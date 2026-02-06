"use client";

import { useEffect, useState } from "react";
import Editor from "@monaco-editor/react";
import { Button } from "@/components/ui/button";
import { Play, Send } from "lucide-react";

interface CodeEditorProps {
    initialCode?: string;
    language?: string;
    onRun?: (code: string) => void;
    onSubmit?: (code: string) => void;
    onChange?: (code: string) => void;
    isRunning?: boolean;
    isSubmitting?: boolean;
    hideButtons?: boolean;
}

const LANGUAGES = {
    python: {
        label: "Python",
        value: "python",
        defaultCode: "def solution():\n    # Write your code here\n    pass"
    }
};

export function CodeEditor({
    initialCode,
    language = "python",
    onRun,
    onSubmit,
    onChange,
    isRunning = false,
    isSubmitting = false,
    hideButtons = false
}: CodeEditorProps) {
    const [code, setCode] = useState(initialCode || LANGUAGES.python.defaultCode);

    useEffect(() => {
        if (initialCode) setCode(initialCode);
    }, [initialCode]);

    return (
        <div className="flex flex-col h-full bg-[#1e1e1e] rounded-xl overflow-hidden border border-[#404040]">
            {/* Toolbar */}
            <div className="flex items-center justify-between p-3 bg-[#2d2d2d] border-b border-[#404040]">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-3 h-8 bg-[#3c3c3c] border border-[#4a4a4a] text-white text-xs rounded-md">
                        <span className="text-yellow-400">🐍</span> Python
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {!hideButtons && (
                        <>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onRun?.(code)}
                                disabled={isRunning || isSubmitting}
                                className="bg-[#3c3c3c] border-[#4a4a4a] text-white hover:bg-[#4a4a4a] h-8"
                            >
                                {isRunning ? (
                                    "Running..."
                                ) : (
                                    <>
                                        <Play className="w-3 h-3 mr-2 text-white" />
                                        Run
                                    </>
                                )}
                            </Button>
                            <Button
                                size="sm"
                                onClick={() => onSubmit?.(code)}
                                disabled={isRunning || isSubmitting}
                                className="bg-[#2E2E2E] hover:bg-[#404040] text-white h-8"
                            >
                                {isSubmitting ? (
                                    "Submitting..."
                                ) : (
                                    <>
                                        <Send className="w-3 h-3 mr-2" />
                                        Submit
                                    </>
                                )}
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {/* Editor */}
            <div className="flex-1 relative">
                <Editor
                    height="100%"
                    defaultLanguage="python"
                    language="python"
                    value={code}
                    onChange={(value) => {
                        const newCode = value || "";
                        setCode(newCode);
                        onChange?.(newCode);
                    }}
                    theme="vs-dark"
                    options={{
                        minimap: { enabled: false },
                        fontSize: 14,
                        lineHeight: 22,
                        padding: { top: 16 },
                        scrollBeyondLastLine: false,
                        smoothScrolling: true,
                        cursorBlinking: "smooth",
                        cursorSmoothCaretAnimation: "on",
                        fontFamily: "JetBrains Mono, monospace"
                    }}
                />
            </div>
        </div>
    );
}
