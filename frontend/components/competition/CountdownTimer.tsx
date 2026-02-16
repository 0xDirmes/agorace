"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";

interface CountdownTimerProps {
  endDate: Date;
  compact?: boolean;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function calculateTimeLeft(endDate: Date): TimeLeft {
  const difference = endDate.getTime() - Date.now();

  if (difference <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  }

  return {
    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((difference / 1000 / 60) % 60),
    seconds: Math.floor((difference / 1000) % 60),
  };
}

export function CountdownTimer({ endDate, compact = false }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(calculateTimeLeft(endDate));

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft(endDate));
    }, 1000);

    return () => clearInterval(timer);
  }, [endDate]);

  const TimeBlock = ({ value, label }: { value: number; label: string }) => (
    <motion.div
      className={`flex flex-col items-center ${compact ? "px-2" : "px-4"}`}
      initial={{ scale: 1 }}
      animate={{ scale: [1, 1.02, 1] }}
      transition={{ duration: 1, repeat: Infinity }}
    >
      <span
        className={`font-mono font-bold text-foreground ${compact ? "text-xl" : "text-4xl md:text-5xl"}`}
      >
        {String(value).padStart(2, "0")}
      </span>
      <span
        className={`text-muted-foreground uppercase tracking-wider ${compact ? "text-[10px]" : "text-xs"}`}
      >
        {label}
      </span>
    </motion.div>
  );

  const Separator = () => (
    <span
      className={`font-mono font-bold text-primary ${compact ? "text-xl" : "text-4xl"}`}
    >
      :
    </span>
  );

  return (
    <div
      className={`flex items-center justify-center ${compact ? "gap-1" : "gap-2"}`}
    >
      <TimeBlock value={timeLeft.days} label="days" />
      <Separator />
      <TimeBlock value={timeLeft.hours} label="hrs" />
      <Separator />
      <TimeBlock value={timeLeft.minutes} label="min" />
      <Separator />
      <TimeBlock value={timeLeft.seconds} label="sec" />
    </div>
  );
}
