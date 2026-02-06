// =====================================================
// TalentPulse - Stage-5 Decision Override API
// Recruiter override with mandatory reason
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

type Decision = 'hire' | 'no_hire' | 'maybe' | 'manual_review';

interface OverrideRequest {
  decision_id: string;
  new_decision: Decision;
  override_reason: string;
  notes?: string;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body: OverrideRequest = await request.json();

    // Validate required fields
    if (!body.decision_id || !body.new_decision || !body.override_reason) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: decision_id, new_decision, override_reason' },
        { status: 400 }
      );
    }

    // Validate override reason length (minimum 10 characters)
    if (body.override_reason.length < 10) {
      return NextResponse.json(
        { success: false, error: 'Override reason must be at least 10 characters' },
        { status: 400 }
      );
    }

    // Validate decision value
    const validDecisions: Decision[] = ['hire', 'no_hire', 'maybe', 'manual_review'];
    if (!validDecisions.includes(body.new_decision)) {
      return NextResponse.json(
        { success: false, error: 'Invalid decision value' },
        { status: 400 }
      );
    }

    // Get current user (recruiter)
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - must be logged in' },
        { status: 401 }
      );
    }

    // Verify user is recruiter or admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, full_name')
      .eq('id', user.id)
      .single();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const profileData = profile as any;
    if (!profileData || !['recruiter', 'admin'].includes(profileData.role)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden - recruiter or admin access required' },
        { status: 403 }
      );
    }

    // Fetch the original decision
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: originalDecision, error: fetchError } = await (supabase.from('hiring_decisions') as any)
      .select('*')
      .eq('id', body.decision_id)
      .single();

    if (fetchError || !originalDecision) {
      return NextResponse.json(
        { success: false, error: 'Decision not found' },
        { status: 404 }
      );
    }

    // Don't allow override to the same decision
    const currentDecision = originalDecision.current_decision || originalDecision.decision;
    if (currentDecision === body.new_decision) {
      return NextResponse.json(
        { success: false, error: 'New decision must be different from current decision' },
        { status: 400 }
      );
    }

    // Create override record
    const overrideRecord = {
      decision_id: body.decision_id,
      recruiter_id: user.id,
      recruiter_name: profileData.full_name || user.email,
      previous_decision: currentDecision,
      new_decision: body.new_decision,
      override_reason: body.override_reason,
      notes: body.notes || null,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: override, error: overrideError } = await (supabase.from('decision_overrides') as any)
      .insert(overrideRecord)
      .select()
      .single();

    if (overrideError) {
      console.error('Override insert error:', overrideError);
      return NextResponse.json(
        { success: false, error: 'Failed to create override record' },
        { status: 500 }
      );
    }

    // Update the hiring decision
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: updatedDecision, error: updateError } = await (supabase.from('hiring_decisions') as any)
      .update({
        is_overridden: true,
        current_decision: body.new_decision,
        status: 'overridden',
        updated_at: new Date().toISOString(),
      })
      .eq('id', body.decision_id)
      .select()
      .single();

    if (updateError) {
      console.error('Decision update error:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to update decision' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      override,
      updated_decision: updatedDecision,
      message: `Decision overridden from ${currentDecision} to ${body.new_decision}`,
    });
  } catch (error) {
    console.error('Override error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Get override history for a decision
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    
    const decision_id = searchParams.get('decision_id');

    if (!decision_id) {
      return NextResponse.json(
        { success: false, error: 'Missing decision_id parameter' },
        { status: 400 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: overrides, error } = await (supabase.from('decision_overrides') as any)
      .select('*')
      .eq('decision_id', decision_id)
      .order('overridden_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch overrides' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      overrides,
    });
  } catch (error) {
    console.error('Fetch overrides error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
