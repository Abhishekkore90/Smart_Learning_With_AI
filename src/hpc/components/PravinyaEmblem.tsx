import React, { useId } from "react";

export type PravinyaLevel = "nirjhar" | "parvat" | "aakash";

export interface PravinyaEmblemProps {
  level?: "nirjhar" | "parvat" | "aakash" | "beginner" | "proficient" | "advanced" | "प्रवाह" | "पर्वत" | "आकाश" | string;
  size?: number; // target width in pixels (e.g. 130 to 180)
  showSlider?: boolean; // whether to show the left 'प्राविण्य स्तर' arrow slider
  className?: string;
  onSelectLevel?: (level: PravinyaLevel) => void;
}

/**
 * PravinyaEmblem (प्राविण्य स्तर दर्शक चक्र)
 * 100% Vector SVG illustration of the Maharashtra SCERT HPC Proficiency Framework:
 * - Top: आकाश (Sky with clouds)
 * - Middle: पर्वत / शिखर (Snow-capped mountain peaks)
 * - Bottom: निर्झर / प्रवाह (Flowing river stream through green meadows)
 * - Left: प्राविण्य स्तर vertical arrow slider with dynamic level indicator
 * 100% Canvas Safe, Zero Taint, High-DPI Sharp in PDF exports and Web UI.
 */
export function PravinyaEmblem({
  level = "",
  size = 150,
  showSlider = true,
  className = "",
  onSelectLevel,
}: PravinyaEmblemProps) {
  const uid = useId().replace(/[:]/g, "_");

  // Normalize level
  const norm = String(level || "").toLowerCase().trim();
  const isAkash = norm === "आकाश" || norm === "advanced" || norm === "akash" || norm === "aakash";
  const isParvat = norm === "पर्वत" || norm === "proficient" || norm === "parvat";
  const isNirjhar =
    norm === "निर्झर" ||
    norm === "beginner" ||
    norm === "nirjhar" ||
    norm === "प्रवाह" ||
    norm === "flow";

  // Aspect ratio coordinates
  // viewBox: 0 0 176 140 (Slider x: 0-38, Circle cx: 108, cy: 70, r: 58)
  const cx = 108;
  const cy = 70;
  const r = 57;

  // Active y for slider bead
  const sliderY = isAkash ? 24 : isParvat ? 68 : isNirjhar ? 112 : 68;
  const sliderColor = isAkash ? "#0284c7" : isParvat ? "#16a34a" : isNirjhar ? "#0891b2" : "#94a3b8";

  return (
    <div
      className={`inline-flex items-center justify-center select-none ${className}`}
      style={{ width: size, height: (size * 140) / 176 }}
    >
      <svg
        viewBox="0 0 176 140"
        className="w-full h-full overflow-visible"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Unique IDs to avoid collision when multiple emblems are on the same page */}
          <clipPath id={`clip_${uid}`}>
            <circle cx={cx} cy={cy} r={r} />
          </clipPath>

          {/* Sky Gradient */}
          <linearGradient id={`skyGrad_${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="55%" stopColor="#7dd3fc" />
            <stop offset="100%" stopColor="#bae6fd" />
          </linearGradient>

          {/* River Stream Gradient */}
          <linearGradient id={`streamGrad_${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7dd3fc" />
            <stop offset="45%" stopColor="#0284c7" />
            <stop offset="100%" stopColor="#0369a1" />
          </linearGradient>

          {/* Left Arrow Stem Gradient */}
          <linearGradient id={`arrowStem_${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0369a1" />
            <stop offset="50%" stopColor="#15803d" />
            <stop offset="100%" stopColor="#0e7490" />
          </linearGradient>

          {/* Soft Drop Shadow for Pills */}
          <filter id={`shadow_${uid}`} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#0f172a" floodOpacity="0.28" />
          </filter>
        </defs>

        {/* =========================================================================
            1. LEFT VERTICAL SLIDER (प्राविण्य स्तर दर्शक बाण)
        ========================================================================= */}
        {showSlider && (
          <g className="cursor-default">
            {/* Top Arrowhead (Pointing Up) */}
            <polygon points="26,8 20,20 32,20" fill="#0f172a" />
            <line x1="26" y1="9" x2="26" y2="128" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />
            {/* Bottom Arrowhead (Pointing Down) */}
            <polygon points="26,132 20,120 32,120" fill="#0f172a" />

            {/* Vertical Ruler Ticks */}
            <line x1="22" y1="24" x2="30" y2="24" stroke="#0f172a" strokeWidth="1.5" />
            <line x1="22" y1="68" x2="30" y2="68" stroke="#0f172a" strokeWidth="1.5" />
            <line x1="22" y1="112" x2="30" y2="112" stroke="#0f172a" strokeWidth="1.5" />

            {/* 'प्राविण्य स्तर' Badge Label */}
            <rect
              x="2"
              y="53"
              width="17"
              height="32"
              rx="4"
              fill="#ffffff"
              stroke="#cbd5e1"
              strokeWidth="1"
              filter={`url(#shadow_${uid})`}
            />
            <text
              x="10.5"
              y="64"
              textAnchor="middle"
              fontSize="6"
              fontWeight="900"
              fill="#0f172a"
              style={{ fontFamily: "'Noto Sans Devanagari', 'Nirmala UI', sans-serif" }}
            >
              प्राविण्य
            </text>
            <text
              x="10.5"
              y="74"
              textAnchor="middle"
              fontSize="6"
              fontWeight="900"
              fill="#0f172a"
              style={{ fontFamily: "'Noto Sans Devanagari', 'Nirmala UI', sans-serif" }}
            >
              स्तर
            </text>
            {/* Small triangle indicator */}
            <polygon points="10.5,78 8.5,81 12.5,81" fill="#475569" />

            {/* Dynamic Slider Indicator Bead */}
            {(isAkash || isParvat || isNirjhar) && (
              <g className="transition-all duration-300">
                {/* Horizontal Guide Line to the Circle */}
                <line
                  x1="26"
                  y1={sliderY}
                  x2={cx - r + 3}
                  y2={sliderY}
                  stroke={sliderColor}
                  strokeWidth="2"
                  strokeDasharray="2 2"
                />
                {/* Indicator Bead */}
                <circle
                  cx="26"
                  cy={sliderY}
                  r="6"
                  fill={sliderColor}
                  stroke="#ffffff"
                  strokeWidth="2"
                  filter={`url(#shadow_${uid})`}
                />
                <circle cx="26" cy={sliderY} r="2.5" fill="#ffffff" />
              </g>
            )}
          </g>
        )}

        {/* =========================================================================
            2. MAIN CIRCULAR LANDSCAPE ILLUSTRATION (आकाश, पर्वत, निर्झर)
        ========================================================================= */}
        <g>
          {/* External Drop Shadow Circle */}
          <circle cx={cx} cy={cy} r={r} fill="#ffffff" filter={`url(#shadow_${uid})`} />

          {/* Clipped Scene */}
          <g clipPath={`url(#clip_${uid})`}>
            {/* LAYER A: SKY (आकाश) */}
            <g
              className={onSelectLevel ? "cursor-pointer" : ""}
              onClick={() => onSelectLevel && onSelectLevel("aakash")}
            >
              <rect x={cx - r - 2} y={cy - r - 2} width={r * 2 + 4} height={r * 2 + 4} fill={`url(#skyGrad_${uid})`} />
              {/* Sun Rays / Ambient Sky Glow */}
              <circle cx={cx} cy={cy - 20} r="45" fill="#fef08a" opacity="0.25" />
              {/* Fluffy Clouds */}
              <g fill="#ffffff" opacity="0.92">
                <path d={`M ${cx - 40} 38 a 7 7 0 0 1 12 -2 a 9 9 0 0 1 15 2 a 6 6 0 0 1 8 5 l -35 0 z`} />
                <path d={`M ${cx + 12} 40 a 6 6 0 0 1 11 -2 a 8 8 0 0 1 13 2 a 6 6 0 0 1 7 5 l -31 0 z`} />
                <ellipse cx={cx - 5} cy="26" rx="16" ry="3.5" fill="#ffffff" opacity="0.4" />
              </g>
            </g>

            {/* LAYER B: MOUNTAIN PEAKS (पर्वत / शिखर) */}
            <g
              className={onSelectLevel ? "cursor-pointer" : ""}
              onClick={() => onSelectLevel && onSelectLevel("parvat")}
            >
              {/* Distant Hazy Mountains */}
              <polygon points={`${cx - 50},92 ${cx - 28},48 ${cx - 6},92`} fill="#64748b" opacity="0.55" />
              <polygon points={`${cx + 8},92 ${cx + 32},46 ${cx + 54},92`} fill="#64748b" opacity="0.55" />

              {/* Left Mountain Peak */}
              <polygon points={`${cx - 46},96 ${cx - 22},42 ${cx + 4},96`} fill="#475569" />
              {/* Left Snowcap */}
              <polygon
                points={`${cx - 22},42 ${cx - 30},55 ${cx - 26},53 ${cx - 22},57 ${cx - 17},53 ${cx - 14},56`}
                fill="#f8fafc"
              />
              {/* Left Peak Shadow */}
              <polygon points={`${cx - 22},42 ${cx + 4},96 ${cx - 22},96`} fill="#1e293b" opacity="0.35" />

              {/* Right Mountain Peak */}
              <polygon points={`${cx - 4},96 ${cx + 24},44 ${cx + 48},96`} fill="#475569" />
              {/* Right Snowcap */}
              <polygon
                points={`${cx + 24},44 ${cx + 16},56 ${cx + 20},54 ${cx + 24},58 ${cx + 29},54 ${cx + 33},57`}
                fill="#f8fafc"
              />
              {/* Right Peak Shadow */}
              <polygon points={`${cx + 24},44 ${cx + 48},96 ${cx + 24},96`} fill="#1e293b" opacity="0.35" />

              {/* Center Highest Summit (मुख्य शिखर) */}
              <polygon points={`${cx - 34},96 ${cx},28 ${cx + 34},96`} fill="#334155" />
              {/* Center Snowcap */}
              <polygon
                points={`${cx},28 ${cx - 11},46 ${cx - 6},44 ${cx},49 ${cx + 6},44 ${cx + 12},47`}
                fill="#ffffff"
              />
              {/* Snow Soft Shading */}
              <polygon points={`${cx},28 ${cx},49 ${cx + 6},44 ${cx + 12},47`} fill="#e2e8f0" />
              {/* Center Summit Ridge Shadow (Right Face) */}
              <polygon points={`${cx},28 ${cx + 34},96 ${cx},96`} fill="#0f172a" opacity="0.45" />
            </g>

            {/* LAYER C: VALLEY & GREEN MEADOWS */}
            <g
              className={onSelectLevel ? "cursor-pointer" : ""}
              onClick={() => onSelectLevel && onSelectLevel("nirjhar")}
            >
              {/* Back Foothills */}
              <path
                d={`M ${cx - r} 88 Q ${cx - 25} 78 ${cx} 88 Q ${cx + 25} 78 ${cx + r} 88 L ${cx + r} 135 L ${cx - r} 135 Z`}
                fill="#15803d"
              />
              {/* Left Rolling Hill */}
              <path
                d={`M ${cx - r} 94 Q ${cx - 30} 85 ${cx - 8} 96 L ${cx - 25} 135 L ${cx - r} 135 Z`}
                fill="#22c55e"
              />
              {/* Right Rolling Hill */}
              <path
                d={`M ${cx + 8} 96 Q ${cx + 32} 85 ${cx + r} 94 L ${cx + r} 135 L ${cx + 25} 135 Z`}
                fill="#16a34a"
              />

              {/* LAYER D: WINDING RIVER STREAM (निर्झर / प्रवाह) */}
              {/* Riverbed Flowing Forward from Mountains */}
              <path
                d={`M ${cx - 2} 82 Q ${cx - 7} 93 ${cx + 3} 104 Q ${cx - 12} 118 ${cx - 25} 135 L ${cx + 25} 135 Q ${cx + 12} 118 ${cx + 8} 104 Q ${cx + 2} 93 ${cx + 3} 82 Z`}
                fill={`url(#streamGrad_${uid})`}
              />
              {/* Water Ripple Reflections */}
              <path
                d={`M ${cx - 1} 90 Q ${cx - 3} 96 ${cx + 1} 100`}
                stroke="#ffffff"
                strokeWidth="1.2"
                fill="none"
                opacity="0.85"
              />
              <path
                d={`M ${cx - 6} 110 Q ${cx + 4} 118 ${cx - 2} 125`}
                stroke="#ffffff"
                strokeWidth="1.4"
                fill="none"
                opacity="0.85"
              />
              <path
                d={`M ${cx + 3} 112 Q ${cx + 12} 120 ${cx + 6} 128`}
                stroke="#ffffff"
                strokeWidth="1.2"
                fill="none"
                opacity="0.75"
              />

              {/* Riverbank Tree */}
              <rect x={cx + 32} y="98" width="3.5" height="11" fill="#78350f" rx="1" />
              <circle cx={cx + 34} cy="94" r="8.5" fill="#15803d" />
              <circle cx={cx + 31} cy="92" r="5.5" fill="#22c55e" />
            </g>
          </g>

          {/* =========================================================================
              3. FLOATING TIER PILLS (आकाश, पर्वत, निर्झर)
          ========================================================================= */}
          {/* TIER 1: आकाश (Sky / Advanced) */}
          <g
            transform={`translate(${cx}, 23)`}
            className={onSelectLevel ? "cursor-pointer" : "cursor-default"}
            onClick={() => onSelectLevel && onSelectLevel("aakash")}
          >
            <rect
              x="-33"
              y="-9"
              width="66"
              height="18"
              rx="9"
              fill={isAkash ? "#0284c7" : "#ffffff"}
              fillOpacity={isAkash ? 1 : 0.95}
              stroke={isAkash ? "#ffffff" : "#0284c7"}
              strokeWidth={isAkash ? "2" : "1.2"}
              filter={`url(#shadow_${uid})`}
            />
            <text
              x="0"
              y="3.5"
              textAnchor="middle"
              fontSize="9"
              fontWeight="900"
              fill={isAkash ? "#ffffff" : "#0369a1"}
              style={{ fontFamily: "'Noto Sans Devanagari', 'Nirmala UI', sans-serif" }}
            >
              {isAkash ? "✓ आकाश" : "आकाश"}
            </text>
          </g>

          {/* TIER 2: पर्वत (शिखर) (Mountain / Proficient) */}
          <g
            transform={`translate(${cx}, 68)`}
            className={onSelectLevel ? "cursor-pointer" : "cursor-default"}
            onClick={() => onSelectLevel && onSelectLevel("parvat")}
          >
            <rect
              x="-46"
              y="-10"
              width="92"
              height="20"
              rx="10"
              fill={isParvat ? "#15803d" : "#ffffff"}
              fillOpacity={isParvat ? 1 : 0.95}
              stroke={isParvat ? "#ffffff" : "#16a34a"}
              strokeWidth={isParvat ? "2.2" : "1.2"}
              filter={`url(#shadow_${uid})`}
            />
            <text
              x="0"
              y="3.5"
              textAnchor="middle"
              fontSize="9.5"
              fontWeight="900"
              fill={isParvat ? "#ffffff" : "#166534"}
              style={{ fontFamily: "'Noto Sans Devanagari', 'Nirmala UI', sans-serif" }}
            >
              {isParvat ? "✓ पर्वत (शिखर)" : "पर्वत (शिखर)"}
            </text>
          </g>

          {/* TIER 3: निर्झर (Stream / Beginner) */}
          <g
            transform={`translate(${cx}, 113)`}
            className={onSelectLevel ? "cursor-pointer" : "cursor-default"}
            onClick={() => onSelectLevel && onSelectLevel("nirjhar")}
          >
            <rect
              x="-33"
              y="-9"
              width="66"
              height="18"
              rx="9"
              fill={isNirjhar ? "#0891b2" : "#ffffff"}
              fillOpacity={isNirjhar ? 1 : 0.95}
              stroke={isNirjhar ? "#ffffff" : "#0891b2"}
              strokeWidth={isNirjhar ? "2" : "1.2"}
              filter={`url(#shadow_${uid})`}
            />
            <text
              x="0"
              y="3.5"
              textAnchor="middle"
              fontSize="9"
              fontWeight="900"
              fill={isNirjhar ? "#ffffff" : "#0e7490"}
              style={{ fontFamily: "'Noto Sans Devanagari', 'Nirmala UI', sans-serif" }}
            >
              {isNirjhar ? "✓ निर्झर" : "निर्झर"}
            </text>
          </g>

          {/* Outer Circle Green Ring (Frame Border) */}
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#16a34a" strokeWidth="3" />
          <circle cx={cx} cy={cy} r={r - 1.5} fill="none" stroke="#ffffff" strokeWidth="1.2" opacity="0.8" />
        </g>
      </svg>
    </div>
  );
}
