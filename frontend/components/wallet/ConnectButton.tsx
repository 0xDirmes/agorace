"use client";

import { useState } from "react";
import { useAccount, useConnectors, useDisconnect } from "wagmi";
import { useConnect } from "porto/wagmi/Hooks";
import { motion } from "framer-motion";
import { Wallet, Fingerprint, LogOut, Loader2, Coins, Copy, Check } from "lucide-react";
import { useWalletSetup } from "@/hooks/useWalletSetup";
import { formatUnits } from "viem";

interface ConnectButtonProps {
  variant?: "primary" | "outline";
}

export function ConnectButton({ variant = "primary" }: ConnectButtonProps) {
  const { address, isConnected, isConnecting } = useAccount();
  const { mutate: connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const connectors = useConnectors();
  const { status: setupStatus, balance } = useWalletSetup();

  const [copied, setCopied] = useState(false);

  // Get the Porto connector
  const portoConnector = connectors[0];

  const handleConnect = () => {
    if (!portoConnector) return;

    const hasConnectedBefore =
      localStorage.getItem("porto.hasConnected") === "true";

    connect(
      {
        connector: portoConnector,
        ...(hasConnectedBefore ? {} : { createAccount: true }),
      },
      {
        onSuccess: () => {
          localStorage.setItem("porto.hasConnected", "true");
        },
      },
    );
  };

  // Format balance for display (AUSD has 6 decimals)
  const formattedBalance = balance !== undefined ? formatUnits(balance, 6) : "0";

  // Connected state - show account info with balance
  if (isConnected && address) {
    return (
      <div className="flex items-center gap-3 px-4 py-2 bg-muted rounded-lg">
        {/* Balance display */}
        {setupStatus === "checking" ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Loading...</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-sm">
            <Coins className="w-4 h-4 text-accent" />
            <span className="font-medium">{formattedBalance}</span>
            <span className="text-muted-foreground">AUSD</span>
          </div>
        )}

        {/* Divider */}
        <div className="w-px h-4 bg-border" />

        {/* Address with copy button */}
        <button
          onClick={() => {
            navigator.clipboard.writeText(address);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="flex items-center gap-1.5 font-mono text-sm text-foreground hover:text-accent transition-colors"
          title={copied ? "Copied!" : "Copy address"}
        >
          <span>{address.slice(0, 6)}...{address.slice(-4)}</span>
          {copied ? (
            <Check className="w-3.5 h-3.5 text-green-500" />
          ) : (
            <Copy className="w-3.5 h-3.5 text-muted-foreground" />
          )}
        </button>

        {/* Disconnect button */}
        <button
          onClick={() => disconnect()}
          className="p-1 hover:bg-background rounded transition-colors"
          title="Disconnect"
        >
          <LogOut className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>
    );
  }

  // Connecting state - show appropriate message
  if (isConnecting || isPending) {
    return (
      <button
        disabled
        className={
          variant === "primary"
            ? "btn-game-primary opacity-70"
            : "btn-game-outline opacity-70"
        }
      >
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Connecting...</span>
        </div>
      </button>
    );
  }

  // Disconnected state - show connect button
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={handleConnect}
      className={
        variant === "primary" ? "btn-game-primary" : "btn-game-outline"
      }
    >
      <div className="flex items-center gap-3">
        <div className="relative">
          <Wallet className="w-5 h-5" />
          <Fingerprint className="w-3 h-3 absolute -bottom-1 -right-1 text-accent" />
        </div>
        <span>Connect with Porto</span>
      </div>
    </motion.button>
  );
}
