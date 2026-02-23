"use client";

import { useEffect, useRef, useState } from "react";
import { useCompetitionState } from "./useCompetitionState";

interface UseAutoSettleResult {
  isSettling: boolean;
  settleError: string | null;
}

export function useAutoSettle(): UseAutoSettleResult {
  const { active, settled, endTime, refetch } = useCompetitionState();
  const [isSettling, setIsSettling] = useState(false);
  const [settleError, setSettleError] = useState<string | null>(null);
  const hasFired = useRef(false);

  const needsSettling = !active && !settled && endTime > 0n;

  useEffect(() => {
    if (!needsSettling || hasFired.current) return;
    hasFired.current = true;

    async function settle() {
      setIsSettling(true);
      setSettleError(null);

      try {
        const res = await fetch("/api/settle", { method: "POST" });
        const data = await res.json();

        if (!res.ok || !data.success) {
          setSettleError(data.error || "Failed to settle competition");
          return;
        }

        refetch();
      } catch {
        setSettleError("Network error — could not reach server");
      } finally {
        setIsSettling(false);
      }
    }

    settle();
  }, [needsSettling, refetch]);

  return { isSettling, settleError };
}
