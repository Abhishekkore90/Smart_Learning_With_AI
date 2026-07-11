import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Cake,
  Gift,
  PartyPopper,
  Share2,
  X,
  Star,
  Heart,
  MessageCircle,
  Download,
  Calendar,
  Camera,
  User,
} from "lucide-react";
import confetti from "canvas-confetti";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface StudentBirthdaySystemProps {
  student: {
    fullName: string;
    class?: string;
    rollNo?: string;
    photo?: string;
    dob?: string; // ISO string
    birthdayMessage?: string;
  };
}

export function StudentBirthdaySystem({ student }: StudentBirthdaySystemProps) {
  const [showPopup, setShowPopup] = useState(false);
  const [isBirthday, setIsBirthday] = useState(false);

  useEffect(() => {
    if (student.dob) {
      const today = new Date();
      const dob = new Date(student.dob);
      if (
        today.getDate() === dob.getDate() &&
        today.getMonth() === dob.getMonth()
      ) {
        setIsBirthday(true);
        // Only show popup once per session or day
        const lastSeen = localStorage.getItem(
          `birthday_popup_${student.fullName}`,
        );
        const todayStr = today.toISOString().split("T")[0];
        if (lastSeen !== todayStr) {
          setShowPopup(true);
          localStorage.setItem(`birthday_popup_${student.fullName}`, todayStr);
          triggerConfetti();
        }
      }
    }
  }, [student]);

  const triggerConfetti = () => {
    const duration = 5 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = {
      startVelocity: 30,
      spread: 360,
      ticks: 60,
      zIndex: 9999,
    };

    const randomInRange = (min: number, max: number) =>
      Math.random() * (max - min) + min;

    const interval: any = setInterval(function () {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      });
    }, 250);
  };

  const shareOnWhatsApp = () => {
    const message = `🎉 Happy Birthday Dear ${student.fullName} 🎂\n\nMay your life be filled with happiness, success and joy.\nHave a wonderful day!\n\n— From School Management ❤️`;
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encodedMessage}`, "_blank");
  };

  if (!isBirthday) return null;

  return (
    <div className="space-y-6 mb-10">
      {/* Birthday Card In-Dashboard */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative overflow-hidden rounded-[3rem] p-8 md:p-12 text-white shadow-2xl group"
        style={{
          background:
            "linear-gradient(135deg, #FF3CAC 0%, #784BA0 50%, #2B86C5 100%)",
        }}
      >
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
        <div className="absolute -top-24 -right-24 size-64 bg-white/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-24 -left-24 size-64 bg-blue-400/20 rounded-full blur-3xl" />

        <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
          {/* Photo Section */}
          <div className="relative shrink-0">
            <motion.div
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 4, repeat: Infinity }}
              className="size-32 md:size-40 rounded-3xl overflow-hidden border-4 border-white/30 shadow-2xl relative"
            >
              {student.photo ? (
                <img
                  src={student.photo}
                  alt={student.fullName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-white/20 backdrop-blur-md flex items-center justify-center">
                  <User className="size-16 text-white/50" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
            </motion.div>
            <div className="absolute -top-4 -left-4 size-12 bg-yellow-400 rounded-2xl flex items-center justify-center shadow-lg -rotate-12 animate-bounce">
              <Star className="size-6 text-white" fill="white" />
            </div>
          </div>

          {/* Details Section */}
          <div className="flex-1 text-center md:text-left space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/20 backdrop-blur-md rounded-full border border-white/30 text-xs font-black uppercase tracking-widest">
              <PartyPopper className="size-4" /> Today's Celebration
            </div>
            <h2 className="text-4xl md:text-5xl font-black tracking-tighter drop-shadow-xl">
              Happy Birthday,{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-orange-300">
                {student.fullName.split(" ")[0]}!
              </span>
            </h2>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
              <div className="px-5 py-2 bg-black/10 rounded-2xl border border-white/10 backdrop-blur-sm">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-60 block">
                  Class
                </span>
                <span className="font-bold text-lg">
                  {student.class || "N/A"}
                </span>
              </div>
              <div className="px-5 py-2 bg-black/10 rounded-2xl border border-white/10 backdrop-blur-sm">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-60 block">
                  Roll No
                </span>
                <span className="font-bold text-lg">
                  {student.rollNo || "N/A"}
                </span>
              </div>
            </div>
            <p className="text-white/80 font-medium italic text-lg italic max-w-lg">
              "
              {student.birthdayMessage ||
                "Wishing you a day filled with infinite possibilities and joy!"}
              "
            </p>

            {/* New: Special Teacher Message Badge */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1 }}
              className="mt-6 flex items-center gap-3 p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 w-fit"
            >
              <div className="size-10 rounded-xl bg-pink-500 flex items-center justify-center text-white shadow-lg">
                <Heart className="size-5" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-white/50 leading-none mb-1">
                  Teacher's Special Wish
                </p>
                <p className="text-sm font-bold text-white">
                  Your teacher has shared a special card for you!
                </p>
              </div>
            </motion.div>
          </div>

          {/* Action Button */}
          <button
            onClick={shareOnWhatsApp}
            className="px-8 py-5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest flex items-center gap-3 transition-all shadow-xl shadow-emerald-500/20 group-hover:scale-105"
          >
            <MessageCircle className="size-5" /> Share Wishes on WhatsApp
          </button>
        </div>
      </motion.div>

      {/* Birthday Modal Popup */}
      <Dialog open={showPopup} onOpenChange={setShowPopup}>
        <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden bg-transparent border-none shadow-none">
          <motion.div
            initial={{ opacity: 0, scale: 0.5, rotate: -10 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            className="bg-white rounded-[3rem] p-10 text-center relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-purple-50 -z-10" />
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500" />

            <button
              onClick={() => setShowPopup(false)}
              className="absolute top-6 right-6 size-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-200 transition-colors"
            >
              <X className="size-5" />
            </button>

            <div className="space-y-8">
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="size-24 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-3xl mx-auto flex items-center justify-center shadow-xl rotate-12"
              >
                <Cake className="size-12 text-white" />
              </motion.div>

              <div className="space-y-2">
                <h2 className="text-4xl font-black text-slate-900 tracking-tighter">
                  Happy Birthday! 🎂
                </h2>
                <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-xs">
                  Today is your special day
                </p>
              </div>

              <div className="size-32 rounded-3xl overflow-hidden mx-auto border-4 border-white shadow-2xl ring-4 ring-blue-50">
                {student.photo ? (
                  <img
                    src={student.photo}
                    alt={student.fullName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-blue-100 flex items-center justify-center">
                    <User className="size-16 text-blue-200" />
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <h3 className="text-2xl font-black text-slate-900">
                  {student.fullName}
                </h3>
                <p className="text-slate-400 font-medium">
                  Have a magical and wonderful year ahead!
                </p>
              </div>

              <div className="pt-4 flex flex-col gap-3">
                <Button
                  onClick={shareOnWhatsApp}
                  className="w-full h-16 rounded-[2rem] bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase tracking-widest gap-3 text-xs shadow-lg shadow-emerald-500/20"
                >
                  <MessageCircle className="size-5" /> Share on WhatsApp
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowPopup(false)}
                  className="w-full h-16 rounded-[2rem] font-black uppercase tracking-widest text-xs border-2"
                >
                  Close & Explore
                </Button>
              </div>
            </div>
          </motion.div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
