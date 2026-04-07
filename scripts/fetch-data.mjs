#!/usr/bin/env node
/**
 * Pre-deploy script: Fetches all participant data from REDCap and saves
 * it as static JSON. Run this locally before deploying because Temple's
 * REDCap blocks API calls from Vercel's servers.
 *
 * Usage: node scripts/fetch-data.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Tokens: from env vars (GitHub Actions) or fallback to local .env file
const REDCAP_API_URL = process.env.REDCAP_API_URL || "https://cphapps.temple.edu/redcap/api/";
const SPARK_TOKEN = process.env.REDCAP_SPARK_TOKEN || (() => { try { return fs.readFileSync(path.join(__dirname, "..", "..", "keys", "spark-rdcp.txt"), "utf-8").trim(); } catch { return ""; } })();
const RECRUIT_TOKEN = process.env.REDCAP_RECRUIT_TOKEN || (() => { try { return fs.readFileSync(path.join(__dirname, "..", "..", "keys", "rcrt.pjct.txt"), "utf-8").trim(); } catch { return ""; } })();

if (!SPARK_TOKEN || !RECRUIT_TOKEN) {
  console.error("Missing REDCap tokens. Set REDCAP_SPARK_TOKEN and REDCAP_RECRUIT_TOKEN env vars, or place key files in ../keys/");
  process.exit(1);
}

// --- CSV Parser ---
function parseCSV(text) {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];
  const parseRow = (line) => {
    const result = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (ch === "," && !inQuotes) { result.push(current); current = ""; }
      else current += ch;
    }
    result.push(current);
    return result;
  };
  const headers = parseRow(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const values = parseRow(lines[i]);
    const row = {};
    for (let j = 0; j < headers.length; j++) row[headers[j]] = values[j] ?? "";
    rows.push(row);
  }
  return rows;
}

// --- REDCap helpers ---
async function redcapPost(token, params) {
  const body = new URLSearchParams({ token, ...params });
  const res = await fetch(REDCAP_API_URL, { method: "POST", body, headers: { "Content-Type": "application/x-www-form-urlencoded" } });
  if (!res.ok) throw new Error(`REDCap error: ${res.status} ${await res.text()}`);
  return res.text();
}

async function fetchReport(reportId) {
  const csv = await redcapPost(SPARK_TOKEN, { content: "report", format: "csv", report_id: reportId, rawOrLabel: "raw", rawOrLabelHeaders: "raw" });
  return parseCSV(csv);
}

async function fetchRecords(token, params) {
  const payload = { content: "record", format: "json" };
  if (params.records) params.records.forEach((r, i) => payload[`records[${i}]`] = r);
  if (params.fields) params.fields.forEach((f, i) => payload[`fields[${i}]`] = f);
  if (params.events) params.events.forEach((e, i) => payload[`events[${i}]`] = e);
  const text = await redcapPost(token, payload);
  return JSON.parse(text);
}

// --- Survey definitions (must match surveys.ts) ---
const VISIT_TYPES = [
  { key: "v1_child", eventName: "v1_child_surveys_arm_1", label: "V1 Child Surveys", recipient: "child",
    instruments: ["spark_surveys","ius12_child_version","pvq_child_version","ctqsf_child_version","dsm5cc_child_version","quic_child_version","rcads25_child_version","pds_child_version","mte_child_version","fqq_child_version","crsq_child_version","af5_child_version","bfne_child_version","calis_child_version","derssf_child_version","lsds_child_version","nbs_child_version","pasa_child_version","smds_child_version","ari_child_version"] },
  { key: "v2_child", eventName: "v2_child_surveys_arm_1", label: "V2 Child Surveys", recipient: "child",
    instruments: ["peer_rating","scared_child_version","cdi_child_version","posttask_panas"] },
  { key: "v2_parent", eventName: "v2_parent_surveys_arm_1", label: "V2 Parent Surveys", recipient: "parent",
    instruments: ["demographics_spark","scared_parent_on_child","cbcl_parent_on_child","saca_parent_on_child","rbsr_parent_on_child","srs2_parent_on_child","pds_parent_on_child","scq_parent_on_child","calis_parent_on_child","rcads25_parent_on_child","dsm5cc_parent_on_child_version","ari_parent_on_child","cshqsf_parent_on_child","fasa_parent_on_child","scaared_adult_version","bdiii_adult_version","dsm5cc_adult_version","psdq_adult_version","hair_sampling_questionnaire"] },
  { key: "6mo_child", eventName: "6_month_child_surv_arm_1", label: "6-Month Child Surveys", recipient: "child",
    instruments: ["spark_follow_up_surveys","scared_child_version","pvq_child_version","dsm5cc_child_version_sf","rcads25_child_version_sf","pds_child_version","af5_child_version","calis_child_version","lsds_child_version","ari_child_version"] },
  { key: "6mo_parent", eventName: "6_month_parent_sur_arm_1", label: "6-Month Parent Surveys", recipient: "parent",
    instruments: ["spark_follow_up_surveys","scared_parent_on_child","saca_parent_on_child","pds_parent_on_child","calis_parent_on_child","rcads25_parent_on_child_sf","dsm5cc_parent_on_child_version_sf","ari_parent_on_child","fasa_parent_on_child","scaared_adult_version","bdiii_adult_version","dsm5cc_adult_version_sf"] },
  { key: "12mo_child", eventName: "12_month_child_sur_arm_1", label: "12-Month Child Surveys", recipient: "child",
    instruments: ["spark_follow_up_surveys","scared_child_version","pvq_child_version","dsm5cc_child_version_sf","rcads25_child_version_sf","pds_child_version","mte_child_version","af5_child_version","calis_child_version","lsds_child_version","ari_child_version"] },
  { key: "12mo_parent", eventName: "12_month_parent_su_arm_1", label: "12-Month Parent Surveys", recipient: "parent",
    instruments: ["spark_follow_up_surveys","scared_parent_on_child","saca_parent_on_child","pds_parent_on_child","calis_parent_on_child","rcads25_parent_on_child_sf","dsm5cc_parent_on_child_version_sf","ari_parent_on_child","fasa_parent_on_child","scaared_adult_version","bdiii_adult_version","dsm5cc_adult_version_sf"] },
  { key: "18mo_child", eventName: "18_month_child_sur_arm_1", label: "18-Month Child Surveys", recipient: "child",
    instruments: ["spark_follow_up_surveys","scared_child_version","pvq_child_version","dsm5cc_child_version_sf","rcads25_child_version_sf","pds_child_version","af5_child_version","calis_child_version","lsds_child_version","ari_child_version"] },
  { key: "18mo_parent", eventName: "18_month_parent_su_arm_1", label: "18-Month Parent Surveys", recipient: "parent",
    instruments: ["spark_follow_up_surveys","scared_parent_on_child","saca_parent_on_child","pds_parent_on_child","calis_parent_on_child","rcads25_parent_on_child_sf","dsm5cc_parent_on_child_version_sf","ari_parent_on_child","fasa_parent_on_child","scaared_adult_version","bdiii_adult_version","dsm5cc_adult_version_sf"] },
];

const INSTRUMENT_LABELS = {
  spark_surveys: "SPARK Surveys", ius12_child_version: "IUS-12 Child Version", pvq_child_version: "PVQ Child Version",
  ctqsf_child_version: "CTQ-SF Child Version", dsm5cc_child_version: "DSM5CC Child Version", quic_child_version: "QUIC Child Version",
  rcads25_child_version: "RCADS-25 Child Version", pds_child_version: "PDS Child Version", mte_child_version: "MTE Child Version",
  fqq_child_version: "FQQ Child Version", crsq_child_version: "CRSQ Child Version", af5_child_version: "AF-5 Child Version",
  bfne_child_version: "BFnE Child Version", calis_child_version: "CALIS Child Version", derssf_child_version: "DERS-SF Child Version",
  lsds_child_version: "LSDS Child Version", nbs_child_version: "NBS Child Version", pasa_child_version: "PASA Child Version",
  smds_child_version: "SMDS Child Version", ari_child_version: "ARI Child Version", peer_rating: "Peer Rating",
  scared_child_version: "SCARED Child Version", cdi_child_version: "CDI Child Version", posttask_panas: "Post-Task PANAS",
  demographics_spark: "Demographics SPARK", scared_parent_on_child: "SCARED Parent on Child", cbcl_parent_on_child: "CBCL Parent On Child",
  saca_parent_on_child: "SACA Parent On Child", rbsr_parent_on_child: "RBS-R Parent on Child", srs2_parent_on_child: "SRS2 Parent On Child",
  pds_parent_on_child: "PDS Parent On Child", scq_parent_on_child: "SCQ Parent On Child", calis_parent_on_child: "CALIS Parent On Child",
  rcads25_parent_on_child: "RCADS-25 Parent On Child", dsm5cc_parent_on_child_version: "DSM5-CC Parent On Child",
  ari_parent_on_child: "ARI Parent on Child", cshqsf_parent_on_child: "CSHQ-SF Parent on Child", fasa_parent_on_child: "FASA Parent On Child",
  scaared_adult_version: "SCAARED Adult Version", bdiii_adult_version: "BDI-II Adult Version", dsm5cc_adult_version: "DSM5-CC Adult Version",
  psdq_adult_version: "PSDQ Adult Version", hair_sampling_questionnaire: "Hair Sampling Questionnaire",
  spark_follow_up_surveys: "SPARK Follow Up Surveys", dsm5cc_child_version_sf: "DSM5CC Child Version (SF)",
  rcads25_child_version_sf: "RCADS-25 Child Version (SF)", rcads25_parent_on_child_sf: "RCADS-25 Parent On Child (SF)",
  dsm5cc_parent_on_child_version_sf: "DSM5-CC Parent On Child (SF)", dsm5cc_adult_version_sf: "DSM5-CC Adult Version (SF)",
};

async function main() {
  console.log("Fetching data from REDCap...");

  // 1. Get V1 and V2 participant lists
  console.log("  Report 9490 (V1 participants)...");
  const v1Report = await fetchReport("9490");
  const v1RecordIds = [...new Set(v1Report.map(r => r.record_id).filter(Boolean))];
  console.log(`    ${v1RecordIds.length} V1 participants`);

  console.log("  Report 9491 (V2 participants)...");
  const v2Report = await fetchReport("9491");
  const v2RecordIds = new Set(v2Report.map(r => r.record_id).filter(Boolean));
  console.log(`    ${v2RecordIds.size} V2 participants`);

  // 2. Get session dates and sub_ids
  console.log("  Session dates and sub_ids...");
  const teamFacingData = await fetchRecords(SPARK_TOKEN, {
    records: v1RecordIds,
    fields: ["record_id", "sub_id", "sub_email", "spark_date_v1", "spark_v2date_v1", "spark_date"],
    events: ["team_facing_arm_1"],
  });

  const participantInfo = {};
  for (const row of teamFacingData) {
    if (!row.record_id) continue;
    participantInfo[row.record_id] = {
      subId: row.sub_id || "",
      email: row.sub_email || "",
      v1Date: row.spark_date_v1 || "",
      v2Date: row.spark_date || row.spark_v2date_v1 || "",
    };
  }

  // 3. Get completion fields
  console.log("  Completion fields for all events...");
  const completionFields = ["record_id"];
  const relevantEvents = [];
  for (const vt of VISIT_TYPES) {
    relevantEvents.push(vt.eventName);
    for (const inst of vt.instruments) {
      completionFields.push(`${inst}_complete`);
    }
  }

  const completionData = await fetchRecords(SPARK_TOKEN, {
    records: v1RecordIds,
    fields: [...new Set(completionFields)],
    events: relevantEvents,
  });

  const completionMap = {};
  for (const row of completionData) {
    const rid = row.record_id;
    const event = row.redcap_event_name;
    if (!rid || !event) continue;
    if (!completionMap[rid]) completionMap[rid] = {};
    completionMap[rid][event] = row;
  }

  // 4. Get contacts
  console.log("  Contact info from Recruitment project...");
  const subIds = Object.values(participantInfo).map(p => p.subId).filter(Boolean);
  const contactRecords = await fetchRecords(RECRUIT_TOKEN, {
    records: subIds,
    fields: ["sub_id", "email", "child_email", "ph_m", "child_phone", "ph_prefer_text"],
    events: ["subject_informatio_arm_1"],
  });

  const contacts = {};
  for (const r of contactRecords) {
    const id = r.sub_id;
    if (!id) continue;
    contacts[id.toLowerCase()] = {
      email: r.email || "", childEmail: r.child_email || "",
      phone: r.ph_m || "", childPhone: r.child_phone || "",
      preferText: r.ph_prefer_text || "",
    };
  }

  // 5. Build participant objects
  console.log("  Building participant data...");
  const participants = [];

  for (const recordId of v1RecordIds) {
    const info = participantInfo[recordId];
    if (!info || !info.subId) continue;

    const contact = contacts[info.subId.toLowerCase()] || {
      email: "", childEmail: "", phone: "", childPhone: "", preferText: "",
    };

    const hasV2 = v2RecordIds.has(recordId);
    const visits = {};

    for (const vt of VISIT_TYPES) {
      if (vt.key !== "v1_child" && !hasV2 && !info.v2Date) continue;

      const eventData = completionMap[recordId]?.[vt.eventName] || {};
      const surveys = vt.instruments.map(inst => {
        const value = parseInt(eventData[`${inst}_complete`] || "0", 10);
        return {
          instrumentName: inst,
          label: INSTRUMENT_LABELS[inst] || inst,
          completionValue: value,
          isComplete: value === 2,
        };
      });

      const totalComplete = surveys.filter(s => s.isComplete).length;
      visits[vt.key] = {
        visitTypeKey: vt.key, label: vt.label, eventName: vt.eventName,
        surveys, totalComplete, totalSurveys: surveys.length,
        allComplete: totalComplete === surveys.length,
      };
    }

    participants.push({
      subId: info.subId, recordId, v1Date: info.v1Date || null, v2Date: info.v2Date || null,
      email: contact.email || info.email, childEmail: contact.childEmail,
      phone: contact.phone, childPhone: contact.childPhone, visits,
    });
  }

  participants.sort((a, b) => a.subId.localeCompare(b.subId));

  const totalParticipants = participants.length;
  const v1Complete = participants.filter(p => p.visits.v1_child?.allComplete).length;
  const v2Complete = participants.filter(p => p.visits.v2_child?.allComplete).length;

  const output = {
    participants,
    stats: {
      totalParticipants, v1Complete, v2Complete,
      overallCompletionPercent: totalParticipants > 0 ? Math.round((v1Complete / totalParticipants) * 100) : 0,
    },
    fetchedAt: new Date().toISOString(),
  };

  // Write to public directory so it's served as a static file
  const outPath = path.join(__dirname, "..", "public", "data", "participants.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(output));

  console.log(`\nDone! ${participants.length} participants written to public/data/participants.json`);
  console.log(`  V1 complete: ${v1Complete}/${totalParticipants}`);
  console.log(`  V2 complete: ${v2Complete}/${totalParticipants}`);
  console.log(`  File size: ${(fs.statSync(outPath).size / 1024).toFixed(0)} KB`);
}

main().catch(err => { console.error("FATAL:", err); process.exit(1); });
