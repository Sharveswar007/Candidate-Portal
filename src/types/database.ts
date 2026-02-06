// Database Types for HIRENEX - Multi-Modal Assessment Engine
// Strict types for Supabase queries

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          full_name: string | null;
          avatar_url: string | null;
          phone: string | null;
          location: string | null;
          current_education: string | null;
          onboarding_complete: boolean;
          updated_at: string | null;
          job_title: string | null;
          years_experience: number | null;
          industry: string | null;
          skills: Json | null;
          linkedin_url: string | null;
          role: string | null;
        };
        Insert: {
          id: string;
          email?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          phone?: string | null;
          location?: string | null;
          current_education?: string | null;
          onboarding_complete?: boolean;
          updated_at?: string | null;
          job_title?: string | null;
          years_experience?: number | null;
          industry?: string | null;
          skills?: Json | null;
          linkedin_url?: string | null;
          role?: string | null;
        };
        Update: {
          id?: string;
          email?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          phone?: string | null;
          location?: string | null;
          current_education?: string | null;
          onboarding_complete?: boolean;
          updated_at?: string | null;
          job_title?: string | null;
          years_experience?: number | null;
          industry?: string | null;
          skills?: Json | null;
          linkedin_url?: string | null;
          role?: string | null;
        };
      };
      applications: {
        Row: {
          id: string;
          candidate_id: string;
          job_id: string;
          status: string;
          resume_id: string | null;
          cover_letter: string | null;
          match_score: number | null;
          match_category: string | null;
          recruiter_notes: string | null;
          final_decision: string | null;
          decision_rationale: string | null;
          created_at: string;
          updated_at: string | null;
          resume_uploaded: boolean | null;
          resume_score: number | null;
          skills_extracted: Json | null;
          resume_analyzed_at: string | null;
          eligibility_score: number | null;
          is_eligible: boolean | null;
          eligibility_checked_at: string | null;
          job_assessment_id: string | null;
          assessment_started_at: string | null;
          assessment_completed_at: string | null;
          mcq_score: number | null;
          coding_score: number | null;
          psychometric_score: number | null;
          composite_score: number | null;
          current_stage: string | null;
          decision: string | null;
          hr_notes: string | null;
          decided_by: string | null;
          decided_at: string | null;
          resume_file_url: string | null;
        };
        Insert: {
          id?: string;
          candidate_id: string;
          job_id: string;
          status?: string;
          resume_id?: string | null;
          cover_letter?: string | null;
          match_score?: number | null;
          match_category?: string | null;
          recruiter_notes?: string | null;
          final_decision?: string | null;
          decision_rationale?: string | null;
          created_at?: string;
          updated_at?: string | null;
          resume_uploaded?: boolean | null;
          resume_score?: number | null;
          skills_extracted?: Json | null;
          resume_analyzed_at?: string | null;
          eligibility_score?: number | null;
          is_eligible?: boolean | null;
          eligibility_checked_at?: string | null;
          job_assessment_id?: string | null;
          assessment_started_at?: string | null;
          assessment_completed_at?: string | null;
          mcq_score?: number | null;
          coding_score?: number | null;
          psychometric_score?: number | null;
          composite_score?: number | null;
          current_stage?: string | null;
          decision?: string | null;
          hr_notes?: string | null;
          decided_by?: string | null;
          decided_at?: string | null;
          resume_file_url?: string | null;
        };
        Update: {
          id?: string;
          candidate_id?: string;
          job_id?: string;
          status?: string;
          resume_id?: string | null;
          cover_letter?: string | null;
          match_score?: number | null;
          match_category?: string | null;
          recruiter_notes?: string | null;
          final_decision?: string | null;
          decision_rationale?: string | null;
          created_at?: string;
          updated_at?: string | null;
          resume_uploaded?: boolean | null;
          resume_score?: number | null;
          skills_extracted?: Json | null;
          resume_analyzed_at?: string | null;
          eligibility_score?: number | null;
          is_eligible?: boolean | null;
          eligibility_checked_at?: string | null;
          job_assessment_id?: string | null;
          assessment_started_at?: string | null;
          assessment_completed_at?: string | null;
          mcq_score?: number | null;
          coding_score?: number | null;
          psychometric_score?: number | null;
          composite_score?: number | null;
          current_stage?: string | null;
          decision?: string | null;
          hr_notes?: string | null;
          decided_by?: string | null;
          decided_at?: string | null;
          resume_file_url?: string | null;
        };
      };
      job_descriptions: {
        Row: {
          id: string;
          recruiter_id: string | null;
          title: string;
          department: string | null;
          location: string | null;
          employment_type: string | null;
          experience_min: number | null;
          experience_max: number | null;
          salary_min: number | null;
          salary_max: number | null;
          description: string;
          requirements: Json | null;
          skills_required: Json | null;
          responsibilities: Json | null;
          status: string | null;
          created_at: string;
          updated_at: string | null;
          company_name: string | null;
          criteria: Json | null;
          work_mode: string | null;
          seniority_level: string | null;
          experience_range: string | null;
          skills_config: Json | null;
          role_focus: string | null;
          weights_config: Json | null;
          psychometric_config: Json | null;
          cutoffs_config: Json | null;
          assessment_config: Json | null;
        };
        Insert: {
          id?: string;
          recruiter_id?: string | null;
          title: string;
          department?: string | null;
          location?: string | null;
          employment_type?: string | null;
          experience_min?: number | null;
          experience_max?: number | null;
          salary_min?: number | null;
          salary_max?: number | null;
          description: string;
          requirements?: Json | null;
          skills_required?: Json | null;
          responsibilities?: Json | null;
          status?: string | null;
          created_at?: string;
          updated_at?: string | null;
          company_name?: string | null;
          criteria?: Json | null;
          work_mode?: string | null;
          seniority_level?: string | null;
          experience_range?: string | null;
          skills_config?: Json | null;
          role_focus?: string | null;
          weights_config?: Json | null;
          psychometric_config?: Json | null;
          cutoffs_config?: Json | null;
          assessment_config?: Json | null;
        };
        Update: {
          id?: string;
          recruiter_id?: string | null;
          title?: string;
          department?: string | null;
          location?: string | null;
          employment_type?: string | null;
          experience_min?: number | null;
          experience_max?: number | null;
          salary_min?: number | null;
          salary_max?: number | null;
          description?: string;
          requirements?: Json | null;
          skills_required?: Json | null;
          responsibilities?: Json | null;
          status?: string | null;
          created_at?: string;
          updated_at?: string | null;
          company_name?: string | null;
          criteria?: Json | null;
          work_mode?: string | null;
          seniority_level?: string | null;
          experience_range?: string | null;
          skills_config?: Json | null;
          role_focus?: string | null;
          weights_config?: Json | null;
          psychometric_config?: Json | null;
          cutoffs_config?: Json | null;
          assessment_config?: Json | null;
        };
      };
      job_assessments: {
        Row: {
          id: string;
          job_id: string;
          is_generated: boolean;
          difficulty: string | null;
          duration_minutes: number | null;
          webcam_required: boolean | null;
          mcq_questions: Json | null;
          coding_challenges: Json | null;
          psychometric_questions: Json | null;
          generated_at: string | null;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          job_id: string;
          is_generated?: boolean;
          difficulty?: string | null;
          duration_minutes?: number | null;
          webcam_required?: boolean | null;
          mcq_questions?: Json | null;
          coding_challenges?: Json | null;
          psychometric_questions?: Json | null;
          generated_at?: string | null;
          created_at?: string;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          job_id?: string;
          is_generated?: boolean;
          difficulty?: string | null;
          duration_minutes?: number | null;
          webcam_required?: boolean | null;
          mcq_questions?: Json | null;
          coding_challenges?: Json | null;
          psychometric_questions?: Json | null;
          generated_at?: string | null;
          created_at?: string;
          updated_at?: string | null;
        };
      };
      assessment_sessions: {
        Row: {
          id: string;
          user_id: string;
          session_type: 'full' | 'quick' | 'coding_only' | 'psychometric_only';
          status: 'in_progress' | 'completed' | 'abandoned';
          started_at: string;
          completed_at: string | null;
          total_score: number | null;
          breakdown_scores: Json | null;
          ai_evaluation: Json | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          session_type: 'full' | 'quick' | 'coding_only' | 'psychometric_only';
          status?: 'in_progress' | 'completed' | 'abandoned';
          started_at?: string;
          completed_at?: string | null;
          total_score?: number | null;
          breakdown_scores?: Json | null;
          ai_evaluation?: Json | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          session_type?: 'full' | 'quick' | 'coding_only' | 'psychometric_only';
          status?: 'in_progress' | 'completed' | 'abandoned';
          started_at?: string;
          completed_at?: string | null;
          total_score?: number | null;
          breakdown_scores?: Json | null;
          ai_evaluation?: Json | null;
        };
      };
      psychometric_profiles: {
        Row: {
          id: string;
          user_id: string;
          session_id: string | null;
          openness_score: number | null;
          conscientiousness_score: number | null;
          extraversion_score: number | null;
          agreeableness_score: number | null;
          neuroticism_score: number | null;
          leadership_score: number | null;
          problem_solving_score: number | null;
          adaptability_score: number | null;
          teamwork_score: number | null;
          profile_summary: string | null;
          recommendations: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          session_id?: string | null;
          openness_score?: number | null;
          conscientiousness_score?: number | null;
          extraversion_score?: number | null;
          agreeableness_score?: number | null;
          neuroticism_score?: number | null;
          leadership_score?: number | null;
          problem_solving_score?: number | null;
          adaptability_score?: number | null;
          teamwork_score?: number | null;
          profile_summary?: string | null;
          recommendations?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          session_id?: string | null;
          openness_score?: number | null;
          conscientiousness_score?: number | null;
          extraversion_score?: number | null;
          agreeableness_score?: number | null;
          neuroticism_score?: number | null;
          leadership_score?: number | null;
          problem_solving_score?: number | null;
          adaptability_score?: number | null;
          teamwork_score?: number | null;
          profile_summary?: string | null;
          recommendations?: Json | null;
          created_at?: string;
        };
      };
      career_selections: {
        Row: {
          id: string;
          user_id: string;
          career_name: string;
          is_custom: boolean;
          selected_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          career_name: string;
          is_custom?: boolean;
          selected_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          career_name?: string;
          is_custom?: boolean;
          selected_at?: string;
        };
      };
      user_assessments: {
        Row: {
          id: string;
          user_id: string;
          selected_career: string;
          career_questions: Json;
          logic_questions: Json;
          total_score: number | null;
          career_score: number | null;
          logic_score: number | null;
          completed_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          selected_career: string;
          career_questions: Json;
          logic_questions: Json;
          total_score?: number | null;
          career_score?: number | null;
          logic_score?: number | null;
          completed_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          selected_career?: string;
          career_questions?: Json;
          logic_questions?: Json;
          total_score?: number | null;
          career_score?: number | null;
          logic_score?: number | null;
          completed_at?: string;
        };
      };
      skills_gap_analysis: {
        Row: {
          id: string;
          user_id: string;
          assessment_id: string | null;
          target_career: string;
          readiness_score: number | null;
          gap_analysis: string | null;
          strengths: Json | null;
          weaknesses: Json | null;
          roadmap: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          assessment_id?: string | null;
          target_career: string;
          readiness_score?: number | null;
          gap_analysis?: string | null;
          strengths?: Json | null;
          weaknesses?: Json | null;
          roadmap?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          assessment_id?: string | null;
          target_career?: string;
          readiness_score?: number | null;
          gap_analysis?: string | null;
          strengths?: Json | null;
          weaknesses?: Json | null;
          roadmap?: Json | null;
          created_at?: string;
        };
      };
      coding_challenges: {
        Row: {
          id: string;
          user_id: string | null;
          title: string;
          description: string;
          difficulty: string;
          category: string;
          starter_code: Json | null;
          test_cases: Json | null;
          is_recommended: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          title: string;
          description: string;
          difficulty: string;
          category: string;
          starter_code?: Json | null;
          test_cases?: Json | null;
          is_recommended?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          title?: string;
          description?: string;
          difficulty?: string;
          category?: string;
          starter_code?: Json | null;
          test_cases?: Json | null;
          is_recommended?: boolean;
          created_at?: string;
        };
      };
      coding_submissions: {
        Row: {
          id: string;
          user_id: string;
          challenge_id: string;
          code: string;
          language: string;
          status: string;
          test_results: Json | null;
          execution_time: number | null;
          memory_used: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          challenge_id: string;
          code: string;
          language: string;
          status?: string;
          test_results?: Json | null;
          execution_time?: number | null;
          memory_used?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          challenge_id?: string;
          code?: string;
          language?: string;
          status?: string;
          test_results?: Json | null;
          execution_time?: number | null;
          memory_used?: number | null;
          created_at?: string;
        };
      };
      resume_analyses: {
        Row: {
          id: string;
          user_id: string;
          file_name: string;
          file_url: string | null;
          analysis_result: Json;
          ats_score: number | null;
          suggestions: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          file_name: string;
          file_url?: string | null;
          analysis_result: Json;
          ats_score?: number | null;
          suggestions?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          file_name?: string;
          file_url?: string | null;
          analysis_result?: Json;
          ats_score?: number | null;
          suggestions?: Json | null;
          created_at?: string;
        };
      };
      chat_history: {
        Row: {
          id: string;
          user_id: string;
          messages: Json;
          context: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          messages: Json;
          context?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          messages?: Json;
          context?: Json | null;
          created_at?: string;
        };
      };
      user_activity: {
        Row: {
          id: string;
          user_id: string;
          activity_date: string;
          activity_type: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          activity_date?: string;
          activity_type?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          activity_date?: string;
          activity_type?: string;
          created_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

// Helper types for easier table access (from Supabase docs)
type PublicSchema = Database[Extract<keyof Database, "public">];

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
      PublicSchema["Views"])
  ? (PublicSchema["Tables"] &
      PublicSchema["Views"])[PublicTableNameOrOptions] extends {
      Row: infer R;
    }
    ? R
    : never
  : never;

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
  ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
      Insert: infer I;
    }
    ? I
    : never
  : never;

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
  ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
      Update: infer U;
    }
    ? U
    : never
  : never;
