// Activity Tracking Helper - Simplified for TalentPulse
// Note: Activity tracking is optional, returns default values if table doesn't exist

import { SupabaseClient } from "@supabase/supabase-js";

export interface ActivityStats {
    currentStreak: number;
    longestStreak: number;
    totalDays: number;
    lastActive: string | null;
}

// Record user activity (no-op in current schema - can be enhanced later)
export async function recordActivity(_supabase: SupabaseClient, _userId: string): Promise<void> {
    // Activity tracking not implemented in current TalentPulse schema
    // This is a placeholder for future enhancement
    return;
}

// Get activity stats (returns defaults - can be enhanced later)
export async function getActivityStats(_supabase: SupabaseClient, _userId: string): Promise<ActivityStats> {
    // Activity tracking not implemented in current TalentPulse schema
    // Return default values
    return {
        currentStreak: 0,
        longestStreak: 0,
        totalDays: 0,
        lastActive: null,
    };
}
