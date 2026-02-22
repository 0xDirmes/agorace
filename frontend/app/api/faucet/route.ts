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
import { AUSD_ADDRESS, ATTEMPT_FEE } from "@/lib/contracts";

// Server-side wallet for sponsoring transactions
const SERVER_PK = process.env.SERVER_PK;

if (!SERVER_PK) {
  console.warn("SERVER_PK not set - faucet API will fail");
}

// MockAUSD mint ABI
const mockAusdMintAbi = [
  {
    name: "mint",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_to", type: "address" },
      { name: "_amount", type: "uint256" },
    ],
    outputs: [],
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

    // Mint AUSD to user (1 AUSD = attempt fee)
    const hash = await walletClient.writeContract({
      address: AUSD_ADDRESS,
      abi: mockAusdMintAbi,
      functionName: "mint",
      args: [body.address, ATTEMPT_FEE],
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
      amount: ATTEMPT_FEE.toString(),
    });
  } catch (error) {
    console.error("Faucet error:", error);

    let errorMessage = "Failed to mint tokens";
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
