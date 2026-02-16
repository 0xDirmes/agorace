import { type Address } from "viem";

// Competition state from contract
export interface CompetitionState {
  startTime: bigint;
  endTime: bigint;
  pot: bigint;
  settled: boolean;
  active: boolean;
  playerCount: bigint;
}

// Leaderboard entry (processed for display)
export interface LeaderboardEntry {
  rank: number;
  address: Address;
  score: number; // Decoded score (divided by 100)
  isCurrentUser?: boolean;
}

// Submit attempt API response
export interface SubmitAttemptResponse {
  success: boolean;
  txHash?: string;
  error?: string;
}
