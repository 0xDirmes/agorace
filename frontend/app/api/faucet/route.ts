import { NextRequest, NextResponse } from "next/server";
import {
  createWalletClient,
  http,
  type Address,
  isAddress,
  createPublicClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arbitrumSepolia } from "@/lib/chains";
import { AUSD_ADDRESS } from "@/lib/contracts";

// 10 AUSD (6 decimals)
const FAUCET_AMOUNT = 10_000_000n;

// Server-side wallet for sponsoring transactions
const SERVER_PK = process.env.SERVER_PK;

if (!SERVER_PK) {
  console.warn("SERVER_PK not set - faucet API will fail");
}

// ERC-20 transfer ABI
const transferAbi = [
  {
    name: "transfer",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

interface FaucetBody {
  address: Address;
}

export async function POST(request: NextRequest) {
  try {
    // Validate server key is configured
    if (!SERVER_PK) {
      return NextResponse.json(
        { success: false, error: "Server not configured" },
        { status: 500 }
      );
    }

    // Parse and validate request body
    const body: FaucetBody = await request.json();

    if (!body.address || !isAddress(body.address)) {
      return NextResponse.json(
        { success: false, error: "Invalid address" },
        { status: 400 }
      );
    }

    // Create account from server private key
    const serverAccount = privateKeyToAccount(SERVER_PK as `0x${string}`);

    // Create wallet client
    const walletClient = createWalletClient({
      account: serverAccount,
      chain: arbitrumSepolia,
      transport: http(),
    });

    // Create public client for waiting for transaction
    const publicClient = createPublicClient({
      chain: arbitrumSepolia,
      transport: http(),
    });

    // Transfer AUSD from server wallet to user
    const hash = await walletClient.writeContract({
      address: AUSD_ADDRESS,
      abi: transferAbi,
      functionName: "transfer",
      args: [body.address, FAUCET_AMOUNT],
    });

    // Wait for transaction confirmation
    const receipt = await publicClient.waitForTransactionReceipt({
      hash,
      timeout: 60_000, // 1 minute timeout
    });

    if (receipt.status === "reverted") {
      return NextResponse.json(
        { success: false, error: "Transaction reverted" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      txHash: hash,
      amount: FAUCET_AMOUNT.toString(),
    });
  } catch (error) {
    console.error("Faucet error:", error);

    let errorMessage = "Failed to send tokens";
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
