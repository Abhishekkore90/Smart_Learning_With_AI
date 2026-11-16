import React from "react";

export type PravinyaLevel = "nirjhar" | "parvat" | "aakash";

interface PravinyaStharChartProps {
  selectedLevel: PravinyaLevel;
  onSelectLevel: (lvl: PravinyaLevel) => void;
  className?: string;
  size?: number;
}

export const PravinyaStharChart: React.FC<PravinyaStharChartProps> = ({
  selectedLevel,
  onSelectLevel,
  className = "",
  size = 170,
}) => {
  return (
    <div className={`relative flex flex-col items-center select-none ${className}`}>
      {/* Container with gentle elevation & interactive hover */}
      <div
        className="relative rounded-2xl p-2 bg-gradient-to-b from-sky-50/60 to-emerald-50/40 border border-slate-200/90 shadow-xs flex flex-col items-center group transition-all"
        style={{ width: size + 20 }}
      >
        {/* Diagram title header */}
        <div className="w-full flex items-center justify-between px-1 mb-1.5">
          <span className="text-[10px] font-black tracking-wider text-slate-700 uppercase flex items-center gap-1">
            <span className="size-1.5 rounded-full bg-indigo-600 animate-pulse" />
            प्राविण्य स्तर
          </span>
          <span
            className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${
              selectedLevel === "nirjhar"
                ? "bg-emerald-100 text-emerald-800"
                : selectedLevel === "parvat"
                ? "bg-indigo-100 text-indigo-800"
                : "bg-sky-100 text-sky-800"
            }`}
          >
            {selectedLevel === "nirjhar"
              ? "प्रवाह (निर्झर)"
              : selectedLevel === "parvat"
              ? "पर्वत"
              : "आकाश"}
          </span>
        </div>

        {/* Circular Graphic Container */}
        <div
          className="relative rounded-full overflow-hidden shadow-sm border-2 border-white ring-2 ring-slate-200/80 cursor-pointer transition-transform hover:scale-102"
          style={{ width: size, height: size }}
          title="स्तर निवडण्यासाठी क्लिक करा (आकाश, पर्वत, किंवा निर्झर)"
        >
          {/* Base Clean Graphic */}
          <img
            src="/hpc/pravinya_sthar_chart_clean.png"
            alt="प्राविण्य स्तर (आकाश, पर्वत, निर्झर)"
            className="w-full h-full object-cover object-center pointer-events-none"
            onError={(e) => {
              // fallback if clean not found
              (e.currentTarget as HTMLImageElement).src = "/hpc/pravinya_sthar_chart.png";
            }}
          />

          {/* Interactive Clickable Rings Overlay */}
          {/* 1. आकाश (Outer top/sides) */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelectLevel("aakash");
            }}
            title="आकाश स्तर निवडा"
            className={`absolute inset-x-0 top-0 h-[38%] rounded-t-full transition-colors ${
              selectedLevel === "aakash"
                ? "bg-sky-400/20 ring-3 ring-sky-500/80 ring-inset"
                : "hover:bg-sky-300/15"
            }`}
          />

          {/* 2. पर्वत (Middle Ring) */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelectLevel("parvat");
            }}
            title="पर्वत स्तर निवडा"
            className={`absolute inset-x-[12%] top-[34%] h-[36%] rounded-full transition-colors ${
              selectedLevel === "parvat"
                ? "bg-indigo-500/25 ring-3 ring-indigo-600/80 ring-inset"
                : "hover:bg-indigo-400/15"
            }`}
          />

          {/* 3. निर्झर (Center bottom inner circle) */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelectLevel("nirjhar");
            }}
            title="प्रवाह (निर्झर) स्तर निवडा"
            className={`absolute inset-x-[24%] bottom-[4%] h-[38%] rounded-full transition-colors ${
              selectedLevel === "nirjhar"
                ? "bg-emerald-500/25 ring-3 ring-emerald-600/80 ring-inset"
                : "hover:bg-emerald-400/15"
            }`}
          />
        </div>

        {/* Caption with quick select pills */}
        <div className="w-full grid grid-cols-3 gap-1 mt-2 text-center">
          <button
            type="button"
            onClick={() => onSelectLevel("nirjhar")}
            className={`py-0.5 px-1 rounded-md text-[9px] font-black transition-all cursor-pointer ${
              selectedLevel === "nirjhar"
                ? "bg-emerald-600 text-white shadow-2xs"
                : "bg-white text-slate-600 hover:bg-emerald-50 border border-slate-200"
            }`}
          >
            निर्झर
          </button>
          <button
            type="button"
            onClick={() => onSelectLevel("parvat")}
            className={`py-0.5 px-1 rounded-md text-[9px] font-black transition-all cursor-pointer ${
              selectedLevel === "parvat"
                ? "bg-indigo-600 text-white shadow-2xs"
                : "bg-white text-slate-600 hover:bg-indigo-50 border border-slate-200"
            }`}
          >
            पर्वत
          </button>
          <button
            type="button"
            onClick={() => onSelectLevel("aakash")}
            className={`py-0.5 px-1 rounded-md text-[9px] font-black transition-all cursor-pointer ${
              selectedLevel === "aakash"
                ? "bg-sky-600 text-white shadow-2xs"
                : "bg-white text-slate-600 hover:bg-sky-50 border border-slate-200"
            }`}
          >
            आकाश
          </button>
        </div>
      </div>
    </div>
  );
};
