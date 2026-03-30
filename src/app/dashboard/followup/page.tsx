"use client";

import React, { useEffect, useState, useMemo } from "react";
import type { Participant } from "@/types";
import { FOLLOWUP_PERIODS } from "@/lib/surveys";

function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split("T")[0];
}

function isPast(dateStr: string): boolean {
  return new Date(dateStr) < new Date();
}

type SortKey = "pid" | "v2Date" | "6mo_child" | "6mo_parent" | "12mo_child" | "12mo_parent" | "18mo_child" | "18mo_parent";
type SortDir = "asc" | "desc";
type StatusFilter = "all" | "complete" | "incomplete" | "overdue";

function getCompletionCount(p: Participant, key: string): number {
  const v = p.visits[key];
  return v ? v.totalComplete : -1;
}

export default function FollowupPage() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("pid");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  // 6-month expanded by default, 12 and 18 collapsed
  const [expandedPeriods, setExpandedPeriods] = useState<Record<string, boolean>>({
    "6-Month": false,
    "12-Month": false,
    "18-Month": false,
  });

  function togglePeriod(label: string) {
    setExpandedPeriods((prev) => ({ ...prev, [label]: !prev[label] }));
  }

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/redcap/participants");
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setParticipants(
          data.participants.filter((p: Participant) => p.v2Date)
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const filtered = useMemo(() => {
    let result = participants.filter((p) =>
      p.subId.toLowerCase().includes(search.toLowerCase())
    );

    if (statusFilter !== "all") {
      result = result.filter((p) => {
        // Check across all follow-up periods
        for (const period of FOLLOWUP_PERIODS) {
          const dueDate = p.v2Date ? addMonths(p.v2Date, period.months) : null;
          const child = p.visits[period.childKey];
          const parent = p.visits[period.parentKey];
          const childComplete = child?.allComplete ?? false;
          const parentComplete = parent?.allComplete ?? false;
          const bothComplete = childComplete && parentComplete;
          const overdue = dueDate ? isPast(dueDate) : false;

          if (statusFilter === "complete" && bothComplete) return true;
          if (statusFilter === "incomplete" && !bothComplete && (child || parent)) return true;
          if (statusFilter === "overdue" && overdue && !bothComplete && (child || parent)) return true;
        }
        return false;
      });
    }

    result.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "pid":
          cmp = a.subId.localeCompare(b.subId);
          break;
        case "v2Date":
          cmp = (a.v2Date || "").localeCompare(b.v2Date || "");
          break;
        default: {
          // Sort by completion count for a specific visit key
          const aVal = getCompletionCount(a, sortKey);
          const bVal = getCompletionCount(b, sortKey);
          cmp = aVal - bVal;
          break;
        }
      }
      return sortDir === "desc" ? -cmp : cmp;
    });

    return result;
  }, [participants, search, statusFilter, sortKey, sortDir]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-gray-500">
          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading follow-up data...
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
        <h2 className="text-2xl font-bold text-gray-900">Follow-up Tracker</h2>
        <p className="text-sm text-gray-500 mt-1">
          6, 12, and 18-month follow-up survey completion for V2 participants
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">V2 Participants</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{participants.length}</p>
        </div>
        {FOLLOWUP_PERIODS.map((period) => {
          const dueCount = participants.filter((p) => {
            if (!p.v2Date) return false;
            return isPast(addMonths(p.v2Date, period.months));
          }).length;
          return (
            <div key={period.label} className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{period.label} Due</p>
              <p className="text-2xl font-bold text-teal-600 mt-1">{dueCount}</p>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search by PID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
        >
          <option value="all">All Status</option>
          <option value="incomplete">Has Incomplete</option>
          <option value="overdue">Overdue</option>
          <option value="complete">All Complete</option>
        </select>
        <span className="text-sm text-gray-500">{filtered.length} participants</span>
      </div>

      {/* Collapsible period sections */}
      {FOLLOWUP_PERIODS.map((period) => {
        const isOpen = expandedPeriods[period.label];
        const dueCount = participants.filter((p) => p.v2Date && isPast(addMonths(p.v2Date, period.months))).length;
        const completeCount = participants.filter((p) => {
          const child = p.visits[period.childKey];
          const parent = p.visits[period.parentKey];
          return child?.allComplete && parent?.allComplete;
        }).length;

        return (
          <div key={period.label} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* Collapsible header */}
            <button
              onClick={() => togglePeriod(period.label)}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <svg
                  className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? "rotate-90" : ""}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <h3 className="text-sm font-bold text-gray-900">{period.label} Follow-up</h3>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <span className="text-gray-500">{dueCount} due</span>
                <span className="text-green-600 font-medium">{completeCount} complete</span>
                <span className="text-red-600 font-medium">{dueCount - completeCount} remaining</span>
              </div>
            </button>

            {/* Table (collapsible) */}
            {isOpen && (
              <div className="border-t border-gray-200 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <SortableHeader label="PID" sortKey="pid" currentKey={sortKey} dir={sortDir} onSort={toggleSort} sticky />
                      <SortableHeader label="V2 Date" sortKey="v2Date" currentKey={sortKey} dir={sortDir} onSort={toggleSort} />
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">{period.label} Due</th>
                      <SortableHeader label="Child" sortKey={`${period.childKey}` as SortKey} currentKey={sortKey} dir={sortDir} onSort={toggleSort} center />
                      <SortableHeader label="Parent" sortKey={`${period.parentKey}` as SortKey} currentKey={sortKey} dir={sortDir} onSort={toggleSort} center />
                      <th className="text-center px-4 py-3 font-semibold text-gray-600">Reminders</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((p, i) => {
                      const dueDate = p.v2Date ? addMonths(p.v2Date, period.months) : null;
                      const childVisit = p.visits[period.childKey];
                      const parentVisit = p.visits[period.parentKey];

                      return (
                        <React.Fragment key={p.subId}>
                          <tr
                            className={`border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}
                            onClick={() => setExpandedRow(expandedRow === `${p.subId}-${period.label}` ? null : `${p.subId}-${period.label}`)}
                          >
                            <td className="px-4 py-3 font-mono font-medium text-gray-900 sticky left-0 bg-inherit z-10">{p.subId}</td>
                            <td className="px-4 py-3 text-gray-600">{p.v2Date || "--"}</td>
                            <td className="px-4 py-3 text-gray-600">{dueDate || "--"}</td>
                            <td className="px-4 py-3 text-center">
                              <FollowupStatusBadge visit={childVisit} dueDate={dueDate} />
                            </td>
                            <td className="px-4 py-3 text-center">
                              <FollowupStatusBadge visit={parentVisit} dueDate={dueDate} />
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-500">0</span>
                            </td>
                          </tr>
                          {expandedRow === `${p.subId}-${period.label}` && (
                            <tr>
                              <td colSpan={6} className="px-4 py-4 bg-teal-50/30 border-b border-gray-200">
                                <div className="space-y-3">
                                  <div className="flex gap-6 text-xs text-gray-600">
                                    <span><strong>Email:</strong> {p.email || "N/A"}</span>
                                    <span><strong>Phone:</strong> {p.phone || "N/A"}</span>
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {childVisit && (
                                      <div className="bg-white rounded-lg border border-gray-200 p-3">
                                        <p className="text-xs font-bold text-gray-700 mb-2">Child ({childVisit.totalComplete}/{childVisit.totalSurveys})</p>
                                        {childVisit.surveys.map((s) => (
                                          <div key={s.instrumentName} className="flex items-center text-xs">
                                            <span className={s.isComplete ? "text-green-600" : "text-red-600"}>
                                              {s.isComplete ? "\u2713" : "\u2717"} {s.label}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                    {parentVisit && (
                                      <div className="bg-white rounded-lg border border-gray-200 p-3">
                                        <p className="text-xs font-bold text-gray-700 mb-2">Parent ({parentVisit.totalComplete}/{parentVisit.totalSurveys})</p>
                                        {parentVisit.surveys.map((s) => (
                                          <div key={s.instrumentName} className="flex items-center text-xs">
                                            <span className={s.isComplete ? "text-green-600" : "text-red-600"}>
                                              {s.isComplete ? "\u2713" : "\u2717"} {s.label}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function SortableHeader({
  label,
  sortKey,
  currentKey,
  dir,
  onSort,
  center,
  sticky,
}: {
  label: string;
  sortKey: SortKey;
  currentKey: SortKey;
  dir: SortDir;
  onSort: (key: SortKey) => void;
  center?: boolean;
  sticky?: boolean;
}) {
  const isActive = currentKey === sortKey;
  return (
    <th
      className={`px-4 py-3 font-semibold text-gray-600 cursor-pointer hover:text-gray-900 select-none ${center ? "text-center" : "text-left"} ${sticky ? "sticky left-0 bg-gray-50 z-10" : ""}`}
      onClick={() => onSort(sortKey)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {isActive && (
          <svg className={`w-3 h-3 ${dir === "desc" ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        )}
      </span>
    </th>
  );
}

function FollowupStatusBadge({
  visit,
  dueDate,
}: {
  visit?: { totalComplete: number; totalSurveys: number; allComplete: boolean };
  dueDate: string | null;
}) {
  if (!visit || !dueDate) {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-400">--</span>
    );
  }

  const overdue = isPast(dueDate);

  if (visit.allComplete) {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-green-100 text-green-700">
        {visit.totalComplete}/{visit.totalSurveys}
      </span>
    );
  }

  if (overdue) {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-red-100 text-red-700">
        {visit.totalComplete}/{visit.totalSurveys}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-gray-100 text-gray-500">
      {visit.totalComplete}/{visit.totalSurveys}
    </span>
  );
}
