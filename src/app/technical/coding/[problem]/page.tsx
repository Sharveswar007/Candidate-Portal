"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { CodeEditor } from "@/components/coding/code-editor";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    CheckCircle,
    XCircle,
    AlertCircle,
    ChevronRight,
    FileCode,
    Files,
    Settings,
    Play,
    Terminal,
    Search,
    Bug
} from "lucide-react";

export default function CodingProblemPage() {
    const params = useParams();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState("problem");
    const [consoleOpen, setConsoleOpen] = useState(true);
    const [isRunning, setIsRunning] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [output, setOutput] = useState<any>(null);
    const [userCode, setUserCode] = useState("");
    const videoRef = useRef<HTMLVideoElement>(null);

    // Camera setup for proctoring view
    useEffect(() => {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia({ video: true })
                .then(stream => {
                    if (videoRef.current) {
                        videoRef.current.srcObject = stream;
                    }
                })
                .catch(err => console.error("Camera access denied:", err));
        }
    }, []);

    // Mock problem data matching the user's report
    // In a real app, this would be fetched based on params.problem
    const problem = {
        title: "Sorted Array Search",
        difficulty: "Easy",
        functionName: "sorted_array_search",
        description: `Given a sorted array of integers and a target value, find the index of the target value in the array.\n\nIf the target value is not found, return -1. The array is sorted in ascending order.`,
        examples: [
            { input: "arr = [1, 2, 3, 4, 5], target = 3", output: "2", explanation: "3 is at index 2" },
            { input: "arr = [1, 2, 3, 4, 5], target = 6", output: "-1", explanation: "6 is not in the array" }
        ],
        // Test cases for the driver code
        testCases: [
            { args: [[1, 2, 3, 4, 5], 3], expected: 2 },
            { args: [[1, 2, 3, 4, 5], 6], expected: -1 },
            { args: [[10, 20, 30, 40, 50], 30], expected: 2 }
        ],
        initialCode: `def sorted_array_search(arr, target):
    # Write your code here
    # Remember array is sorted
    low = 0
    high = len(arr) - 1
    
    while low <= high:
        mid = (low + high) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            low = mid + 1
        else:
            high = mid - 1
            
    return -1
`
    };

    const handleRun = async (code: string) => {
        setIsRunning(true);
        if (!consoleOpen) setConsoleOpen(true);
        setOutput(null);

        try {
            // Dynamic Python Driver Logic
            // Serializes test cases and boilerplate to call user function safely
            const driverCode = `
import sys
import json

# User Code
${code}

# Test Driver
if __name__ == "__main__":
    try:
        test_cases = ${JSON.stringify(problem.testCases)}
        
        results = []
        passed_count = 0
        
        for i, tc in enumerate(test_cases):
            args = tc['args']
            expected = tc['expected']
            
            try:
                # Dynamic function call with unpacking
                result = ${problem.functionName}(*args)
                
                is_pass = str(result) == str(expected)
                if is_pass: passed_count += 1
                
                status = "[PASS]" if is_pass else "[FAIL]"
                results.append(f"Test Case {i+1}: {status}\\n  Input: {args}\\n  Result: {result}\\n  Expected: {expected}")
            except Exception as e:
                results.append(f"Test Case {i+1}: [ERROR] Runtime Error\\n  {str(e)}")
        
        print(f"Summary: {passed_count}/{len(test_cases)} Passed\\n")
        print("\\n".join(results))
        
    except Exception as e:
        print(f"Driver Error: {str(e)}")
`;

            const response = await fetch("/api/challenges/run", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    code: driverCode,
                    language: "python",
                    stdin: "" // Driver has tests embedded now 
                })
            });

            const data = await response.json();

            setOutput({
                status: data.success ? "success" : "error",
                logs: data.output || data.error
            });

        } catch (error) {
            setOutput({
                status: "error",
                logs: "Failed to connect to execution server"
            });
        } finally {
            setIsRunning(false);
        }
    };

    const handleSubmit = async (code: string) => {
        setIsSubmitting(true);
        // Simulate submission
        await new Promise(resolve => setTimeout(resolve, 1500));
        router.push("/psychometric/scenarios");
    };

    return (
        <div className="flex h-[calc(100vh-64px)] bg-[#1e1e1e] text-[#d4d4d4] overflow-hidden font-sans">
            {/* Activity Bar (Leftmost VS Code style) */}
            <div className="w-12 bg-[#181818] border-r border-[#2b2b2b] flex flex-col items-center py-4 gap-6">
                <Files className="h-6 w-6 text-[#858585] hover:text-white cursor-pointer" />
                <Search className="h-6 w-6 text-[#6e6e6e] hover:text-white cursor-pointer" />
                <Bug className="h-6 w-6 text-[#6e6e6e] hover:text-white cursor-pointer" />
                <div className="flex-1" />
                <Settings className="h-6 w-6 text-[#6e6e6e] hover:text-white cursor-pointer" />
            </div>

            {/* Side Panel (Problem & Explorer) */}
            <div className="w-[350px] bg-[#181818] border-r border-[#2b2b2b] flex flex-col">
                <div className="h-9 px-4 flex items-center bg-[#181818] text-xs font-semibold uppercase tracking-wider text-[#6e6e6e]">
                    Explorer
                </div>
                <div className="px-2 py-1 flex items-center gap-2 bg-[#2a2d2e] text-orange-300 text-sm">
                    <FileCode className="h-4 w-4" />
                    problem.py
                </div>

                <div className="flex-1 overflow-hidden flex flex-col border-t border-[#2b2b2b] mt-2">
                    <div className="h-9 px-4 flex items-center bg-[#181818] text-xs font-semibold uppercase tracking-wider text-[#6e6e6e]">
                        Problem Description
                    </div>
                    <ScrollArea className="flex-1 px-4 py-4">
                        <h1 className="text-xl font-bold text-white mb-2">{problem.title}</h1>
                        <div className="flex items-center gap-2 mb-4">
                            <Badge className="bg-[#2E2E2E]/10 text-[#2E2E2E] dark:text-white text-xs border-[#2E2E2E]/20">{problem.difficulty}</Badge>
                        </div>
                        <div className="prose prose-invert prose-sm max-w-none text-[#d4d4d4]/90 leading-relaxed mb-6">
                            <p className="whitespace-pre-wrap">{problem.description}</p>
                        </div>

                        <div className="space-y-4">
                            {problem.examples.map((ex, i) => (
                                <div key={i} className="bg-[#1e1e1e] p-3 rounded border border-[#2b2b2b]">
                                    <h3 className="text-xs font-semibold text-[#6e6e6e] mb-2 uppercase">Example {i + 1}</h3>
                                    <div className="space-y-1 font-mono text-xs">
                                        <div className="flex gap-2">
                                            <span className="text-blue-400">Input:</span>
                                            <span className="text-[#d4d4d4]">{ex.input}</span>
                                        </div>
                                        <div className="flex gap-2">
                                            <span className="text-orange-400">Output:</span>
                                            <span className="text-[#d4d4d4]">{ex.output}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                </div>
            </div>

            {/* Main Editor Area */}
            <div className="flex-1 flex flex-col bg-[#1e1e1e] relative">
                {/* Editor Tabs */}
                <div className="h-9 flex bg-[#181818] border-b border-[#2b2b2b]">
                    <div className="px-4 flex items-center gap-2 bg-[#1e1e1e] border-t-2 border-orange-400 text-sm text-[#d4d4d4] min-w-[120px]">
                        <FileCode className="h-3 w-3 text-orange-400" />
                        solution.py
                    </div>
                </div>

                {/* Editor */}
                <div className="flex-1 relative">
                    <CodeEditor
                        initialCode={problem.initialCode}
                        onRun={handleRun}
                        onSubmit={handleSubmit}
                        onChange={setUserCode}
                        isRunning={isRunning}
                        isSubmitting={isSubmitting}
                        hideButtons={true}
                    />

                    {/* Floating Camera View (Corner) */}
                    <div className="absolute bottom-4 right-4 w-40 h-28 bg-black rounded-lg border border-[#404040] overflow-hidden shadow-2xl z-50">
                        <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
                        <div className="absolute top-1 right-1">
                            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
                        </div>
                    </div>
                </div>

                {/* Terminal / Output Panel (Bottom) */}
                <div className={`border-t border-[#2b2b2b] bg-[#181818] transition-all duration-300 flex flex-col ${consoleOpen ? 'h-[200px]' : 'h-8'}`}>
                    <div
                        className="h-8 flex items-center justify-between px-4 bg-[#181818] hover:bg-[#202020] cursor-pointer border-b border-[#2b2b2b]"
                        onClick={() => setConsoleOpen(!consoleOpen)}
                    >
                        <div className="flex items-center gap-4 text-xs font-semibold text-[#858585] uppercase tracking-wide">
                            <div className="flex items-center gap-2 hover:text-white transition-colors">
                                <Terminal className="h-3 w-3" />
                                Console
                            </div>
                            <div className="flex items-center gap-2 hover:text-white transition-colors">
                                <AlertCircle className="h-3 w-3" />
                                Problems
                            </div>
                        </div>
                        <ChevronRight className={`h-4 w-4 text-[#6e6e6e] transition-transform ${consoleOpen ? 'rotate-90' : 'rotate-0'}`} />
                    </div>

                    {consoleOpen && (
                        <ScrollArea className="flex-1 p-4 font-mono text-sm">
                            {!output && !isRunning && (
                                <div className="text-[#6e6e6e] italic">Ready to execute. Press Run to start...</div>
                            )}
                            {isRunning && (
                                <div className="text-blue-400 animate-pulse">Running tests...</div>
                            )}
                            {output && (
                                <div className="whitespace-pre-wrap text-[#d4d4d4]">
                                    {output.logs}
                                </div>
                            )}
                        </ScrollArea>
                    )}
                </div>
            </div>

            {/* Custom Action Bar (Top Right Overlay or in Editor Header) */}
            <div className="absolute top-2 right-4 flex gap-2 z-50">
                <Button
                    size="sm"
                    variant="secondary"
                    className="bg-[#2E2E2E] hover:bg-[#404040] text-white h-7 text-xs gap-1.5"
                    onClick={() => handleRun(userCode || problem.initialCode)}
                    disabled={isRunning}
                >
                    <Play className="h-3 w-3" />
                    Run Code
                </Button>
            </div>
        </div>
    );
}

// Note: CodeEditor needs to store code in local state/ref to be accessible if we trigger from outside.
// For now, I'll assume CodeEditor's internal "Run" button is hidden and I might rely on its internal state if I can't reach it.
// Actually, to keep it simple, I will let CodeEditor handle the state completely,
// OR pass the code state up. The current CodeEditor implementation doesn't expose code effortlessly.
// I'll re-enable "hideButtons={false}" in CodeEditor if I can't easily control it, but the design calls for VS code style.
// Best approach: Modifying CodeEditor to accept "external trigger" or just keeping the buttons inside for functionality first.
