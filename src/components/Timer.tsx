"use client";

import { useEffect, useState, useRef } from "react";

interface TimerProps {
  seconds: number;
  onExpire: () => void;
  resetKey: number;
}

export default function Timer({ seconds, onExpire, resetKey }: TimerProps) {
  const [remaining, setRemaining] = useState(seconds);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    setRemaining(seconds);
  }, [seconds, resetKey]);

  useEffect(() => {
    if (remaining <= 0) {
      onExpireRef.current();
      return;
    }

    const timer = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(timer);
  }, [remaining]);

  const percent = seconds > 0 ? (remaining / seconds) * 100 : 0;
  const isLow = remaining <= 10;
  const circumference = 2 * Math.PI * 20;

  return (
    <div className="flex items-center gap-3 shrink-0">
      <div className="relative w-12 h-12">
        <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
          <circle
            cx="24"
            cy="24"
            r="20"
            fill="none"
            stroke="#E2E8F0"
            strokeWidth="3"
          />
          <circle
            cx="24"
            cy="24"
            r="20"
            fill="none"
            stroke={isLow ? "#DC2626" : "#0F172A"}
            strokeWidth="3"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - percent / 100)}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-linear"
          />
        </svg>
        <span
          className={`absolute inset-0 flex items-center justify-center text-sm font-bold ${
            isLow ? "text-wrong" : "text-navy"
          }`}
        >
          {remaining}
        </span>
      </div>
    </div>
  );
}
