import React from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  ClipboardCheck,
  FileText,
  ArrowLeft,
  Sparkles,
  BookOpen,
  Award,
} from "lucide-react";
import { HpcStageId } from "../types/hpc";
import { HPC_STAGES_INFO } from "../data/hpcCurricularGoals";

interface HpcNavProps {
  stageId?: HpcStageId;
  selectedClass?: string;
  academicYear?: string;
  onClassChange?: (cls: string) => void;
  onYearChange?: (yr: string) => void;
}

export function HpcNav({
  stageId = "foundational",
  selectedClass = "1st",
  academicYear = "2025-2026",
}: HpcNavProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname;

  const stage = HPC_STAGES_INFO.find((s) => s.id === stageId) || HPC_STAGES_INFO[0];

  const navItems = [
    {
      to: "/teacher/hpc",
      label: "HPC डॅशबोर्ड",
      subLabel: "Dashboard",
      icon: LayoutDashboard,
      active: path === "/teacher/hpc" || path === "/teacher/hpc/",
    },
    {
      to: "/teacher/hpc/students",
      label: "विद्यार्थी नोंदी (भाग अ)",
      subLabel: "Part A Profile",
      icon: Users,
      active: path.includes("/teacher/hpc/students") || path.includes("/teacher/hpc/student/"),
    },
    {
      to: "/teacher/hpc/reports",
      label: "HPC अहवाल व PDF",
      subLabel: "Cards & Reports",
      icon: FileText,
      active: path.includes("/teacher/hpc/reports"),
    },
  ];

  return (
    <div className="w-full bg-white border-b border-slate-200/80 shadow-xs sticky top-16 z-30">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* Module Title / Stage Indicator */}
        <div className="flex items-center gap-3">
          <Link
            to="/teacher"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
          >
            <ArrowLeft className="size-3.5" />
            <span className="hidden sm:inline">शिक्षक डॅशबोर्ड</span>
          </Link>

          <div className="h-4 w-px bg-slate-200" />

          <div className="flex items-center gap-2">
            <div className="size-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="size-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black text-slate-900 tracking-tight">
                  समग्र प्रगतिपत्रक (HPC)
                </span>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {stage.titleMarathi}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Links */}
        <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto py-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  item.active
                    ? "bg-gradient-to-r from-slate-900 to-indigo-950 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <Icon className={`size-3.5 ${item.active ? "text-indigo-400" : "text-slate-400"}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
