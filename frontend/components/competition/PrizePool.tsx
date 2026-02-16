"use client";

import { motion } from "framer-motion";
import { Trophy } from "lucide-react";

interface PrizePoolProps {
  amount: string;
  compact?: boolean;
}

export function PrizePool({ amount, compact = false }: PrizePoolProps) {
  return (
    <div
      className={`flex flex-col items-center ${compact ? "gap-1" : "gap-2"}`}
    >
      {!compact && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Trophy className="w-5 h-5 text-primary" />
          <span className="uppercase tracking-wider text-sm font-medium">
            Prize Pool
          </span>
        </div>
      )}
      <div className="relative">
        <span
          className={`font-mono font-bold text-primary ${compact ? "text-2xl" : "text-5xl md:text-6xl"}`}
        >
          {amount} AUSD
        </span>
        <motion.div
          className="absolute inset-0 bg-primary/10 blur-2xl -z-10 rounded-full"
          animate={{ opacity: [0.2, 0.35, 0.2] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
      {!compact && (
        <p className="text-muted-foreground text-sm">Winner takes all!</p>
      )}
    </div>
  );
}
