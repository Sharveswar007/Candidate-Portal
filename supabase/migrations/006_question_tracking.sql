-- =====================================================
-- TalentPulse - AI Question Tracking Schema
-- Tracks which questions users have answered to prevent repeats
-- =====================================================

-- Drop existing tables if they exist
DROP TABLE IF EXISTS user_answered_questions CASCADE;
DROP TABLE IF EXISTS generated_questions CASCADE;

-- =====================================================
-- TABLE: user_answered_questions
-- Tracks all questions a user has answered
-- =====================================================
CREATE TABLE user_answered_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    question_id TEXT NOT NULL,
    question_type TEXT NOT NULL CHECK (question_type IN ('mcq', 'coding', 'text', 'psychometric')),
    question_hash TEXT, -- Hash of question content to detect duplicates
    answered_at TIMESTAMPTZ DEFAULT NOW(),
    was_correct BOOLEAN,
    score_earned INTEGER DEFAULT 0,
    time_spent_seconds INTEGER,
    session_id UUID,
    
    -- Ensure unique question per user
    UNIQUE(user_id, question_id)
);

-- =====================================================
-- TABLE: generated_questions
-- Cache of AI-generated questions for reuse
-- =====================================================
CREATE TABLE generated_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id TEXT UNIQUE NOT NULL,
    question_type TEXT NOT NULL CHECK (question_type IN ('mcq', 'coding')),
    category TEXT NOT NULL,
    difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
    content JSONB NOT NULL, -- Full question content
    content_hash TEXT NOT NULL, -- Hash for duplicate detection
    times_used INTEGER DEFAULT 0,
    avg_correct_rate DECIMAL(5,2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Index for faster lookups
    UNIQUE(content_hash)
);

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX idx_user_answered_user ON user_answered_questions(user_id);
CREATE INDEX idx_user_answered_type ON user_answered_questions(question_type);
CREATE INDEX idx_user_answered_session ON user_answered_questions(session_id);
CREATE INDEX idx_generated_type ON generated_questions(question_type);
CREATE INDEX idx_generated_category ON generated_questions(category);
CREATE INDEX idx_generated_difficulty ON generated_questions(difficulty);

-- =====================================================
-- RLS POLICIES
-- =====================================================
ALTER TABLE user_answered_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_questions ENABLE ROW LEVEL SECURITY;

-- Users can only see their own answered questions
CREATE POLICY "Users can view own answered questions"
    ON user_answered_questions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own answered questions"
    ON user_answered_questions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Anyone can read generated questions (they're shared)
CREATE POLICY "Anyone can read generated questions"
    ON generated_questions FOR SELECT
    USING (true);

-- Only authenticated users can insert generated questions
CREATE POLICY "Authenticated users can insert generated questions"
    ON generated_questions FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- =====================================================
-- FUNCTION: Get unused questions for a user
-- =====================================================
CREATE OR REPLACE FUNCTION get_unused_questions(
    p_user_id UUID,
    p_question_type TEXT,
    p_count INTEGER DEFAULT 10
)
RETURNS TABLE (
    question_id TEXT,
    content JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT gq.question_id, gq.content
    FROM generated_questions gq
    WHERE gq.question_type = p_question_type
    AND gq.question_id NOT IN (
        SELECT uaq.question_id 
        FROM user_answered_questions uaq 
        WHERE uaq.user_id = p_user_id
    )
    ORDER BY gq.times_used ASC, RANDOM()
    LIMIT p_count;
END;
$$;

-- =====================================================
-- FUNCTION: Record answered question
-- =====================================================
CREATE OR REPLACE FUNCTION record_answered_question(
    p_user_id UUID,
    p_question_id TEXT,
    p_question_type TEXT,
    p_was_correct BOOLEAN DEFAULT NULL,
    p_score INTEGER DEFAULT 0,
    p_time_spent INTEGER DEFAULT NULL,
    p_session_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO user_answered_questions (
        user_id, question_id, question_type, was_correct, 
        score_earned, time_spent_seconds, session_id
    )
    VALUES (
        p_user_id, p_question_id, p_question_type, p_was_correct,
        p_score, p_time_spent, p_session_id
    )
    ON CONFLICT (user_id, question_id) DO NOTHING;
    
    -- Update usage count in generated_questions
    UPDATE generated_questions
    SET times_used = times_used + 1
    WHERE question_id = p_question_id;
    
    RETURN TRUE;
END;
$$;

-- =====================================================
-- FUNCTION: Get user question stats
-- =====================================================
CREATE OR REPLACE FUNCTION get_user_question_stats(p_user_id UUID)
RETURNS TABLE (
    question_type TEXT,
    total_answered BIGINT,
    correct_count BIGINT,
    total_score BIGINT,
    avg_time_seconds NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        uaq.question_type,
        COUNT(*) as total_answered,
        COUNT(*) FILTER (WHERE uaq.was_correct = true) as correct_count,
        COALESCE(SUM(uaq.score_earned), 0) as total_score,
        AVG(uaq.time_spent_seconds) as avg_time_seconds
    FROM user_answered_questions uaq
    WHERE uaq.user_id = p_user_id
    GROUP BY uaq.question_type;
END;
$$;
