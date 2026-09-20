import React from "react";

interface RunnerIconProps {
  className?: string;
  size?: number;
}

export const RunnerIcon: React.FC<RunnerIconProps> = ({ className = "w-6 h-6", size }) => {
  return (
    <svg
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={size ? { width: size, height: size } : undefined}
    >
      <defs>
        <linearGradient id="runnerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00F5FF" />
          <stop offset="100%" stopColor="#29B6F6" />
        </linearGradient>
      </defs>

      {/* Speed Trails */}
      {/* Top Dash */}
      <rect
        x="50"
        y="65"
        width="82"
        height="40"
        rx="20"
        fill="url(#runnerGradient)"
      />
      {/* Middle Dash */}
      <rect
        x="12"
        y="148"
        width="76"
        height="40"
        rx="20"
        fill="url(#runnerGradient)"
      />
      {/* Bottom Speed Particle */}
      <circle
        cx="63"
        cy="420"
        r="26"
        fill="url(#runnerGradient)"
      />

      {/* Head (Hollow outlined circle) */}
      <circle
        cx="330"
        cy="90"
        r="54"
        stroke="url(#runnerGradient)"
        strokeWidth="40"
      />

      {/* Torso & Neck */}
      <path
        d="M268 155 L182 320"
        stroke="url(#runnerGradient)"
        strokeWidth="42"
        strokeLinecap="round"
      />

      {/* Raised Right Arm */}
      <path
        d="M255 178 L370 216 L476 138"
        stroke="url(#runnerGradient)"
        strokeWidth="42"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Forward Left Arm */}
      <path
        d="M230 185 L132 258 L96 322"
        stroke="url(#runnerGradient)"
        strokeWidth="42"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Forward Raised Leg */}
      <path
        d="M182 320 L315 365 L335 480"
        stroke="url(#runnerGradient)"
        strokeWidth="42"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Back Trailing Leg */}
      <path
        d="M182 320 L108 495"
        stroke="url(#runnerGradient)"
        strokeWidth="42"
        strokeLinecap="round"
      />
    </svg>
  );
};
