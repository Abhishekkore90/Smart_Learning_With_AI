import React from "react";

/**
 * 4 Art Deco / Baroque Golden Corner Flourishes
 */
export function CornerOrnaments({ color = "#fbbf24" }: { color?: string }) {
  return (
    <>
      {/* Top Left */}
      <svg
        className="absolute top-3 left-3 size-10 pointer-events-none opacity-60 z-10"
        viewBox="0 0 40 40"
        fill="none"
      >
        <path
          d="M2 38 V 8 C 2 4.7 4.7 2 8 2 H 38"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M8 32 V 14 C 8 10.7 10.7 8 14 8 H 32"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <circle cx="8" cy="8" r="2.5" fill={color} />
      </svg>

      {/* Top Right */}
      <svg
        className="absolute top-3 right-3 size-10 pointer-events-none opacity-60 z-10"
        viewBox="0 0 40 40"
        fill="none"
      >
        <path
          d="M38 38 V 8 C 38 4.7 35.3 2 32 2 H 2"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M32 32 V 14 C 32 10.7 29.3 8 26 8 H 8"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <circle cx="32" cy="8" r="2.5" fill={color} />
      </svg>

      {/* Bottom Left */}
      <svg
        className="absolute bottom-3 left-3 size-10 pointer-events-none opacity-60 z-10"
        viewBox="0 0 40 40"
        fill="none"
      >
        <path
          d="M2 2 V 32 C 2 35.3 4.7 38 8 38 H 38"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M8 8 V 26 C 8 29.3 10.7 32 14 32 H 32"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <circle cx="8" cy="32" r="2.5" fill={color} />
      </svg>

      {/* Bottom Right */}
      <svg
        className="absolute bottom-3 right-3 size-10 pointer-events-none opacity-60 z-10"
        viewBox="0 0 40 40"
        fill="none"
      >
        <path
          d="M38 2 V 32 C 38 35.3 35.3 38 32 38 H 2"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M32 8 V 26 C 32 29.3 29.3 32 26 32 H 8"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <circle cx="32" cy="32" r="2.5" fill={color} />
      </svg>
    </>
  );
}

/**
 * Floating Celebration Balloons (Left Side)
 */
export function CelebrationBalloonsLeft() {
  return (
    <svg
      className="absolute top-10 left-3 sm:left-6 w-20 sm:w-28 h-36 sm:h-48 pointer-events-none opacity-85 z-10"
      viewBox="0 0 100 160"
      fill="none"
    >
      <defs>
        <radialGradient id="balloonGold1" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="40%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#78350f" />
        </radialGradient>
        <radialGradient id="balloonRose1" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#fbcfe8" />
          <stop offset="40%" stopColor="#f43f5e" />
          <stop offset="100%" stopColor="#881337" />
        </radialGradient>
        <radialGradient id="balloonCyan1" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#cffafe" />
          <stop offset="40%" stopColor="#06b6d4" />
          <stop offset="100%" stopColor="#083344" />
        </radialGradient>
      </defs>

      {/* Balloon 1: Cyan back */}
      <ellipse cx="65" cy="40" rx="22" ry="28" fill="url(#balloonCyan1)" />
      <ellipse cx="60" cy="30" rx="6" ry="10" fill="white" opacity="0.4" />
      <path d="M65 68 L 63 72 L 67 72 Z" fill="#083344" />
      <path d="M65 72 Q 62 100 70 140" stroke="#fbbf24" strokeWidth="1.2" opacity="0.6" strokeDasharray="2 2" />

      {/* Balloon 2: Rose center */}
      <ellipse cx="32" cy="50" rx="26" ry="32" fill="url(#balloonRose1)" />
      <ellipse cx="26" cy="38" rx="8" ry="12" fill="white" opacity="0.45" />
      <path d="M32 82 L 30 86 L 34 86 Z" fill="#881337" />
      <path d="M32 86 Q 40 115 35 155" stroke="#fbbf24" strokeWidth="1.2" opacity="0.7" />

      {/* Balloon 3: Gold front */}
      <ellipse cx="50" cy="22" rx="24" ry="29" fill="url(#balloonGold1)" />
      <ellipse cx="44" cy="14" rx="7" ry="11" fill="white" opacity="0.5" />
      <path d="M50 51 L 48 55 L 52 55 Z" fill="#78350f" />
      <path d="M50 55 Q 46 90 55 145" stroke="#fbbf24" strokeWidth="1.2" opacity="0.7" />
    </svg>
  );
}

/**
 * Floating Celebration Balloons (Right Side)
 */
export function CelebrationBalloonsRight() {
  return (
    <svg
      className="absolute top-10 right-3 sm:right-6 w-20 sm:w-28 h-36 sm:h-48 pointer-events-none opacity-85 z-10"
      viewBox="0 0 100 160"
      fill="none"
    >
      <defs>
        <radialGradient id="balloonGold2" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="40%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#92400e" />
        </radialGradient>
        <radialGradient id="balloonPurple2" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#f3e8ff" />
          <stop offset="40%" stopColor="#a855f7" />
          <stop offset="100%" stopColor="#4c1d95" />
        </radialGradient>
      </defs>

      {/* Balloon 1: Purple back */}
      <ellipse cx="35" cy="40" rx="22" ry="28" fill="url(#balloonPurple2)" />
      <ellipse cx="40" cy="30" rx="6" ry="10" fill="white" opacity="0.4" />
      <path d="M35 68 L 33 72 L 37 72 Z" fill="#4c1d95" />
      <path d="M35 72 Q 42 100 32 140" stroke="#fbbf24" strokeWidth="1.2" opacity="0.6" strokeDasharray="2 2" />

      {/* Balloon 2: Gold front */}
      <ellipse cx="65" cy="35" rx="26" ry="32" fill="url(#balloonGold2)" />
      <ellipse cx="72" cy="24" rx="8" ry="12" fill="white" opacity="0.5" />
      <path d="M65 67 L 63 71 L 67 71 Z" fill="#92400e" />
      <path d="M65 71 Q 58 105 60 155" stroke="#fbbf24" strokeWidth="1.2" opacity="0.7" />
    </svg>
  );
}

/**
 * 3D Birthday Cake with Candles SVG
 */
export function FestiveBirthdayCake() {
  return (
    <svg
      className="size-16 sm:size-20 drop-shadow-[0_8px_16px_rgba(0,0,0,0.5)] mx-auto"
      viewBox="0 0 100 100"
      fill="none"
    >
      <defs>
        <linearGradient id="cakePlate" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="50%" stopColor="#fef08a" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
        <linearGradient id="cakeBase" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fed7aa" />
          <stop offset="100%" stopColor="#fb923c" />
        </linearGradient>
        <linearGradient id="cakeFrosting" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f472b6" />
          <stop offset="100%" stopColor="#db2777" />
        </linearGradient>
      </defs>

      {/* Plate */}
      <ellipse cx="50" cy="90" rx="44" ry="7" fill="url(#cakePlate)" />

      {/* Bottom Tier */}
      <path
        d="M16 68 C 16 65, 84 65, 84 68 L 84 85 C 84 90, 16 90, 16 85 Z"
        fill="url(#cakeBase)"
      />
      {/* Bottom Frosting drips */}
      <path
        d="M16 70 Q 24 78 32 70 Q 40 78 48 70 Q 56 78 64 70 Q 72 78 84 70 L 84 65 L 16 65 Z"
        fill="url(#cakeFrosting)"
      />

      {/* Top Tier */}
      <path
        d="M26 48 C 26 45, 74 45, 74 48 L 74 65 C 74 68, 26 68, 26 65 Z"
        fill="url(#cakeBase)"
      />
      {/* Top Frosting drips */}
      <path
        d="M26 50 Q 34 56 42 50 Q 50 56 58 50 Q 66 56 74 50 L 74 46 L 26 46 Z"
        fill="url(#cakeFrosting)"
      />

      {/* Candles */}
      {[36, 50, 64].map((x, idx) => (
        <g key={idx}>
          {/* Candle stick */}
          <rect x={x - 2} y="32" width="4" height="15" rx="1.5" fill="#fef08a" stroke="#f59e0b" strokeWidth="0.5" />
          {/* Flame */}
          <path
            d={`M${x} 23 C ${x - 3} 27, ${x - 3} 30, ${x} 32 C ${x + 3} 30, ${x + 3} 27, ${x} 23 Z`}
            fill="#f97316"
          />
          <path
            d={`M${x} 26 C ${x - 1.5} 28, ${x - 1.5} 30, ${x} 31 C ${x + 1.5} 30, ${x + 1.5} 28, ${x} 26 Z`}
            fill="#fef08a"
          />
        </g>
      ))}
    </svg>
  );
}

/**
 * Golden Laurel Wreath SVG (For Student of the Month & Achievement)
 */
export function GoldenLaurelWreath({ className = "size-32" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 140 140" fill="none">
      <defs>
        <linearGradient id="laurelGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="50%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#b45309" />
        </linearGradient>
      </defs>

      {/* Left Laurel Branch */}
      <path
        d="M 40 115 C 20 95, 20 45, 45 25"
        stroke="url(#laurelGrad)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {[
        { x: 42, y: 110, a: 30 },
        { x: 30, y: 95, a: 45 },
        { x: 24, y: 78, a: 65 },
        { x: 24, y: 60, a: 85 },
        { x: 30, y: 44, a: 110 },
        { x: 42, y: 30, a: 135 },
      ].map((leaf, idx) => (
        <path
          key={idx}
          d={`M ${leaf.x} ${leaf.y} C ${leaf.x - 8} ${leaf.y - 4}, ${leaf.x - 8} ${leaf.y + 4}, ${leaf.x} ${leaf.y}`}
          fill="url(#laurelGrad)"
          transform={`rotate(${leaf.a} ${leaf.x} ${leaf.y}) scale(1.4)`}
        />
      ))}

      {/* Right Laurel Branch */}
      <path
        d="M 100 115 C 120 95, 120 45, 95 25"
        stroke="url(#laurelGrad)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {[
        { x: 98, y: 110, a: -30 },
        { x: 110, y: 95, a: -45 },
        { x: 116, y: 78, a: -65 },
        { x: 116, y: 60, a: -85 },
        { x: 110, y: 44, a: -110 },
        { x: 98, y: 30, a: -135 },
      ].map((leaf, idx) => (
        <path
          key={idx}
          d={`M ${leaf.x} ${leaf.y} C ${leaf.x + 8} ${leaf.y - 4}, ${leaf.x + 8} ${leaf.y + 4}, ${leaf.x} ${leaf.y}`}
          fill="url(#laurelGrad)"
          transform={`rotate(${leaf.a} ${leaf.x} ${leaf.y}) scale(1.4)`}
        />
      ))}

      {/* Bottom Ribbon Bow */}
      <circle cx="70" cy="116" r="4" fill="url(#laurelGrad)" />
      <path d="M 66 116 Q 58 126 50 128" stroke="url(#laurelGrad)" strokeWidth="2" strokeLinecap="round" />
      <path d="M 74 116 Q 82 126 90 128" stroke="url(#laurelGrad)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Floating Gold Sparkles
 */
export function FloatingSparkles() {
  return (
    <>
      <div className="absolute top-12 left-1/4 size-3 text-amber-300 pointer-events-none animate-pulse">
        ✦
      </div>
      <div className="absolute top-20 right-1/4 size-2.5 text-yellow-200 pointer-events-none animate-pulse">
        ★
      </div>
      <div className="absolute bottom-24 left-16 size-2 text-amber-400 pointer-events-none opacity-80 animate-ping">
        ✦
      </div>
      <div className="absolute bottom-28 right-16 size-3 text-amber-200 pointer-events-none opacity-90 animate-pulse">
        ★
      </div>
      <div className="absolute top-1/2 left-8 size-2.5 text-pink-300 pointer-events-none opacity-70">
        ✦
      </div>
      <div className="absolute top-1/2 right-8 size-2.5 text-cyan-300 pointer-events-none opacity-70">
        ✦
      </div>
    </>
  );
}



/**
 * ─────────────────────────────────────────────────────────────
 * BACKGROUND THEMES: Pure High-Res Scalable SVG Visual Scenery
 * ─────────────────────────────────────────────────────────────
 */

/**
 * 1. Royal Gold Bokeh & Hanging Festive Garland Theme
 */
export function RoyalGoldBokehTheme() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
      {/* Soft Center Radial Spotlight */}
      <div className="absolute top-[20%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[130%] aspect-square rounded-full bg-gradient-to-b from-amber-500/15 via-yellow-500/5 to-transparent blur-3xl" />

      {/* SVG Bokeh Lights & Festive Garland */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 560" fill="none" preserveAspectRatio="xMidYMid slice">
        <defs>
          <radialGradient id="bokehGlow1" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fef08a" stopOpacity="0.45" />
            <stop offset="60%" stopColor="#f59e0b" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#d97706" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="bokehGlow2" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.5" />
            <stop offset="70%" stopColor="#b45309" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#78350f" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="goldStreamer" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="50%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#b45309" />
          </linearGradient>
        </defs>

        {/* Radiating Sunburst Light Rays behind photo */}
        <g opacity="0.12" stroke="url(#goldStreamer)" strokeWidth="1.5">
          <line x1="200" y1="180" x2="0" y2="0" />
          <line x1="200" y1="180" x2="80" y2="0" />
          <line x1="200" y1="180" x2="160" y2="0" />
          <line x1="200" y1="180" x2="240" y2="0" />
          <line x1="200" y1="180" x2="320" y2="0" />
          <line x1="200" y1="180" x2="400" y2="0" />
          <line x1="200" y1="180" x2="0" y2="100" />
          <line x1="200" y1="180" x2="400" y2="100" />
          <line x1="200" y1="180" x2="0" y2="240" />
          <line x1="200" y1="180" x2="400" y2="240" />
          <line x1="200" y1="180" x2="40" y2="400" />
          <line x1="200" y1="180" x2="360" y2="400" />
          <line x1="200" y1="180" x2="100" y2="560" />
          <line x1="200" y1="180" x2="300" y2="560" />
        </g>

        {/* Golden Bokeh Circles */}
        <circle cx="70" cy="120" r="45" fill="url(#bokehGlow1)" />
        <circle cx="330" cy="140" r="55" fill="url(#bokehGlow2)" />
        <circle cx="50" cy="380" r="50" fill="url(#bokehGlow2)" />
        <circle cx="340" cy="400" r="60" fill="url(#bokehGlow1)" />
        <circle cx="200" cy="490" r="40" fill="url(#bokehGlow1)" />
        <circle cx="120" cy="270" r="30" fill="url(#bokehGlow2)" />
        <circle cx="280" cy="290" r="35" fill="url(#bokehGlow1)" />

        {/* Top Hanging Golden Festive Garland */}
        <path d="M 0 15 Q 100 45 200 15 Q 300 45 400 15" stroke="url(#goldStreamer)" strokeWidth="1.5" fill="none" opacity="0.75" />
        <path d="M 0 30 Q 100 65 200 30 Q 300 65 400 30" stroke="url(#goldStreamer)" strokeWidth="1.2" strokeDasharray="3 3" fill="none" opacity="0.6" />

        {/* Hanging Mini Gold Pennants */}
        {[30, 70, 110, 150, 190, 230, 270, 310, 350, 390].map((x, i) => (
          <g key={i}>
            <polygon
              points={`${x - 8},25 ${x + 8},25 ${x},45`}
              fill={i % 2 === 0 ? "url(#goldStreamer)" : "#fef08a"}
              opacity="0.8"
            />
            <circle cx={x} cy="48" r="1.5" fill="#fef08a" />
          </g>
        ))}

        {/* Floating Glitter Confetti Pieces */}
        {[
          { x: 30, y: 190, r: 15, w: 7, h: 4 },
          { x: 370, y: 220, r: -25, w: 8, h: 5 },
          { x: 45, y: 310, r: 40, w: 6, h: 4 },
          { x: 355, y: 330, r: -15, w: 7, h: 5 },
          { x: 80, y: 460, r: 30, w: 8, h: 4 },
          { x: 320, y: 480, r: -35, w: 6, h: 5 },
          { x: 190, y: 530, r: 20, w: 7, h: 4 },
          { x: 220, y: 540, r: -10, w: 6, h: 4 },
        ].map((c, i) => (
          <rect
            key={i}
            x={c.x}
            y={c.y}
            width={c.w}
            height={c.h}
            rx="1"
            fill="#fef08a"
            opacity="0.7"
            transform={`rotate(${c.r} ${c.x} ${c.y})`}
          />
        ))}

        {/* Sparkle Stars */}
        {[
          { x: 60, y: 70, s: 0.8 },
          { x: 340, y: 80, s: 0.9 },
          { x: 30, y: 240, s: 0.7 },
          { x: 375, y: 260, s: 0.8 },
          { x: 70, y: 510, s: 0.75 },
          { x: 330, y: 520, s: 0.85 },
        ].map((star, i) => (
          <g key={i} transform={`translate(${star.x}, ${star.y}) scale(${star.s})`} fill="#fef08a" opacity="0.85">
            <path d="M 0 -8 Q 0 0 8 0 Q 0 0 0 8 Q 0 0 -8 0 Q 0 0 0 -8 Z" />
          </g>
        ))}
      </svg>
    </div>
  );
}

/**
 * 2. Festive Party Streamers & Colorful Confetti Theme
 */
export function PartyConfettiTheme() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
      {/* Multi-color ambient glows */}
      <div className="absolute top-0 -left-10 w-72 h-72 bg-pink-500/15 rounded-full blur-3xl" />
      <div className="absolute top-0 -right-10 w-72 h-72 bg-purple-500/15 rounded-full blur-3xl" />
      <div className="absolute bottom-10 left-10 w-64 h-64 bg-cyan-500/15 rounded-full blur-3xl" />
      <div className="absolute bottom-10 right-10 w-64 h-64 bg-amber-500/15 rounded-full blur-3xl" />

      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 560" fill="none" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="streamerPink" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#f472b6" />
            <stop offset="100%" stopColor="#db2777" />
          </linearGradient>
          <linearGradient id="streamerCyan" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#0284c7" />
          </linearGradient>
          <linearGradient id="streamerGold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fde047" />
            <stop offset="100%" stopColor="#eab308" />
          </linearGradient>
        </defs>

        {/* Curly Streamers Left */}
        <path
          d="M 10 0 Q 30 50 15 100 Q -5 150 25 200 Q 55 250 20 300 Q -10 350 25 400"
          stroke="url(#streamerPink)"
          strokeWidth="3.5"
          fill="none"
          strokeLinecap="round"
          opacity="0.8"
        />
        <path
          d="M 40 0 Q 60 70 35 140 Q 15 210 50 280 Q 80 350 45 420"
          stroke="url(#streamerGold)"
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
          opacity="0.7"
        />

        {/* Curly Streamers Right */}
        <path
          d="M 390 0 Q 370 50 385 100 Q 405 150 375 200 Q 345 250 380 300 Q 410 350 375 400"
          stroke="url(#streamerCyan)"
          strokeWidth="3.5"
          fill="none"
          strokeLinecap="round"
          opacity="0.8"
        />
        <path
          d="M 360 0 Q 340 70 365 140 Q 385 210 350 280 Q 320 350 355 420"
          stroke="url(#streamerGold)"
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
          opacity="0.7"
        />

        {/* Falling Party Confetti Scatter */}
        {[
          { x: 35, y: 70, c: "#f472b6", r: 15 },
          { x: 80, y: 40, c: "#38bdf8", r: -25 },
          { x: 320, y: 50, c: "#fde047", r: 35 },
          { x: 365, y: 80, c: "#a855f7", r: -15 },
          { x: 25, y: 160, c: "#34d399", r: 45 },
          { x: 375, y: 170, c: "#f472b6", r: -30 },
          { x: 45, y: 250, c: "#fde047", r: 20 },
          { x: 355, y: 260, c: "#38bdf8", r: -40 },
          { x: 30, y: 350, c: "#a855f7", r: 15 },
          { x: 370, y: 360, c: "#34d399", r: -25 },
          { x: 60, y: 460, c: "#f472b6", r: 35 },
          { x: 340, y: 470, c: "#fde047", r: -15 },
          { x: 120, y: 530, c: "#38bdf8", r: 25 },
          { x: 280, y: 535, c: "#a855f7", r: -35 },
        ].map((conf, idx) => (
          <rect
            key={idx}
            x={conf.x}
            y={conf.y}
            width="8"
            height="5"
            rx="1.5"
            fill={conf.c}
            opacity="0.85"
            transform={`rotate(${conf.r} ${conf.x} ${conf.y})`}
          />
        ))}

        {/* Confetti Discs */}
        {[
          { x: 50, y: 110, c: "#fde047", r: 3.5 },
          { x: 350, y: 120, c: "#f472b6", r: 3 },
          { x: 20, y: 210, c: "#38bdf8", r: 4 },
          { x: 380, y: 220, c: "#34d399", r: 3.5 },
          { x: 55, y: 390, c: "#a855f7", r: 4 },
          { x: 345, y: 400, c: "#fde047", r: 3 },
          { x: 160, y: 540, c: "#f472b6", r: 3.5 },
          { x: 240, y: 540, c: "#38bdf8", r: 3 },
        ].map((disc, idx) => (
          <circle key={idx} cx={disc.x} cy={disc.y} r={disc.r} fill={disc.c} opacity="0.8" />
        ))}
      </svg>
    </div>
  );
}

/**
 * 3. Cosmic Galaxy & Starry Nebula Theme
 */
export function CosmicGalaxyTheme() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
      {/* Galactic Clouds */}
      <div className="absolute -top-20 left-10 w-80 h-80 bg-purple-600/20 rounded-full blur-[100px]" />
      <div className="absolute top-1/3 -right-20 w-80 h-80 bg-blue-600/20 rounded-full blur-[100px]" />
      <div className="absolute -bottom-20 left-1/3 w-80 h-80 bg-pink-600/20 rounded-full blur-[100px]" />

      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 560" fill="none" preserveAspectRatio="xMidYMid slice">
        <defs>
          <radialGradient id="planetGlow" cx="40%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#c084fc" />
            <stop offset="60%" stopColor="#7e22ce" />
            <stop offset="100%" stopColor="#3b0764" />
          </radialGradient>
        </defs>

        {/* Distant Ringed Planet */}
        <g opacity="0.65" transform="translate(60, 90)">
          <ellipse cx="0" cy="0" rx="14" ry="14" fill="url(#planetGlow)" />
          <ellipse cx="0" cy="0" rx="28" ry="7" stroke="#e9d5ff" strokeWidth="1.5" fill="none" transform="rotate(-25)" opacity="0.8" />
        </g>

        {/* Small Crescent Planet */}
        <g opacity="0.5" transform="translate(340, 480)">
          <circle cx="0" cy="0" r="10" fill="#38bdf8" />
          <circle cx="-3" cy="-3" r="9" fill="#0f172a" />
        </g>

        {/* Constellation Lines */}
        <g stroke="#93c5fd" strokeWidth="0.8" opacity="0.4" strokeDasharray="2 3">
          <line x1="310" y1="90" x2="340" y2="120" />
          <line x1="340" y1="120" x2="370" y2="110" />
          <line x1="30" y1="460" x2="60" y2="480" />
          <line x1="60" y1="480" x2="50" y2="520" />
        </g>

        {/* Cosmic Starfield */}
        {[
          { x: 310, y: 90, r: 2 },
          { x: 340, y: 120, r: 2.5 },
          { x: 370, y: 110, r: 2 },
          { x: 30, y: 460, r: 2 },
          { x: 60, y: 480, r: 2.5 },
          { x: 50, y: 520, r: 2 },
          { x: 40, y: 220, r: 1.5 },
          { x: 360, y: 260, r: 1.5 },
          { x: 50, y: 350, r: 1.5 },
          { x: 350, y: 390, r: 2 },
          { x: 180, y: 520, r: 1.5 },
          { x: 220, y: 535, r: 1.5 },
        ].map((s, idx) => (
          <circle key={idx} cx={s.x} cy={s.y} r={s.r} fill="#ffffff" opacity="0.8" />
        ))}
      </svg>
    </div>
  );
}

/**
 * 4. Royal Palace Damask & Golden Stage Spotlights Theme
 */
export function RoyalPalaceVelvetTheme() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
      {/* Golden Stage Spotlights */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-400/20 via-transparent to-black/60" />

      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 560" fill="none" preserveAspectRatio="xMidYMid slice">
        <defs>
          <pattern id="damaskPattern" width="40" height="40" patternUnits="userSpaceOnUse">
            <path
              d="M 20 5 C 15 15, 5 15, 5 20 C 5 25, 15 25, 20 35 C 25 25, 35 25, 35 20 C 35 15, 25 15, 20 5 Z"
              stroke="#fbbf24"
              strokeWidth="0.8"
              fill="none"
              opacity="0.12"
            />
            <circle cx="20" cy="20" r="1.5" fill="#fbbf24" opacity="0.15" />
          </pattern>
        </defs>

        {/* Wallpaper Grid */}
        <rect width="100%" height="100%" fill="url(#damaskPattern)" />

        {/* Top Royal Drapery Curtain Swag */}
        <path
          d="M 0 0 C 60 40, 140 40, 200 10 C 260 40, 340 40, 400 0 L 400 15 C 340 55, 260 55, 200 25 C 140 55, 60 55, 0 15 Z"
          fill="#fbbf24"
          opacity="0.3"
        />
        <path
          d="M 0 0 C 60 30, 140 30, 200 0 C 260 30, 340 30, 400 0"
          stroke="#fef08a"
          strokeWidth="2"
          fill="none"
          opacity="0.6"
        />

        {/* Drapery Tassels */}
        <circle cx="200" cy="18" r="4" fill="#fbbf24" opacity="0.8" />
        <path d="M 200 18 L 197 32 L 203 32 Z" fill="#fbbf24" opacity="0.8" />
        <circle cx="0" cy="12" r="4" fill="#fbbf24" opacity="0.8" />
        <circle cx="400" cy="12" r="4" fill="#fbbf24" opacity="0.8" />
      </svg>
    </div>
  );
}

/**
 * Universal Card Background Theme Layer Dispatcher
 */
export function CardBackgroundThemeLayer({
  themeType = "auto",
  templateId = "",
}: {
  themeType?: string;
  templateId?: string;
}) {
  const effectiveTheme =
    themeType !== "auto"
      ? themeType
      : templateId.includes("birthday-2") || templateId.includes("galaxy")
      ? "cosmic-galaxy"
      : templateId.includes("birthday-3") || templateId.includes("annual")
      ? "party-streamers"
      : templateId.includes("sports") || templateId.includes("achievement")
      ? "royal-palace"
      : "royal-gold-bokeh";

  switch (effectiveTheme) {
    case "party-streamers":
      return <PartyConfettiTheme />;
    case "cosmic-galaxy":
      return <CosmicGalaxyTheme />;
    case "royal-palace":
      return <RoyalPalaceVelvetTheme />;
    case "royal-gold-bokeh":
    default:
      return <RoyalGoldBokehTheme />;
  }
}


/**
 * Realistic Metallic Paperclip (For Polaroid Frame)
 */
export function RealisticPaperclipSVG({ className = "size-8", color = "#e2e8f0" }: { className?: string; color?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 70" fill="none">
      <defs>
        <linearGradient id="clipShine" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="40%" stopColor={color} />
          <stop offset="100%" stopColor="#64748b" />
        </linearGradient>
        <filter id="clipDropShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="1.5" dy="2.5" stdDeviation="1.5" floodColor="#000000" floodOpacity="0.45" />
        </filter>
      </defs>
      <path
        d="M 12 60 L 12 18 C 12 10, 28 10, 28 18 L 28 54 C 28 60, 18 60, 18 54 L 18 24 C 18 20, 24 20, 24 24 L 24 50"
        stroke="url(#clipShine)"
        strokeWidth="3.2"
        strokeLinecap="round"
        fill="none"
        filter="url(#clipDropShadow)"
      />
    </svg>
  );
}

/**
 * 3D Celebration Gift Box with Ribbon
 */
export function CelebrationGiftBoxSVG({ className = "size-12" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 80 80" fill="none">
      <defs>
        <linearGradient id="giftBody" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f43f5e" />
          <stop offset="50%" stopColor="#e11d48" />
          <stop offset="100%" stopColor="#9f1239" />
        </linearGradient>
        <linearGradient id="giftLid" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fb7185" />
          <stop offset="100%" stopColor="#be123c" />
        </linearGradient>
        <linearGradient id="goldRibbon" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="50%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#b45309" />
        </linearGradient>
      </defs>

      {/* Main Box */}
      <rect x="15" y="32" width="50" height="42" rx="5" fill="url(#giftBody)" />
      {/* Box Lid */}
      <rect x="11" y="24" width="58" height="12" rx="3" fill="url(#giftLid)" />

      {/* Vertical Ribbon */}
      <rect x="35" y="32" width="10" height="42" fill="url(#goldRibbon)" />
      <rect x="35" y="24" width="10" height="12" fill="url(#goldRibbon)" />

      {/* Horizontal Ribbon */}
      <rect x="15" y="48" width="50" height="10" fill="url(#goldRibbon)" />

      {/* Ribbon Bow */}
      <path
        d="M 40 24 C 30 10, 20 18, 35 24 Z"
        fill="url(#goldRibbon)"
      />
      <path
        d="M 40 24 C 50 10, 60 18, 45 24 Z"
        fill="url(#goldRibbon)"
      />
      <circle cx="40" cy="24" r="3.5" fill="#fef08a" />
    </svg>
  );
}

/**
 * Overhead Studio Spotlight Beam
 */
export function OverheadSpotlightBeam() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
      <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-[120%] h-[75%] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-200/25 via-yellow-400/8 to-transparent blur-2xl" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-80 bg-gradient-to-b from-white/20 via-amber-300/10 to-transparent blur-3xl transform -skew-x-6" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-80 bg-gradient-to-b from-white/20 via-amber-300/10 to-transparent blur-3xl transform skew-x-6" />
    </div>
  );
}

/**
 * Golden Medal Emblem with Ribbon
 */
export function GoldenMedalEmblemSVG({ className = "size-10" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 60 75" fill="none">
      <defs>
        <linearGradient id="medalGold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="50%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#92400e" />
        </linearGradient>
        <linearGradient id="ribbonRed" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ef4444" />
          <stop offset="100%" stopColor="#991b1b" />
        </linearGradient>
        <linearGradient id="ribbonBlue" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#1e3a8a" />
        </linearGradient>
      </defs>

      {/* Ribbon Tails */}
      <polygon points="18,0 26,0 34,35 22,35" fill="url(#ribbonRed)" />
      <polygon points="34,0 42,0 38,35 26,35" fill="url(#ribbonBlue)" />
      <polygon points="22,35 14,48 24,45 28,48 30,35" fill="url(#ribbonRed)" />
      <polygon points="38,35 46,48 36,45 32,48 30,35" fill="url(#ribbonBlue)" />

      {/* Golden Medal Disc */}
      <circle cx="30" cy="48" r="18" fill="url(#medalGold)" stroke="#fef08a" strokeWidth="1.5" />
      <circle cx="30" cy="48" r="14" stroke="#78350f" strokeWidth="1" strokeDasharray="2 1.5" fill="none" opacity="0.6" />

      {/* Star / #1 in center */}
      <path
        d="M 30 38 L 32.5 44 L 38 44.5 L 34 48 L 35 54 L 30 50.5 L 25 54 L 26 48 L 22 44.5 L 27.5 44 Z"
        fill="#ffffff"
        opacity="0.9"
      />
    </svg>
  );
}
