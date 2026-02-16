"use client";

import { useReadContract, useAccount } from "wagmi";
import { AGORACE_ADDRESS, agoRaceAbi } from "@/lib/contracts";
import { LEADERBOARD_POLL_INTERVAL } from "@/lib/constants";
import { decodeScore } from "@/lib/scoring";
import { type LeaderboardEntry } from "@/types";
import { type Address } from "viem";

interface UseLeaderboardResult {
  entries: LeaderboardEntry[];
  currentUserRank: number | null;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

export function useLeaderboard(): UseLeaderboardResult {
  const { address: currentUser } = useAccount();

  const { data, isLoading, isError, refetch } = useReadContract({
    address: AGORACE_ADDRESS,
    abi: agoRaceAbi,
    functionName: "getLeaderboard",
    query: {
      refetchInterval: LEADERBOARD_POLL_INTERVAL,
    },
  });

  // Default values
  const defaultResult: UseLeaderboardResult = {
    entries: [],
    currentUserRank: null,
    isLoading,
    isError,
    refetch,
  };

  if (!data) {
    return defaultResult;
  }

  const [players, scores] = data;

  // Create entries and sort by score descending
  const entries: LeaderboardEntry[] = players
    .map((address, index) => ({
      address: address as Address,
      score: decodeScore(scores[index]),
      rank: 0, // Will be set after sorting
      isCurrentUser: currentUser
        ? address.toLowerCase() === currentUser.toLowerCase()
        : false,
    }))
    .sort((a, b) => b.score - a.score)
    .map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));

  // Find current user's rank
  const currentUserRank = currentUser
    ? entries.find((e) => e.isCurrentUser)?.rank ?? null
    : null;

  return {
    entries,
    currentUserRank,
    isLoading,
    isError,
    refetch,
  };
}
