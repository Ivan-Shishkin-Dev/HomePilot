import { useEffect, useState } from "react";

interface ScoreRingProps {
  score: number;
  maxScore?: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  colorClass?: string;
}

export function ScoreRing({
  score,
  maxScore = 900,
  size = 120,
  strokeWidth = 8,
  label = "Renter Score",
  colorClass,
}: ScoreRingProps) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = animatedScore / maxScore;
  const dashOffset = circumference * (1 - progress);

  const getColor = () => {
    if (colorClass) return colorClass;
    if (score >= 800) return "#10B981";
    if (score >= 650) return "#F59E0B";
    return "#EF4444";
  };

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedScore(score), 100);
    return () => clearTimeout(timer);
  }, [score]);

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={getColor()}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{ transition: "stroke-dashoffset 1.2s ease-out" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="text-white"
            style={{ fontSize: size * 0.28, fontWeight: 700, lineHeight: 1 }}
          >
            {score}
          </span>
        </div>
      </div>
      {label && (
        <span className="text-[11px] text-[#8B95A5] tracking-wide uppercase">
          {label}
        </span>
      )}
    </div>
  );
}
