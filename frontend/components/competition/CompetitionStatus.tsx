"use client";

import { useCompetitionState } from "@/hooks/useCompetitionState";
import { CountdownTimer } from "./CountdownTimer";
import { PrizePool } from "./PrizePool";

interface CompetitionStatusProps {
  compact?: boolean;
}

export function CompetitionStatus({ compact = false }: CompetitionStatusProps) {
  const { potFormatted, endDate, active, settled, playerCount, isLoading } =
    useCompetitionState();

  if (isLoading) {
    return (
      <div className="animate-pulse glass-card rounded-2xl p-6">
        <div className="h-8 bg-muted rounded w-1/2 mx-auto mb-4" />
        <div className="h-16 bg-muted rounded w-3/4 mx-auto" />
      </div>
    );
  }

  // Competition ended
  if (settled) {
    return (
      <div className="glass-card rounded-2xl p-6 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-muted rounded-full mb-4">
          <span className="w-2 h-2 bg-warning rounded-full" />
          <span className="text-sm text-muted-foreground font-medium">
            Competition Ended
          </span>
        </div>
        <p className="text-muted-foreground">
          The competition has been settled. Stay tuned for the next one!
        </p>
      </div>
    );
  }

  // No active competition
  if (!active || !endDate) {
    return (
      <div className="glass-card rounded-2xl p-6 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-muted rounded-full mb-4">
          <span className="w-2 h-2 bg-muted-foreground rounded-full" />
          <span className="text-sm text-muted-foreground font-medium">
            No Active Competition
          </span>
        </div>
        <p className="text-muted-foreground">
          Waiting for the next competition to start.
        </p>
      </div>
    );
  }

  // Active competition
  if (compact) {
    return (
      <div className="flex items-center gap-6">
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Time Left</p>
          <CountdownTimer endDate={endDate} compact />
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Prize Pool</p>
          <PrizePool amount={potFormatted} compact />
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Players</p>
          <span className="font-mono font-bold text-foreground">
            {Number(playerCount)}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-2xl p-6 space-y-6">
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-secondary/50 rounded-full">
        <span className="w-2 h-2 bg-correct rounded-full animate-pulse" />
        <span className="text-sm text-secondary-foreground font-medium">
          Competition Live
        </span>
      </div>

      <PrizePool amount={potFormatted} />

      <div className="border-t border-border pt-6">
        <p className="text-center text-sm text-muted-foreground mb-3">
          Competition ends in
        </p>
        <CountdownTimer endDate={endDate} />
      </div>

      <div className="text-center text-sm text-muted-foreground">
        <span className="font-mono font-bold text-foreground">
          {Number(playerCount)}
        </span>{" "}
        players competing
      </div>
    </div>
  );
}
