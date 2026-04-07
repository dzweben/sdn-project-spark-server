"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import type { Participant } from "@/types";

interface RaffleEntry {
  subId: string;
  tickets: number;
  completedSets: { key: string; label: string }[];
}

const TICKET_SETS = [
  { key: "v1_child", label: "V1 Child Surveys" },
  { key: "v2_child", label: "V2 Child Surveys" },
  { key: "v2_parent", label: "V2 Parent Surveys" },
  { key: "6mo_child", label: "6-Month Child" },
  { key: "6mo_parent", label: "6-Month Parent" },
  { key: "12mo_child", label: "12-Month Child" },
  { key: "12mo_parent", label: "12-Month Parent" },
  { key: "18mo_child", label: "18-Month Child" },
  { key: "18mo_parent", label: "18-Month Parent" },
];

function buildRaffleEntries(participants: Participant[]): RaffleEntry[] {
  const entries: RaffleEntry[] = [];

  for (const p of participants) {
    const completedSets: { key: string; label: string }[] = [];

    for (const set of TICKET_SETS) {
      const visit = p.visits[set.key];
      if (visit && visit.allComplete) {
        completedSets.push({ key: set.key, label: set.label });
      }
    }

    if (completedSets.length > 0) {
      entries.push({
        subId: p.subId,
        tickets: completedSets.length,
        completedSets,
      });
    }
  }

  entries.sort((a, b) => b.tickets - a.tickets);
  return entries;
}

function weightedRandomPick(entries: RaffleEntry[]): RaffleEntry | null {
  if (entries.length === 0) return null;

  const totalTickets = entries.reduce((sum, e) => sum + e.tickets, 0);
  let roll = Math.random() * totalTickets;

  for (const entry of entries) {
    roll -= entry.tickets;
    if (roll <= 0) return entry;
  }

  return entries[entries.length - 1];
}

export default function RafflePage() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [winner, setWinner] = useState<RaffleEntry | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [flashName, setFlashName] = useState<string | null>(null);

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

  const entries = useMemo(() => buildRaffleEntries(participants), [participants]);

  const totalTickets = useMemo(
    () => entries.reduce((sum, e) => sum + e.tickets, 0),
    [entries]
  );

  const filtered = useMemo(
    () =>
      entries.filter((e) =>
        e.subId.toLowerCase().includes(search.toLowerCase())
      ),
    [entries, search]
  );

  const drawWinner = useCallback(() => {
    if (entries.length === 0) return;

    setIsDrawing(true);
    setWinner(null);

    // Flash through random names for dramatic effect
    let count = 0;
    const totalFlashes = 20;
    const interval = setInterval(() => {
      const randomEntry = entries[Math.floor(Math.random() * entries.length)];
      setFlashName(randomEntry.subId);
      count++;

      if (count >= totalFlashes) {
        clearInterval(interval);
        const picked = weightedRandomPick(entries);
        setFlashName(null);
        setWinner(picked);
        setIsDrawing(false);
      }
    }, 80);
  }, [entries]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-gray-500">
          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading raffle data...
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
        <h2 className="text-2xl font-bold text-gray-900">Raffle</h2>
        <p className="text-sm text-gray-500 mt-1">
          Weighted drawing based on completed survey sets — one ticket per completed set
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            Participants with Tickets
          </p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{entries.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            Total Tickets in Pool
          </p>
          <p className="text-2xl font-bold text-teal-600 mt-1">{totalTickets}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            Max Tickets Per Person
          </p>
          <p className="text-2xl font-bold text-gray-900 mt-1">9</p>
          <p className="text-xs text-gray-400 mt-0.5">V1 + V2 child/parent + 3 follow-ups child/parent</p>
        </div>
      </div>

      {/* Draw button + Winner display */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex flex-col items-center gap-4">
          <button
            onClick={drawWinner}
            disabled={isDrawing || entries.length === 0}
            className="inline-flex items-center gap-3 px-8 py-4 text-lg font-bold text-white bg-teal-600 rounded-xl hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl active:scale-95"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {isDrawing ? "Drawing..." : "Draw a Winner"}
          </button>

          {/* Flashing name during draw */}
          {isDrawing && flashName && (
            <div className="text-3xl font-mono font-bold text-gray-300 animate-pulse">
              {flashName}
            </div>
          )}

          {/* Winner display */}
          {winner && !isDrawing && (
            <div className="mt-2 text-center">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-amber-100 text-amber-700 rounded-full text-sm font-medium mb-3">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                Winner
              </div>
              <div className="text-5xl font-mono font-black text-teal-700 mb-2">
                {winner.subId}
              </div>
              <p className="text-sm text-gray-500">
                {winner.tickets} ticket{winner.tickets !== 1 ? "s" : ""} in the pool
                {" "}({((winner.tickets / totalTickets) * 100).toFixed(1)}% chance)
              </p>
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                {winner.completedSets.map((s) => (
                  <span
                    key={s.key}
                    className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-green-100 text-green-700"
                  >
                    {s.label}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
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
        <span className="text-sm text-gray-500">{filtered.length} participants</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-semibold text-gray-600">PID</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600">Tickets</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Completed Sets</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Win Probability</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((entry, i) => (
                <React.Fragment key={entry.subId}>
                  <tr
                    className={`border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${
                      i % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                    } ${winner?.subId === entry.subId ? "ring-2 ring-inset ring-amber-400 bg-amber-50" : ""}`}
                    onClick={() =>
                      setExpandedRow(expandedRow === entry.subId ? null : entry.subId)
                    }
                  >
                    <td className="px-4 py-3 font-mono font-medium text-gray-900">
                      {entry.subId}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-teal-100 text-teal-700 font-bold text-sm">
                        {entry.tickets}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      <div className="flex flex-wrap gap-1">
                        {entry.completedSets.map((s) => (
                          <span
                            key={s.key}
                            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700"
                          >
                            {s.label}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500 font-mono text-xs">
                      {((entry.tickets / totalTickets) * 100).toFixed(1)}%
                    </td>
                  </tr>
                  {expandedRow === entry.subId && (
                    <tr>
                      <td colSpan={4} className="px-4 py-4 bg-teal-50/30 border-b border-gray-200">
                        <div className="space-y-2">
                          <p className="text-xs font-bold text-gray-700">
                            All Survey Sets ({entry.tickets}/9 completed)
                          </p>
                          <div className="grid grid-cols-3 gap-2">
                            {TICKET_SETS.map((set) => {
                              const completed = entry.completedSets.some(
                                (s) => s.key === set.key
                              );
                              return (
                                <div
                                  key={set.key}
                                  className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg ${
                                    completed
                                      ? "bg-green-100 text-green-700"
                                      : "bg-gray-100 text-gray-400"
                                  }`}
                                >
                                  <span>{completed ? "\u2713" : "\u2717"}</span>
                                  <span>{set.label}</span>
                                  <span className="ml-auto font-bold">
                                    {completed ? "+1" : ""}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
