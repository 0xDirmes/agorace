"use client";

import { useReadContract, useAccount } from "wagmi";
import { AGORACE_ADDRESS, agoRaceAbi } from "@/lib/contracts";
import { PLAYER_STATE_POLL_INTERVAL } from "@/lib/constants";
import { decodeScore } from "@/lib/scoring";
import { type Address } from "viem";

interface UsePlayerStateResult {
  // Raw data
  bestScoreRaw: bigint;
  hasPlayed: boolean;
  // Formatted for display
  bestScore: number; // Decoded (divided by 100)
  // Status
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

export function usePlayerState(playerAddress?: Address): UsePlayerStateResult {
  const { address: connectedAddress } = useAccount();
  const address = playerAddress ?? connectedAddress;

  const { data, isLoading, isError, refetch } = useReadContract({
    address: AGORACE_ADDRESS,
    abi: agoRaceAbi,
    functionName: "getPlayerState",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
      refetchInterval: PLAYER_STATE_POLL_INTERVAL,
    },
  });

  // Default values
  const defaultState: UsePlayerStateResult = {
    bestScoreRaw: BigInt(0),
    hasPlayed: false,
    bestScore: 0,
    isLoading,
    isError,
    refetch,
  };

  if (!data || !address) {
    return defaultState;
  }

  const [bestScoreRaw, hasPlayed] = data;

  return {
    bestScoreRaw,
    hasPlayed,
    bestScore: decodeScore(bestScoreRaw),
    isLoading,
    isError,
    refetch,
  };
}
