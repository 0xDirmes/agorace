import { NextResponse } from "next/server";
import { createWalletClient, http, createPublicClient } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arbitrumSepolia } from "@/lib/chains";
import { AGORACE_ADDRESS, agoRaceAbi } from "@/lib/contracts";

const SERVER_PK = process.env.SERVER_PK;

if (!SERVER_PK) {
  console.warn("SERVER_PK not set - settle API will fail");
}

export async function POST() {
  try {
    if (!SERVER_PK) {
      return NextResponse.json(
        { success: false, error: "Server not configured" },
        { status: 500 }
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

    // Read current on-chain state
    const [, endTime, , settled, active, playerCount] =
      await publicClient.readContract({
        address: AGORACE_ADDRESS,
        abi: agoRaceAbi,
        functionName: "getState",
      });

    // Competition is still running — nothing to do
    if (active) {
      return NextResponse.json({
        success: true,
        settled: false,
        competitionStarted: false,
      });
    }

    let settleTxHash: string | undefined;
    let startTxHash: string | undefined;

    // Needs settling: expired, not settled, has had a competition before
    if (!settled && !active && endTime > 0n) {
      if (playerCount === 0n) {
        return NextResponse.json(
          { success: false, error: "Cannot settle — no players in competition" },
          { status: 400 }
        );
      }

      const hash = await walletClient.writeContract({
        address: AGORACE_ADDRESS,
        abi: agoRaceAbi,
        functionName: "settle",
      });

      const receipt = await publicClient.waitForTransactionReceipt({
        hash,
        timeout: 60_000,
      });

      if (receipt.status === "reverted") {
        return NextResponse.json(
          { success: false, error: "Settle transaction reverted" },
          { status: 500 }
        );
      }

      settleTxHash = hash;
    }

    // Start a new competition (whether we just settled or it was already settled)
    {
      const hash = await walletClient.writeContract({
        address: AGORACE_ADDRESS,
        abi: agoRaceAbi,
        functionName: "startCompetition",
      });

      const receipt = await publicClient.waitForTransactionReceipt({
        hash,
        timeout: 60_000,
      });

      if (receipt.status === "reverted") {
        return NextResponse.json(
          { success: false, error: "StartCompetition transaction reverted" },
          { status: 500 }
        );
      }

      startTxHash = hash;
    }

    return NextResponse.json({
      success: true,
      settled: !!settleTxHash,
      competitionStarted: true,
      settleTxHash,
      startTxHash,
    });
  } catch (error) {
    console.error("Settle error:", error);

    let errorMessage = "Failed to settle competition";
    if (error instanceof Error) {
      // Surface known contract revert reasons gracefully
      if (error.message.includes("AlreadySettled")) {
        errorMessage = "Competition already settled";
      } else if (error.message.includes("CompetitionActive")) {
        errorMessage = "Competition is already active";
      } else if (error.message.includes("NoPlayers")) {
        errorMessage = "Cannot settle — no players in competition";
      } else {
        errorMessage = error.message;
      }
    }

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
