import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  MapPin,
  Globe,
  ChevronRight,
  School,
  Landmark,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import { showToast as toast } from "@/lib/custom-toast";

export const Route = createFileRoute("/teacher/setup")({
  head: () => ({ meta: [{ title: "Setup Profile — Educator" }] }),
  component: TeacherSetupPage,
});

function TeacherSetupPage() {
  const [step, setStep] = useState(1);
  const [state, setState] = useState("");
  const [board, setBoard] = useState("");
  const navigate = useNavigate();

  const states = [
    "Maharashtra",
    "Gujarat",
    "Karnataka",
    "Delhi",
    "Tamil Nadu",
    "Rajasthan",
  ];
  const boards = [
    "Maharashtra ZP Teacher",
    "MSBSHSE",
    "CBSE",
    "ICSE",
    "IB",
    "IGCSE",
  ];

  const handleComplete = () => {
    if (!state || !board) {
      toast.error("Please select both state and board");
      return;
    }
    toast.success(`Profile updated: ${board} - ${state}`);
    navigate({ to: "/teacher" });
  };

  return (
    <div className="min-h-screen bg-[#FDFDFF] text-[#111827] selection:bg-teal-500/10 flex items-center justify-center p-6">
      <div className="max-w-xl w-full">
        <div className="text-center mb-12 space-y-4">
          <div className="size-16 bg-teal-50 rounded-[1.5rem] flex items-center justify-center text-teal-600 mx-auto shadow-sm">
            <Landmark className="size-8" />
          </div>
          <h1 className="text-4xl font-black tracking-tight">
            Institutional <span className="text-teal-600">Context.</span>
          </h1>
          <p className="text-slate-500 font-medium">
            Select your regional board and state to customize your dashboard.
          </p>
        </div>

        <div className="bg-white rounded-[3rem] border border-slate-200/60 p-10 shadow-soft space-y-10">
          {/* Progress Indicator */}
          <div className="flex justify-between items-center px-4">
            {[1, 2].map((s) => (
              <div key={s} className="flex items-center gap-3">
                <div
                  className={`size-8 rounded-full flex items-center justify-center text-xs font-black transition-all ${step >= s ? "bg-teal-600 text-white shadow-glow-sm" : "bg-slate-100 text-slate-400"}`}
                >
                  {s}
                </div>
                {s === 1 && (
                  <div
                    className={`w-32 h-1 rounded-full transition-all ${step > 1 ? "bg-teal-600" : "bg-slate-100"}`}
                  />
                )}
              </div>
            ))}
          </div>

          <div className="min-h-[400px]">
            {step === 1 ? (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <div className="flex items-center gap-3 text-sm font-black uppercase tracking-widest text-slate-400 mb-6">
                  <MapPin className="size-4" /> Select Your State
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {states.map((s) => (
                    <button
                      key={s}
                      onClick={() => setState(s)}
                      className={`p-6 rounded-3xl border-2 transition-all text-left group ${state === s ? "border-teal-600 bg-teal-50/30" : "border-slate-100 hover:border-teal-200"}`}
                    >
                      <div
                        className={`font-black text-lg transition-colors ${state === s ? "text-teal-700" : "text-slate-600 group-hover:text-slate-900"}`}
                      >
                        {s}
                      </div>
                      <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">
                        Republic of India
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <div className="flex items-center gap-3 text-sm font-black uppercase tracking-widest text-slate-400 mb-6">
                  <School className="size-4" /> Select Education Board
                </div>
                <div className="grid gap-4">
                  {boards.map((b) => (
                    <button
                      key={b}
                      onClick={() => setBoard(b)}
                      className={`p-6 rounded-3xl border-2 transition-all flex items-center justify-between group ${board === b ? "border-teal-600 bg-teal-50/30" : "border-slate-100 hover:border-teal-200"}`}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`size-10 rounded-xl flex items-center justify-center transition-all ${board === b ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-400"}`}
                        >
                          {b === "Maharashtra ZP Teacher" ? (
                            <Sparkles className="size-5" />
                          ) : (
                            <Globe className="size-5" />
                          )}
                        </div>
                        <div className="text-left">
                          <div
                            className={`font-black text-lg ${board === b ? "text-teal-700" : "text-slate-700"}`}
                          >
                            {b}
                          </div>
                          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                            Official Educational Council
                          </div>
                        </div>
                      </div>
                      {board === b && (
                        <div className="size-6 bg-teal-600 rounded-full flex items-center justify-center text-white">
                          <ChevronRight className="size-4" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </div>

          <div className="flex gap-4">
            {step === 2 && (
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-5 bg-slate-100 text-slate-600 rounded-[2rem] font-black uppercase text-xs tracking-widest hover:bg-slate-200 transition-all"
              >
                Go Back
              </button>
            )}
            <button
              onClick={() =>
                step === 1
                  ? state
                    ? setStep(2)
                    : toast.error("Select a state")
                  : handleComplete()
              }
              className="flex-[2] py-5 bg-[#111827] text-white rounded-[2rem] font-black uppercase text-xs tracking-[0.2em] hover:bg-teal-600 transition-all shadow-xl shadow-slate-900/10 flex items-center justify-center gap-3"
            >
              {step === 1 ? "Next Phase" : "Complete Setup"}{" "}
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
