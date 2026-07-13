import {
  createFileRoute,
  useNavigate,
  useSearch,
  Link,
} from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload as UploadIcon,
  FileVideo,
  FileText,
  Globe,
  CheckCircle2,
  Cloud,
  ArrowRight,
  Link as LinkIcon,
  Play,
  Loader2,
  Unlock,
  Gift,
  Crown,
  LayoutDashboard,
  User as UserIcon,
  Sparkles,
  ChevronLeft,
  Settings,
  LogOut,
  Bell,
} from "lucide-react";
import { DOMAINS } from "@/lib/constants";
import { Footer } from "@/components/Footer";
import { useState, useEffect } from "react";
import { showToast as toast } from "@/lib/custom-toast";
import { addDoc, collection, doc, getDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/upload")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { category?: string; type?: "free" | "paid" } => ({
    category: search.category as string | undefined,
    type: (search.type as "free" | "paid") || "free",
  }),
  head: () => ({
    meta: [
      { title: "Course Details — SMART LEARNING" },
      {
        name: "description",
        content: "Finalize your course details and publish to the world.",
      },
    ],
  }),
  component: AntigravityUploadForm,
});

function AntigravityUploadForm() {
  const search = useSearch({ from: "/upload" });
  const { category: initialCategory = "", type = "free" } = search;
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();

  const [userName, setUserName] = useState("Creator");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(initialCategory || "");
  const [subcategory, setSubcategory] = useState("");
  const [videoLink, setVideoLink] = useState("");
  const [loading, setLoading] = useState(false);

  // Bunny Stream / Storage integration states
  const [uploadMethod, setUploadMethod] = useState<"link" | "file">("link");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUploadProgress, setVideoUploadProgress] = useState(0);
  const [videoUploadStatus, setVideoUploadStatus] = useState<"" | "uploading" | "success" | "error">("");
  const [videoUploadError, setVideoUploadError] = useState("");

  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailUploadProgress, setThumbnailUploadProgress] = useState(0);
  const [thumbnailUploadStatus, setThumbnailUploadStatus] = useState<"" | "uploading" | "success" | "error">("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [thumbnailUploadError, setThumbnailUploadError] = useState("");

  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfUploadProgress, setPdfUploadProgress] = useState(0);
  const [pdfUploadStatus, setPdfUploadStatus] = useState<"" | "uploading" | "success" | "error">("");
  const [pdfUrl, setPdfUrl] = useState("");
  const [pdfUploadError, setPdfUploadError] = useState("");

  useEffect(() => {
    if (!authLoading) {
      const isSuperAdmin = sessionStorage.getItem("is_super_admin");
      if (!isSuperAdmin && (!user || profile?.role !== "uploader")) {
        toast.error("Please login as Uploader to access the creator dashboard");
        navigate({
          to: "/login",
          search: {
            redirect: `/upload?category=${initialCategory}&type=${type}`,
            role: "uploader",
          } as any,
        });
        return;
      }
      if (!initialCategory) {
        toast.error("Please select a category first");
        navigate({ to: "/courses", search: { action: "upload" } });
      }
      setCategory(initialCategory || "");
    }
  }, [initialCategory, navigate, type, user, profile, authLoading]);

  useEffect(() => {
    const fetchUser = async () => {
      if (auth.currentUser) {
        const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
        if (userDoc.exists()) {
          setUserName(
            userDoc.data().name || userDoc.data().fullName || "Creator",
          );
        }
      }
    };
    fetchUser();
  }, []);

  const handleDirectBunnyUpload = async () => {
    if (!videoFile) return;

    const apiKey = import.meta.env.VITE_BUNNY_API_KEY;
    const libraryId = import.meta.env.VITE_BUNNY_LIBRARY_ID;

    if (!apiKey || !libraryId) {
      setVideoUploadStatus("error");
      setVideoUploadError("Bunny.net API keys are not configured in your .env file.");
      toast.error("Bunny.net API keys are not configured in your .env file.");
      return;
    }

    setVideoUploadStatus("uploading");
    setVideoUploadProgress(0);
    setVideoUploadError("");

    try {
      const createResponse = await fetch(`/api/bunny-stream/library/${libraryId}/videos`, {
        method: "POST",
        headers: {
          "AccessKey": apiKey,
          "Content-Type": "application/json",
          "accept": "application/json"
        },
        body: JSON.stringify({ title: title || videoFile.name })
      });

      if (!createResponse.ok) {
        throw new Error(`Failed to create video record in Bunny.net (Status: ${createResponse.status})`);
      }

      const createData = await createResponse.json();
      const videoId = createData.guid;

      if (!videoId) {
        throw new Error("Did not receive a valid Video ID from Bunny.net.");
      }

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) {
            setVideoUploadProgress(Math.round((event.loaded / event.total) * 100));
          }
        });
        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(`Video upload failed (Status: ${xhr.status})`));
        });
        xhr.addEventListener("error", () => reject(new Error("Network error during video upload.")));

        xhr.open("PUT", `/api/bunny-stream/library/${libraryId}/videos/${videoId}`);
        xhr.setRequestHeader("AccessKey", apiKey);
        xhr.setRequestHeader("Content-Type", "application/octet-stream");
        xhr.send(videoFile);
      });

      const embedUrl = `https://player.mediadelivery.net/embed/${libraryId}/${videoId}`;
      setVideoLink(embedUrl);
      setVideoUploadStatus("success");
      toast.success("Video uploaded to Bunny.net successfully!");
    } catch (err: any) {
      console.error(err);
      setVideoUploadStatus("error");
      setVideoUploadError(err?.message || "Failed to upload video.");
      toast.error(err?.message || "Failed to upload video.");
    }
  };

  const handleUploadThumbnail = async (file: File) => {
    const storageApiKey = import.meta.env.VITE_BUNNY_STORAGE_API_KEY;
    const storageZone = import.meta.env.VITE_BUNNY_STORAGE_ZONE;
    const cdnHostname = import.meta.env.VITE_BUNNY_STORAGE_CDN_HOSTNAME;

    if (!storageApiKey || !storageZone || !cdnHostname) {
      setThumbnailUploadStatus("error");
      setThumbnailUploadError("Bunny Storage configuration is missing in .env.");
      toast.error("Bunny Storage configuration is missing in .env.");
      return;
    }

    setThumbnailUploadStatus("uploading");
    setThumbnailUploadProgress(0);
    setThumbnailUploadError("");

    try {
      const uniqueId = Math.random().toString(36).substring(2, 9) + "_" + Date.now();
      const cleanFileName = uniqueId + "_" + file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) {
            setThumbnailUploadProgress(Math.round((event.loaded / event.total) * 100));
          }
        });
        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(`Thumbnail upload failed (Status: ${xhr.status})`));
        });
        xhr.addEventListener("error", () => reject(new Error("Network error during thumbnail upload.")));

        xhr.open("PUT", `/api/bunny-storage/${storageZone}/thumbnails/${cleanFileName}`);
        xhr.setRequestHeader("AccessKey", storageApiKey);
        xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
        xhr.send(file);
      });

      const finalUrl = `https://${cdnHostname}/thumbnails/${cleanFileName}`;
      setThumbnailUrl(finalUrl);
      setThumbnailUploadStatus("success");
      toast.success("Thumbnail uploaded successfully!");
    } catch (err: any) {
      console.error(err);
      setThumbnailUploadStatus("error");
      setThumbnailUploadError(err?.message || "Failed to upload thumbnail.");
      toast.error(err?.message || "Failed to upload thumbnail.");
    }
  };

  const handleUploadPdf = async (file: File) => {
    const storageApiKey = import.meta.env.VITE_BUNNY_STORAGE_API_KEY;
    const storageZone = import.meta.env.VITE_BUNNY_STORAGE_ZONE;
    const cdnHostname = import.meta.env.VITE_BUNNY_STORAGE_CDN_HOSTNAME;

    if (!storageApiKey || !storageZone || !cdnHostname) {
      setPdfUploadStatus("error");
      setPdfUploadError("Bunny Storage configuration is missing in .env.");
      toast.error("Bunny Storage configuration is missing in .env.");
      return;
    }

    setPdfUploadStatus("uploading");
    setPdfUploadProgress(0);
    setPdfUploadError("");

    try {
      const uniqueId = Math.random().toString(36).substring(2, 9) + "_" + Date.now();
      const cleanFileName = uniqueId + "_" + file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) {
            setPdfUploadProgress(Math.round((event.loaded / event.total) * 100));
          }
        });
        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(`PDF upload failed (Status: ${xhr.status})`));
        });
        xhr.addEventListener("error", () => reject(new Error("Network error during PDF upload.")));

        xhr.open("PUT", `/api/bunny-storage/${storageZone}/documents/${cleanFileName}`);
        xhr.setRequestHeader("AccessKey", storageApiKey);
        xhr.setRequestHeader("Content-Type", file.type || "application/pdf");
        xhr.send(file);
      });

      const finalUrl = `https://${cdnHostname}/documents/${cleanFileName}`;
      setPdfUrl(finalUrl);
      setPdfUploadStatus("success");
      toast.success("Study Material PDF uploaded successfully!");
    } catch (err: any) {
      console.error(err);
      setPdfUploadStatus("error");
      setPdfUploadError(err?.message || "Failed to upload PDF.");
      toast.error(err?.message || "Failed to upload PDF.");
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !category || !subcategory || !videoLink) {
      toast.error("Please fill in all fields including subcategory and video");
      return;
    }

    if (!auth.currentUser) {
      toast.error("Please login to upload content");
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, "videos"), {
        title,
        category,
        subcategory,
        videoLink,
        thumbnailUrl: thumbnailUrl || "",
        pdfUrl: pdfUrl || "",
        uploaderId: auth.currentUser.uid,
        uploaderName: userName,
        createdAt: new Date().toISOString(),
        isFree: type === "free",
        priceType: type,
        status: "pending",
      });

      toast.success(
        `${type === "free" ? "Free" : "Paid"} course published successfully!`,
      );
      navigate({ to: "/courses", search: { action: "upload" } });
    } catch (error: any) {
      toast.error("Failed to upload video metadata");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFDFF] text-[#111827] relative overflow-hidden font-sans">
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-[#6C63FF]/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[600px] h-[600px] bg-[#00D4FF]/5 blur-[120px] rounded-full" />
        <div className="absolute top-[40%] left-[30%] w-[400px] h-[400px] bg-[#FFB6FF]/5 blur-[100px] rounded-full" />
      </div>

      <main className="max-w-7xl mx-auto px-6 pt-40 pb-20 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-6xl mx-auto mb-12"
        >
          <div className="bg-white/60 backdrop-blur-2xl p-8 md:p-12 rounded-[3.5rem] border border-white shadow-soft flex flex-col md:flex-row items-center gap-8">
            <div className="size-24 rounded-[2rem] bg-gradient-to-br from-[#6C63FF] to-[#4F46E5] flex items-center justify-center text-white shadow-glow relative">
              <UserIcon className="size-10" />
              <div className="absolute -bottom-2 -right-2 size-8 bg-white rounded-xl shadow-card flex items-center justify-center">
                <Sparkles className="size-4 text-[#FACC15]" />
              </div>
            </div>
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-4xl md:text-5xl font-black tracking-tight">
                Welcome, <span className="text-[#6C63FF]">{userName}</span> 👋
              </h1>
              <p className="text-[#6B7280] text-lg mt-2 font-medium">
                Ready to empower the world with your expertise today?
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-6xl mx-auto"
        >
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={() =>
                navigate({ to: "/courses", search: { action: "upload" } })
              }
              className="flex items-center gap-2 text-sm font-black text-[#6B7280] hover:text-[#111827] uppercase tracking-widest transition-colors"
            >
              <ChevronLeft className="size-5" /> Change Category
            </button>
            <div
              className={`px-6 py-2 rounded-full border text-[10px] font-black uppercase tracking-widest shadow-soft ${type === "free" ? "border-emerald-200 text-emerald-600 bg-emerald-50" : "border-purple-200 text-purple-600 bg-purple-50"}`}
            >
              {type} Course • {category}
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-8 min-h-[600px]">
            {/* ATTRACTIVE SIDEBAR */}
            <motion.aside
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="w-full lg:w-72 bg-white/60 backdrop-blur-2xl rounded-[3rem] p-8 border border-white shadow-soft h-fit sticky top-32"
            >
              <div className="mb-8">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[#6C63FF] mb-2">
                  Explore Niches
                </h3>
                <p className="text-[10px] text-[#6B7280] font-medium leading-relaxed">
                  Select the most relevant topic for your expertise.
                </p>
              </div>

              <nav className="space-y-2">
                {DOMAINS.find((d) => d.t === category)?.subcategories.map(
                  (sub) => (
                    <motion.button
                      key={sub}
                      whileHover={{ x: 4 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSubcategory(sub)}
                      className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl text-xs font-black transition-all ${subcategory === sub ? "bg-[#6C63FF] text-white shadow-glow-sm scale-[1.02]" : "text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#111827]"}`}
                    >
                      <span className="truncate">{sub}</span>
                      {subcategory === sub && (
                        <motion.div
                          layoutId="active-indicator"
                          className="size-1.5 rounded-full bg-white shadow-sm"
                        />
                      )}
                    </motion.button>
                  ),
                )}
              </nav>

              <div className="mt-10 p-5 rounded-[2rem] bg-gradient-to-br from-[#F8FAFF] to-[#F3F4F6] border border-white/50">
                <div className="flex items-center gap-3 mb-3">
                  <div className="size-8 rounded-lg bg-white flex items-center justify-center shadow-soft">
                    <Sparkles className="size-4 text-[#6C63FF]" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider">
                    Pro Tip
                  </span>
                </div>
                <p className="text-[9px] text-[#6B7280] leading-relaxed">
                  Specific subcategories help scholars find your content 3x
                  faster.
                </p>
              </div>
            </motion.aside>

            {/* MAIN FORM */}
            <div className="flex-1">
              <div className="bg-white/60 backdrop-blur-3xl p-10 md:p-14 rounded-[4.5rem] border border-white shadow-soft relative overflow-hidden h-full">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#6C63FF]/5 to-transparent rounded-bl-[100px]" />

                <div className="space-y-10">
                  <header>
                    <h2 className="text-4xl font-black tracking-tight">
                      Course <span className="text-[#6C63FF]">Details</span>
                    </h2>
                    <p className="text-[#6B7280] mt-2 font-medium">
                      Ready to publish to{" "}
                      <span className="font-bold text-[#111827]">
                        {subcategory || "..."}
                      </span>
                      ?
                    </p>
                  </header>

                  <form onSubmit={handleUpload} className="space-y-8">
                    <DashboardField
                      label="Course Title"
                      icon={Play}
                      placeholder="e.g. Advanced Quantum Mechanics"
                      value={title}
                      onChange={(e: any) => setTitle(e.target.value)}
                    />

                    {/* VIDEO SOURCE TYPE */}
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-widest text-[#6B7280] ml-1">
                        Video Source
                      </label>
                      <div className="flex gap-4 p-1.5 bg-[#F3F4F6] rounded-2xl w-fit">
                        <button
                          type="button"
                          onClick={() => setUploadMethod("link")}
                          className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${uploadMethod === "link" ? "bg-white text-[#111827] shadow-sm" : "text-[#6B7280] hover:text-[#111827]"}`}
                        >
                          Provide Link
                        </button>
                        <button
                          type="button"
                          onClick={() => setUploadMethod("file")}
                          className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${uploadMethod === "file" ? "bg-white text-[#111827] shadow-sm" : "text-[#6B7280] hover:text-[#111827]"}`}
                        >
                          Upload Video File
                        </button>
                      </div>
                    </div>

                    {uploadMethod === "link" ? (
                      <DashboardField
                        label="Video URI"
                        icon={LinkIcon}
                        placeholder="YouTube or Drive link"
                        value={videoLink}
                        onChange={(e: any) => setVideoLink(e.target.value)}
                      />
                    ) : (
                      <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-[#6B7280] ml-1">
                          Video File
                        </label>
                        {!videoFile ? (
                          <div
                            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                            onDrop={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              const files = e.dataTransfer.files;
                              if (files && files.length > 0) {
                                setVideoFile(files[0]);
                                setVideoUploadStatus("");
                                setVideoUploadProgress(0);
                              }
                            }}
                            onClick={() => document.getElementById("bunny-video-input")?.click()}
                            className="border-2 border-dashed border-slate-200 hover:border-[#6C63FF]/50 bg-[#F9FAFB] hover:bg-[#F3F4F6] transition-all rounded-3xl p-10 flex flex-col items-center justify-center gap-4 cursor-pointer text-center"
                          >
                            <input
                              type="file"
                              id="bunny-video-input"
                              accept="video/*"
                              className="hidden"
                              onChange={(e) => {
                                const files = e.target.files;
                                if (files && files.length > 0) {
                                  setVideoFile(files[0]);
                                  setVideoUploadStatus("");
                                  setVideoUploadProgress(0);
                                }
                              }}
                            />
                            <div className="size-16 rounded-2xl bg-indigo-50 flex items-center justify-center text-[#6C63FF]">
                              <UploadIcon className="size-8" />
                            </div>
                            <div>
                              <p className="text-sm font-bold">Drag and drop your video file here</p>
                              <p className="text-xs text-[#6B7280] mt-1">Or click to browse files (MP4, MOV, etc.)</p>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-[#F9FAFB] border border-slate-200 rounded-3xl p-6 flex flex-col gap-4">
                            <div className="flex items-center gap-4">
                              <div className="size-12 rounded-xl bg-indigo-50 flex items-center justify-center text-[#6C63FF]">
                                <FileVideo className="size-6" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold truncate">{videoFile.name}</p>
                                <p className="text-xs text-[#6B7280]">{(videoFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                              </div>
                              {videoUploadStatus !== "uploading" && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setVideoFile(null);
                                    setVideoUploadStatus("");
                                    setVideoUploadProgress(0);
                                    setVideoLink("");
                                  }}
                                  className="text-xs font-black uppercase tracking-wider text-rose-500 hover:text-rose-700 px-3 py-1 transition-colors"
                                >
                                  Remove
                                </button>
                              )}
                            </div>

                            {videoUploadStatus === "" && (
                              <button
                                type="button"
                                onClick={handleDirectBunnyUpload}
                                className="w-full py-4 bg-[#6C63FF] hover:bg-[#5B52EE] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-glow-sm transition-all"
                              >
                                Upload to Bunny.net Stream
                              </button>
                            )}

                            {videoUploadStatus === "uploading" && (
                              <div className="space-y-2">
                                <div className="flex justify-between text-xs font-bold text-[#6B7280]">
                                  <span>Uploading video...</span>
                                  <span>{videoUploadProgress}%</span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                  <div
                                    className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                                    style={{ width: `${videoUploadProgress}%` }}
                                  />
                                </div>
                              </div>
                            )}

                            {videoUploadStatus === "success" && (
                              <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-100 rounded-2xl text-emerald-700 text-xs font-bold">
                                <CheckCircle2 className="size-4 shrink-0" />
                                <span>Uploaded successfully! Video ID: {videoLink.split("/").pop()}</span>
                              </div>
                            )}

                            {videoUploadStatus === "error" && (
                              <div className="space-y-3">
                                <div className="p-3 bg-rose-50 border border-rose-100 rounded-2xl text-rose-700 text-xs font-bold">
                                  <span>Error: {videoUploadError}</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={handleDirectBunnyUpload}
                                  className="w-full py-3 bg-[#6C63FF] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-glow-sm transition-all"
                                >
                                  Try Again
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* COURSE THUMBNAIL UPLOAD */}
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-widest text-[#6B7280] ml-1">
                        Course Thumbnail (Image)
                      </label>
                      {!thumbnailFile ? (
                        <div
                          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                          onDrop={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const files = e.dataTransfer.files;
                            if (files && files.length > 0 && files[0].type.startsWith("image/")) {
                              setThumbnailFile(files[0]);
                              handleUploadThumbnail(files[0]);
                            }
                          }}
                          onClick={() => document.getElementById("bunny-thumbnail-input")?.click()}
                          className="border-2 border-dashed border-slate-200 hover:border-[#6C63FF]/50 bg-[#F9FAFB] hover:bg-[#F3F4F6] transition-all rounded-3xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer text-center"
                        >
                          <input
                            type="file"
                            id="bunny-thumbnail-input"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const files = e.target.files;
                              if (files && files.length > 0) {
                                setThumbnailFile(files[0]);
                                handleUploadThumbnail(files[0]);
                              }
                            }}
                          />
                          <div className="size-12 rounded-xl bg-indigo-50 flex items-center justify-center text-[#6C63FF]">
                            <UploadIcon className="size-6" />
                          </div>
                          <div>
                            <p className="text-xs font-bold">Select or drag thumbnail image here</p>
                            <p className="text-[10px] text-[#6B7280] mt-0.5">PNG, JPG or WEBP (Max 5MB)</p>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-[#F9FAFB] border border-slate-200 rounded-3xl p-6 flex flex-col gap-4">
                          <div className="flex items-center gap-4">
                            {thumbnailUrl ? (
                              <img src={thumbnailUrl} className="size-12 rounded-xl object-cover shadow-sm bg-white" alt="Thumbnail Preview" />
                            ) : (
                              <div className="size-12 rounded-xl bg-indigo-50 flex items-center justify-center text-[#6C63FF]">
                                <UploadIcon className="size-6" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold truncate">{thumbnailFile.name}</p>
                              <p className="text-[10px] text-[#6B7280]">{(thumbnailFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                            </div>
                            {thumbnailUploadStatus !== "uploading" && (
                              <button
                                type="button"
                                onClick={() => {
                                  setThumbnailFile(null);
                                  setThumbnailUploadStatus("");
                                  setThumbnailUploadProgress(0);
                                  setThumbnailUrl("");
                                }}
                                className="text-xs font-black uppercase tracking-wider text-rose-500 hover:text-rose-700 px-3 py-1 transition-colors"
                              >
                                Remove
                              </button>
                            )}
                          </div>

                          {thumbnailUploadStatus === "uploading" && (
                            <div className="space-y-2">
                              <div className="flex justify-between text-xs font-bold text-[#6B7280]">
                                <span>Uploading thumbnail...</span>
                                <span>{thumbnailUploadProgress}%</span>
                              </div>
                              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                                  style={{ width: `${thumbnailUploadProgress}%` }}
                                />
                              </div>
                            </div>
                          )}

                          {thumbnailUploadStatus === "success" && (
                            <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-100 rounded-2xl text-emerald-700 text-xs font-bold">
                              <CheckCircle2 className="size-4 shrink-0" />
                              <span>Thumbnail uploaded and linked!</span>
                            </div>
                          )}

                          {thumbnailUploadStatus === "error" && (
                            <div className="space-y-3">
                              <div className="p-3 bg-rose-50 border border-rose-100 rounded-2xl text-rose-700 text-xs font-bold">
                                <span>Error: {thumbnailUploadError}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleUploadThumbnail(thumbnailFile)}
                                className="w-full py-2.5 bg-[#6C63FF] text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-glow-sm transition-all"
                              >
                                Retry Upload
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* STUDY MATERIAL PDF UPLOAD */}
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-widest text-[#6B7280] ml-1">
                        Study Material (PDF)
                      </label>
                      {!pdfFile ? (
                        <div
                          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                          onDrop={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const files = e.dataTransfer.files;
                            if (files && files.length > 0 && files[0].type === "application/pdf") {
                              setPdfFile(files[0]);
                              handleUploadPdf(files[0]);
                            }
                          }}
                          onClick={() => document.getElementById("bunny-pdf-input")?.click()}
                          className="border-2 border-dashed border-slate-200 hover:border-[#6C63FF]/50 bg-[#F9FAFB] hover:bg-[#F3F4F6] transition-all rounded-3xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer text-center"
                        >
                          <input
                            type="file"
                            id="bunny-pdf-input"
                            accept="application/pdf"
                            className="hidden"
                            onChange={(e) => {
                              const files = e.target.files;
                              if (files && files.length > 0) {
                                setPdfFile(files[0]);
                                handleUploadPdf(files[0]);
                              }
                            }}
                          />
                          <div className="size-12 rounded-xl bg-indigo-50 flex items-center justify-center text-[#6C63FF]">
                            <FileText className="size-6" />
                          </div>
                          <div>
                            <p className="text-xs font-bold">Select or drag PDF study material here</p>
                            <p className="text-[10px] text-[#6B7280] mt-0.5">PDF documents (Max 10MB)</p>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-[#F9FAFB] border border-slate-200 rounded-3xl p-6 flex flex-col gap-4">
                          <div className="flex items-center gap-4">
                            <div className="size-12 rounded-xl bg-indigo-50 flex items-center justify-center text-[#6C63FF]">
                              <FileText className="size-6" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold truncate">{pdfFile.name}</p>
                              <p className="text-[10px] text-[#6B7280]">{(pdfFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                            </div>
                            {pdfUploadStatus !== "uploading" && (
                              <button
                                type="button"
                                onClick={() => {
                                  setPdfFile(null);
                                  setPdfUploadStatus("");
                                  setPdfUploadProgress(0);
                                  setPdfUrl("");
                                }}
                                className="text-xs font-black uppercase tracking-wider text-rose-500 hover:text-rose-700 px-3 py-1 transition-colors"
                              >
                                Remove
                              </button>
                            )}
                          </div>

                          {pdfUploadStatus === "uploading" && (
                            <div className="space-y-2">
                              <div className="flex justify-between text-xs font-bold text-[#6B7280]">
                                <span>Uploading PDF...</span>
                                <span>{pdfUploadProgress}%</span>
                              </div>
                              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                                  style={{ width: `${pdfUploadProgress}%` }}
                                />
                              </div>
                            </div>
                          )}

                          {pdfUploadStatus === "success" && (
                            <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-100 rounded-2xl text-emerald-700 text-xs font-bold">
                              <CheckCircle2 className="size-4 shrink-0" />
                              <span>Study material PDF uploaded and linked!</span>
                            </div>
                          )}

                          {pdfUploadStatus === "error" && (
                            <div className="space-y-3">
                              <div className="p-3 bg-rose-50 border border-rose-100 rounded-2xl text-rose-700 text-xs font-bold">
                                <span>Error: {pdfUploadError}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleUploadPdf(pdfFile)}
                                className="w-full py-2.5 bg-[#6C63FF] text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-glow-sm transition-all"
                              >
                                Retry Upload
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={
                        loading ||
                        !subcategory ||
                        videoUploadStatus === "uploading" ||
                        thumbnailUploadStatus === "uploading" ||
                        pdfUploadStatus === "uploading"
                      }
                      className={`w-full py-5 rounded-[2rem] font-black tracking-[0.2em] uppercase text-xs shadow-glow flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:scale-100 ${type === "free" ? "bg-[#10B981] text-white" : "bg-[#6C63FF] text-white"}`}
                    >
                      {loading ? (
                        <Loader2 className="size-5 animate-spin" />
                      ) : (
                        <>
                          Publish {subcategory || "Course"} Content{" "}
                          <ArrowRight className="size-4" />
                        </>
                      )}
                    </button>
                  </form>

                  <div className="pt-8 border-t border-[#F3F4F6]">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-[#6B7280] mb-4">
                      Upload Guidelines
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        "High Resolution",
                        "Clear Audio",
                        "Original Work",
                        "Educational Value",
                      ].map((g, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 text-[10px] font-bold text-[#6B7280]"
                        >
                          <div className="size-1 rounded-full bg-[#6C63FF]" />{" "}
                          {g}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}

function DashboardField({
  label,
  icon: Icon,
  placeholder,
  type = "text",
  value,
  onChange,
}: any) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-black uppercase tracking-widest text-[#6B7280] ml-1">
        {label}
      </label>
      <div className="bg-[#F3F4F6] rounded-2xl flex items-center gap-4 px-6 border border-transparent focus-within:border-[#6C63FF]/30 transition-all">
        <Icon className="size-5 text-[#9CA3AF]" />
        <input
          type={type}
          placeholder={placeholder}
          className="bg-transparent outline-none w-full py-5 text-sm font-medium"
          value={value}
          onChange={onChange}
          required
        />
      </div>
    </div>
  );
}
