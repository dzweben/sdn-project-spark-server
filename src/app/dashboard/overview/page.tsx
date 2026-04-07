"use client";

import { useEffect, useState, useMemo } from "react";
import type { Participant, DashboardStats } from "@/types";

type SortKey = "pid" | "v1Date" | "v1Child" | "v2Date" | "v2Child" | "v2Parent";
type SortDir = "asc" | "desc";
type CompletionFilter = "all" | "v1_incomplete" | "v2_incomplete" | "all_complete" | "no_v2";

export default function OverviewPage() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("pid");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [completionFilter, setCompletionFilter] = useState<CompletionFilter>("all");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/redcap/participants");
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setParticipants(data.participants);
        setStats(data.stats);
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

    switch (completionFilter) {
      case "v1_incomplete":
        result = result.filter((p) => !p.visits.v1_child?.allComplete);
        break;
      case "v2_incomplete":
        result = result.filter((p) => p.v2Date && (!p.visits.v2_child?.allComplete || !p.visits.v2_parent?.allComplete));
        break;
      case "all_complete":
        result = result.filter((p) => p.visits.v1_child?.allComplete && p.visits.v2_child?.allComplete && p.visits.v2_parent?.allComplete);
        break;
      case "no_v2":
        result = result.filter((p) => !p.v2Date);
        break;
    }

    result.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "pid":
          cmp = a.subId.localeCompare(b.subId);
          break;
        case "v1Date":
          cmp = (a.v1Date || "").localeCompare(b.v1Date || "");
          break;
        case "v1Child":
          cmp = (a.visits.v1_child?.totalComplete ?? -1) - (b.visits.v1_child?.totalComplete ?? -1);
          break;
        case "v2Date":
          cmp = (a.v2Date || "").localeCompare(b.v2Date || "");
          break;
        case "v2Child":
          cmp = (a.visits.v2_child?.totalComplete ?? -1) - (b.visits.v2_child?.totalComplete ?? -1);
          break;
        case "v2Parent":
          cmp = (a.visits.v2_parent?.totalComplete ?? -1) - (b.visits.v2_parent?.totalComplete ?? -1);
          break;
      }
      return sortDir === "desc" ? -cmp : cmp;
    });

    return result;
  }, [participants, search, completionFilter, sortKey, sortDir]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-gray-500">
          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading participant data from REDCap...
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
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">V1/V2 Overview</h2>
        <p className="text-sm text-gray-500 mt-1">
          Survey completion status for all SPARK participants
        </p>
      </div>

      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <StatCard label="Total Participants" value={stats.totalParticipants} />
          <StatCard label="V1 Complete" value={`${stats.v1Complete}/${stats.totalParticipants}`} color="teal" />
          <StatCard label="V2 Visited" value={`${stats.v2Visited}/${stats.totalParticipants}`} color="teal" />
          <StatCard label="V1 Completion Rate" value={`${stats.overallCompletionPercent}%`} color="teal" />
        </div>
      )}

      {/* Search + Filters */}
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
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
        </div>
        <select
          value={completionFilter}
          onChange={(e) => setCompletionFilter(e.target.value as CompletionFilter)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
        >
          <option value="all">All Participants</option>
          <option value="v1_incomplete">V1 Incomplete</option>
          <option value="v2_incomplete">V2 Incomplete</option>
          <option value="all_complete">All Complete</option>
          <option value="no_v2">No V2 Yet</option>
        </select>
        <span className="text-sm text-gray-500">
          {filtered.length} participant{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <SortableHeader label="PID" sortKey="pid" currentKey={sortKey} dir={sortDir} onSort={toggleSort} sticky />
                <SortableHeader label="V1 Date" sortKey="v1Date" currentKey={sortKey} dir={sortDir} onSort={toggleSort} />
                <SortableHeader label="V1 Child (20)" sortKey="v1Child" currentKey={sortKey} dir={sortDir} onSort={toggleSort} center />
                <SortableHeader label="V2 Date" sortKey="v2Date" currentKey={sortKey} dir={sortDir} onSort={toggleSort} />
                <SortableHeader label="V2 Child (4)" sortKey="v2Child" currentKey={sortKey} dir={sortDir} onSort={toggleSort} center />
                <SortableHeader label="V2 Parent (19)" sortKey="v2Parent" currentKey={sortKey} dir={sortDir} onSort={toggleSort} center />
                <th className="text-center px-4 py-3 font-semibold text-gray-600">Reminders Sent</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, i) => (
                <ParticipantRow
                  key={p.subId}
                  participant={p}
                  isEven={i % 2 === 0}
                  isExpanded={expandedRow === p.subId}
                  onToggle={() =>
                    setExpandedRow(expandedRow === p.subId ? null : p.subId)
                  }
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
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

function StatCard({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${color === "teal" ? "text-teal-600" : "text-gray-900"}`}>{value}</p>
    </div>
  );
}

function StatusCell({
  visit,
  onClick,
}: {
  visit: { totalComplete: number; totalSurveys: number; allComplete: boolean } | undefined;
  onClick?: () => void;
}) {
  if (!visit) {
    return (
      <td className="px-4 py-3 text-center">
        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-400">--</span>
      </td>
    );
  }

  return (
    <td className="px-4 py-3 text-center">
      <button
        onClick={onClick}
        className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold transition-colors cursor-pointer ${
          visit.allComplete
            ? "bg-green-100 text-green-700 hover:bg-green-200"
            : "bg-red-100 text-red-700 hover:bg-red-200"
        }`}
      >
        {visit.totalComplete}/{visit.totalSurveys}
      </button>
    </td>
  );
}

function ParticipantRow({
  participant: p,
  isEven,
  isExpanded,
  onToggle,
}: {
  participant: Participant;
  isEven: boolean;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr
        className={`border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${isEven ? "bg-white" : "bg-gray-50/50"}`}
        onClick={onToggle}
      >
        <td className="px-4 py-3 font-mono font-medium text-gray-900 sticky left-0 bg-inherit z-10">{p.subId}</td>
        <td className="px-4 py-3 text-gray-600">{p.v1Date || "--"}</td>
        <StatusCell visit={p.visits.v1_child} />
        <td className="px-4 py-3 text-gray-600">{p.v2Date || "--"}</td>
        <StatusCell visit={p.visits.v2_child} />
        <StatusCell visit={p.visits.v2_parent} />
        <td className="px-4 py-3 text-center">
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-500">0</span>
        </td>
      </tr>
      {isExpanded && <ExpandedDetails participant={p} />}
    </>
  );
}

function ExpandedDetails({ participant: p }: { participant: Participant }) {
  return (
    <tr>
      <td colSpan={7} className="px-4 py-4 bg-teal-50/30 border-b border-gray-200">
        <div className="space-y-4">
          <div className="flex gap-6 text-xs text-gray-600">
            <span><strong>Email:</strong> {p.email || "N/A"}</span>
            <span><strong>Phone:</strong> {p.phone || "N/A"}</span>
            <span><strong>Child Email:</strong> {p.childEmail || "N/A"}</span>
            <span><strong>Record ID:</strong> {p.recordId}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {["v1_child", "v2_child", "v2_parent"].map((key) => {
              const visit = p.visits[key];
              if (!visit) return null;
              return (
                <div key={key} className="bg-white rounded-lg border border-gray-200 p-3">
                  <h4 className="text-xs font-bold text-gray-700 mb-2">
                    {visit.label} ({visit.totalComplete}/{visit.totalSurveys})
                  </h4>
                  <div className="space-y-1">
                    {visit.surveys.map((s) => (
                      <div key={s.instrumentName} className="flex items-center justify-between text-xs">
                        <span className={s.isComplete ? "text-green-600" : "text-red-600"}>
                          {s.isComplete ? "\u2713" : "\u2717"} {s.label}
                        </span>
                        {!s.isComplete && (
                          <SurveyLinkButton recordId={p.recordId} event={visit.eventName} instrument={s.instrumentName} />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </td>
    </tr>
  );
}

function SurveyLinkButton({ recordId, event, instrument }: { recordId: string; event: string; instrument: string }) {
  const [link, setLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function fetchLink() {
    if (link) { window.open(link, "_blank"); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/redcap/survey-link?record=${recordId}&event=${event}&instrument=${instrument}`);
      const data = await res.json();
      if (data.link) { setLink(data.link); window.open(data.link, "_blank"); }
    } catch { /* ignore */ } finally { setLoading(false); }
  }

  return (
    <button
      onClick={(e) => { e.stopPropagation(); fetchLink(); }}
      disabled={loading}
      className="text-teal-600 hover:text-teal-800 font-medium underline disabled:opacity-50"
    >
      {loading ? "..." : "Link"}
    </button>
  );
}
