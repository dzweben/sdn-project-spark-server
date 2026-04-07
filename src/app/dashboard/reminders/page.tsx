"use client";

import { useEffect, useState, useMemo } from "react";
import type { Participant } from "@/types";
import { VISIT_TYPES, FOLLOWUP_PERIODS } from "@/lib/surveys";

interface SurveyToSend {
  name: string;
  label: string;
  instrumentName: string;
  eventName: string;
}

interface ComputedReminder {
  id: string;
  subId: string;
  recordId: string;
  visitType: string;
  visitLabel: string;
  scheduledDate: string;
  reminderNumber: number;
  channel: "email" | "text";
  status: "would-send" | "past" | "future";
  recipientEmail: string;
  recipientPhone: string;
  surveyToSend: SurveyToSend; // The next incomplete survey that would be sent
}

const REMINDER_DAYS = [1, 8, 15];

function addDays(dateStr: string, days: number): Date {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  d.setHours(17, 0, 0, 0);
  return d;
}

function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split("T")[0];
}

function computeReminders(participants: Participant[]): ComputedReminder[] {
  const reminders: ComputedReminder[] = [];
  const now = new Date();

  for (const p of participants) {
    const visitDateMap: { date: string; visitKeys: string[] }[] = [];

    if (p.v1Date) {
      visitDateMap.push({ date: p.v1Date, visitKeys: ["v1_child"] });
    }
    if (p.v2Date) {
      visitDateMap.push({ date: p.v2Date, visitKeys: ["v2_child", "v2_parent"] });
      for (const period of FOLLOWUP_PERIODS) {
        const fuDate = addMonths(p.v2Date, period.months);
        visitDateMap.push({ date: fuDate, visitKeys: [period.childKey, period.parentKey] });
      }
    }

    for (const { date, visitKeys } of visitDateMap) {
      for (const visitKey of visitKeys) {
        const visit = p.visits[visitKey];
        if (!visit || visit.allComplete) continue;

        // Find the NEXT incomplete survey (first one not complete — this is what gets sent)
        const nextIncomplete = visit.surveys.find((s) => !s.isComplete);
        if (!nextIncomplete) continue;

        const visitTypeDef = VISIT_TYPES.find((v) => v.key === visitKey);
        if (!visitTypeDef) continue;

        const surveyToSend: SurveyToSend = {
          name: nextIncomplete.instrumentName,
          label: nextIncomplete.label,
          instrumentName: nextIncomplete.instrumentName,
          eventName: visitTypeDef.eventName,
        };

        const windowEnd = new Date(date);
        windowEnd.setDate(windowEnd.getDate() + 21);

        for (let i = 0; i < REMINDER_DAYS.length; i++) {
          const reminderDate = addDays(date, REMINDER_DAYS[i]);

          let status: "would-send" | "past" | "future";
          if (reminderDate < now) {
            status = "past";
          } else if (now > windowEnd) {
            continue;
          } else {
            status = "would-send";
          }

          for (const channel of ["email", "text"] as const) {
            reminders.push({
              id: `${p.subId}-${visitKey}-${i + 1}-${channel}`,
              subId: p.subId,
              recordId: p.recordId,
              visitType: visitKey,
              visitLabel: visit.label,
              scheduledDate: reminderDate.toISOString(),
              reminderNumber: i + 1,
              channel,
              status,
              recipientEmail: channel === "email" ? (visit.label.includes("Child") ? p.childEmail || p.email : p.email) : "",
              recipientPhone: channel === "text" ? (visit.label.includes("Child") ? p.childPhone || p.phone : p.phone) : "",
              surveyToSend,
            });
          }
        }
      }
    }
  }

  reminders.sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());
  return reminders;
}

function SurveyLinkCell({ reminder }: { reminder: ComputedReminder }) {
  const [link, setLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function fetchLink() {
    if (link) {
      window.open(link, "_blank");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `/api/redcap/survey-link?record=${reminder.recordId}&event=${reminder.surveyToSend.eventName}&instrument=${reminder.surveyToSend.instrumentName}`
      );
      const data = await res.json();
      if (data.link) {
        setLink(data.link);
        window.open(data.link, "_blank");
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        fetchLink();
      }}
      disabled={loading}
      className="text-left text-teal-700 hover:text-teal-900 underline decoration-dotted underline-offset-2 font-medium disabled:opacity-50 text-xs"
      title={`Click to open survey link for ${reminder.surveyToSend.label}`}
    >
      {loading ? "Loading..." : reminder.surveyToSend.label}
    </button>
  );
}

export default function RemindersPage() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [visitFilter, setVisitFilter] = useState<string>("all");
  const [channelFilter, setChannelFilter] = useState<string>("all");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/redcap/participants");
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setParticipants(data.participants);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const allReminders = useMemo(
    () => computeReminders(participants),
    [participants]
  );

  const filtered = useMemo(() => {
    return allReminders.filter((r) => {
      if (search && !r.subId.toLowerCase().includes(search.toLowerCase()))
        return false;
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (visitFilter !== "all" && r.visitType !== visitFilter) return false;
      if (channelFilter !== "all" && r.channel !== channelFilter) return false;
      return true;
    });
  }, [allReminders, search, statusFilter, visitFilter, channelFilter]);

  const pageCount = Math.ceil(filtered.length / PAGE_SIZE);
  const pageData = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const wouldSendCount = allReminders.filter((r) => r.status === "would-send").length;
  const pastCount = allReminders.filter((r) => r.status === "past").length;
  const next7Days = allReminders.filter((r) => {
    const d = new Date(r.scheduledDate);
    const now = new Date();
    const week = new Date();
    week.setDate(week.getDate() + 7);
    return d >= now && d <= week;
  }).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-gray-500">
          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Computing reminder schedule...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        <strong>Error:</strong> {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Outgoing Reminders</h2>
        <p className="text-sm text-gray-500 mt-1">
          Computed reminder queue for audit — no messages are being sent yet
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Reminders</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{allReminders.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Would-Send (Future)</p>
          <p className="text-2xl font-bold text-teal-600 mt-1">{wouldSendCount}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Next 7 Days</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{next7Days}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Past (Would Have Sent)</p>
          <p className="text-2xl font-bold text-gray-500 mt-1">{pastCount}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search PID..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
        >
          <option value="all">All Status</option>
          <option value="would-send">Would-Send</option>
          <option value="past">Past</option>
        </select>
        <select
          value={visitFilter}
          onChange={(e) => { setVisitFilter(e.target.value); setPage(0); }}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
        >
          <option value="all">All Visits</option>
          {VISIT_TYPES.map((vt) => (
            <option key={vt.key} value={vt.key}>{vt.label}</option>
          ))}
        </select>
        <select
          value={channelFilter}
          onChange={(e) => { setChannelFilter(e.target.value); setPage(0); }}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
        >
          <option value="all">All Channels</option>
          <option value="email">Email</option>
          <option value="text">Text</option>
        </select>
        <span className="text-sm text-gray-500">{filtered.length} reminders</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Scheduled Date</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">PID</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Visit Type</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Survey to Send</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600">Reminder</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600">Channel</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Recipient</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody>
              {pageData.map((r) => (
                <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-600 font-mono text-xs whitespace-nowrap">
                    {new Date(r.scheduledDate).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}{" "}
                    5:00 PM
                  </td>
                  <td className="px-4 py-3 font-mono font-medium text-gray-900">{r.subId}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{r.visitLabel}</td>
                  <td className="px-4 py-3">
                    <SurveyLinkCell reminder={r} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                      {r.reminderNumber} of 3
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      r.channel === "email"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-purple-100 text-purple-700"
                    }`}>
                      {r.channel === "email" ? "Email" : "Text"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs max-w-[200px] truncate">
                    {r.channel === "email" ? r.recipientEmail || "N/A" : r.recipientPhone || "N/A"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold ${
                      r.status === "would-send"
                        ? "bg-teal-100 text-teal-700"
                        : "bg-gray-100 text-gray-500"
                    }`}>
                      {r.status === "would-send" ? "Would Send" : "Past"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pageCount > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-sm text-gray-500">
              Page {page + 1} of {pageCount}
            </span>
            <button
              onClick={() => setPage(Math.min(pageCount - 1, page + 1))}
              disabled={page >= pageCount - 1}
              className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Audit notice */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <div>
            <h3 className="text-sm font-bold text-amber-800">Audit Mode</h3>
            <p className="text-sm text-amber-700 mt-1">
              No messages are being sent. This view shows what <strong>would</strong> be sent based on the
              current reminder logic. Please review carefully before enabling automation in Phase 2.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
