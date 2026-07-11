import {
  createFileRoute,
  Outlet,
  useNavigate,
  useLocation,
} from "@tanstack/react-router";
import { motion } from "framer-motion";
import { TeacherHeader } from "@/components/teacher/TeacherHeader";
import { TeacherSidebar } from "@/components/teacher/TeacherSidebar";
import { ArrowRight } from "lucide-react";

export const Route = createFileRoute("/teacher/timetable")({
  component: TimetableLayout,
});

const CLASSES = [
  { id: "1st", en: "CLASS 1ST", mr: "इयत्ता पहिली" },
  { id: "2nd", en: "CLASS 2ND", mr: "इयत्ता दुसरी" },
  { id: "3rd", en: "CLASS 3RD", mr: "इयत्ता तिसरी" },
  { id: "4th", en: "CLASS 4TH", mr: "इयत्ता चौथी" },
  { id: "5th", en: "CLASS 5TH", mr: "इयत्ता पाचवी" },
  { id: "6th", en: "CLASS 6TH", mr: "इयत्ता सहावी" },
  { id: "7th", en: "CLASS 7TH", mr: "इयत्ता सातवी" },
  { id: "8th", en: "CLASS 8TH", mr: "इयत्ता आठवी" },
];

function TimetableLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const isIndex =
    location.pathname === "/teacher/timetable" ||
    location.pathname === "/teacher/timetable/";

  if (isIndex) {
    return (
      <div className="min-h-screen bg-slate-50">
        <TeacherHeader />
        <TeacherSidebar />

        <main className="lg:pl-64 pt-16 min-h-screen">
          <div className="p-6 md:p-10 max-w-5xl mx-auto space-y-8 flex flex-col justify-center min-h-[calc(100vh-8rem)]">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">
                Select Class / इयत्ता निवडा
              </h2>
              <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest">
                Step 2: Choose the target standard
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto w-full">
              {CLASSES.map((cls, idx) => {
                return (
                  <motion.button
                    key={cls.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    onClick={() => {
                      navigate({
                        to: "/teacher/timetable/class",
                        search: { class: cls.id },
                      });
                    }}
                    className="group p-8 rounded-[2.5rem] border text-center transition-all duration-500 shadow-md hover:shadow-[0_20px_45px_rgba(139,92,246,0.3)] cursor-pointer relative overflow-hidden flex flex-col items-center gap-4 bg-gradient-to-br from-[#8b5cf6] to-[#6d28d9] text-white border-[#7c3aed]/30 hover:scale-[1.02]"
                  >
                    <div className="absolute -bottom-6 -right-6 size-24 text-white/5 pointer-events-none group-hover:scale-110 transition-transform duration-700">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        className="w-full h-full"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
                        />
                      </svg>
                    </div>

                    <div className="size-12 bg-white/10 rounded-2xl flex items-center justify-center border border-white/20 backdrop-blur-sm group-hover:scale-110 transition-transform text-white font-black text-sm uppercase">
                      {cls.id}
                    </div>

                    <div className="space-y-1">
                      <h3 className="text-xl font-black leading-tight tracking-tight">
                        {cls.mr}
                      </h3>
                      <p className="text-[10px] text-violet-200 font-bold uppercase tracking-wider">
                        {cls.en}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-violet-200 mt-2">
                      प्रवेश करा{" "}
                      <ArrowRight className="size-3 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return <Outlet />;
}
