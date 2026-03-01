import { type Address } from "viem";

// Contract addresses from environment (Arbitrum Sepolia)
export const AGORACE_ADDRESS = (process.env.NEXT_PUBLIC_AGORACE_ADDRESS ||
  "0x5e3b4d6B110428E716DE572786Ed85d301bdd93a") as Address;
export const AUSD_ADDRESS = (process.env.NEXT_PUBLIC_AUSD_ADDRESS ||
  "0xa9012a055bd4e0edff8ce09f960291c09d5322dc") as Address;

// AgoRace ABI - only the functions we need
export const agoRaceAbi = [
  // View functions
  {
    name: "getState",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "_startTime", type: "uint256" },
      { name: "_endTime", type: "uint256" },
      { name: "_pot", type: "uint256" },
      { name: "_settled", type: "bool" },
      { name: "_active", type: "bool" },
      { name: "_playerCount", type: "uint256" },
    ],
  },
  {
    name: "getPlayerState",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "_player", type: "address" }],
    outputs: [
      { name: "_bestScore", type: "uint256" },
      { name: "_hasPlayed", type: "bool" },
    ],
  },
  {
    name: "getLeaderboard",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "_players", type: "address[]" },
      { name: "_scores", type: "uint256[]" },
    ],
  },
  {
    name: "ATTEMPT_FEE",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "DURATION",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  // Write functions
  {
    name: "submitAttempt",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_player", type: "address" },
      { name: "_score", type: "uint256" },
    ],
    outputs: [],
  },
  {
    name: "settle",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  {
    name: "startCompetition",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
] as const;

// AUSD ABI - balance + approval functions
export const ausdAbi = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "_account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "decimals",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
  {
    name: "allowance",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "_owner", type: "address" },
      { name: "_spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_spender", type: "address" },
      { name: "_value", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

// Attempt fee: 1 AUSD (6 decimals)
export const ATTEMPT_FEE = 1_000_000n;
