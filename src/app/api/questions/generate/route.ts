// AI Question Generation API
// Generates unique MCQ and Coding questions per user using LLM
// Tracks answered questions to prevent repetition

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Groq from "groq-sdk";

export const runtime = "nodejs";
export const maxDuration = 60;

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Question categories for variety
const MCQ_CATEGORIES = [
  "Workplace Ethics",
  "Team Dynamics",
  "Client Relations",
  "Priority Management",
  "Innovation & Initiative",
  "Communication",
  "Problem Solving",
  "Leadership",
  "Time Management",
  "Conflict Resolution",
];

const CODING_CATEGORIES = [
  "Arrays & Strings",
  "Data Structures",
  "Algorithms",
  "Dynamic Programming",
  "Mathematics",
  "Searching & Sorting",
  "Recursion",
  "Graph Theory",
  "Trees",
  "Object-Oriented Design",
];

// Fallback MCQ questions when API is rate limited
const FALLBACK_MCQ_QUESTIONS = [
  {
    category: "Team Dynamics",
    difficulty: "medium",
    scenario_text: "You are working on a team project when you notice a colleague consistently missing deadlines, which is affecting the team's overall progress. The colleague seems stressed but hasn't communicated any issues.",
    question_text: "What is the most appropriate action to take?",
    options: [
      { id: "A", text: "Report the colleague to your manager immediately" },
      { id: "B", text: "Privately approach the colleague to offer support and understand their situation" },
      { id: "C", text: "Take over their tasks without saying anything" },
      { id: "D", text: "Ignore the situation and focus only on your own work" }
    ],
    correct_option_id: "B",
    explanation: "Approaching the colleague privately shows empathy and gives them a chance to share their challenges. This often resolves issues before escalation is needed.",
    points: 10,
    time_limit_seconds: 120
  },
  {
    category: "Workplace Ethics",
    difficulty: "hard",
    scenario_text: "You discover that your supervisor has been approving expense reports that include personal items. The amounts are small but it's clearly against company policy.",
    question_text: "What should you do in this situation?",
    options: [
      { id: "A", text: "Confront your supervisor directly about the issue" },
      { id: "B", text: "Start doing the same since your supervisor does it" },
      { id: "C", text: "Report the issue through proper channels such as ethics hotline or HR" },
      { id: "D", text: "Collect evidence and use it for personal leverage" }
    ],
    correct_option_id: "C",
    explanation: "Using proper reporting channels protects you legally and ensures the issue is handled professionally without creating workplace conflicts.",
    points: 10,
    time_limit_seconds: 120
  },
  {
    category: "Communication",
    difficulty: "easy",
    scenario_text: "During a meeting, a senior colleague presents an idea that you know has a significant flaw. However, they seem very confident about it.",
    question_text: "How should you handle this situation?",
    options: [
      { id: "A", text: "Stay silent to avoid embarrassing them" },
      { id: "B", text: "Raise your concern professionally by asking clarifying questions" },
      { id: "C", text: "Criticize the idea openly in front of everyone" },
      { id: "D", text: "Wait until the project fails to prove you were right" }
    ],
    correct_option_id: "B",
    explanation: "Asking clarifying questions allows you to raise concerns diplomatically while giving the colleague a chance to address potential issues.",
    points: 10,
    time_limit_seconds: 120
  },
  {
    category: "Priority Management",
    difficulty: "medium",
    scenario_text: "You have three urgent tasks due by end of day: a client presentation, a report for your manager, and helping a new team member. You realize you cannot complete all three.",
    question_text: "What is the best approach to handle this situation?",
    options: [
      { id: "A", text: "Work on all three simultaneously and submit incomplete work" },
      { id: "B", text: "Prioritize tasks by business impact and communicate delays proactively" },
      { id: "C", text: "Focus only on the client presentation and ignore the others" },
      { id: "D", text: "Stay late without telling anyone and try to finish everything" }
    ],
    correct_option_id: "B",
    explanation: "Prioritizing by business impact while communicating proactively shows professionalism and allows stakeholders to adjust their expectations.",
    points: 10,
    time_limit_seconds: 120
  },
  {
    category: "Conflict Resolution",
    difficulty: "hard",
    scenario_text: "Two members of your team are in constant disagreement about the technical approach for a project. Their conflict is affecting team morale and progress.",
    question_text: "As a team lead, what should you do?",
    options: [
      { id: "A", text: "Let them sort it out themselves without intervening" },
      { id: "B", text: "Pick a side and enforce that decision on both" },
      { id: "C", text: "Facilitate a discussion to find common ground and align on objectives" },
      { id: "D", text: "Separate them and split the project into two parts" }
    ],
    correct_option_id: "C",
    explanation: "Facilitating a constructive discussion helps resolve the root cause of the conflict while maintaining team cohesion and finding the best solution.",
    points: 10,
    time_limit_seconds: 120
  },
  {
    category: "Client Relations",
    difficulty: "medium",
    scenario_text: "A client calls you angry about a mistake in their project that was actually caused by their unclear requirements. They are demanding immediate action.",
    question_text: "How should you respond?",
    options: [
      { id: "A", text: "Immediately blame the client for the unclear requirements" },
      { id: "B", text: "Apologize for the confusion and work together to find a solution" },
      { id: "C", text: "Transfer the call to your manager to avoid confrontation" },
      { id: "D", text: "Hang up and send an email explaining it was their fault" }
    ],
    correct_option_id: "B",
    explanation: "Taking a collaborative approach maintains the client relationship while addressing their concerns professionally.",
    points: 10,
    time_limit_seconds: 120
  },
  {
    category: "Innovation & Initiative",
    difficulty: "easy",
    scenario_text: "You have an idea that could significantly improve a company process, but it would require resources and time to implement. Your manager is very focused on current projects.",
    question_text: "What is the best way to proceed?",
    options: [
      { id: "A", text: "Implement the idea without telling anyone" },
      { id: "B", text: "Forget about it since the manager is busy" },
      { id: "C", text: "Prepare a brief proposal with benefits and present it at an appropriate time" },
      { id: "D", text: "Complain to others about how the company doesn't value innovation" }
    ],
    correct_option_id: "C",
    explanation: "Preparing a well-thought-out proposal shows initiative and professionalism while respecting the proper channels.",
    points: 10,
    time_limit_seconds: 120
  },
  {
    category: "Leadership",
    difficulty: "medium",
    scenario_text: "You are leading a project when a team member makes a significant mistake that delays the timeline. The team is demotivated.",
    question_text: "What is the most effective leadership response?",
    options: [
      { id: "A", text: "Publicly criticize the team member to set an example" },
      { id: "B", text: "Address the mistake privately, then rally the team around a recovery plan" },
      { id: "C", text: "Take over all the work yourself to prevent future mistakes" },
      { id: "D", text: "Blame the team member in the status report to management" }
    ],
    correct_option_id: "B",
    explanation: "Addressing issues privately while leading the team forward demonstrates effective leadership and maintains team morale.",
    points: 10,
    time_limit_seconds: 120
  },
  {
    category: "Time Management",
    difficulty: "easy",
    scenario_text: "You are working on a complex task when colleagues frequently interrupt you with quick questions. This is affecting your productivity.",
    question_text: "How should you handle these interruptions?",
    options: [
      { id: "A", text: "Ignore all colleagues and put on headphones permanently" },
      { id: "B", text: "Set specific times for questions and communicate this to the team" },
      { id: "C", text: "Answer every question immediately to be helpful" },
      { id: "D", text: "Complain to management about disruptive colleagues" }
    ],
    correct_option_id: "B",
    explanation: "Setting boundaries while remaining approachable helps balance productivity with collaboration.",
    points: 10,
    time_limit_seconds: 120
  },
  {
    category: "Problem Solving",
    difficulty: "hard",
    scenario_text: "A critical system fails during a product launch. Multiple solutions are proposed but each has significant trade-offs. Time is very limited.",
    question_text: "What is the best approach to resolve this crisis?",
    options: [
      { id: "A", text: "Pick the first solution suggested to save time" },
      { id: "B", text: "Quickly assess options based on risk and impact, then decide and execute" },
      { id: "C", text: "Wait for more information before making any decision" },
      { id: "D", text: "Blame the team responsible for the failure" }
    ],
    correct_option_id: "B",
    explanation: "A structured rapid assessment allows for informed decision-making under pressure while maintaining focus on resolution.",
    points: 10,
    time_limit_seconds: 120
  }
];

// Fallback coding challenges when API is rate limited
const FALLBACK_CODING_CHALLENGES = [
  {
    title: "Two Sum",
    description: "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target. You may assume that each input has exactly one solution, and you may not use the same element twice.",
    difficulty: "easy",
    category: "Arrays & Strings",
    examples: [
      { input: "nums = [2,7,11,15], target = 9", output: "[0,1]", explanation: "Because nums[0] + nums[1] == 9, we return [0, 1]." },
      { input: "nums = [3,2,4], target = 6", output: "[1,2]", explanation: "Because nums[1] + nums[2] == 6, we return [1, 2]." }
    ],
    test_cases: [
      { input: "[2,7,11,15]\n9", expected: "[0,1]", hidden: false },
      { input: "[3,2,4]\n6", expected: "[1,2]", hidden: false },
      { input: "[3,3]\n6", expected: "[0,1]", hidden: true }
    ],
    starter_code: {
      javascript: "function twoSum(nums, target) {\n  // Your code here\n}",
      python: "def two_sum(nums, target):\n    # Your code here\n    pass"
    },
    time_limit_minutes: 15,
    max_points: 100
  },
  {
    title: "Reverse String",
    description: "Write a function that reverses a string. The input string is given as an array of characters. Do this in-place with O(1) extra memory.",
    difficulty: "easy",
    category: "Arrays & Strings",
    examples: [
      { input: '["h","e","l","l","o"]', output: '["o","l","l","e","h"]', explanation: "The array is reversed in place." },
      { input: '["H","a","n","n","a","h"]', output: '["h","a","n","n","a","H"]', explanation: "The array is reversed in place." }
    ],
    test_cases: [
      { input: '["h","e","l","l","o"]', expected: '["o","l","l","e","h"]', hidden: false },
      { input: '["H","a","n","n","a","h"]', expected: '["h","a","n","n","a","H"]', hidden: false },
      { input: '["a"]', expected: '["a"]', hidden: true }
    ],
    starter_code: {
      javascript: "function reverseString(s) {\n  // Your code here - modify array in place\n}",
      python: "def reverse_string(s):\n    # Your code here - modify list in place\n    pass"
    },
    time_limit_minutes: 10,
    max_points: 100
  },
  {
    title: "Valid Palindrome",
    description: "Given a string s, determine if it is a palindrome, considering only alphanumeric characters and ignoring cases.",
    difficulty: "easy",
    category: "Arrays & Strings",
    examples: [
      { input: '"A man, a plan, a canal: Panama"', output: "true", explanation: "'amanaplanacanalpanama' is a palindrome." },
      { input: '"race a car"', output: "false", explanation: "'raceacar' is not a palindrome." }
    ],
    test_cases: [
      { input: "A man, a plan, a canal: Panama", expected: "true", hidden: false },
      { input: "race a car", expected: "false", hidden: false },
      { input: " ", expected: "true", hidden: true }
    ],
    starter_code: {
      javascript: "function isPalindrome(s) {\n  // Your code here\n}",
      python: "def is_palindrome(s):\n    # Your code here\n    pass"
    },
    time_limit_minutes: 10,
    max_points: 100
  }
];

// Generate MCQ questions using AI
async function generateMCQQuestions(
  count: number,
  excludeIds: string[],
  userId: string
): Promise<any[]> {
  const category = MCQ_CATEGORIES[Math.floor(Math.random() * MCQ_CATEGORIES.length)];
  
  const prompt = `Generate ${count} unique workplace scenario-based multiple choice questions for HR assessment.

Category: ${category}
Difficulty: Mix of easy, medium, and hard

Each question should:
1. Present a realistic workplace scenario
2. Test decision-making, ethics, or soft skills
3. Have 4 options (A, B, C, D) with only ONE correct answer
4. Include brief explanation for the correct answer

Return ONLY valid JSON array:
[
  {
    "category": "${category}",
    "difficulty": "easy|medium|hard",
    "scenario_text": "Detailed workplace scenario...",
    "question_text": "What should you do?",
    "options": [
      {"id": "A", "text": "Option A text"},
      {"id": "B", "text": "Option B text"},
      {"id": "C", "text": "Option C text"},
      {"id": "D", "text": "Option D text"}
    ],
    "correct_option_id": "A|B|C|D",
    "explanation": "Why this is correct...",
    "points": 10,
    "time_limit_seconds": 120
  }
]`;

  try {
    console.log("\n🤖 ============================================");
    console.log("🤖 GENERATED WITH GROQ AI (MCQ Questions)");
    console.log("🤖 Model: llama-3.3-70b-versatile");
    console.log("🤖 Count:", count);
    console.log("🤖 ============================================\n");
    
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are an HR assessment expert. Generate realistic workplace scenario questions. Return ONLY valid JSON array.",
        },
        { role: "user", content: prompt },
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.8,
      max_tokens: 4000,
    });

    const content = completion.choices[0]?.message?.content || "[]";
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];

    // Clean up common JSON issues from AI generation
    let jsonString = jsonMatch[0]
      .replace(/,\s*}/g, '}')  // Remove trailing commas before }
      .replace(/,\s*\]/g, ']') // Remove trailing commas before ]
      .replace(/(['"])\s*\n\s*(['"])/g, '$1 $2') // Fix broken strings
      .replace(/\\n/g, '\\n') // Escape newlines properly
      .replace(/[\x00-\x1F\x7F]/g, ' '); // Remove control characters
    
    let questions;
    try {
      questions = JSON.parse(jsonString);
    } catch (parseError) {
      console.error("JSON parse failed, attempting repair...", parseError);
      // Try more aggressive cleanup
      jsonString = jsonString.replace(/,([^,\[\]{}]*)(\]|\})/g, '$1$2');
      try {
        questions = JSON.parse(jsonString);
      } catch {
        console.error("JSON repair failed, using fallback");
        return [];
      }
    }
    
    // Add unique IDs
    return questions.map((q: any, i: number) => ({
      ...q,
      id: `mcq_${userId}_${Date.now()}_${i}`,
      generated_for: userId,
      generated_at: new Date().toISOString(),
    }));
  } catch (error: any) {
    console.error("MCQ generation error:", error);
    
    // Check if it's a rate limit error (429)
    if (error?.status === 429 || error?.error?.code === "rate_limit_exceeded") {
      console.log("⚠️ Rate limit hit, using fallback MCQ questions");
      // Return fallback questions with shuffled order
      const shuffled = [...FALLBACK_MCQ_QUESTIONS].sort(() => Math.random() - 0.5);
      return shuffled.slice(0, count).map((q: any, i: number) => ({
        ...q,
        id: `mcq_${userId}_${Date.now()}_${i}`,
        generated_for: userId,
        generated_at: new Date().toISOString(),
        is_fallback: true,
      }));
    }
    
    return [];
  }
}

// Generate coding challenges using AI
async function generateCodingChallenges(
  count: number,
  excludeIds: string[],
  userId: string
): Promise<any[]> {
  const category = CODING_CATEGORIES[Math.floor(Math.random() * CODING_CATEGORIES.length)];
  
  const prompt = `Generate ${count} unique coding challenges for technical assessment.

Category: ${category}
Difficulty: Mix of easy, medium, and hard

Each challenge should:
1. Have a clear problem statement
2. Include 2-3 example test cases with inputs and expected outputs
3. Include 2-3 hidden test cases for validation
4. Provide starter code in Python ONLY

Return ONLY valid JSON array:
[
  {
    "title": "Problem Title",
    "description": "Detailed problem description with constraints...",
    "difficulty": "easy|medium|hard",
    "category": "${category}",
    "examples": [
      {"input": "example input", "output": "expected output", "explanation": "why"}
    ],
    "test_cases": [
      {"input": "test input 1", "expected": "expected output 1", "hidden": false},
      {"input": "test input 2", "expected": "expected output 2", "hidden": true}
    ],
    "starter_code": {
      "python": "# Write your solution here\\ndef solve(input):\\n    pass"
    },
    "time_limit_minutes": 15,
    "max_points": 100
  }
]`;

  try {
    console.log("\n🤖 ============================================");
    console.log("🤖 GENERATED WITH GROQ AI (Coding Challenges)");
    console.log("🤖 Model: llama-3.3-70b-versatile");
    console.log("🤖 Category:", category);
    console.log("🤖 Count:", count);
    console.log("🤖 ============================================\n");
    
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are a coding assessment expert. Generate solvable coding challenges with clear test cases. Return ONLY valid JSON array.",
        },
        { role: "user", content: prompt },
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.8,
      max_tokens: 4000,
    });

    const content = completion.choices[0]?.message?.content || "[]";
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];

    // Clean up common JSON issues from AI generation
    let jsonString = jsonMatch[0]
      .replace(/,\s*}/g, '}')  // Remove trailing commas before }
      .replace(/,\s*\]/g, ']') // Remove trailing commas before ]
      .replace(/(['"])\s*\n\s*(['"])/g, '$1 $2') // Fix broken strings
      .replace(/\\n/g, '\\n') // Escape newlines properly
      .replace(/[\x00-\x1F\x7F]/g, ' '); // Remove control characters
    
    let challenges;
    try {
      challenges = JSON.parse(jsonString);
    } catch (parseError) {
      console.error("JSON parse failed, attempting repair...", parseError);
      jsonString = jsonString.replace(/,([^,\[\]{}]*)(\]|\})/g, '$1$2');
      try {
        challenges = JSON.parse(jsonString);
      } catch {
        console.error("JSON repair failed, using fallback");
        return [];
      }
    }
    
    // Add unique IDs and HIDE answers from test cases sent to client
    return challenges.map((c: any, i: number) => {
      // Filter test cases to hide expected output for hidden tests
      const safeTestCases = c.test_cases?.map((tc: any) => ({
        input: tc.input,
        expected: tc.hidden ? '[HIDDEN]' : tc.expected,
        hidden: tc.hidden
      })) || [];
      
      return {
        ...c,
        test_cases: safeTestCases,
        // Store original test cases in a separate field for server-side validation
        _validation_cases: c.test_cases,
        id: `coding_${userId}_${Date.now()}_${i}`,
        generated_for: userId,
        generated_at: new Date().toISOString(),
      };
    });
  } catch (error: any) {
    console.error("Coding generation error:", error);
    
    // Check if it's a rate limit error (429)
    if (error?.status === 429 || error?.error?.code === "rate_limit_exceeded") {
      console.log("⚠️ Rate limit hit, using fallback coding challenges");
      // Return fallback challenges with shuffled order
      const shuffled = [...FALLBACK_CODING_CHALLENGES].sort(() => Math.random() - 0.5);
      return shuffled.slice(0, count).map((c: any, i: number) => ({
        ...c,
        id: `coding_${userId}_${Date.now()}_${i}`,
        generated_for: userId,
        generated_at: new Date().toISOString(),
        is_fallback: true,
      }));
    }
    
    return [];
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { type, count = 10 } = body;

    if (!type || !["mcq", "coding", "both"].includes(type)) {
      return NextResponse.json(
        { error: "Invalid type. Use 'mcq', 'coding', or 'both'" },
        { status: 400 }
      );
    }

    // Get previously answered question IDs for this user
    const { data: answeredMcqs } = await supabase
      .from("user_answered_questions")
      .select("question_id")
      .eq("user_id", user.id)
      .eq("question_type", "mcq");

    const { data: answeredCoding } = await supabase
      .from("user_answered_questions")
      .select("question_id")
      .eq("user_id", user.id)
      .eq("question_type", "coding");

    const excludeMcqIds = (answeredMcqs as { question_id: string }[] | null)?.map(a => a.question_id) || [];
    const excludeCodingIds = (answeredCoding as { question_id: string }[] | null)?.map(a => a.question_id) || [];

    const result: { mcq_questions?: any[]; coding_challenges?: any[] } = {};

    if (type === "mcq" || type === "both") {
      result.mcq_questions = await generateMCQQuestions(count, excludeMcqIds, user.id);
    }

    if (type === "coding" || type === "both") {
      result.coding_challenges = await generateCodingChallenges(
        type === "both" ? Math.min(count, 3) : count,
        excludeCodingIds,
        user.id
      );
    }

    return NextResponse.json({
      success: true,
      ...result,
      user_id: user.id,
      previously_answered: {
        mcq: excludeMcqIds.length,
        coding: excludeCodingIds.length,
      },
    });
  } catch (error) {
    console.error("Question generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate questions" },
      { status: 500 }
    );
  }
}

// GET: Fetch user's question history
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: history } = await supabase
      .from("user_answered_questions")
      .select("*")
      .eq("user_id", user.id)
      .order("answered_at", { ascending: false });

    type HistoryItem = { question_type: string; [key: string]: any };
    const typedHistory = history as HistoryItem[] | null;
    const mcqCount = typedHistory?.filter(h => h.question_type === "mcq").length || 0;
    const codingCount = typedHistory?.filter(h => h.question_type === "coding").length || 0;

    return NextResponse.json({
      success: true,
      total_answered: typedHistory?.length || 0,
      mcq_answered: mcqCount,
      coding_answered: codingCount,
      history: typedHistory?.slice(0, 50) || [],
    });
  } catch (error) {
    console.error("History fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch history" },
      { status: 500 }
    );
  }
}
