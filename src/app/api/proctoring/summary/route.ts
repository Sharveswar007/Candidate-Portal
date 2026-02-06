// Proctoring Summary API - Get integrity score and event summary
// Used by Decision Engine in Stage-5

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: integrityData } = await (supabase
      .from("integrity_scores") as any)
      .select("*")
      .eq("attempt_id", attemptId)
      .single();

    // Get event counts by type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: events } = await (supabase
      .from("proctor_events") as any)
      .select("event_type, event_category, severity")
      .eq("attempt_id", attemptId) as { data: Array<{ event_type: string; event_category: string; severity: string }> | null };

    // Calculate event statistics
    const eventStats = {
      total: events?.length || 0,
      by_category: {
        webcam: events?.filter(e => e.event_category === "webcam").length || 0,
        browser: events?.filter(e => e.event_category === "browser").length || 0,
        clipboard: events?.filter(e => e.event_category === "clipboard").length || 0,
        keyboard: events?.filter(e => e.event_category === "keyboard").length || 0,
        system: events?.filter(e => e.event_category === "system").length || 0,
      },
      by_severity: {
        low: events?.filter(e => e.severity === "low").length || 0,
        medium: events?.filter(e => e.severity === "medium").length || 0,
        high: events?.filter(e => e.severity === "high").length || 0,
        critical: events?.filter(e => e.severity === "critical").length || 0,
      },
      by_type: events?.reduce((acc: Record<string, number>, e) => {
        acc[e.event_type] = (acc[e.event_type] || 0) + 1;
        return acc;
      }, {}) || {},
    };

    // Calculate risk factors
    const riskFactors: string[] = [];
    
    if ((eventStats.by_type["MULTI_FACE"] || 0) > 0) {
      riskFactors.push("Multiple faces detected during session");
    }
    if ((eventStats.by_type["NO_FACE"] || 0) > 5) {
      riskFactors.push("Frequent face absences detected");
    }
    if ((eventStats.by_type["TAB_SWITCH"] || 0) > 3) {
      riskFactors.push("Multiple tab switches detected");
    }
    if ((eventStats.by_type["PASTE"] || 0) > 2) {
      riskFactors.push("Multiple paste actions detected");
    }
    if ((eventStats.by_type["DEVTOOLS_ATTEMPT"] || 0) > 0) {
      riskFactors.push("Attempted to access developer tools");
    }
    if (eventStats.by_category.webcam === 0 && !integrityData) {
      riskFactors.push("No webcam monitoring data");
    }

    // Determine overall risk level
    const integrityScore = integrityData?.integrity_score ?? 100;
    let riskLevel: string;
    if (integrityScore >= 80) riskLevel = "low";
    else if (integrityScore >= 60) riskLevel = "medium";
    else if (integrityScore >= 40) riskLevel = "high";
    else riskLevel = "critical";

    // Build summary for Decision Engine
    const summary = {
      attempt_id: attemptId,
      integrity_score: integrityScore,
      risk_level: riskLevel,
      risk_factors: riskFactors,
      event_stats: eventStats,
      deductions: integrityData?.deductions || {},
      
      // Specific counts for scoring
      violation_counts: {
        no_face: eventStats.by_type["NO_FACE"] || 0,
        multi_face: eventStats.by_type["MULTI_FACE"] || 0,
        tab_switch: eventStats.by_type["TAB_SWITCH"] || 0,
        window_blur: eventStats.by_type["WINDOW_BLUR"] || 0,
        copy: eventStats.by_type["COPY"] || 0,
        paste: eventStats.by_type["PASTE"] || 0,
        shortcuts: eventStats.by_type["SHORTCUT_USED"] || 0,
        devtools: eventStats.by_type["DEVTOOLS_ATTEMPT"] || 0,
      },

      // Flags for decision engine
      flags: {
        webcam_active: eventStats.by_category.webcam > 0 || (eventStats.by_type["SESSION_START"] || 0) > 0,
        had_critical_event: eventStats.by_severity.critical > 0,
        excessive_violations: eventStats.total > 20,
        suspected_cheating: riskLevel === "critical" || (eventStats.by_type["MULTI_FACE"] || 0) > 0,
      },

      // Timestamps
      created_at: integrityData?.created_at,
      updated_at: integrityData?.updated_at,
    };

    return NextResponse.json(summary);

  } catch (error) {
    console.error("Get proctoring summary error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST endpoint to finalize proctoring session
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { attemptId, action } = body;

    if (!attemptId) {
      return NextResponse.json({ error: "attemptId required" }, { status: 400 });
    }

    if (action === "finalize") {
      // Calculate final integrity score from all events
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: events } = await (supabase
        .from("proctor_events") as any)
        .select("event_type")
        .eq("attempt_id", attemptId) as { data: Array<{ event_type: string }> | null };

      // Deduction mapping
      const deductions: Record<string, number> = {
        NO_FACE: 2,
        MULTI_FACE: 15,
        FACE_LOST: 3,
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

      let totalDeduction = 0;
      const eventCounts: Record<string, number> = {};
      const deductionBreakdown: Record<string, number> = {};

      for (const event of events || []) {
        const deduction = deductions[event.event_type] || 0;
        totalDeduction += deduction;
        eventCounts[event.event_type] = (eventCounts[event.event_type] || 0) + 1;
        
        if (deduction > 0) {
          deductionBreakdown[event.event_type] = (deductionBreakdown[event.event_type] || 0) - deduction;
        }
      }

      const finalScore = Math.max(0, 100 - totalDeduction);
      const riskLevel = finalScore >= 80 ? "low" : finalScore >= 60 ? "medium" : finalScore >= 40 ? "high" : "critical";

      // Upsert final score
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from("integrity_scores") as any).upsert({
        attempt_id: attemptId,
        candidate_id: user.id,
        integrity_score: finalScore,
        total_events: events?.length || 0,
        no_face_count: eventCounts["NO_FACE"] || 0,
        multi_face_count: eventCounts["MULTI_FACE"] || 0,
        tab_switch_count: eventCounts["TAB_SWITCH"] || 0,
        copy_paste_count: (eventCounts["COPY"] || 0) + (eventCounts["PASTE"] || 0),
        shortcut_count: eventCounts["SHORTCUT_USED"] || 0,
        deductions: deductionBreakdown,
        risk_level: riskLevel,
        finalized_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: "attempt_id" });

      return NextResponse.json({
        success: true,
        integrity_score: finalScore,
        risk_level: riskLevel,
        total_events: events?.length || 0,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  } catch (error) {
    console.error("Finalize proctoring error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
