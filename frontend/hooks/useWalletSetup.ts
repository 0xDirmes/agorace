"use client";

import { useAccount, useReadContract } from "wagmi";
import { AUSD_ADDRESS, ausdAbi, ATTEMPT_FEE } from "@/lib/contracts";

type SetupStatus = "idle" | "checking" | "ready";

interface UseWalletSetupResult {
  status: SetupStatus;
  balance: bigint | undefined;
  hasEnoughBalance: boolean;
  refetchBalance: () => void;
}

export function useWalletSetup(): UseWalletSetupResult {
  const { address, isConnected } = useAccount();

  // Read AUSD balance
  const {
    data: balance,
    refetch: refetchBalance,
    isLoading: isBalanceLoading,
  } = useReadContract({
    address: AUSD_ADDRESS,
    abi: ausdAbi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });

  const hasEnoughBalance = balance !== undefined && balance >= ATTEMPT_FEE;

  // Determine status
  let status: SetupStatus = "idle";
  if (isConnected && address) {
    status = isBalanceLoading ? "checking" : "ready";
  }

  return {
    status,
    balance,
    hasEnoughBalance,
    refetchBalance,
  };
}
