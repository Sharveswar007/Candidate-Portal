-- =====================================================
-- TalentPulse - Production Assessment Seed Data
-- 28 Total Items: 10 MCQ + 3 Coding + 3 Text + 12 Sliders
-- =====================================================

-- =====================================================
-- STAGE 1: SCENARIO-BASED MCQs (10 total)
-- 6 Psychometric + 4 Technical-in-Workplace
-- =====================================================

-- Psychometric MCQs (6)
INSERT INTO public.mcq_questions (id, category, difficulty, scenario_text, question_text, options, correct_option_id, explanation, points, time_limit_seconds) VALUES

-- Q1: Conflict Handling
('a1b2c3d4-0001-4000-8000-000000000001', 'situational', 'medium',
'You are working on a critical feature with a tight deadline. A senior colleague publicly criticizes your code approach in a team meeting, calling it "inefficient and poorly thought out." Other team members are watching.',
'What would be your immediate response?',
'[
  {"id": "A", "text": "Defend your approach firmly, explaining why their criticism is unfounded"},
  {"id": "B", "text": "Thank them for the feedback, ask to discuss specifics after the meeting, and request concrete suggestions"},
  {"id": "C", "text": "Stay silent to avoid confrontation and speak to your manager privately later"},
  {"id": "D", "text": "Agree with them immediately to end the uncomfortable situation"}
]',
'B',
'Option B demonstrates emotional intelligence - acknowledging feedback while redirecting to a constructive private discussion. It shows professionalism without being defensive or passive.',
10, 120),

-- Q2: Ethics & Integrity
('a1b2c3d4-0001-4000-8000-000000000002', 'behavioral', 'medium',
'While reviewing deployment logs, you discover that a bug you introduced last week caused incorrect billing for approximately 200 customers. The total overcharge is around $15,000. No one else has noticed yet, and the bug has been fixed in today''s release.',
'How do you handle this situation?',
'[
  {"id": "A", "text": "Since it''s fixed now, document it internally and move on - raising it will just cause unnecessary alarm"},
  {"id": "B", "text": "Immediately report to your manager and the billing team, propose a customer refund plan, and document the incident"},
  {"id": "C", "text": "Wait to see if customers complain, then address it reactively"},
  {"id": "D", "text": "Fix the records quietly without telling anyone to avoid blame"}
]',
'B',
'Integrity requires proactive disclosure. Option B shows ownership, ethical behavior, and problem-solving mindset. Hiding issues (A, C, D) creates larger problems.',
10, 120),

-- Q3: Stress & Pressure
('a1b2c3d4-0001-4000-8000-000000000003', 'situational', 'medium',
'It''s Friday 4 PM. Your sprint ends Monday. You have 3 story points remaining, a production incident was just assigned to you, and your teammate who was supposed to help called in sick. Your manager is in back-to-back meetings.',
'What is your approach?',
'[
  {"id": "A", "text": "Work through the weekend to complete everything yourself"},
  {"id": "B", "text": "Triage: handle the production incident first, then message your manager with a realistic status update and proposed plan"},
  {"id": "C", "text": "Focus only on the sprint work and let someone else handle the incident"},
  {"id": "D", "text": "Wait for your manager to become available before taking any action"}
]',
'B',
'Option B shows mature prioritization (prod incident > sprint work), proactive communication, and realistic planning. Burnout (A) and avoidance (C, D) are not sustainable.',
10, 120),

-- Q4: Teamwork & Collaboration
('a1b2c3d4-0001-4000-8000-000000000004', 'situational', 'medium',
'You''ve been assigned to mentor a new graduate hire. After 3 weeks, you notice they''re struggling with basic concepts and their code quality is affecting the team''s velocity. They seem embarrassed to ask questions.',
'How do you approach this?',
'[
  {"id": "A", "text": "Report the performance issues to your manager and suggest they may not be a good fit"},
  {"id": "B", "text": "Schedule regular 1:1s, create a safe space for questions, pair program on tasks, and give specific actionable feedback"},
  {"id": "C", "text": "Do their critical tasks yourself to protect the team''s delivery"},
  {"id": "D", "text": "Send them documentation links and let them figure it out independently"}
]',
'B',
'Effective mentorship requires psychological safety, structured support, and patience. Option B invests in their growth. A is premature, C creates dependency, D abandons responsibility.',
10, 120),

-- Q5: Ownership & Accountability
('a1b2c3d4-0001-4000-8000-000000000005', 'behavioral', 'medium',
'A feature you developed 2 months ago is now causing performance issues in production. The original requirements were vague, and you implemented what you understood at the time. The product manager is now saying "this isn''t what we asked for."',
'What is your response?',
'[
  {"id": "A", "text": "Point out that the requirements document was unclear and this isn''t your fault"},
  {"id": "B", "text": "Acknowledge the gap, propose a fix with timeline, and suggest improving the requirements process for future features"},
  {"id": "C", "text": "Agree it was your mistake and offer to work overtime to fix it immediately"},
  {"id": "D", "text": "Ask the product manager to provide detailed specifications before you make any changes"}
]',
'B',
'Option B shows ownership without excessive self-blame, focuses on solutions, and proposes systemic improvement. Blame-shifting (A) and over-apologizing (C) are not constructive.',
10, 120),

-- Q6: Leadership Intent
('a1b2c3d4-0001-4000-8000-000000000006', 'situational', 'medium',
'During a team retrospective, you notice a pattern: the same issues keep coming up sprint after sprint, but no one takes action. The team lead facilitates but doesn''t drive accountability. You''re a mid-level engineer.',
'What do you do?',
'[
  {"id": "A", "text": "It''s not your place to speak up - wait for senior leadership to notice"},
  {"id": "B", "text": "Volunteer to own one action item, track it, and report progress next retro - lead by example"},
  {"id": "C", "text": "Privately tell the team lead they''re not doing their job properly"},
  {"id": "D", "text": "Bring it up in the retro and ask why nothing ever changes"}
]',
'B',
'Leadership isn''t about title. Option B demonstrates initiative without overstepping. It models accountability rather than criticizing others.',
10, 120),

-- Technical-in-Workplace MCQs (4)

-- Q7: Debugging Under Pressure
('a1b2c3d4-0001-4000-8000-000000000007', 'technical', 'medium',
'Production is down. Error logs show "Connection pool exhausted" on your database service. The issue started 30 minutes ago after a deployment. Rollback is possible but takes 15 minutes. Users are impacted.',
'What is your immediate action sequence?',
'[
  {"id": "A", "text": "Start rollback immediately - it''s the safest option"},
  {"id": "B", "text": "Check the deployment diff for database-related changes, verify connection pool metrics, then decide rollback vs hotfix"},
  {"id": "C", "text": "Scale up the database instance to handle more connections"},
  {"id": "D", "text": "Restart all application servers to clear the connection pool"}
]',
'B',
'Root cause analysis before action prevents wrong fixes. B investigates first (5 min) to make informed decision. Blind rollback (A), scaling (C), or restart (D) may not fix the actual issue.',
10, 120),

-- Q8: Deployment Decision
('a1b2c3d4-0001-4000-8000-000000000008', 'technical', 'medium',
'You''re about to deploy a critical security patch. It''s Thursday 5 PM. The patch fixes a vulnerability disclosed publicly 2 hours ago. Your CI pipeline passes but you only have 60% test coverage on the affected module.',
'What do you do?',
'[
  {"id": "A", "text": "Deploy immediately - security patches can''t wait"},
  {"id": "B", "text": "Wait until Monday when the full team is available for support"},
  {"id": "C", "text": "Deploy to staging, run manual smoke tests on critical paths, then deploy to production with monitoring alerts on"},
  {"id": "D", "text": "Write more tests first to reach 80% coverage, then deploy"}
]',
'C',
'Security urgency requires action, but not reckless action. C balances urgency with risk mitigation (staging + smoke tests + monitoring). Pure YOLO deploy (A) or waiting (B) are both wrong.',
10, 120),

-- Q9: Prioritization
('a1b2c3d4-0001-4000-8000-000000000009', 'technical', 'medium',
'You have 4 tasks in your sprint: (1) Feature for major client demo tomorrow, (2) Tech debt refactoring you promised to finish, (3) Code review blocking a teammate, (4) Bug fix requested by support team yesterday.',
'In what order do you tackle these?',
'[
  {"id": "A", "text": "1 → 2 → 3 → 4 (features first, then promises, then others)"},
  {"id": "B", "text": "3 → 1 → 4 → 2 (unblock teammate, then demo, then customer bug, then debt)"},
  {"id": "C", "text": "4 → 1 → 3 → 2 (customers first always)"},
  {"id": "D", "text": "1 → 4 → 3 → 2 (demo, then customer, then teammate, then debt)"}
]',
'B',
'Code review blocking others should be first (high leverage, quick). Then demo (deadline). Then customer bug (external impact). Tech debt can wait - it has no external deadline.',
10, 120),

-- Q10: Code Review Conflict
('a1b2c3d4-0001-4000-8000-000000000010', 'technical', 'medium',
'You submitted a PR. A senior engineer leaves 15 comments, most requesting significant architectural changes. You believe your approach is simpler and works. The senior engineer is known for over-engineering.',
'How do you proceed?',
'[
  {"id": "A", "text": "Make all requested changes - they''re senior so probably right"},
  {"id": "B", "text": "Reject all comments and explain why your approach is better"},
  {"id": "C", "text": "Address each comment individually: implement valid points, push back with reasoning on others, suggest a call if there''s still disagreement"},
  {"id": "D", "text": "Escalate to your manager to make the final call"}
]',
'C',
'C shows professional disagreement. Evaluate each point on merit, not authority. Be open to being wrong but also advocate for your perspective with reasoning.',
10, 120);


-- =====================================================
-- STAGE 2: CODING CHALLENGES (3 total)
-- 1 Easy + 1 Medium + 1 Hard
-- =====================================================

INSERT INTO public.coding_challenges (id, title, description, difficulty, category, starter_code, test_cases, constraints, hints, time_limit_minutes, max_points) VALUES

-- Coding Q1: Easy - Array Manipulation
('a1b2c3d4-0002-4000-8000-000000000001',
'Two Sum',
'Given an array of integers `nums` and an integer `target`, return the indices of the two numbers that add up to `target`.

You may assume that each input would have exactly one solution, and you may not use the same element twice.

**Example:**
```
Input: nums = [2, 7, 11, 15], target = 9
Output: [0, 1]
Explanation: nums[0] + nums[1] = 2 + 7 = 9
```

**Constraints:**
- 2 <= nums.length <= 10^4
- -10^9 <= nums[i] <= 10^9
- Only one valid answer exists',
'easy',
'arrays',
'{"javascript": "function twoSum(nums, target) {\n  // Your code here\n}", "python": "def two_sum(nums, target):\n    # Your code here\n    pass"}',
'[
  {"input": "[2, 7, 11, 15], 9", "expected": "[0, 1]", "hidden": false},
  {"input": "[3, 2, 4], 6", "expected": "[1, 2]", "hidden": false},
  {"input": "[3, 3], 6", "expected": "[0, 1]", "hidden": false},
  {"input": "[1, 5, 8, 3, 9, 2], 11", "expected": "[2, 4]", "hidden": true},
  {"input": "[-1, -2, -3, -4, -5], -8", "expected": "[2, 4]", "hidden": true}
]',
'Time complexity should be O(n) or better. Space complexity O(n) is acceptable.',
'["Use a hash map to store seen numbers", "For each number, check if (target - number) exists in the map"]',
20, 100),

-- Coding Q2: Medium - String/Logic
('a1b2c3d4-0002-4000-8000-000000000002',
'Valid Parentheses with Types',
'Given a string `s` containing just the characters `(`, `)`, `{`, `}`, `[` and `]`, determine if the input string is valid.

A string is valid if:
1. Open brackets must be closed by the same type of brackets.
2. Open brackets must be closed in the correct order.
3. Every close bracket has a corresponding open bracket of the same type.

**Example:**
```
Input: s = "()[]{}"
Output: true

Input: s = "([)]"
Output: false

Input: s = "{[]}"
Output: true
```

**Constraints:**
- 1 <= s.length <= 10^4
- s consists of parentheses only',
'medium',
'strings',
'{"javascript": "function isValid(s) {\n  // Your code here\n}", "python": "def is_valid(s):\n    # Your code here\n    pass"}',
'[
  {"input": "\"()[]{}\"", "expected": "true", "hidden": false},
  {"input": "\"([)]\"", "expected": "false", "hidden": false},
  {"input": "\"{[]}\"", "expected": "true", "hidden": false},
  {"input": "\"((()))\"", "expected": "true", "hidden": false},
  {"input": "\"({[()]})\"", "expected": "true", "hidden": true},
  {"input": "\"((({{{[[[]]]}}})\"", "expected": "false", "hidden": true},
  {"input": "\"\"", "expected": "true", "hidden": true}
]',
'Think about LIFO order. Time O(n), Space O(n).',
'["Use a stack data structure", "Push opening brackets, pop and compare for closing brackets"]',
25, 100),

-- Coding Q3: Hard - Algorithm Design
('a1b2c3d4-0002-4000-8000-000000000003',
'Minimum Meeting Rooms',
'Given an array of meeting time intervals where `intervals[i] = [start_i, end_i]`, return the minimum number of conference rooms required.

**Example:**
```
Input: intervals = [[0,30],[5,10],[15,20]]
Output: 2
Explanation: Meeting 1 [0,30] uses room 1.
Meetings [5,10] and [15,20] can share room 2.

Input: intervals = [[7,10],[2,4]]
Output: 1
```

**Constraints:**
- 1 <= intervals.length <= 10^4
- 0 <= start_i < end_i <= 10^6',
'hard',
'algorithms',
'{"javascript": "function minMeetingRooms(intervals) {\n  // Your code here\n}", "python": "def min_meeting_rooms(intervals):\n    # Your code here\n    pass"}',
'[
  {"input": "[[0,30],[5,10],[15,20]]", "expected": "2", "hidden": false},
  {"input": "[[7,10],[2,4]]", "expected": "1", "hidden": false},
  {"input": "[[1,5],[2,6],[3,7],[4,8]]", "expected": "4", "hidden": false},
  {"input": "[[1,2],[2,3],[3,4],[4,5]]", "expected": "1", "hidden": true},
  {"input": "[[1,10],[2,3],[4,5],[6,7]]", "expected": "2", "hidden": true},
  {"input": "[[0,5],[5,10],[10,15]]", "expected": "1", "hidden": true}
]',
'Optimal solution is O(n log n). Think about when rooms become free.',
'["Separate start and end times", "Use a min-heap or two-pointer technique", "Track overlapping intervals"]',
30, 100);


-- =====================================================
-- STAGE 3: TEXT-BASED QUESTIONS (3 total)
-- 1 Technical + 1 Reasoning + 1 Behavioral
-- =====================================================

INSERT INTO public.text_questions (id, category, question_text, context, min_words, max_words, time_limit_seconds, evaluation_criteria, max_points) VALUES

-- Text Q1: Technical Explanation
('a1b2c3d4-0003-4000-8000-000000000001',
'communication',
'Explain how you would design a rate limiter for an API that handles 10,000 requests per second. Include your choice of algorithm, data structures, and how you would handle distributed systems.',
'You are interviewing for a backend engineering role. The interviewer wants to assess your system design thinking and ability to communicate technical concepts clearly.',
100, 400,
300,
'{"clarity": "Can explain complex concepts simply", "depth": "Demonstrates understanding of tradeoffs", "completeness": "Covers algorithm, data structure, and distribution", "practicality": "Considers real-world constraints"}',
100),

-- Text Q2: Problem Solving / Reasoning
('a1b2c3d4-0003-4000-8000-000000000002',
'problem_solving',
'A critical production system you own has been experiencing intermittent failures for 2 weeks. Logs show no clear pattern. Metrics look normal. Three different engineers have investigated and found nothing. The failures affect 0.1% of requests. Walk us through your systematic approach to diagnose and resolve this.',
'This question assesses your debugging methodology, systematic thinking, and persistence with ambiguous problems.',
100, 400,
300,
'{"methodology": "Shows structured debugging approach", "creativity": "Considers non-obvious causes", "persistence": "Demonstrates thoroughness", "communication": "Explains reasoning clearly"}',
100),

-- Text Q3: Behavioral Reflection
('a1b2c3d4-0003-4000-8000-000000000003',
'teamwork',
'Describe a time when you had to deliver difficult feedback to a peer or disagree with a decision made by someone more senior. What was the situation, how did you handle it, and what was the outcome?',
'We value direct, respectful communication. This question assesses your ability to navigate interpersonal challenges professionally.',
100, 400,
300,
'{"specificity": "Provides concrete example, not hypothetical", "self_awareness": "Shows reflection on own behavior", "outcome_focus": "Describes resolution and learning", "professionalism": "Demonstrates respect while being direct"}',
100);


-- =====================================================
-- STAGE 4: PSYCHOMETRIC SLIDER STATEMENTS (12 total)
-- 3 each: EI, Resilience, Teamwork, Leadership
-- =====================================================

INSERT INTO public.psychometric_questions (id, dimension, question_text, scale_min_label, scale_max_label, reverse_scored, category) VALUES

-- Emotional Intelligence (3)
('a1b2c3d4-0004-4000-8000-000000000001', 'emotional_intelligence',
'When a colleague seems upset but says "I''m fine," I usually notice and check in with them later.',
'Never', 'Always', false, 'emotional_intelligence'),

('a1b2c3d4-0004-4000-8000-000000000002', 'emotional_intelligence',
'I find it difficult to understand why people get upset about things that seem trivial to me.',
'Strongly Disagree', 'Strongly Agree', true, 'emotional_intelligence'),

('a1b2c3d4-0004-4000-8000-000000000003', 'emotional_intelligence',
'Before responding to a frustrating email, I take time to consider how my response might be perceived.',
'Never', 'Always', false, 'emotional_intelligence'),

-- Resilience & Stress (3)
('a1b2c3d4-0004-4000-8000-000000000004', 'resilience',
'When I face a major setback at work, I typically recover and refocus within a day or two.',
'Strongly Disagree', 'Strongly Agree', false, 'resilience'),

('a1b2c3d4-0004-4000-8000-000000000005', 'resilience',
'Tight deadlines and high-pressure situations negatively affect the quality of my work.',
'Strongly Disagree', 'Strongly Agree', true, 'resilience'),

('a1b2c3d4-0004-4000-8000-000000000006', 'resilience',
'I view failures as learning opportunities rather than personal defeats.',
'Strongly Disagree', 'Strongly Agree', false, 'resilience'),

-- Team & Collaboration (3)
('a1b2c3d4-0004-4000-8000-000000000007', 'teamwork',
'I prefer working independently and only collaborating when absolutely necessary.',
'Strongly Disagree', 'Strongly Agree', true, 'teamwork'),

('a1b2c3d4-0004-4000-8000-000000000008', 'teamwork',
'When working in a group, I actively seek input from quieter team members.',
'Never', 'Always', false, 'teamwork'),

('a1b2c3d4-0004-4000-8000-000000000009', 'teamwork',
'I am comfortable adjusting my working style to accommodate different team dynamics.',
'Strongly Disagree', 'Strongly Agree', false, 'teamwork'),

-- Leadership & Ownership (3)
('a1b2c3d4-0004-4000-8000-000000000010', 'leadership',
'When I see a problem that''s not my responsibility, I still take initiative to address it.',
'Never', 'Always', false, 'leadership'),

('a1b2c3d4-0004-4000-8000-000000000011', 'leadership',
'I prefer to wait for clear instructions rather than make decisions on ambiguous tasks.',
'Strongly Disagree', 'Strongly Agree', true, 'leadership'),

('a1b2c3d4-0004-4000-8000-000000000012', 'leadership',
'I regularly volunteer to lead projects or initiatives, even without being asked.',
'Never', 'Always', false, 'leadership');


-- =====================================================
-- QUESTION METADATA TABLE (for tracking/explainability)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.question_metadata (
  question_id uuid PRIMARY KEY,
  question_type text NOT NULL CHECK (question_type IN ('scenario_mcq', 'coding', 'text', 'slider')),
  track text NOT NULL CHECK (track IN ('technical', 'psychometric', 'both')),
  competency text NOT NULL,
  weight numeric DEFAULT 1.0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insert metadata for all questions
INSERT INTO public.question_metadata (question_id, question_type, track, competency, weight) VALUES
-- Psychometric MCQs
('a1b2c3d4-0001-4000-8000-000000000001', 'scenario_mcq', 'psychometric', 'conflict_handling', 1.0),
('a1b2c3d4-0001-4000-8000-000000000002', 'scenario_mcq', 'psychometric', 'ethics_integrity', 1.5),
('a1b2c3d4-0001-4000-8000-000000000003', 'scenario_mcq', 'psychometric', 'stress_management', 1.0),
('a1b2c3d4-0001-4000-8000-000000000004', 'scenario_mcq', 'psychometric', 'teamwork', 1.0),
('a1b2c3d4-0001-4000-8000-000000000005', 'scenario_mcq', 'psychometric', 'ownership', 1.2),
('a1b2c3d4-0001-4000-8000-000000000006', 'scenario_mcq', 'psychometric', 'leadership', 1.0),

-- Technical MCQs
('a1b2c3d4-0001-4000-8000-000000000007', 'scenario_mcq', 'technical', 'debugging', 1.2),
('a1b2c3d4-0001-4000-8000-000000000008', 'scenario_mcq', 'technical', 'deployment_judgment', 1.0),
('a1b2c3d4-0001-4000-8000-000000000009', 'scenario_mcq', 'technical', 'prioritization', 1.0),
('a1b2c3d4-0001-4000-8000-000000000010', 'scenario_mcq', 'both', 'code_review_communication', 1.0),

-- Coding
('a1b2c3d4-0002-4000-8000-000000000001', 'coding', 'technical', 'problem_solving', 1.0),
('a1b2c3d4-0002-4000-8000-000000000002', 'coding', 'technical', 'data_structures', 1.2),
('a1b2c3d4-0002-4000-8000-000000000003', 'coding', 'technical', 'algorithm_design', 1.5),

-- Text
('a1b2c3d4-0003-4000-8000-000000000001', 'text', 'technical', 'system_design', 1.2),
('a1b2c3d4-0003-4000-8000-000000000002', 'text', 'both', 'problem_solving', 1.0),
('a1b2c3d4-0003-4000-8000-000000000003', 'text', 'psychometric', 'communication', 1.0),

-- Sliders
('a1b2c3d4-0004-4000-8000-000000000001', 'slider', 'psychometric', 'emotional_intelligence', 1.0),
('a1b2c3d4-0004-4000-8000-000000000002', 'slider', 'psychometric', 'emotional_intelligence', 1.0),
('a1b2c3d4-0004-4000-8000-000000000003', 'slider', 'psychometric', 'emotional_intelligence', 1.0),
('a1b2c3d4-0004-4000-8000-000000000004', 'slider', 'psychometric', 'resilience', 1.0),
('a1b2c3d4-0004-4000-8000-000000000005', 'slider', 'psychometric', 'resilience', 1.0),
('a1b2c3d4-0004-4000-8000-000000000006', 'slider', 'psychometric', 'resilience', 1.0),
('a1b2c3d4-0004-4000-8000-000000000007', 'slider', 'psychometric', 'teamwork', 1.0),
('a1b2c3d4-0004-4000-8000-000000000008', 'slider', 'psychometric', 'teamwork', 1.0),
('a1b2c3d4-0004-4000-8000-000000000009', 'slider', 'psychometric', 'teamwork', 1.0),
('a1b2c3d4-0004-4000-8000-000000000010', 'slider', 'psychometric', 'leadership', 1.0),
('a1b2c3d4-0004-4000-8000-000000000011', 'slider', 'psychometric', 'leadership', 1.0),
('a1b2c3d4-0004-4000-8000-000000000012', 'slider', 'psychometric', 'leadership', 1.0);


-- =====================================================
-- RLS POLICY FOR METADATA
-- =====================================================

ALTER TABLE public.question_metadata ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Question metadata viewable by authenticated" 
ON public.question_metadata FOR SELECT 
USING (auth.role() = 'authenticated');
