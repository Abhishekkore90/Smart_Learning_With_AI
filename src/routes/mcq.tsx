import React, { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";
import { MCQHomeworkSection } from "@/components/homework/MCQHomeworkSection";
import { clearLocalQuizData } from "@/services/mcqHomeworkService";
import logoImg from "@/assets/logo.jpeg";

export const Route = createFileRoute("/mcq")({
  validateSearch: (search: Record<string, unknown>) => ({
    id: (search.id as string) || undefined,
  }),
  head: () => ({
    meta: [
      {
        title: "दैनिक MCQ स्वाध्याय व प्रश्नमंजुषा — SMART LEARNING",
      },
    ],
  }),
  component: MCQPublicPage,
});

function MCQPublicPage() {
  const { id } = Route.useSearch();

  // Clean up any guest quiz data when the visitor navigates away
  useEffect(() => {
    return () => {
      if (id) {
        clearLocalQuizData(id);
      }
      sessionStorage.removeItem("mcq_guest_student_name");
    };
  }, [id]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100">
      {/* Clean Public Header */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Logo & Platform Name */}
          <a
            href="https://sgkbrainova.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 group"
          >
            <img
              src={logoImg}
              alt="SGK Brainova"
              className="w-10 h-10 rounded-xl object-cover border border-indigo-200 dark:border-indigo-800 shadow-xs group-hover:scale-105 transition-transform"
            />
            <div>
              <span className="text-[10px] uppercase font-black tracking-widest text-indigo-600 dark:text-indigo-400 block leading-none">
                SMART LEARNING WITH AI
              </span>
              <span className="text-sm font-extrabold text-slate-900 dark:text-white leading-tight block">
                SGK BRAINOVA DIGITAL ACADEMY
              </span>
            </div>
          </a>

          {/* Official Portal Link */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <a
              href="https://sgkbrainova.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 transition-colors"
            >
              <span>🌐 sgkbrainova.com</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 py-6 sm:py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <MCQHomeworkSection
          initialQuizId={id}
          defaultRole="user"
          userName="विद्यार्थी"
        />
      </main>

      {/* Minimal Public Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-6 text-center text-xs text-slate-500 bg-white dark:bg-slate-900">
        <p>
          © 2026 SGK Brainova Digital Learning • अधिकृत संकेतस्थळ:{" "}
          <a
            href="https://sgkbrainova.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-600 hover:underline font-bold"
          >
            sgkbrainova.com
          </a>
        </p>
      </footer>
    </div>
  );
}
