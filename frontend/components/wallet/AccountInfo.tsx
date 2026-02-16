"use client";

import { useAccount, useDisconnect } from "wagmi";
import { LogOut } from "lucide-react";

export function AccountInfo() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();

  if (!isConnected || !address) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-muted rounded-lg">
      <span className="font-mono text-sm text-foreground">
        {address.slice(0, 6)}...{address.slice(-4)}
      </span>
      <button
        onClick={() => disconnect()}
        className="p-1 hover:bg-background rounded transition-colors"
        title="Disconnect wallet"
      >
        <LogOut className="w-4 h-4 text-muted-foreground" />
      </button>
    </div>
  );
}
