const REDCAP_API_URL = process.env.REDCAP_API_URL!;
const SPARK_TOKEN = process.env.REDCAP_SPARK_TOKEN!;
const RECRUIT_TOKEN = process.env.REDCAP_RECRUIT_TOKEN!;

// In-memory cache (works on Vercel serverless + local dev)
const memCache: Record<string, { data: string; fetchedAt: number }> = {};
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];

  const parseRow = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === "," && !inQuotes) {
        result.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
    result.push(current);
    return result;
  };

  const headers = parseRow(lines[0]);
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const values = parseRow(lines[i]);
    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j] ?? "";
    }
    rows.push(row);
  }
  return rows;
}

async function redcapPost(
  token: string,
  params: Record<string, string>
): Promise<string> {
  const body = new URLSearchParams({ token, ...params });
  const res = await fetch(REDCAP_API_URL, {
    method: "POST",
    body,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  if (!res.ok) {
    throw new Error(`REDCap API error: ${res.status} ${await res.text()}`);
  }
  return res.text();
}

export async function fetchReport(
  reportId: string,
  forceRefresh = false
): Promise<Record<string, string>[]> {
  const cacheKey = `report_${reportId}`;

  if (!forceRefresh && memCache[cacheKey]) {
    const cached = memCache[cacheKey];
    if (Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
      return JSON.parse(cached.data);
    }
  }

  const csv = await redcapPost(SPARK_TOKEN, {
    content: "report",
    format: "csv",
    report_id: reportId,
    rawOrLabel: "raw",
    rawOrLabelHeaders: "raw",
  });

  const data = parseCSV(csv);
  memCache[cacheKey] = { data: JSON.stringify(data), fetchedAt: Date.now() };

  return data;
}

export async function fetchRecords(
  token: string,
  params: {
    records?: string[];
    fields?: string[];
    events?: string[];
    forms?: string[];
    filterLogic?: string;
  }
): Promise<Record<string, string>[]> {
  const payload: Record<string, string> = {
    content: "record",
    format: "json",
  };

  if (params.records) {
    params.records.forEach((r, i) => (payload[`records[${i}]`] = r));
  }
  if (params.fields) {
    params.fields.forEach((f, i) => (payload[`fields[${i}]`] = f));
  }
  if (params.events) {
    params.events.forEach((e, i) => (payload[`events[${i}]`] = e));
  }
  if (params.forms) {
    params.forms.forEach((f, i) => (payload[`forms[${i}]`] = f));
  }
  if (params.filterLogic) {
    payload["filterLogic"] = params.filterLogic;
  }

  const text = await redcapPost(token, payload);
  return JSON.parse(text);
}

export async function fetchSparkRecords(params: {
  records?: string[];
  fields?: string[];
  events?: string[];
  forms?: string[];
}): Promise<Record<string, string>[]> {
  return fetchRecords(SPARK_TOKEN, params);
}

export async function fetchSurveyLink(
  recordId: string,
  eventName: string,
  instrument: string
): Promise<string | null> {
  try {
    const text = await redcapPost(SPARK_TOKEN, {
      content: "surveyLink",
      format: "json",
      record: recordId,
      event: eventName,
      instrument,
    });
    const trimmed = text.trim();
    return trimmed.startsWith("http") ? trimmed : null;
  } catch {
    return null;
  }
}

export async function fetchContacts(
  subIds: string[]
): Promise<
  Record<string, { email: string; childEmail: string; phone: string; childPhone: string; preferText: string }>
> {
  if (subIds.length === 0) return {};

  const records = await fetchRecords(RECRUIT_TOKEN, {
    records: subIds,
    fields: [
      "sub_id",
      "email",
      "child_email",
      "ph_m",
      "child_phone",
      "ph_prefer_text",
    ],
    events: ["subject_informatio_arm_1"],
  });

  const contacts: Record<
    string,
    { email: string; childEmail: string; phone: string; childPhone: string; preferText: string }
  > = {};

  for (const r of records) {
    const id = r.sub_id;
    if (!id) continue;
    contacts[id.toLowerCase()] = {
      email: r.email || "",
      childEmail: r.child_email || "",
      phone: r.ph_m || "",
      childPhone: r.child_phone || "",
      preferText: r.ph_prefer_text || "",
    };
  }

  return contacts;
}

export function clearCache() {
  for (const key of Object.keys(memCache)) {
    delete memCache[key];
  }
}
