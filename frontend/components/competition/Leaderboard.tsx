"use client";

import { motion } from "framer-motion";
import { Crown, Medal, Award } from "lucide-react";
import { useLeaderboard } from "@/hooks/useLeaderboard";

interface LeaderboardProps {
  compact?: boolean;
  maxEntries?: number;
}

function getRankIcon(rank: number) {
  switch (rank) {
    case 1:
      return <Crown className="w-5 h-5 text-prize-glow" />;
    case 2:
      return <Medal className="w-5 h-5 text-muted-foreground" />;
    case 3:
      return <Award className="w-5 h-5 text-warning" />;
    default:
      return (
        <span className="w-5 text-center font-mono text-muted-foreground">
          {rank}
        </span>
      );
  }
}

function getRankBg(rank: number, isCurrentUser: boolean) {
  if (isCurrentUser) {
    return "bg-primary/10 border-primary/30";
  }
  switch (rank) {
    case 1:
      return "bg-prize-glow/10 border-prize-glow/30";
    case 2:
      return "bg-muted border-muted-foreground/30";
    case 3:
      return "bg-warning/10 border-warning/30";
    default:
      return "bg-transparent border-transparent";
  }
}

function formatAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function Leaderboard({ compact = false, maxEntries }: LeaderboardProps) {
  const { entries, isLoading, isError } = useLeaderboard();

  const displayEntries = maxEntries ? entries.slice(0, maxEntries) : entries;
  const remainingCount = maxEntries ? Math.max(0, entries.length - maxEntries) : 0;

  if (isLoading) {
    return (
      <div className="w-full animate-pulse space-y-2">
        {[...Array(compact ? 5 : 10)].map((_, i) => (
          <div
            key={i}
            className="h-12 bg-muted rounded-lg"
            style={{ opacity: 1 - i * 0.1 }}
          />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center text-muted-foreground py-8">
        Failed to load leaderboard
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        No players yet. Be the first!
      </div>
    );
  }

  return (
    <div className="w-full">
      {!compact && (
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-foreground">Leaderboard</h3>
          <span className="text-sm text-muted-foreground">
            {entries.length} competitors
          </span>
        </div>
      )}

      {/* Header */}
      <div className="grid grid-cols-12 gap-2 px-4 py-2 text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
        <div className="col-span-1">#</div>
        <div className="col-span-7">Player</div>
        <div className="col-span-4 text-right">Score</div>
      </div>

      {/* Entries */}
      <div className="divide-y divide-border/50">
        {displayEntries.map((entry, index) => (
          <motion.div
            key={entry.address}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`grid grid-cols-12 gap-2 px-4 py-3 items-center transition-colors
              ${entry.isCurrentUser ? "leaderboard-row-highlight" : "leaderboard-row"}
              ${getRankBg(entry.rank, !!entry.isCurrentUser)} border-l-2`}
          >
            <div className="col-span-1 flex items-center">
              {getRankIcon(entry.rank)}
            </div>
            <div className="col-span-7 font-mono text-sm truncate text-foreground">
              {formatAddress(entry.address)}
              {entry.isCurrentUser && (
                <span className="ml-2 text-xs text-primary">(you)</span>
              )}
            </div>
            <div className="col-span-4 text-right font-mono font-bold text-primary">
              {entry.score.toFixed(0)}
            </div>
          </motion.div>
        ))}
      </div>

      {compact && remainingCount > 0 && (
        <div className="text-center py-3 text-sm text-muted-foreground">
          +{remainingCount} more players
        </div>
      )}
    </div>
  );
}
