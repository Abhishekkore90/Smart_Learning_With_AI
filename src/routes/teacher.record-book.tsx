import { createFileRoute, Link } from "@tanstack/react-router";
import { TeacherHeader } from "@/components/teacher/TeacherHeader";
import { TeacherSidebar } from "@/components/teacher/TeacherSidebar";
import { MonthlyParipathRegister } from "@/components/teacher/MonthlyParipathRegister";
import { ChevronLeft } from "lucide-react";

export const Route = createFileRoute("/teacher/record-book")({
  component: RecordBookPage,
});

function RecordBookPage() {
  return (
    <div className="min-h-screen bg-slate-50/50">
      <TeacherHeader />
      <TeacherSidebar />

      <main className="lg:pl-64 pt-16 min-h-screen">
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
          {/* Header Bar */}
          <div className="flex items-center justify-between bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
                परिपाठ नोंदवही <span className="text-indigo-600">(Month Paripath Record Book)</span>
              </h1>
              <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-wider">
                दैनिक परिपाठ आणि परिपाठातील उपक्रम मासिक नोंद तक्ता
              </p>
            </div>
            <Link
              to="/teacher"
              className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-colors shadow-md active:scale-95"
            >
              <ChevronLeft className="size-4" /> Dashboard
            </Link>
          </div>

          {/* Monthly Register Component */}
          <MonthlyParipathRegister />
        </div>
      </main>
    </div>
  );
}
