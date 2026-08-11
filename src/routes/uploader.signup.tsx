import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Mail,
  Lock,
  User,
  CloudUpload,
  ArrowRight,
  Loader2,
  Sparkles,
  Eye,
  EyeOff,
  Film,
  Globe,
} from "lucide-react";
import { useState } from "react";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { showToast as toast } from "@/lib/custom-toast";

export const Route = createFileRoute("/uploader/signup")({
  head: () => ({ meta: [{ title: "Join Creator Network — SMART LEARNING" }] }),
  component: UploaderSignupPage,
});

function UploaderSignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );
      await updateProfile(userCredential.user, { displayName: name });

      await setDoc(doc(db, "users", userCredential.user.uid), {
        fullName: name,
        email: email,
        role: "uploader",
        createdAt: new Date().toISOString(),
      });

      toast.success("Creator account created successfully!");
      window.location.href = "/courses?action=upload";
    } catch (error: any) {
      toast.error(error.message || "Failed to create account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid md:grid-cols-2 bg-[#F8FAFC]">
      <div className="bg-white p-8 md:p-20 flex flex-col justify-center order-2 md:order-1">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="max-w-md w-full mx-auto"
        >
          <div className="mb-10">
            <h2 className="text-4xl font-black tracking-tight text-slate-900">
              Start Uploading.
            </h2>
            <p className="text-slate-500 mt-2 font-medium">
              Join our network of elite digital creators.
            </p>
          </div>

          <form className="space-y-6" onSubmit={handleSignup}>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">
                Full Legal Name
              </label>
              <div className="bg-[#F1F5F9] rounded-2xl flex items-center gap-3 px-6 border border-transparent focus-within:bg-white focus-within:border-violet-500/30 transition-all">
                <User className="size-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="John Doe"
                  className="bg-transparent outline-none w-full py-5 text-sm font-bold text-slate-900"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">
                Creator Email
              </label>
              <div className="bg-[#F1F5F9] rounded-2xl flex items-center gap-3 px-6 border border-transparent focus-within:bg-white focus-within:border-violet-500/30 transition-all">
                <Mail className="size-4 text-slate-400" />
                <input
                  type="email"
                  placeholder="creator@example.com"
                  className="bg-transparent outline-none w-full py-5 text-sm font-bold text-slate-900"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">
                Create Secure Password
              </label>
              <div className="bg-[#F1F5F9] rounded-2xl flex items-center gap-3 px-6 border border-transparent focus-within:bg-white focus-within:border-violet-500/30 transition-all relative">
                <Lock className="size-4 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••••••"
                  className="bg-transparent outline-none w-full py-5 text-sm font-bold text-slate-900 pr-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-6 text-slate-400 hover:text-violet-600 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-violet-600 text-white py-5 rounded-2xl font-black flex items-center justify-center gap-3 hover:bg-violet-700 transition-all shadow-xl shadow-violet-600/10 disabled:opacity-50 mt-4 uppercase text-xs tracking-[0.2em]"
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Register as Creator"
              )}{" "}
              <ArrowRight className="size-4" />
            </button>
          </form>

          <p className="mt-12 text-center text-sm font-bold text-slate-500">
            Already registered?{" "}
            <Link
              to="/login"
              search={{ role: "uploader" } as any}
              className="text-violet-600 hover:underline"
            >
              Creator Sign In
            </Link>
          </p>
        </motion.div>
      </div>

      <div className="relative overflow-hidden p-10 md:p-14 flex flex-col text-white bg-slate-900 order-1 md:order-2">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-violet-900/40 to-slate-900" />
        <div className="relative my-auto max-w-md">
          <div className="flex items-center gap-3 mb-8">
            <div className="size-10 bg-violet-500 rounded-lg flex items-center justify-center">
              <Sparkles className="size-6 text-white" />
            </div>
            <span className="text-xs font-black uppercase tracking-[0.3em] text-violet-400">
              Creator Advantage
            </span>
          </div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl font-black tracking-tighter mb-8 leading-none"
          >
            Share your <span className="text-violet-500">Knowledge.</span>
          </motion.h1>

          <div className="grid gap-4">
            {[
              {
                icon: Film,
                title: "Course Creation",
                desc: "Upload high-quality video content.",
              },
              {
                icon: Globe,
                title: "Global Reach",
                desc: "Share your expertise with the world.",
              },
            ].map((item, i) => (
              <div
                key={i}
                className="p-6 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm group hover:bg-white/10 transition-all"
              >
                <item.icon className="size-6 text-violet-500 mb-4" />
                <h3 className="font-black text-lg mb-1">{item.title}</h3>
                <p className="text-sm text-slate-400 font-medium">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
        <div className="relative text-xs text-slate-500 mt-12 font-bold tracking-widest uppercase">
          SMART LEARNING Intelligence Systems
        </div>
      </div>
    </div>
  );
}
