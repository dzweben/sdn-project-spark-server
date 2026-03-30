import { NextResponse } from "next/server";
import { fetchSurveyLink } from "@/lib/redcap";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const recordId = url.searchParams.get("record");
  const event = url.searchParams.get("event");
  const instrument = url.searchParams.get("instrument");

  if (!recordId || !event || !instrument) {
    return NextResponse.json(
      { error: "Missing required parameters: record, event, instrument" },
      { status: 400 }
    );
  }

  try {
    const link = await fetchSurveyLink(recordId, event, instrument);
    return NextResponse.json({ link });
  } catch (error) {
    console.error("Error fetching survey link:", error);
    return NextResponse.json(
      { error: "Failed to fetch survey link" },
      { status: 500 }
    );
  }
}
