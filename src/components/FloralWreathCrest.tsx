import React from 'react';

export const FloralWreathCrest: React.FC = () => {
  return (
    <div
      className="relative flex items-center justify-center shrink-0 select-none"
      aria-label="S & J Wedding Date 19.12.2026"
    >
      <svg
        viewBox="0 0 120 120"
        className="w-20 h-20 sm:w-24 sm:h-24 drop-shadow-sm"
        aria-hidden="true"
      >
        {/* Soft parchment medallion */}
        <circle cx="60" cy="60" r="45" fill="#FFFDF9" stroke="#E8DCCD" strokeWidth="1.2" />
        <circle cx="60" cy="60" r="40" fill="none" stroke="#F0D9DC" strokeWidth="0.9" strokeDasharray="3 3" />

        {/* Left botanical olive/eucalyptus spray */}
        <path
          d="M 22 68 C 16 50, 22 30, 42 20"
          fill="none"
          stroke="#6A9374"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <ellipse cx="20" cy="54" rx="5.5" ry="3" transform="rotate(-35 20 54)" fill="#9EC0A3" />
        <ellipse cx="23" cy="40" rx="5.5" ry="2.8" transform="rotate(-20 23 40)" fill="#88B08F" />
        <ellipse cx="32" cy="28" rx="5" ry="2.6" transform="rotate(10 32 28)" fill="#9EC0A3" />
        <ellipse cx="25" cy="64" rx="4.8" ry="2.6" transform="rotate(-55 25 64)" fill="#B5D1B8" />

        {/* Right botanical spray */}
        <path
          d="M 98 68 C 104 50, 98 30, 78 20"
          fill="none"
          stroke="#6A9374"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <ellipse cx="100" cy="54" rx="5.5" ry="3" transform="rotate(35 100 54)" fill="#9EC0A3" />
        <ellipse cx="97" cy="40" rx="5.5" ry="2.8" transform="rotate(20 97 40)" fill="#88B08F" />
        <ellipse cx="88" cy="28" rx="5" ry="2.6" transform="rotate(-10 88 28)" fill="#9EC0A3" />
        <ellipse cx="95" cy="64" rx="4.8" ry="2.6" transform="rotate(55 95 64)" fill="#B5D1B8" />

        {/* Bottom blush rose cluster */}
        <circle cx="46" cy="97" r="5" fill="#F2B5BC" stroke="#D96B78" strokeWidth="0.9" />
        <circle cx="46" cy="97" r="2" fill="#E67E8A" />
        <circle cx="60" cy="101" r="6" fill="#F7CDD2" stroke="#D96B78" strokeWidth="0.9" />
        <circle cx="60" cy="101" r="2.4" fill="#D96B78" />
        <circle cx="74" cy="97" r="5" fill="#F2B5BC" stroke="#D96B78" strokeWidth="0.9" />
        <circle cx="74" cy="97" r="2" fill="#E67E8A" />

        {/* Top tiny blossom & gold dots */}
        <circle cx="60" cy="17" r="3.5" fill="#F6D5A7" stroke="#C89250" strokeWidth="0.8" />
        <circle cx="49" cy="19" r="2" fill="#F2B5BC" />
        <circle cx="71" cy="19" r="2" fill="#F2B5BC" />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
        <span className="font-display text-lg sm:text-xl font-bold tracking-wider text-[#2C2A29] leading-none">
          S &amp; J
        </span>
        <span className="mt-1 text-[10px] sm:text-[11px] font-medium tracking-widest text-[#8B5E63] tabular-nums leading-none">
          19.12.2026
        </span>
      </div>
    </div>
  );
};

export const GardenRibbonBanner: React.FC = () => {
  return (
    <div className="inline-flex items-center gap-3">
      <div className="relative inline-flex items-center px-5 py-2 sm:px-7 sm:py-2.5">
        {/* Hand-drawn ribbon backdrop */}
        <svg
          viewBox="0 0 320 64"
          preserveAspectRatio="none"
          className="absolute inset-0 w-full h-full drop-shadow-xs"
          aria-hidden="true"
        >
          {/* Left ribbon tail */}
          <path d="M 18 14 L 4 14 L 12 32 L 4 50 L 18 50 Z" fill="#EBC2C7" />
          {/* Right ribbon tail */}
          <path d="M 302 14 L 316 14 L 308 32 L 316 50 L 302 50 Z" fill="#EBC2C7" />
          {/* Main ivory-blush ribbon face */}
          <rect
            x="16"
            y="6"
            width="288"
            height="52"
            rx="12"
            fill="#FFFDF9"
            stroke="#E5B8BE"
            strokeWidth="1.6"
          />
          <rect
            x="21"
            y="11"
            width="278"
            height="42"
            rx="8"
            fill="none"
            stroke="#F4DADF"
            strokeWidth="1"
            strokeDasharray="4 3"
          />
        </svg>

        <div className="relative z-10 flex items-baseline gap-2.5 whitespace-nowrap px-2">
          <h1 className="font-display text-xl sm:text-2xl font-bold text-[#2C2A29] tracking-wide">
            婚礼指南
          </h1>
          <span className="text-[#C6A2A7]" aria-hidden="true">
            /
          </span>
          <span className="font-display italic text-base sm:text-lg font-semibold text-[#7A595E]">
            Wedding Guide
          </span>
        </div>
      </div>
    </div>
  );
};
