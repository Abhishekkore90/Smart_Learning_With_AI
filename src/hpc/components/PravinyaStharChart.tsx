import React from "react";
import { PravinyaEmblem, PravinyaLevel } from "./PravinyaEmblem";

export type { PravinyaLevel };

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
  size = 175,
}) => {
  return (
    <div className={`relative flex flex-col items-center select-none ${className}`}>
      {/* Container with gentle elevation & interactive hover */}
      <div className="relative rounded-2xl p-2 bg-gradient-to-b from-sky-50/70 to-emerald-50/50 border border-slate-200/90 shadow-xs flex flex-col items-center group transition-all">
        {/* Diagram title header */}
        <div className="w-full flex items-center justify-between px-1 mb-1.5">
          <span className="text-[10px] font-black tracking-wider text-slate-700 uppercase flex items-center gap-1">
            <span className="size-1.5 rounded-full bg-indigo-600 animate-pulse" />
            प्राविण्य स्तर
          </span>
          <span
            className={`text-[9.5px] font-black px-2 py-0.5 rounded-md ${
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

        {/* 100% Vector SCERT Pravinya Emblem (Interactive) */}
        <div
          className="relative cursor-pointer transition-transform hover:scale-[1.02] flex items-center justify-center"
          title="स्तर निवडण्यासाठी क्लिक करा (आकाश, पर्वत, किंवा निर्झर)"
        >
          <PravinyaEmblem
            level={selectedLevel}
            size={size}
            showSlider={true}
            onSelectLevel={onSelectLevel}
          />
        </div>

        {/* Caption with quick select pills */}
        <div className="w-full grid grid-cols-3 gap-1 mt-2 text-center">
          <button
            type="button"
            onClick={() => onSelectLevel("nirjhar")}
            className={`py-1 px-1 rounded-lg text-[9.5px] font-black transition-all cursor-pointer ${
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
            className={`py-1 px-1 rounded-lg text-[9.5px] font-black transition-all cursor-pointer ${
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
            className={`py-1 px-1 rounded-lg text-[9.5px] font-black transition-all cursor-pointer ${
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
