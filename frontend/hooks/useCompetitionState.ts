"use client";

import { useReadContract } from "wagmi";
import { AGORACE_ADDRESS, agoRaceAbi } from "@/lib/contracts";
import { COMPETITION_POLL_INTERVAL, AUSD_DECIMALS } from "@/lib/constants";
import { type CompetitionState } from "@/types";

interface UseCompetitionStateResult {
  // Raw data
  startTime: bigint;
  endTime: bigint;
  pot: bigint;
  settled: boolean;
  active: boolean;
  playerCount: bigint;
  // Formatted for display
  potFormatted: string;
  endDate: Date | null;
  timeRemaining: number | null; // milliseconds
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

export function useCompetitionState(): UseCompetitionStateResult {
  const { data, isLoading, isError, refetch } = useReadContract({
    address: AGORACE_ADDRESS,
    abi: agoRaceAbi,
    functionName: "getState",
    query: {
      refetchInterval: COMPETITION_POLL_INTERVAL,
    },
  });

  // Default values
  const defaultState: UseCompetitionStateResult = {
    startTime: BigInt(0),
    endTime: BigInt(0),
    pot: BigInt(0),
    settled: false,
    active: false,
    playerCount: BigInt(0),
    potFormatted: "0",
    endDate: null,
    timeRemaining: null,
    isLoading,
    isError,
    refetch,
  };

  if (!data) {
    return defaultState;
  }

  const [startTime, endTime, pot, settled, active, playerCount] = data;

  // Format pot for display (AUSD has 6 decimals)
  const potFormatted = (Number(pot) / Math.pow(10, AUSD_DECIMALS)).toLocaleString();

  // Calculate end date and time remaining
  const endDate = endTime > 0 ? new Date(Number(endTime) * 1000) : null;
  const now = Date.now();
  const timeRemaining = endDate ? Math.max(0, endDate.getTime() - now) : null;

  return {
    startTime,
    endTime,
    pot,
    settled,
    active,
    playerCount,
    potFormatted,
    endDate,
    timeRemaining,
    isLoading,
    isError,
    refetch,
  };
}
