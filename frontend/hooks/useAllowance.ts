"use client";

import { useAccount, useReadContract } from "wagmi";
import { AGORACE_ADDRESS, AUSD_ADDRESS, ATTEMPT_FEE, ausdAbi } from "@/lib/contracts";

interface UseAllowanceResult {
  allowance: bigint | undefined;
  hasSufficientAllowance: boolean;
  isLoading: boolean;
  refetch: () => void;
}

export function useAllowance(): UseAllowanceResult {
  const { address } = useAccount();

  const { data: allowance, isLoading, refetch } = useReadContract({
    address: AUSD_ADDRESS,
    abi: ausdAbi,
    functionName: "allowance",
    args: address ? [address, AGORACE_ADDRESS] : undefined,
    query: { enabled: !!address },
  });

  return {
    allowance,
    hasSufficientAllowance: allowance !== undefined && allowance >= ATTEMPT_FEE,
    isLoading,
    refetch,
  };
}
