// =====================================================
// TalentPulse - Stage-5 Decision Stats API
// Dashboard statistics and analytics
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    
    const job_id = searchParams.get('job_id');

    // Build query
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase.from('hiring_decisions') as any)
      .select('*')
      .neq('status', 'pending');

    if (job_id) {
      query = query.eq('job_id', job_id);
    }

    const { data: decisions, error } = await query;

    if (error) {
      console.error('Stats fetch error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch statistics' },
        { status: 500 }
      );
    }

    const total = decisions?.length || 0;

    if (total === 0) {
      return NextResponse.json({
        success: true,
        stats: {
          total_candidates: 0,
          hired: 0,
          rejected: 0,
          maybe: 0,
          overridden: 0,
          avg_technical: 0,
          avg_psychometric: 0,
          avg_integrity: 0,
          avg_composite: 0,
          hire_rate: 0,
          override_rate: 0,
        },
        distribution: {
          decisions: {},
          resume_categories: {},
          roles: {},
        },
        trends: [],
      });
    }

    // Calculate statistics
    const hired = decisions.filter((d: { current_decision: string; decision: string }) => 
      (d.current_decision || d.decision) === 'hire'
    ).length;
    
    const rejected = decisions.filter((d: { current_decision: string; decision: string }) => 
      (d.current_decision || d.decision) === 'no_hire'
    ).length;
    
    const maybe = decisions.filter((d: { current_decision: string; decision: string }) => 
      (d.current_decision || d.decision) === 'maybe'
    ).length;
    
    const overridden = decisions.filter((d: { is_overridden: boolean }) => d.is_overridden).length;

    // Calculate averages
    const avgTechnical = decisions.reduce((sum: number, d: { technical_score: number }) => 
      sum + (d.technical_score || 0), 0
    ) / total;
    
    const avgPsychometric = decisions.reduce((sum: number, d: { psychometric_score: number }) => 
      sum + (d.psychometric_score || 0), 0
    ) / total;
    
    const avgIntegrity = decisions.reduce((sum: number, d: { integrity_score: number }) => 
      sum + (d.integrity_score || 0), 0
    ) / total;
    
    const avgComposite = decisions.reduce((sum: number, d: { composite_score: number }) => 
      sum + (d.composite_score || 0), 0
    ) / total;

    // Distribution by decision
    const decisionDist: Record<string, number> = {};
    decisions.forEach((d: { current_decision: string; decision: string }) => {
      const decision = d.current_decision || d.decision;
      decisionDist[decision] = (decisionDist[decision] || 0) + 1;
    });

    // Distribution by resume category
    const resumeDist: Record<string, number> = {};
    decisions.forEach((d: { resume_category: string }) => {
      const category = d.resume_category || 'Unknown';
      resumeDist[category] = (resumeDist[category] || 0) + 1;
    });

    // Distribution by role recommendation
    const roleDist: Record<string, number> = {};
    decisions.forEach((d: { recommended_role: string }) => {
      const role = d.recommended_role || 'General Track';
      roleDist[role] = (roleDist[role] || 0) + 1;
    });

    // Score distribution (buckets)
    const scoreBuckets = {
      '0-40': 0,
      '40-60': 0,
      '60-80': 0,
      '80-100': 0,
    };
    decisions.forEach((d: { composite_score: number }) => {
      const score = d.composite_score || 0;
      if (score < 40) scoreBuckets['0-40']++;
      else if (score < 60) scoreBuckets['40-60']++;
      else if (score < 80) scoreBuckets['60-80']++;
      else scoreBuckets['80-100']++;
    });

    // Top performers
    const topPerformers = [...decisions]
      .sort((a: { composite_score: number }, b: { composite_score: number }) => 
        (b.composite_score || 0) - (a.composite_score || 0)
      )
      .slice(0, 5)
      .map((d: { candidate_id: string; composite_score: number; current_decision: string; decision: string; recommended_role: string }) => ({
        candidate_id: d.candidate_id,
        composite_score: d.composite_score,
        decision: d.current_decision || d.decision,
        role: d.recommended_role,
      }));

    // Common weaknesses
    const weaknessCount: Record<string, number> = {};
    decisions.forEach((d: { weaknesses: Array<{ competency: string }> }) => {
      (d.weaknesses || []).forEach((w: { competency: string }) => {
        weaknessCount[w.competency] = (weaknessCount[w.competency] || 0) + 1;
      });
    });
    const commonWeaknesses = Object.entries(weaknessCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([competency, count]) => ({ competency, count }));

    // Common strengths
    const strengthCount: Record<string, number> = {};
    decisions.forEach((d: { strengths: Array<{ competency: string }> }) => {
      (d.strengths || []).forEach((s: { competency: string }) => {
        strengthCount[s.competency] = (strengthCount[s.competency] || 0) + 1;
      });
    });
    const commonStrengths = Object.entries(strengthCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([competency, count]) => ({ competency, count }));

    return NextResponse.json({
      success: true,
      stats: {
        total_candidates: total,
        hired,
        rejected,
        maybe,
        overridden,
        avg_technical: Math.round(avgTechnical * 10) / 10,
        avg_psychometric: Math.round(avgPsychometric * 10) / 10,
        avg_integrity: Math.round(avgIntegrity * 10) / 10,
        avg_composite: Math.round(avgComposite * 10) / 10,
        hire_rate: Math.round((hired / total) * 100),
        override_rate: Math.round((overridden / total) * 100),
      },
      distribution: {
        decisions: decisionDist,
        resume_categories: resumeDist,
        roles: roleDist,
        score_buckets: scoreBuckets,
      },
      insights: {
        top_performers: topPerformers,
        common_weaknesses: commonWeaknesses,
        common_strengths: commonStrengths,
      },
    });
  } catch (error) {
    console.error('Stats API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
