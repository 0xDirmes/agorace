"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { RotateCcw, X } from "lucide-react";
import { PassageDisplay } from "./PassageDisplay";
import { LiveStats } from "./LiveStats";
import { calculateTypingStats, type TypingStats } from "@/lib/scoring";
interface TypingGameProps {
  passage: string;
  onComplete: (stats: TypingStats) => void;
  onCancel: () => void;
}

type GameState = "ready" | "playing" | "finished";

export function TypingGame({
  passage,
  onComplete,
  onCancel,
}: TypingGameProps) {
  const [input, setInput] = useState("");
  const [gameState, setGameState] = useState<GameState>("ready");
  const [startTime, setStartTime] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [inputKey, setInputKey] = useState(0);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Focus input on mount and after reset
  useEffect(() => {
    inputRef.current?.focus();
  }, [inputKey]);

  // Timer effect
  useEffect(() => {
    if (gameState !== "playing" || !startTime) return;

    const timer = setInterval(() => {
      setCurrentTime(Date.now() - startTime);
    }, 100);

    return () => clearInterval(timer);
  }, [gameState, startTime]);

  // Calculate current stats
  const stats = calculateTypingStats(
    input,
    passage,
    startTime ?? Date.now(),
    Date.now()
  );

  const handleInput = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;

      // Start game on first keystroke
      if (gameState === "ready" && value.length > 0) {
        setGameState("playing");
        setStartTime(Date.now());
      }

      setInput(value);

      // Check for completion
      if (value.length >= passage.length) {
        setGameState("finished");
        const finalStats = calculateTypingStats(
          value,
          passage,
          startTime ?? Date.now(),
          Date.now()
        );
        onComplete(finalStats);
      }
    },
    [gameState, passage, startTime, onComplete]
  );

  const handleReset = () => {
    setInput("");
    setGameState("ready");
    setStartTime(null);
    setCurrentTime(0);
    setInputKey((k) => k + 1);
  };

  const progress = (input.length / passage.length) * 100;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-background z-50 flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-4 border-b border-border">
        <div className="flex items-center gap-4">
          <button
            onClick={handleReset}
            className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            title="Reset"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
          <span className="font-mono text-sm text-muted-foreground">
            {(currentTime / 1000).toFixed(1)}s
          </span>
        </div>

        {/* Live Stats */}
        <LiveStats
          wpm={stats.wpm}
          accuracy={stats.accuracy}
          score={stats.score}
          timeMs={currentTime}
        />

        <button
          onClick={onCancel}
          className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          title="Cancel"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Typing Area */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 max-w-4xl mx-auto w-full">
        {/* Passage Display */}
        <div className="mb-8 w-full">
          <PassageDisplay passage={passage} input={input} />
        </div>

        {/* Input Area */}
        <textarea
          key={inputKey}
          ref={inputRef}
          value={input}
          onChange={handleInput}
          onPaste={(e) => e.preventDefault()}
          onDrop={(e) => e.preventDefault()}
          className="w-full h-32 p-6 bg-muted/50 border border-border rounded-xl font-mono text-lg
                     focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
                     resize-none placeholder:text-muted-foreground"
          placeholder="Start typing..."
          disabled={gameState === "finished"}
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
        />

        {/* Progress */}
        <div className="mt-6 w-full">
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ type: "spring", stiffness: 100 }}
            />
          </div>
          <div className="flex justify-between mt-2 text-sm text-muted-foreground">
            <span>
              {input.length} / {passage.length} characters
            </span>
            <span>{Math.round(progress)}% complete</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
