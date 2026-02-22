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
      {/* Keycap with Agora tree mark */}
      <svg viewBox="0 0 40 40" width={40} height={40} fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="3" y="5" width="34" height="33" rx="5" fill="hsl(var(--primary) / 0.2)" stroke="hsl(var(--primary) / 0.4)" strokeWidth="1.5" />
        <rect x="3" y="28" width="34" height="10" rx="0 0 5 5" fill="hsl(var(--primary) / 0.1)" />
        <rect x="6" y="5" width="28" height="25" rx="4" fill="hsl(var(--muted))" stroke="hsl(var(--primary) / 0.6)" strokeWidth="1.5" />
        <rect x="9" y="7" width="22" height="21" rx="3" fill="hsl(var(--muted) / 0.6)" />
        <g transform="translate(11, 8) scale(0.079)" fill="hsl(var(--primary))">
          <path d="m107.9 0v88.1c0 3.7-4.4 5.5-7 2.9l-41.5-40.5 17.4-45.2c1.2-3.2 4.3-5.3 7.7-5.3h23.4z"/>
          <path d="m107.9 120v49.5c0 3.3-3.9 4.9-6.3 2.7l-64.3-60.6 18.9-49 46.9 45.9c3.1 3 4.8 7.1 4.8 11.5z"/>
          <path d="m107.9 199.8v22.2h-99.7c-5.7 0-9.7-5.8-7.6-11.1l33.4-87 69.3 65.4c3 2.7 4.6 6.5 4.6 10.5z"/>
          <path d="m118.6 0v88.1c0 3.7 4.4 5.5 7 2.9l41.4-40.5-17.3-45.2c-1.3-3.2-4.3-5.3-7.7-5.3h-23.4z"/>
          <path d="m118.6 120v49.5c0 3.3 3.9 4.9 6.3 2.7l64.3-60.6-18.9-49-46.9 45.9c-3.1 3-4.9 7.1-4.9 11.5z"/>
          <path d="m118.6 199.8v22.2h99.6c5.8 0 9.8-5.8 7.7-11.1l-33.5-87-69.3 65.4c-2.9 2.7-4.5 6.5-4.5 10.5z"/>
        </g>
        <line x1="10" y1="36" x2="30" y2="36" stroke="hsl(var(--primary) / 0.25)" strokeWidth="1.5" strokeLinecap="round" />
      </svg>

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
