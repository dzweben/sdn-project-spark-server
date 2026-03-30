import { NextResponse } from "next/server";
import { fetchReport, fetchSparkRecords, fetchContacts } from "@/lib/redcap";
import { VISIT_TYPES, getCompletionFieldName } from "@/lib/surveys";
import type { Participant, VisitStatus, SurveyStatus } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const forceRefresh = url.searchParams.get("refresh") === "true";

    // 1. Get valid V1 participants from Report 9490
    const v1Report = await fetchReport("9490", forceRefresh);
    const v1RecordIds = [
      ...new Set(v1Report.map((r) => r.record_id).filter(Boolean)),
    ];

    // 2. Get V2 completed participants from Report 9491
    const v2Report = await fetchReport("9491", forceRefresh);
    const v2RecordIds = new Set(
      v2Report.map((r) => r.record_id).filter(Boolean)
    );

    if (v1RecordIds.length === 0) {
      return NextResponse.json({ participants: [], stats: { totalParticipants: 0, v1Complete: 0, v2Complete: 0, overallCompletionPercent: 0 } });
    }

    // 3. Get session dates and sub_ids for all participants
    const teamFacingData = await fetchSparkRecords({
      records: v1RecordIds,
      fields: [
        "record_id",
        "sub_id",
        "sub_email",
        "spark_date_v1",
        "spark_v2date_v1",
        "spark_date",
      ],
      events: ["team_facing_arm_1"],
    });

    // Build record_id -> info map
    const participantInfo: Record<
      string,
      { subId: string; email: string; v1Date: string; v2Date: string }
    > = {};
    for (const row of teamFacingData) {
      if (!row.record_id) continue;
      participantInfo[row.record_id] = {
        subId: row.sub_id || "",
        email: row.sub_email || "",
        v1Date: row.spark_date_v1 || "",
        v2Date: row.spark_date || row.spark_v2date_v1 || "",
      };
    }

    // 4. Get completion fields for all relevant events
    const completionFields: string[] = ["record_id"];
    const relevantEvents: string[] = [];

    for (const vt of VISIT_TYPES) {
      relevantEvents.push(vt.eventName);
      for (const inst of vt.instruments) {
        completionFields.push(getCompletionFieldName(inst.name));
      }
    }

    const completionData = await fetchSparkRecords({
      records: v1RecordIds,
      fields: [...new Set(completionFields)],
      events: relevantEvents,
    });

    // Build record_id -> event -> completion map
    const completionMap: Record<
      string,
      Record<string, Record<string, string>>
    > = {};
    for (const row of completionData) {
      const rid = row.record_id;
      const event = row.redcap_event_name;
      if (!rid || !event) continue;
      if (!completionMap[rid]) completionMap[rid] = {};
      completionMap[rid][event] = row;
    }

    // 5. Get contacts from recruitment project
    const subIds = Object.values(participantInfo)
      .map((p) => p.subId)
      .filter(Boolean);
    const contacts = await fetchContacts(subIds);

    // 6. Build participant objects
    const participants: Participant[] = [];

    for (const recordId of v1RecordIds) {
      const info = participantInfo[recordId];
      if (!info || !info.subId) continue;

      const contact = contacts[info.subId.toLowerCase()] || {
        email: "",
        childEmail: "",
        phone: "",
        childPhone: "",
        preferText: "",
      };

      const hasV2 = v2RecordIds.has(recordId);

      // Build visit statuses
      const visits: Record<string, VisitStatus> = {};

      for (const vt of VISIT_TYPES) {
        // Skip V2/follow-up types if no V2 date
        if (vt.key !== "v1_child" && !hasV2 && !info.v2Date) continue;

        const eventData = completionMap[recordId]?.[vt.eventName] || {};

        const surveys: SurveyStatus[] = vt.instruments.map((inst) => {
          const fieldName = getCompletionFieldName(inst.name);
          const value = parseInt(eventData[fieldName] || "0", 10);
          return {
            instrumentName: inst.name,
            label: inst.label,
            completionValue: value,
            isComplete: value === 2,
          };
        });

        const totalComplete = surveys.filter((s) => s.isComplete).length;

        visits[vt.key] = {
          visitTypeKey: vt.key,
          label: vt.label,
          eventName: vt.eventName,
          surveys,
          totalComplete,
          totalSurveys: surveys.length,
          allComplete: totalComplete === surveys.length,
        };
      }

      participants.push({
        subId: info.subId,
        recordId,
        v1Date: info.v1Date || null,
        v2Date: info.v2Date || null,
        email: contact.email || info.email,
        childEmail: contact.childEmail,
        phone: contact.phone,
        childPhone: contact.childPhone,
        visits,
      });
    }

    // Sort by subId
    participants.sort((a, b) => a.subId.localeCompare(b.subId));

    // Stats
    const totalParticipants = participants.length;
    const v1Complete = participants.filter(
      (p) => p.visits.v1_child?.allComplete
    ).length;
    const v2ChildComplete = participants.filter(
      (p) => p.visits.v2_child?.allComplete
    ).length;

    return NextResponse.json({
      participants,
      stats: {
        totalParticipants,
        v1Complete,
        v2Complete: v2ChildComplete,
        overallCompletionPercent:
          totalParticipants > 0
            ? Math.round((v1Complete / totalParticipants) * 100)
            : 0,
      },
    });
  } catch (error) {
    console.error("Error fetching participants:", error);
    return NextResponse.json(
      { error: "Failed to fetch participant data" },
      { status: 500 }
    );
  }
}
