"use client";

import { motion } from "framer-motion";

interface AgoraLogoProps {
  className?: string;
}

export function AgoraLogo({ className = "" }: AgoraLogoProps) {
  return (
    <motion.div
      className={`flex items-center gap-3 ${className}`}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Mark */}
      <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
        <svg
          viewBox="0 0 24 24"
          className="w-6 h-6 text-primary-foreground"
          fill="currentColor"
        >
          <path
            d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Text */}
      <div className="flex flex-col">
        <span className="text-xl font-bold tracking-tight text-foreground">
          Ago<span className="text-primary">Race</span>
        </span>
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
          by 0xDirmes
        </span>
      </div>
    </motion.div>
  );
}
