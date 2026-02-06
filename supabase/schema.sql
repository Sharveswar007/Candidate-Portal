-- =====================================================
-- TalentPulse - AI-Enabled HR Evaluation System
-- Complete Database Schema
-- =====================================================

-- =====================================================
-- CORE TABLES
-- =====================================================

-- Profiles (Users)
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade not null primary key,
  email text,
  full_name text,
  avatar_url text,
  role text default 'candidate' check (role in ('candidate', 'recruiter', 'admin')),
  phone text,
  location text,
  current_education text,
  college text,
  personal_email text,
  date_of_birth text,
  father_name text,
  mother_name text,
  father_email text,
  mother_email text,
  father_phone text,
  mother_phone text,
  faculty_advisor_name text,
  faculty_advisor_email text,
  tenth_marks text,
  twelfth_marks text,
  onboarding_complete boolean default false,
  updated_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.profiles enable row level security;

-- =====================================================
-- JOB MANAGEMENT
-- =====================================================

-- Job Descriptions (created by recruiters)
create table if not exists public.job_descriptions (
  id uuid default gen_random_uuid() primary key,
  recruiter_id uuid references auth.users(id) on delete set null,
  title text not null,
  department text,
  location text,
  employment_type text check (employment_type in ('full_time', 'part_time', 'contract', 'internship')),
  experience_min integer default 0,
  experience_max integer default 5,
  salary_min numeric,
  salary_max numeric,
  description text not null,
  requirements jsonb,
  skills_required jsonb,
  responsibilities jsonb,
  status text default 'draft' check (status in ('draft', 'active', 'paused', 'closed')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone
);

alter table public.job_descriptions enable row level security;

-- =====================================================
-- CANDIDATE APPLICATIONS
-- =====================================================

create table if not exists public.applications (
  id uuid default gen_random_uuid() primary key,
  candidate_id uuid references auth.users(id) on delete cascade not null,
  job_id uuid references public.job_descriptions(id) on delete cascade not null,
  status text default 'pending' check (status in ('pending', 'shortlisted', 'assessment', 'interview', 'offered', 'hired', 'rejected')),
  resume_id uuid,
  cover_letter text,
  match_score numeric,
  match_category text check (match_category in ('high_match', 'potential', 'reject')),
  recruiter_notes text,
  final_decision text check (final_decision in ('hire', 'no_hire', 'pending')),
  decision_rationale text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone
);

alter table public.applications enable row level security;

-- =====================================================
-- RESUME PARSING & ANALYSIS
-- =====================================================

create table if not exists public.resume_analyses (
  id uuid default gen_random_uuid() primary key,
  candidate_id uuid references auth.users(id) on delete cascade not null,
  file_name text not null,
  file_url text,
  raw_text text,
  parsed_data jsonb,
  skills_extracted jsonb,
  experience_years integer,
  education jsonb,
  work_history jsonb,
  ats_score integer,
  job_match_scores jsonb,
  suggestions jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.resume_analyses enable row level security;

-- =====================================================
-- ASSESSMENT SYSTEM
-- =====================================================

create table if not exists public.assessment_sessions (
  id uuid default gen_random_uuid() primary key,
  candidate_id uuid references auth.users(id) on delete cascade not null,
  application_id uuid,
  job_id uuid,
  session_type text not null check (session_type in ('full', 'technical_only', 'psychometric_only', 'coding_only')),
  status text not null default 'in_progress' check (status in ('not_started', 'in_progress', 'completed', 'abandoned', 'flagged')),
  started_at timestamp with time zone default timezone('utc'::text, now()) not null,
  completed_at timestamp with time zone,
  time_limit_minutes integer default 60,
  technical_score numeric,
  psychometric_score numeric,
  coding_score numeric,
  communication_score numeric,
  total_score numeric,
  ai_evaluation jsonb,
  strengths jsonb,
  weaknesses jsonb,
  recommendation text,
  recommendation_rationale text,
  proctoring_enabled boolean default true,
  proctoring_flags integer default 0,
  proctoring_log jsonb
);

alter table public.assessment_sessions enable row level security;

-- =====================================================
-- MCQ ASSESSMENTS
-- =====================================================

create table if not exists public.mcq_questions (
  id uuid default gen_random_uuid() primary key,
  job_id uuid,
  category text not null check (category in ('technical', 'situational', 'behavioral', 'domain')),
  difficulty text check (difficulty in ('easy', 'medium', 'hard')),
  scenario_text text,
  question_text text not null,
  options jsonb not null,
  correct_option_id text not null,
  explanation text,
  points integer default 10,
  time_limit_seconds integer default 120,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.mcq_questions enable row level security;

create table if not exists public.mcq_responses (
  id uuid default gen_random_uuid() primary key,
  session_id uuid references public.assessment_sessions(id) on delete cascade not null,
  candidate_id uuid references auth.users(id) on delete cascade not null,
  question_id uuid references public.mcq_questions(id) on delete cascade not null,
  selected_option_id text,
  is_correct boolean,
  points_earned integer default 0,
  time_taken_seconds integer,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.mcq_responses enable row level security;

-- =====================================================
-- CODING ASSESSMENTS
-- =====================================================

create table if not exists public.coding_challenges (
  id uuid default gen_random_uuid() primary key,
  job_id uuid,
  title text not null,
  description text not null,
  difficulty text not null check (difficulty in ('easy', 'medium', 'hard')),
  category text not null,
  starter_code jsonb,
  test_cases jsonb not null,
  constraints text,
  hints jsonb,
  time_limit_minutes integer default 30,
  max_points integer default 100,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.coding_challenges enable row level security;

create table if not exists public.coding_submissions (
  id uuid default gen_random_uuid() primary key,
  session_id uuid references public.assessment_sessions(id) on delete cascade,
  candidate_id uuid references auth.users(id) on delete cascade not null,
  challenge_id uuid references public.coding_challenges(id) on delete cascade not null,
  code text not null,
  language text not null,
  status text not null check (status in ('pending', 'running', 'passed', 'partial', 'failed', 'error', 'timeout')),
  test_results jsonb,
  tests_passed integer default 0,
  tests_total integer default 0,
  score numeric,
  execution_time_ms numeric,
  memory_used_kb numeric,
  ai_code_review jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.coding_submissions enable row level security;

-- =====================================================
-- TEXT-BASED RESPONSES
-- =====================================================

create table if not exists public.text_questions (
  id uuid default gen_random_uuid() primary key,
  job_id uuid,
  category text check (category in ('communication', 'problem_solving', 'leadership', 'teamwork', 'conflict_resolution')),
  question_text text not null,
  context text,
  min_words integer default 50,
  max_words integer default 500,
  time_limit_seconds integer default 300,
  evaluation_criteria jsonb,
  max_points integer default 100,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.text_questions enable row level security;

create table if not exists public.text_responses (
  id uuid default gen_random_uuid() primary key,
  session_id uuid references public.assessment_sessions(id) on delete cascade not null,
  candidate_id uuid references auth.users(id) on delete cascade not null,
  question_id uuid references public.text_questions(id) on delete cascade not null,
  response_text text not null,
  word_count integer,
  time_taken_seconds integer,
  communication_score integer,
  logic_score integer,
  relevance_score integer,
  creativity_score integer,
  total_score integer,
  ai_feedback text,
  ai_evaluation_details jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.text_responses enable row level security;

-- =====================================================
-- PSYCHOMETRIC ASSESSMENT
-- =====================================================

create table if not exists public.psychometric_questions (
  id uuid default gen_random_uuid() primary key,
  dimension text not null,
  question_text text not null,
  scale_min_label text default 'Strongly Disagree',
  scale_max_label text default 'Strongly Agree',
  reverse_scored boolean default false,
  category text check (category in ('personality', 'emotional_intelligence', 'leadership', 'teamwork', 'resilience', 'culture_fit')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.psychometric_questions enable row level security;

create table if not exists public.psychometric_responses (
  id uuid default gen_random_uuid() primary key,
  session_id uuid references public.assessment_sessions(id) on delete cascade not null,
  candidate_id uuid references auth.users(id) on delete cascade not null,
  question_id uuid references public.psychometric_questions(id) on delete cascade not null,
  slider_value integer not null check (slider_value >= 0 and slider_value <= 100),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.psychometric_responses enable row level security;

create table if not exists public.psychometric_profiles (
  id uuid default gen_random_uuid() primary key,
  candidate_id uuid references auth.users(id) on delete cascade not null,
  session_id uuid references public.assessment_sessions(id),
  openness_score integer,
  conscientiousness_score integer,
  extraversion_score integer,
  agreeableness_score integer,
  neuroticism_score integer,
  leadership_score integer,
  teamwork_score integer,
  problem_solving_score integer,
  adaptability_score integer,
  emotional_intelligence_score integer,
  resilience_score integer,
  personality_summary text,
  culture_fit_analysis text,
  role_recommendations jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.psychometric_profiles enable row level security;

-- =====================================================
-- PROCTORING SYSTEM
-- =====================================================

create table if not exists public.proctoring_events (
  id uuid default gen_random_uuid() primary key,
  session_id uuid references public.assessment_sessions(id) on delete cascade not null,
  candidate_id uuid references auth.users(id) on delete cascade not null,
  event_type text not null check (event_type in (
    'session_start', 'session_end',
    'face_detected', 'no_face', 'multiple_faces',
    'tab_switch', 'tab_hidden', 'tab_visible',
    'copy_attempt', 'paste_attempt',
    'right_click', 'keyboard_shortcut',
    'screen_share_start', 'screen_share_end',
    'suspicious_movement', 'audio_detected',
    'browser_resize', 'fullscreen_exit'
  )),
  severity text check (severity in ('info', 'warning', 'critical')),
  details jsonb,
  screenshot_url text,
  timestamp timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.proctoring_events enable row level security;

-- =====================================================
-- FINAL DECISIONS (Explainable AI)
-- =====================================================

create table if not exists public.hiring_decisions (
  id uuid default gen_random_uuid() primary key,
  application_id uuid references public.applications(id) on delete cascade,
  session_id uuid references public.assessment_sessions(id),
  candidate_id uuid references auth.users(id) on delete cascade not null,
  job_id uuid references public.job_descriptions(id) on delete cascade,
  recruiter_id uuid references auth.users(id),
  decision text not null check (decision in ('hire', 'no_hire', 'further_evaluation', 'pending')),
  confidence_score numeric,
  overall_score numeric,
  technical_score numeric,
  psychometric_score numeric,
  communication_score numeric,
  culture_fit_score numeric,
  rationale text not null,
  strengths jsonb,
  weaknesses jsonb,
  concerns jsonb,
  competency_scores jsonb,
  competency_summary text,
  role_fit text,
  recommended_actions jsonb,
  ai_generated boolean default true,
  recruiter_override boolean default false,
  override_reason text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone
);

alter table public.hiring_decisions enable row level security;

-- =====================================================
-- POLICIES
-- =====================================================

-- Profiles
create policy "Profiles viewable by authenticated" on public.profiles for select using (auth.role() = 'authenticated');
create policy "Users insert own profile" on public.profiles for insert with check (auth.uid() = id);
create policy "Users update own profile" on public.profiles for update using (auth.uid() = id);

-- Job Descriptions
create policy "Jobs viewable by authenticated" on public.job_descriptions for select using (auth.role() = 'authenticated');
create policy "Recruiters create jobs" on public.job_descriptions for insert with check (auth.uid() = recruiter_id);
create policy "Recruiters update jobs" on public.job_descriptions for update using (auth.uid() = recruiter_id);

-- Applications
create policy "Candidates view own applications" on public.applications for select using (auth.uid() = candidate_id);
create policy "Candidates create applications" on public.applications for insert with check (auth.uid() = candidate_id);

-- Resume
create policy "Users view own resumes" on public.resume_analyses for select using (auth.uid() = candidate_id);
create policy "Users create own resumes" on public.resume_analyses for insert with check (auth.uid() = candidate_id);

-- Sessions
create policy "Candidates view own sessions" on public.assessment_sessions for select using (auth.uid() = candidate_id);
create policy "Candidates create own sessions" on public.assessment_sessions for insert with check (auth.uid() = candidate_id);
create policy "Candidates update own sessions" on public.assessment_sessions for update using (auth.uid() = candidate_id);

-- MCQ
create policy "MCQ questions viewable" on public.mcq_questions for select using (auth.role() = 'authenticated');
create policy "MCQ responses viewable by owner" on public.mcq_responses for select using (auth.uid() = candidate_id);
create policy "MCQ responses insertable by owner" on public.mcq_responses for insert with check (auth.uid() = candidate_id);

-- Coding
create policy "Challenges viewable" on public.coding_challenges for select using (auth.role() = 'authenticated');
create policy "Submissions viewable by owner" on public.coding_submissions for select using (auth.uid() = candidate_id);
create policy "Submissions insertable by owner" on public.coding_submissions for insert with check (auth.uid() = candidate_id);

-- Text
create policy "Text questions viewable" on public.text_questions for select using (auth.role() = 'authenticated');
create policy "Text responses viewable by owner" on public.text_responses for select using (auth.uid() = candidate_id);
create policy "Text responses insertable by owner" on public.text_responses for insert with check (auth.uid() = candidate_id);

-- Psychometric
create policy "Psychometric questions viewable" on public.psychometric_questions for select using (auth.role() = 'authenticated');
create policy "Psychometric responses viewable by owner" on public.psychometric_responses for select using (auth.uid() = candidate_id);
create policy "Psychometric responses insertable by owner" on public.psychometric_responses for insert with check (auth.uid() = candidate_id);
create policy "Psychometric profiles viewable by owner" on public.psychometric_profiles for select using (auth.uid() = candidate_id);
create policy "Psychometric profiles insertable by owner" on public.psychometric_profiles for insert with check (auth.uid() = candidate_id);

-- Proctoring
create policy "Proctoring events viewable by owner" on public.proctoring_events for select using (auth.uid() = candidate_id);
create policy "Proctoring events insertable by owner" on public.proctoring_events for insert with check (auth.uid() = candidate_id);

-- Hiring Decisions
-- Hiring Decisions - allow any authenticated user to insert and view
create policy "Allow authenticated inserts" on public.hiring_decisions for insert with check (auth.role() = 'authenticated');
create policy "Allow authenticated selects" on public.hiring_decisions for select using (auth.role() = 'authenticated');
create policy "Users update own decisions" on public.hiring_decisions for update using (auth.uid() = candidate_id);

-- Job Descriptions - allow any authenticated user to create (for demo)
create policy "Anyone can create jobs" on public.job_descriptions for insert with check (auth.role() = 'authenticated');
create policy "Anyone can delete jobs" on public.job_descriptions for delete using (auth.uid() = recruiter_id);

-- =====================================================
-- TRIGGER
-- =====================================================

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url, role)
  values (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name', 
    new.raw_user_meta_data->>'avatar_url',
    coalesce(new.raw_user_meta_data->>'role', 'candidate')
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to increment proctoring flags for a session
create or replace function public.increment_proctoring_flags(session_id uuid)
returns void as $$
begin
  update public.assessment_sessions
  set proctoring_flags = coalesce(proctoring_flags, 0) + 1
  where id = session_id;
end;
$$ language plpgsql security definer;
