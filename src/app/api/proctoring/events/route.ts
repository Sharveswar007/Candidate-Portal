// Proctoring Events API - Receives and stores proctor events
// Endpoint: POST /api/proctoring/events

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// Event severity mapping
const EVENT_SEVERITY: Record<string, string> = {
  // Webcam - higher severity
  NO_FACE: "medium",
  MULTI_FACE: "critical",
  FACE_LOST: "medium",
  FACE_SIZE_CHANGE: "low",
  RAPID_MOVEMENT: "low",
  LOOKING_AWAY: "medium",
  // Hand detection
  HAND_DETECTED: "low",
  HAND_COVERING_FACE: "high",
  PHONE_GESTURE: "critical",
  // Browser
  TAB_SWITCH: "high",
  WINDOW_BLUR: "medium",
  WINDOW_FOCUS: "low",
  FULLSCREEN_EXIT: "medium",
  // Clipboard
  COPY: "medium",
  PASTE: "high",
  CUT: "medium",
  // Keyboard
  SHORTCUT_USED: "medium",
  DEVTOOLS_ATTEMPT: "critical",
  // System
  SESSION_START: "low",
  SESSION_END: "low",
  WEBCAM_DENIED: "high",
  WEBCAM_ERROR: "medium",
};

// Event category mapping
const EVENT_CATEGORY: Record<string, string> = {
  NO_FACE: "webcam",
  MULTI_FACE: "webcam",
  FACE_LOST: "webcam",
  FACE_SIZE_CHANGE: "webcam",
  RAPID_MOVEMENT: "webcam",
  LOOKING_AWAY: "webcam",
  HAND_DETECTED: "hand",
  HAND_COVERING_FACE: "hand",
  PHONE_GESTURE: "hand",
  TAB_SWITCH: "browser",
  WINDOW_BLUR: "browser",
  WINDOW_FOCUS: "browser",
  FULLSCREEN_EXIT: "browser",
  COPY: "clipboard",
  PASTE: "clipboard",
  CUT: "clipboard",
  SHORTCUT_USED: "keyboard",
  DEVTOOLS_ATTEMPT: "keyboard",
  SESSION_START: "system",
  SESSION_END: "system",
  WEBCAM_DENIED: "system",
  WEBCAM_ERROR: "system",
};

// Score deductions per event type
const SCORE_DEDUCTIONS: Record<string, number> = {
  NO_FACE: 2,
  MULTI_FACE: 15,
  FACE_LOST: 3,
  LOOKING_AWAY: 3,
  HAND_DETECTED: 1,
  HAND_COVERING_FACE: 8,
  PHONE_GESTURE: 15,
  TAB_SWITCH: 5,
  WINDOW_BLUR: 3,
  FULLSCREEN_EXIT: 5,
  COPY: 3,
  PASTE: 5,
  CUT: 3,
  SHORTCUT_USED: 2,
  DEVTOOLS_ATTEMPT: 20,
  WEBCAM_DENIED: 10,
};

interface ProctorEvent {
  event_type: string;
  client_timestamp: string;
  meta?: Record<string, any>;
  question_index?: number;
  elapsed_seconds?: number;
  description?: string;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { attemptId, sessionId, events } = body as {
      attemptId: string;
      sessionId?: string;
      events: ProctorEvent[];
    };

    if (!attemptId || !events || !Array.isArray(events)) {
      return NextResponse.json(
        { error: "attemptId and events[] are required" },
        { status: 400 }
      );
    }

    // Process and insert events
    const processedEvents = events.map(event => ({
      attempt_id: attemptId,
      candidate_id: user.id,
      session_id: sessionId || null,
      event_type: event.event_type,
      event_category: EVENT_CATEGORY[event.event_type] || "system",
      severity: EVENT_SEVERITY[event.event_type] || "low",
      description: event.description || null,
      meta: event.meta || {},
      client_timestamp: event.client_timestamp,
      question_index: event.question_index || null,
      elapsed_seconds: event.elapsed_seconds || null,
    }));

    // Batch insert events
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: insertError } = await (supabase.from("proctor_events") as any)
      .insert(processedEvents);

    if (insertError) {
      console.error("Failed to insert proctor events:", insertError);
      return NextResponse.json(
        { error: "Failed to log events" },
        { status: 500 }
      );
    }

    // Update proctor_sessions state
    const hasStart = events.some(e => e.event_type === 'SESSION_START');
    const hasEnd = events.some(e => e.event_type === 'SESSION_END');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sessionUpdate: any = {
      last_heartbeat: new Date().toISOString(),
      attempt_id: attemptId,
      candidate_id: user.id,
      session_id: sessionId || null
    };

    if (hasStart) {
      sessionUpdate.status = 'active';
      sessionUpdate.started_at = new Date().toISOString();
      // Reset end time if restarting
      sessionUpdate.ended_at = null;
    }
    if (hasEnd) {
      sessionUpdate.status = 'completed';
      sessionUpdate.ended_at = new Date().toISOString();
    }

    // Upsert session state
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("proctor_sessions") as any).upsert(sessionUpdate, {
      onConflict: 'attempt_id'
    });

    // Update integrity score
    await updateIntegrityScore(supabase, attemptId, user.id, sessionId, events);

    return NextResponse.json({
      success: true,
      logged: events.length,
    });

  } catch (error) {
    console.error("Proctoring API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function updateIntegrityScore(
  supabase: any,
  attemptId: string,
  candidateId: string,
  sessionId: string | undefined,
  newEvents: ProctorEvent[]
) {
  // Get or create integrity score record
  const { data: existing } = await supabase
    .from("integrity_scores")
    .select("*")
    .eq("attempt_id", attemptId)
    .single();

  // Calculate deductions from new events
  let totalDeduction = 0;
  const eventCounts: Record<string, number> = {};

  for (const event of newEvents) {
    const deduction = SCORE_DEDUCTIONS[event.event_type] || 0;
    totalDeduction += deduction;
    eventCounts[event.event_type] = (eventCounts[event.event_type] || 0) + 1;
  }

  if (existing) {
    // Update existing score
    const newScore = Math.max(0, existing.integrity_score - totalDeduction);
    const deductions = { ...existing.deductions };

    for (const [eventType, count] of Object.entries(eventCounts)) {
      const deduction = (SCORE_DEDUCTIONS[eventType] || 0) * count;
      deductions[eventType] = (deductions[eventType] || 0) - deduction;
    }

    await supabase
      .from("integrity_scores")
      .update({
        integrity_score: newScore,
        total_events: existing.total_events + newEvents.length,
        webcam_events: existing.webcam_events + newEvents.filter(e => EVENT_CATEGORY[e.event_type] === "webcam").length,
        browser_events: existing.browser_events + newEvents.filter(e => EVENT_CATEGORY[e.event_type] === "browser").length,
        clipboard_events: existing.clipboard_events + newEvents.filter(e => EVENT_CATEGORY[e.event_type] === "clipboard").length,
        keyboard_events: existing.keyboard_events + newEvents.filter(e => EVENT_CATEGORY[e.event_type] === "keyboard").length,
        no_face_count: existing.no_face_count + (eventCounts["NO_FACE"] || 0),
        multi_face_count: existing.multi_face_count + (eventCounts["MULTI_FACE"] || 0),
        tab_switch_count: existing.tab_switch_count + (eventCounts["TAB_SWITCH"] || 0),
        copy_paste_count: existing.copy_paste_count + (eventCounts["COPY"] || 0) + (eventCounts["PASTE"] || 0),
        shortcut_count: existing.shortcut_count + (eventCounts["SHORTCUT_USED"] || 0),
        deductions,
        risk_level: getRiskLevel(newScore),
        updated_at: new Date().toISOString(),
      })
      .eq("attempt_id", attemptId);
  } else {
    // Create new score record
    const initialScore = Math.max(0, 100 - totalDeduction);
    const deductions: Record<string, number> = {};

    for (const [eventType, count] of Object.entries(eventCounts)) {
      const deduction = (SCORE_DEDUCTIONS[eventType] || 0) * count;
      deductions[eventType] = -deduction;
    }

    await supabase
      .from("integrity_scores")
      .insert({
        attempt_id: attemptId,
        candidate_id: candidateId,
        session_id: sessionId || null,
        integrity_score: initialScore,
        total_events: newEvents.length,
        webcam_events: newEvents.filter(e => EVENT_CATEGORY[e.event_type] === "webcam").length,
        browser_events: newEvents.filter(e => EVENT_CATEGORY[e.event_type] === "browser").length,
        clipboard_events: newEvents.filter(e => EVENT_CATEGORY[e.event_type] === "clipboard").length,
        keyboard_events: newEvents.filter(e => EVENT_CATEGORY[e.event_type] === "keyboard").length,
        no_face_count: eventCounts["NO_FACE"] || 0,
        multi_face_count: eventCounts["MULTI_FACE"] || 0,
        tab_switch_count: eventCounts["TAB_SWITCH"] || 0,
        copy_paste_count: (eventCounts["COPY"] || 0) + (eventCounts["PASTE"] || 0),
        shortcut_count: eventCounts["SHORTCUT_USED"] || 0,
        deductions,
        risk_level: getRiskLevel(initialScore),
      });
  }
}

function getRiskLevel(score: number): string {
  if (score >= 80) return "low";
  if (score >= 60) return "medium";
  if (score >= 40) return "high";
  return "critical";
}

// GET endpoint to retrieve integrity score
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const attemptId = searchParams.get("attemptId");

    if (!attemptId) {
      return NextResponse.json({ error: "attemptId required" }, { status: 400 });
    }

    // Get integrity score
    const { data: score } = await supabase
      .from("integrity_scores")
      .select("*")
      .eq("attempt_id", attemptId)
      .single();

    // Get recent events
    const { data: events } = await supabase
      .from("proctor_events")
      .select("*")
      .eq("attempt_id", attemptId)
      .order("server_timestamp", { ascending: false })
      .limit(50);

    return NextResponse.json({
      score: score || { integrity_score: 100, risk_level: "low" },
      recentEvents: events || [],
    });

  } catch (error) {
    console.error("Get proctoring data error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
