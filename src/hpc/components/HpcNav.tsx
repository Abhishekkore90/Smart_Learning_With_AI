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

  // Extract active studentId from URL if present, or fallback to localStorage
  const studentMatch = path.match(/\/teacher\/hpc\/(?:assessment|student)\/([^/?#]+)/);
  const activeStudentId =
    studentMatch && studentMatch[1]
      ? studentMatch[1]
      : typeof window !== "undefined"
      ? localStorage.getItem("hpc_last_student_id")
      : null;

  const currentSearch = (location.search || {}) as Record<string, any>;
  const currentTab = currentSearch?.tab || "assessment";
  const isAssessmentPath = path.includes("/teacher/hpc/assessment");

  const rawNavItems = [
    {
      id: "dashboard",
      to: "/teacher/hpc",
      search: undefined,
      label: "HPC डॅशबोर्ड",
      subLabel: "Dashboard",
      icon: LayoutDashboard,
      active: path === "/teacher/hpc" || path === "/teacher/hpc/",
    },
    {
      id: "part_a",
      to: activeStudentId ? `/teacher/hpc/student/${activeStudentId}` : "/teacher/hpc/students",
      search: undefined,
      label: "विद्यार्थी नोंदी (भाग अ)",
      subLabel: "Part A Profile",
      icon: Users,
      active: path.includes("/teacher/hpc/students") || path.includes("/teacher/hpc/student/"),
    },
    {
      id: "part_b",
      to: activeStudentId ? `/teacher/hpc/assessment/${activeStudentId}` : "/teacher/hpc/students",
      search: activeStudentId ? { tab: "assessment" } : undefined,
      label: "भाग ब: सत्रनिहाय मूल्यमापन",
      subLabel: "Part B Assessment",
      icon: BookOpen,
      active: isAssessmentPath && currentTab === "assessment",
    },
    {
      id: "part_c",
      to: activeStudentId ? `/teacher/hpc/assessment/${activeStudentId}` : "/teacher/hpc/students",
      search: activeStudentId ? { tab: "annual" } : undefined,
      label: "भाग क: वार्षिक सर्वंकष गोषवारा",
      subLabel: "Part C Summary",
      icon: Award,
      active: isAssessmentPath && currentTab === "annual",
    },
    {
      id: "reports",
      to: "/teacher/hpc/reports",
      search: undefined,
      label: "HPC अहवाल व PDF",
      subLabel: "Cards & Reports",
      icon: FileText,
      active: path.includes("/teacher/hpc/reports"),
    },
  ];

  // Strictly deduplicate by id
  const navItems = Array.from(
    new Map(rawNavItems.map((item) => [item.id, item])).values()
  );

  return (
    <div className="w-full bg-white border-b border-slate-200/80 shadow-xs sticky top-16 z-30">
      {/* Top Header Line: Module Title / Stage Indicator & Teacher Link */}
      <div className="border-b border-slate-100">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              to="/teacher"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
            >
              <ArrowLeft className="size-3.5" />
              <span>शिक्षक डॅशबोर्ड</span>
            </Link>

            <div className="h-4 w-px bg-slate-200" />

            <div className="flex items-center gap-2">
              <div className="size-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-xs">
                <Sparkles className="size-4" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-black text-slate-900 tracking-tight">
                  समग्र प्रगतिपत्रक (HPC)
                </span>
                <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {stage.titleMarathi}
                </span>
              </div>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-slate-500">
            <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200/60">
              इयत्ता: {selectedClass}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200/60">
              वर्ष: {academicYear}
            </span>
          </div>
        </div>
      </div>

      {/* Downside Dedicated Navigation Bar (Separate Clean Line) */}
      <div className="bg-slate-50/70 py-2 border-t border-slate-50">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 flex items-center justify-center">
          <div className="inline-flex items-center gap-1 sm:gap-2 p-1.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs overflow-x-auto max-w-full">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.id}
                  to={item.to as any}
                  search={item.search as any}
                  className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                    item.active
                      ? "bg-slate-950 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  <Icon className={`size-3.5 ${item.active ? "text-amber-400" : "text-slate-400"}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
