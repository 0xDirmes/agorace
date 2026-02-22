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
import { AGORACE_ADDRESS, agoRaceAbi } from "@/lib/contracts";

const ERROR_MESSAGES: Record<string, string> = {
  CompetitionNotActive: "Competition not active",
  NotOperator: "Server not authorized as operator",
  ERC20InsufficientAllowance: "AUSD not approved — please approve first",
  ERC20InsufficientBalance: "Insufficient AUSD balance",
  InsufficientBalance: "Insufficient AUSD balance",
};

function getErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) return "Failed to submit attempt";
  const match = Object.entries(ERROR_MESSAGES).find(([key]) =>
    error.message.includes(key)
  );
  return match ? match[1] : error.message;
}

const SERVER_PK = process.env.SERVER_PK;

if (!SERVER_PK) {
  console.warn("SERVER_PK not set - submit-attempt API will fail");
}

interface SubmitAttemptBody {
  player: Address;
  score: number;
}

export async function POST(request: NextRequest) {
  try {
    if (!SERVER_PK) {
      return NextResponse.json(
        { success: false, error: "Server not configured" },
        { status: 500 }
      );
    }

    const body: SubmitAttemptBody = await request.json();

    if (!body.player || !isAddress(body.player)) {
      return NextResponse.json(
        { success: false, error: "Invalid player address" },
        { status: 400 }
      );
    }

    if (typeof body.score !== "number" || body.score < 0) {
      return NextResponse.json(
        { success: false, error: "Invalid score" },
        { status: 400 }
      );
    }

    const serverAccount = privateKeyToAccount(SERVER_PK as `0x${string}`);

    const walletClient = createWalletClient({
      account: serverAccount,
      chain: arbitrumSepolia,
      transport: http(),
    });

    const publicClient = createPublicClient({
      chain: arbitrumSepolia,
      transport: http(),
    });

    const hash = await walletClient.writeContract({
      address: AGORACE_ADDRESS,
      abi: agoRaceAbi,
      functionName: "submitAttempt",
      args: [body.player, BigInt(body.score)],
    });

    const receipt = await publicClient.waitForTransactionReceipt({
      hash,
      timeout: 60_000,
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
    });
  } catch (error) {
    console.error("Submit attempt error:", error);

    return NextResponse.json(
      { success: false, error: getErrorMessage(error) },
      { status: 500 }
    );
  }
}
