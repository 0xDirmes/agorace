"use client";

interface LiveStatsProps {
  wpm: number;
  accuracy: number;
  score: number;
  timeMs: number;
}

export function LiveStats({ wpm, accuracy, score, timeMs }: LiveStatsProps) {
  const getAccuracyColor = (acc: number) => {
    if (acc >= 95) return "text-correct";
    if (acc >= 80) return "text-warning";
    return "text-error";
  };

  return (
    <div className="flex items-center gap-8">
      <div className="text-center">
        <div className="text-3xl font-mono font-bold text-primary stat-value">
          {wpm}
        </div>
        <div className="text-xs uppercase tracking-wider text-muted-foreground">
          WPM
        </div>
      </div>
      <div className="text-center">
        <div
          className={`text-3xl font-mono font-bold stat-value ${getAccuracyColor(accuracy)}`}
        >
          {accuracy.toFixed(1)}%
        </div>
        <div className="text-xs uppercase tracking-wider text-muted-foreground">
          Accuracy
        </div>
      </div>
      <div className="text-center">
        <div className="text-3xl font-mono font-bold text-foreground stat-value">
          {score.toFixed(0)}
        </div>
        <div className="text-xs uppercase tracking-wider text-muted-foreground">
          Score
        </div>
      </div>
      <div className="text-center">
        <div className="text-xl font-mono text-muted-foreground">
          {(timeMs / 1000).toFixed(1)}s
        </div>
        <div className="text-xs uppercase tracking-wider text-muted-foreground">
          Time
        </div>
      </div>
    </div>
  );
}
