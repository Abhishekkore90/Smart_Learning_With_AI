import { createFileRoute } from "@tanstack/react-router";
import { TeacherHeader } from "@/components/teacher/TeacherHeader";
import { TeacherSidebar } from "@/components/teacher/TeacherSidebar";
import { useState, useRef, useEffect, useMemo } from "react";
import { ArrowLeft, Languages, Eye, School, CheckCircle2, ChevronRight, Upload, Trash2, FileText, Edit, MapPin, User, Building2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
// print-js is imported dynamically to avoid SSR "window is not defined" error

export const Route = createFileRoute("/teacher/sqaf")({
  component: TeacherSqafPage,
});

// Photo Uploader Component for Evidences with option list support and PDF support
const PhotoUploader = ({ standardId, lang, evidenceUrl }: { standardId: number; lang: "mr" | "en"; evidenceUrl?: string }) => {
  const [configuredOptions, setConfiguredOptions] = useState<string[]>([]);
  const [checkedStates, setCheckedStates] = useState<Record<number, boolean>>({});
  const [fileNames, setFileNames] = useState<Record<string, string>>({});
  const [filePreviews, setFilePreviews] = useState<Record<string, string>>({});
  const [fileTypes, setFileTypes] = useState<Record<string, string>>({});

  // For the fallback general uploader (when there are no configured options)
  const [fallbackFileName, setFallbackFileName] = useState<string | null>(null);
  const [fallbackFilePreview, setFallbackFilePreview] = useState<string | null>(null);
  const [fallbackFileType, setFallbackFileType] = useState<string | null>(null);
  const fallbackFileInputRef = useRef<HTMLInputElement>(null);

  // Load configured options & uploads
  useEffect(() => {
    const saved = localStorage.getItem(`sqaf_evidence_options_config_${standardId}`);
    let opts: string[] = [];
    if (saved) {
      try {
        opts = JSON.parse(saved);
      } catch (e) {
        opts = [];
      }
    }
    setConfiguredOptions(opts);

    if (opts.length > 0) {
      // Load option checked states and files
      const states: Record<number, boolean> = {};
      const names: Record<string, string> = {};
      const previews: Record<string, string> = {};
      const types: Record<string, string> = {};

      opts.forEach((_, idx) => {
        const checkedSaved = localStorage.getItem(`sqaf_evidence_checked_${standardId}_${idx}`);
        states[idx] = checkedSaved === "true";

        const fileNameSaved = localStorage.getItem(`sqaf_evidence_file_name_${standardId}_${idx}`);
        if (fileNameSaved) {
          names[idx] = fileNameSaved;
        }

        const previewSaved = localStorage.getItem(`sqaf_evidence_file_preview_${standardId}_${idx}`);
        if (previewSaved) {
          previews[idx] = previewSaved;
        }

        const typeSaved = localStorage.getItem(`sqaf_evidence_file_type_${standardId}_${idx}`);
        if (typeSaved) {
          types[idx] = typeSaved;
        }
      });

      setCheckedStates(states);
      setFileNames(names);
      setFilePreviews(previews);
      setFileTypes(types);
    } else {
      // Load fallback files
      const savedName = localStorage.getItem(`sqaf_evidence_${standardId}`);
      if (savedName) {
        setFallbackFileName(savedName);
        const savedPreview = localStorage.getItem(`sqaf_evidence_preview_${standardId}`);
        if (savedPreview) {
          setFallbackFilePreview(savedPreview);
        }
        const savedType = localStorage.getItem(`sqaf_evidence_type_${standardId}`) || "image/png";
        setFallbackFileType(savedType);
      } else {
        setFallbackFileName(null);
        setFallbackFilePreview(null);
        setFallbackFileType(null);
      }
    }
  }, [standardId]);

  const handleCheckboxChange = (idx: number, checked: boolean) => {
    const updated = { ...checkedStates, [idx]: checked };
    setCheckedStates(updated);
    localStorage.setItem(`sqaf_evidence_checked_${standardId}_${idx}`, checked ? "true" : "false");
  };

  const handleOptionFileChange = (e: React.ChangeEvent<HTMLInputElement>, idx: number) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        
        setFileNames(prev => ({ ...prev, [idx]: file.name }));
        setFilePreviews(prev => ({ ...prev, [idx]: base64 }));
        setFileTypes(prev => ({ ...prev, [idx]: file.type }));

        try {
          localStorage.setItem(`sqaf_evidence_file_name_${standardId}_${idx}`, file.name);
          localStorage.setItem(`sqaf_evidence_file_preview_${standardId}_${idx}`, base64);
          localStorage.setItem(`sqaf_evidence_file_type_${standardId}_${idx}`, file.type);
        } catch (err) {
          console.warn("Could not save file to localStorage due to quota.");
          toast.error(lang === "mr" ? "स्टोरेज फुल आहे, फाईल सेव्ह झाली नाही." : "Storage full, file could not be saved locally.");
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleOptionFileClear = (idx: number) => {
    setFileNames(prev => {
      const copy = { ...prev };
      delete copy[idx];
      return copy;
    });
    setFilePreviews(prev => {
      const copy = { ...prev };
      delete copy[idx];
      return copy;
    });
    setFileTypes(prev => {
      const copy = { ...prev };
      delete copy[idx];
      return copy;
    });

    localStorage.removeItem(`sqaf_evidence_file_name_${standardId}_${idx}`);
    localStorage.removeItem(`sqaf_evidence_file_preview_${standardId}_${idx}`);
    localStorage.removeItem(`sqaf_evidence_file_type_${standardId}_${idx}`);
  };

  const handleFallbackFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setFallbackFilePreview(base64);
        setFallbackFileName(file.name);
        setFallbackFileType(file.type);
        try {
          localStorage.setItem(`sqaf_evidence_${standardId}`, file.name);
          localStorage.setItem(`sqaf_evidence_preview_${standardId}`, base64);
          localStorage.setItem(`sqaf_evidence_type_${standardId}`, file.type);
        } catch (err) {
          console.warn("Could not save image preview to localStorage due to quota.");
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFallbackClear = () => {
    setFallbackFilePreview(null);
    setFallbackFileName(null);
    setFallbackFileType(null);
    localStorage.removeItem(`sqaf_evidence_${standardId}`);
    localStorage.removeItem(`sqaf_evidence_preview_${standardId}`);
    localStorage.removeItem(`sqaf_evidence_type_${standardId}`);
    if (fallbackFileInputRef.current) {
      fallbackFileInputRef.current.value = "";
    }
  };

  const isPdf = (type: string | null) => type?.includes("pdf") || false;

  const handlePreviewFile = (preview: string, fileName: string, type: string) => {
    try {
      if (preview.startsWith("data:")) {
        const newWindow = window.open();
        if (newWindow) {
          if (type.includes("pdf")) {
            newWindow.document.write(
              `<iframe src="${preview}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`
            );
            newWindow.document.title = fileName;
          } else {
            newWindow.document.write(
              `<div style="display:flex; justify-content:center; align-items:center; min-height:100vh; background:#1e293b;">
                <img src="${preview}" style="max-width:90%; max-height:90vh; border-radius:12px; shadow:0 10px 15px -3px rgba(0,0,0,0.1);" />
              </div>`
            );
            newWindow.document.title = fileName;
          }
        }
      }
    } catch (e) {
      console.error(e);
      toast.error("Error opening preview.");
    }
  };

  // Render options checklist
  if (configuredOptions.length > 0) {
    return (
      <div className="space-y-4 pt-4">
        <h3 className="text-lg font-black text-slate-900">
          {lang === "mr" ? "पुरावे पर्याय यादी" : "Evidence Options Checklist"}
        </h3>
        
        <div className="space-y-4">
          {configuredOptions.map((optionText, idx) => {
            const isChecked = checkedStates[idx] || false;
            const hasFile = !!fileNames[idx];
            const fileName = fileNames[idx] || "";
            const filePreview = filePreviews[idx] || "";
            const fileType = fileTypes[idx] || "";

            return (
              <div
                key={idx}
                className={`border rounded-3xl p-5 transition-all duration-300 ${
                  isChecked
                    ? "bg-white border-pink-300 shadow-md ring-1 ring-pink-100"
                    : "bg-slate-50/70 border-slate-200/60 shadow-sm"
                }`}
              >
                {/* Header Row with Checkbox and Label */}
                <label className="flex items-start gap-4 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) => handleCheckboxChange(idx, e.target.checked)}
                    className="mt-1 size-5 rounded-md border-slate-300 text-pink-600 focus:ring-pink-500 accent-pink-500 cursor-pointer"
                  />
                  <div className="flex-1 min-w-0">
                    <p className={`font-extrabold text-sm md:text-[15px] leading-relaxed transition-colors ${
                      isChecked ? "text-slate-900 font-black" : "text-slate-600"
                    }`}>
                      {optionText}
                    </p>
                  </div>
                </label>

                {/* Animated Upload Section */}
                <AnimatePresence>
                  {isChecked && (
                    <motion.div
                      initial={{ height: 0, opacity: 0, marginTop: 0 }}
                      animate={{ height: "auto", opacity: 1, marginTop: 16 }}
                      exit={{ height: 0, opacity: 0, marginTop: 0 }}
                      className="overflow-hidden border-t border-dashed border-pink-200 pt-4"
                    >
                      <input
                        type="file"
                        id={`file-input-${standardId}-${idx}`}
                        onChange={(e) => handleOptionFileChange(e, idx)}
                        accept="image/*,application/pdf"
                        className="hidden"
                      />

                      {hasFile ? (
                        <div className="flex items-center gap-4 bg-pink-50/50 p-3 rounded-2xl border border-pink-200 backdrop-blur-md shadow-sm animate-fade-in">
                          <div
                            onClick={() => handlePreviewFile(filePreview, fileName, fileType)}
                            className="size-16 rounded-xl overflow-hidden bg-white flex-shrink-0 border border-pink-200 flex items-center justify-center cursor-pointer hover:scale-105 transition-transform"
                          >
                            {isPdf(fileType) ? (
                              <FileText className="size-8 text-red-500" />
                            ) : (
                              <img src={filePreview} alt="Evidence" className="w-full h-full object-cover" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p
                              onClick={() => handlePreviewFile(filePreview, fileName, fileType)}
                              className="text-pink-950 font-black text-sm truncate cursor-pointer hover:underline"
                            >
                              {fileName}
                            </p>
                            <p className="text-pink-700/80 text-[10px] uppercase tracking-widest font-bold mt-1">
                              {lang === "mr" ? "यशस्वीरित्या अपलोड केले" : "Successfully uploaded"}
                            </p>
                          </div>
                          <button
                            onClick={() => handleOptionFileClear(idx)}
                            className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white border border-red-100 hover:border-red-500 transition-all shadow-sm active:scale-95"
                            title={lang === "mr" ? "काढून टाका" : "Remove"}
                          >
                            <Trash2 className="size-5" />
                          </button>
                        </div>
                      ) : (
                        <div
                          onClick={() => {
                            const el = document.getElementById(`file-input-${standardId}-${idx}`);
                            if (el) el.click();
                          }}
                          className="border-2 border-dashed border-pink-300 rounded-2xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-pink-50/50 hover:border-pink-400 transition-all group bg-white"
                        >
                          <div className="size-10 bg-pink-100 text-pink-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm border border-pink-200">
                            <Upload className="size-5" />
                          </div>
                          <div className="text-center">
                            <p className="text-pink-900 font-extrabold text-xs tracking-wide">
                              {lang === "mr" ? "फाईल निवडा किंवा ड्रॅग करा" : "Select file or drag here"}
                            </p>
                            <p className="text-pink-700/70 text-[10px] font-bold mt-0.5">
                              {lang === "mr" ? "प्रतिमा (PNG, JPG) किंवा PDF फाईल" : "Image (PNG, JPG) or PDF file"}
                            </p>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        {evidenceUrl && (
          <div className="pt-4 border-t border-slate-100">
            <p className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">
              {lang === "mr" ? "अतिरिक्त संदर्भ लिंक:" : "Additional Reference Link:"}
            </p>
            <a 
              href={evidenceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block bg-[#fbcfe8] hover:bg-pink-300 transition-colors rounded-[2rem] p-5 md:p-6 shadow-sm text-pink-950 font-bold text-sm md:text-base break-all italic underline text-center"
            >
              {evidenceUrl}
            </a>
          </div>
        )}
      </div>
    );
  }

  // Render Google Drive folder link alone if that was the config and no checklist options are defined
  if (evidenceUrl) {
    return (
      <div className="space-y-4 pt-4">
        <h3 className="text-lg font-black text-slate-900">
          {lang === "mr" ? "पुरावे" : "Evidences"}
        </h3>
        <a 
          href={evidenceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block bg-[#fbcfe8] hover:bg-pink-300 transition-colors rounded-[2rem] p-5 md:p-6 shadow-sm text-pink-950 font-bold text-sm md:text-base break-all italic underline text-center"
        >
          {evidenceUrl}
        </a>
      </div>
    );
  }

  // Fallback: General Uploader (when no configured options exist and no evidenceUrl exists)
  return (
    <div className="space-y-4 pt-4">
      <h3 className="text-lg font-black text-slate-900">
        {lang === "mr" ? "पुरावे" : "Evidences"}
      </h3>
      <div className="bg-[#fbcfe8] rounded-[2rem] p-5 md:p-6 shadow-sm relative overflow-hidden">
        <input 
           type="file" 
           ref={fallbackFileInputRef} 
           onChange={handleFallbackFileChange} 
           accept="image/*,application/pdf" 
           className="hidden" 
        />
        
        {fallbackFileName ? (
          <div className="flex items-center gap-4 bg-white/70 p-3 rounded-2xl border border-pink-300/50 backdrop-blur-md shadow-sm relative group">
            <div 
               onClick={() => handlePreviewFile(fallbackFilePreview || "", fallbackFileName, fallbackFileType || "")}
               className="size-16 rounded-xl overflow-hidden bg-pink-100 flex-shrink-0 border border-pink-200 flex items-center justify-center cursor-pointer hover:scale-105 transition-transform"
            >
               {isPdf(fallbackFileType) ? (
                 <FileText className="size-8 text-red-500" />
               ) : (
                 <img src={fallbackFilePreview || ""} alt="Evidence" className="w-full h-full object-cover" />
               )}
            </div>
            <div className="flex-1 min-w-0">
               <p 
                  onClick={() => handlePreviewFile(fallbackFilePreview || "", fallbackFileName, fallbackFileType || "")}
                  className="text-pink-950 font-black text-sm truncate cursor-pointer hover:underline"
               >
                  {fallbackFileName}
               </p>
               <p className="text-pink-700/80 text-[10px] uppercase tracking-widest font-bold mt-1">
                  {lang === "mr" ? "यशस्वीरित्या अपलोड केले" : "Successfully uploaded"}
               </p>
            </div>
            <button 
               onClick={handleFallbackClear}
               className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white border border-red-100 hover:border-red-500 transition-all shadow-sm active:scale-95"
               title={lang === "mr" ? "काढून टाका" : "Remove"}
            >
               <Trash2 className="size-5" />
            </button>
          </div>
        ) : (
          <div 
             onClick={() => fallbackFileInputRef.current?.click()}
             className="border-2 border-dashed border-pink-400/60 rounded-[1.5rem] p-8 flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-pink-300/20 hover:border-pink-400 transition-all group bg-white/30 backdrop-blur-sm"
          >
             <div className="size-14 bg-pink-100 text-pink-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm border border-pink-200">
                <Upload className="size-6" />
             </div>
             <div className="text-center">
                <p className="text-pink-900 font-black text-sm tracking-wide">
                   {lang === "mr" ? "फाईल निवडा किंवा येथे ड्रॅग करा" : "Select file or drag here"}
                </p>
                <p className="text-pink-700/70 text-xs font-bold mt-1">
                   {lang === "mr" ? "प्रतिма फाईल (PNG, JPG) किंवा PDF फाईल" : "Image files (PNG, JPG) or PDF file"}
                </p>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

const toMarathiNumerals = (num: number): string => {
  const marathiDigits = ["०", "१", "२", "३", "४", "५", "६", "७", "८", "९"];
  return num.toString().split('').map(digit => marathiDigits[parseInt(digit)]).join('');
};

const getStandardDetail = (num: number) => {
  if (standardsDetailData[num]) {
    return standardsDetailData[num];
  }
  
  // Fallback for standards 88 to 128
  return {
    mr: {
      orangeDesc: `शालेय गुणवत्ता निकष - मानक क्र. ${toMarathiNumerals(num)} अंतर्गत मूल्यमापन.`,
      options: [
        { text: "१.१ संबंधित निकषांच्या पूर्ततेसाठी प्राथमिक स्तरावर नियोजन केले जाते." },
        { text: "२.१ नियोजन आणि अंमलबजावणीसाठी शालेय स्तरावर विविध उपक्रम राबवले जातात." },
        { text: "३.१ उपक्रमांचे नियमित मूल्यमापन आणि पुनरावलोकन केले जाते." },
        { text: "४.१ सर्व भागधारकांच्या सहभागातून उत्कृष्ट यश संपादन केले जाते." }
      ],
      hasEvidence: true
    },
    en: {
      orangeDesc: `School Quality Evaluation under Standard No. ${num}.`,
      options: [
        { text: "1.1 Planning is done at the primary level for fulfillment of relevant criteria." },
        { text: "2.1 Various initiatives are implemented at the school level for planning and execution." },
        { text: "3.1 Regular evaluation and review of the initiatives are conducted." },
        { text: "4.1 Excellent success is achieved through participation of all stakeholders." }
      ],
      hasEvidence: true
    }
  };
};

// Detailed data for standards 1 to 10 matching provided screenshots with bilingual support
const standardsDetailData: Record<number, {
  mr: {
    orangeDesc: string;
    options: { text: string; isGreen?: boolean }[];
    hasEvidence?: boolean;
    evidenceUrl?: string;
  };
  en: {
    orangeDesc: string;
    options: { text: string; isGreen?: boolean }[];
    hasEvidence?: boolean;
    evidenceUrl?: string;
  };
}> = {
  1: {
    mr: {
      orangeDesc: "१.१.१ मुख्याध्यापक आणि शिक्षक अभ्यासक्रमाशी निगडीत दस्तऐवज आणि NCERT, SCERT यांनी प्रकाशित केलेल्या संदर्भ साहित्याशी परिचित आहेत.",
      options: [{
        text: "१.१ मुख्याध्यापक आणि शिक्षक यांना NEP- 2020, NCF व SCF च्या मुख्य शिफारशी व अध्ययन निष्पत्ती माहिती आहेत."
      }, {
        text: "२.१ शाळा NEP- 2020, SCF आणि NCF वर शिक्षकांसाठी चर्चासत्र व उद्बोधन वर्गांचे आयोजन करते"
      }, {
        text: "३.१ मुख्याध्यापक आणि शिक्षक पाठ नियोजन तयार करताना NCF, SCF आणि NEP-2020 च्या शिफारशी व अध्यापन निष्पत्ती विचारात घेतात."
      }, {
        text: "३.२ विद्यार्थ्यांची संपादणूक आणि त्यांच्या गरजेनुसार पाठ नियोजन आणि अध्यापनासह वर्गातील कृती कार्यक्रमांचेही निरीक्षण नियमितपणे केले जाते."
      }, {
        text: "४.१ NEP-2020 आणि NCF, SCF नुसार विद्यार्थ्यांच्या शिक्षण आणि विकासाच्या दृष्टीने त्याची परिणामकारकता पाहण्यासाठी मुख्याध्यापक आणि शिक्षक अध्यापन पद्धतींशी संबंधित नियमित विश्लेषण करतात.",
        isGreen: true
      }],
      hasEvidence: true
    },
    en: {
      orangeDesc: "1.1.1 Headmaster and teachers are familiar with curriculum-related documents and reference materials published by NCERT, SCERT.",
      options: [{
        text: "1.1 Headmaster and teachers know the main recommendations and learning outcomes of NEP-2020, NCF and SCF."
      }, {
        text: "2.1 The school organizes seminars and orientation classes for teachers on NEP-2020, SCF and NCF."
      }, {
        text: "3.1 Headmaster and teachers consider recommendations of NCF, SCF and NEP-2020 and learning outcomes while preparing lesson plans."
      }, {
        text: "3.2 Classroom activities and programs, along with lesson planning and teaching, are regularly monitored according to student achievement and needs."
      }, {
        text: "4.1 Headmaster and teachers conduct regular analysis related to teaching methods to check their effectiveness from the perspective of student learning and development in accordance with NEP-2020 and NCF, SCF.",
        isGreen: true
      }],
      hasEvidence: true
    }
  },
  2: {
    mr: {
      orangeDesc: "१.१.२ नावीन्यपूर्ण अध्यापनशास्त्रावर आधारित एकात्मिक वार्षिक अभ्यासक्रम आणि अध्यापनशास्त्रीय योजना आहेत.",
      options: [{
        text: "१.१ शाळेत एकात्मिक वार्षिक अभ्यासक्रम आणि अध्यापन नियोजन उपलब्ध आहे."
      }, {
        text: "२.१ विद्यार्थी आणि पालक यांच्यासोबत एकात्मिक वार्षिक अभ्यासक्रम आणि अध्यापन योजना याबद्दल चर्चा करण्यासाठी बैठकांचे आयोजन केले जाते."
      }, {
        text: "३.१ शिक्षक स्वतः नावीन्यपूर्ण अध्ययन-अध्यापन पद्धतींचा अवलंब करतात आणि विद्यार्थ्यांमध्ये चिकित्सक विचार, कुतूहल आणि सर्जनशीलता, समस्या सोडवणे, सहयोग इ.विकसित करण्यासाठी स्थानिक संदर्भ लक्षात घेऊन अनुकूल अशी अध्यापन पद्धत विकसित करतात."
      }, {
        text: "४.१ शिक्षक- पालक सभांमध्ये अध्यापन नियोजनावर चर्चा केली जाते व त्याची अंमलबजावणी सर्व वर्गांमध्ये केली जाते.",
        isGreen: true
      }],
      hasEvidence: true
    },
    en: {
      orangeDesc: "1.1.2 There is an integrated annual curriculum and pedagogical plan based on innovative pedagogy.",
      options: [{
        text: "1.1 Integrated annual curriculum and teaching plan is available in school."
      }, {
        text: "2.1 Meetings are organized with students and parents to discuss the integrated annual curriculum and teaching plan."
      }, {
        text: "3.1 Teachers themselves adopt innovative learning-teaching methods and develop local context-specific teaching methods to develop critical thinking, curiosity, creativity, problem solving, cooperation etc. among students."
      }, {
        text: "4.1 Teaching plans are discussed in teacher-parent meetings and implemented in all classes.",
        isGreen: true
      }],
      hasEvidence: true
    }
  },
  3: {
    mr: {
      orangeDesc: "१.१.३ शाळा सक्रियपणे आपल्या शिक्षकांसाठी नावीन्यपूर्ण अध्यापनशास्त्र अध्यापनात वापरण्याची क्षमता निर्माण करते तसेच केंद्र परिषदांमध्ये इतर शाळेतील शिक्षकांनीही त्या पद्धती अध्यापनासाठी उपयोगात आणाव्यात असे सुचविते.",
      options: [{
        text: "१.१ मुख्याध्यापक व शिक्षकांचे क्षमताधिष्ठीत शिक्षणाचे व नावीन्यपूर्ण अध्यापनाचे प्रशिक्षण झाले आहे."
      }, {
        text: "२.१ मुख्याध्यापक व शिक्षक आपापसात समावेशित शिक्षण, एकात्मिक शिक्षण, क्षमताधिष्ठीत अध्ययन तसेच अध्ययन निष्पत्तीच्या संपादनासाठी नवीन अध्यापनशास्त्रा विषयी वैचारिक देवाणघेवाण करतात."
      }, {
        text: "२.२ शाळेने काही नावीन्यपूर्ण अध्यापन शास्त्र आधारित नियोजन तयार केले आहेत."
      }, {
        text: "३.१ प्रत्येक शिक्षक आठवड्यातून किमान एकदा तरी नवीन अध्यापन पद्धती वापरण्याचा प्रयत्न करीत आहेत."
      }, {
        text: "३.२ शिक्षकांच्या पाठ नियोजनात, वार्षिक नियोजनात आणि वर्गातील आंतर-क्रियेत नावीन्यपूर्ण अध्यापनशास्त्र दिसून येते."
      }, {
        text: "४.१ नावीन्यपूर्ण अध्यापनशास्त्र आणि त्यांचे फायदे आणि अध्ययन निष्पत्ती यावर केंद्र परिषदांमध्ये इतर शाळांसोबत परस्पर संवाद साधणारी सत्रे आयोजित केली जातात.",
        isGreen: true
      }, {
        text: "४.२ सर्व इयत्तांमध्ये नावीन्यपूर्ण अध्यापनशास्त्र वापरून सर्व विषय शिकवले जातील याची खात्री करण्यासाठी शाळेने तिच्या सर्व पाठ नियोजनांचे पुनरावलोकन केले आहे.",
        isGreen: true
      }],
      hasEvidence: true
    },
    en: {
      orangeDesc: "1.1.3 The school actively builds the capacity of its teachers to use innovative pedagogy in teaching and also suggests to teachers of other schools in the cluster resource center to use those methods for teaching.",
      options: [{
        text: "1.1 Headmaster and teachers have received training in competency-based education and innovative teaching."
      }, {
        text: "2.1 Headmaster and teachers exchange ideas about inclusive education, integrated education, competency-based learning and new pedagogy for achieving learning outcomes."
      }, {
        text: "2.2 The school has prepared some plans based on innovative pedagogy."
      }, {
        text: "3.1 Every teacher tries to use new teaching methods at least once a week."
      }, {
        text: "3.2 Innovative pedagogy is visible in teachers' lesson plans, annual plans and classroom interaction."
      }, {
        text: "4.1 Inter-active sessions are organized with other schools in cluster conferences on innovative pedagogy, its benefits and learning outcomes.",
        isGreen: true
      }, {
        text: "4.2 The school has reviewed all its lesson plans to ensure that all subjects are taught using innovative pedagogy in all grades.",
        isGreen: true
      }],
      hasEvidence: true
    }
  },
  4: {
    mr: {
      orangeDesc: "१.१.४ शाळा माध्यमिक स्तरावरील विद्यार्थ्यांना अभ्यासासाठी विषयांच्या निवडीचे स्वातंत्र्य देते.",
      options: [{
        text: "१.१ माध्यमिक शाळेतील विद्यार्थ्यांना अभ्यासासाठी विषयांच्या निवडीचे स्वातंत्र्य आहे."
      }, {
        text: "२.१ शाळेतील किमान २५% विद्यार्थी शाळेत उपलब्ध असलेल्या लवचिक अभ्यासक्रमातून आपल्या आवडीचा अभ्यासक्रम निवडतात."
      }, {
        text: "३.१ शाळेतील किमान ५०% विद्यार्थी शाळेत उपलब्ध असलेल्या लवचिक अभ्यासक्रमातून आपल्या आवडीचा अभ्यासक्रम निवडतात."
      }, {
        text: "३.२ शाळा विद्यार्थ्यांना offline, online आणि मिश्रित पद्धतींद्वारे शिकण्याची संधी उपलब्ध करून देते."
      }, {
        text: "४.१ शाळेतील १००% विद्यार्थी शाळेत उपलब्ध असलेल्या लवचिक अभ्यासक्रमातून आपल्या आवडीचा अभ्यासक्रम निवडतात."
      }, {
        text: "४.२ माध्यमिक स्तरावर विद्यार्थ्यांना अत्याधुनिक कौशल्ये विषय म्हणून दिली जातात."
      }, {
        text: "लागू नाही",
        isGreen: true
      }]
    },
    en: {
      orangeDesc: "1.1.4 The school provides secondary level students with the freedom to choose subjects for study.",
      options: [{
        text: "1.1 Secondary school students have freedom of choice of subjects for study."
      }, {
        text: "2.1 At least 25% of students in the school choose their favorite curriculum from the flexible curriculum available in the school."
      }, {
        text: "3.1 At least 50% of students in the school choose their favorite curriculum from the flexible curriculum available in the school."
      }, {
        text: "3.2 The school provides students with opportunities to learn through offline, online and blended modes."
      }, {
        text: "4.1 100% of students in the school choose their favorite curriculum from the flexible curriculum available in the school."
      }, {
        text: "4.2 State-of-the-art skill subjects are offered to students at the secondary level."
      }, {
        text: "Not Applicable",
        isGreen: true
      }]
    }
  },
  5: {
    mr: {
      orangeDesc: "१.२.१ शिक्षकांना विविध विद्यार्थ्यांच्या गरजा लक्षात घेऊन विविध अध्यापन-शिक्षण पद्धती/शिक्षणशास्त्र अवलंबण्यास सक्षम बनवणे.",
      options: [{
        text: "१.१ शिक्षकांचे विविध अध्यापन पद्धती विषयी प्रशिक्षण झाले आहे."
      }, {
        text: "२.१ शिक्षक विविध गटांच्या गरजा लक्षात घेऊन एकात्मिक पाठ नियोजन करतात."
      }, {
        text: "३.१ शिक्षक त्यांच्या वर्गात विविध अध्यापन- पद्धती जसे अनुभवात्मक शिक्षण पद्धती, कथाकथन, कला-एकात्मिक आणि क्रीडा-एकात्मिक शिक्षणाचा वापर करतात."
      }, {
        text: "४.१ शिक्षकांचे अध्यापन विद्यार्थ्यांना चांगले समजते.",
        isGreen: true
      }, {
        text: "४.२ विद्यार्थ्यांचा अध्ययन स्तर उंचावला आहे.",
        isGreen: true
      }],
      hasEvidence: true
    },
    en: {
      orangeDesc: "1.2.1 Enabling teachers to adopt diverse teaching-learning methods/pedagogy taking into account the needs of different students.",
      options: [{
        text: "1.1 Teachers have been trained in various teaching methods."
      }, {
        text: "2.1 Teachers prepare integrated lesson plans considering the needs of different groups."
      }, {
        text: "3.1 Teachers use various teaching methods in their classes such as experiential learning, storytelling, art-integrated and sports-integrated learning."
      }, {
        text: "4.1 Students understand teachers' instruction well.",
        isGreen: true
      }, {
        text: "4.2 Students' learning levels have improved.",
        isGreen: true
      }],
      hasEvidence: true
    }
  },
  6: {
    mr: {
      orangeDesc: "१.२.२ शाळा सर्व वर्गांसाठी निर्धारित केलेल्या क्षमता आणि अध्ययन निष्पत्तींचा अवलंब करीत आहे.",
      options: [{
        text: "१.१ सर्व वर्गांसाठी निर्धारित केलेल्या क्षमता आणि अध्ययन निष्पत्ती वर्गात प्रदर्शित केल्या आहेत."
      }, {
        text: "२.१ सर्व शिक्षक सर्व वर्गांसाठी निर्धारित केलेल्या क्षमता आणि अध्ययन निष्पत्तींशी परिचित आहेत."
      }, {
        text: "३.१ प्रत्येक शिक्षकाला अध्ययन निष्पत्ती नुसार पाठ नियोजन करण्यास आणि अंमलबजावणी साठी मार्गदर्शन मिळते."
      }, {
        text: "४.१ शाळा अध्ययन निष्पत्तीमधील प्रगतीचा वेळोवेळी आढावा घेऊन मागे असलेल्या विद्यार्थ्यांसाठी कृती कार्यक्रमाची आखणी करते.",
        isGreen: true
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/1rHWFIpAoEkFBCLI5N-xWjFhu5IakCyd"
    },
    en: {
      orangeDesc: "1.2.2 The school is adopting the prescribed competencies and learning outcomes for all classes.",
      options: [{
        text: "1.1 The prescribed competencies and learning outcomes for all classes are displayed in the classroom."
      }, {
        text: "2.1 All teachers are familiar with the prescribed competencies and learning outcomes for all classes."
      }, {
        text: "3.1 Every teacher receives guidance for lesson planning and implementation according to the learning outcomes."
      }, {
        text: "4.1 The school reviews progress in learning outcomes from time to time and plans action programs for students who are lagging behind.",
        isGreen: true
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/1rHWFIpAoEkFBCLI5N-xWjFhu5IakCyd"
    }
  },
  7: {
    mr: {
      orangeDesc: "१.२.३ शाळा अध्ययन अध्यापन अनुभूतीची गुणवत्ता वाढवण्यासाठी तंत्रज्ञानाचा वापर करते.",
      options: [{
        text: "१.१ शाळा अध्ययन अध्यापन अनुभूतीची गुणवत्ता वाढवण्यासाठी आठवड्यातून एकदा तंत्रज्ञानाचा वापर करते."
      }, {
        text: "२.१ शाळा ऑनलाइन संसाधनाच्या साह्याने अध्ययन अध्यापन अनुभव समृद्ध करण्यासाठी त्यांच्याकडे असणाऱ्या स्मार्ट क्लासरूम्समध्ये डिजिटल अध्यापन दररोज करते"
      }, {
        text: "३.१ विद्यार्थी ई- कंटेंटच्या माध्यमातून संकल्पना शिकतात.\n३.२ शाळा विद्यार्थ्यांना ऑनलाइन कंटेंट ब्राऊज करण्यासाठी आणि ऑनलाइन संसाधनाच्या साहाय्याने सादरीकरण करणे, पेपर सोडवणे तसेच गृहपाठ पूर्ण करणे इत्यादींसाठी प्रोत्साहन देते."
      }, {
        text: "४.१ विद्यार्थी त्यांच्या अध्ययन कक्षा वृद्धीसाठी आणि आकलनात्मक संकल्पनांचे सादरीकरण करण्यासाठी, माहितीपत्रके, पोर्टफोलिओ, दस्तऐवज, पेपर, लेख, जर्नल्स, चित्रपट, ग्राफिक्स इत्यादी स्वतःची क्षमता वाढविण्यासाठी तंत्रज्ञानाचा वापर करतात.",
        isGreen: true
      }]
    },
    en: {
      orangeDesc: "1.2.3 The school uses technology to enhance the quality of the teaching-learning experience.",
      options: [{
        text: "1.1 The school uses technology once a week to enhance the quality of the teaching-learning experience."
      }, {
        text: "2.1 The school conducts digital teaching daily in smart classrooms to enrich the teaching-learning experience with the help of online resources."
      }, {
        text: "3.1 Students learn concepts through e-content.\n3.2 The school encourages students to browse online content and make presentations, solve papers, and complete homework using online resources."
      }, {
        text: "4.1 Students use technology to expand their learning horizons, present conceptual understandings, and build their own capacity through brochures, portfolios, documents, papers, articles, journals, films, graphics, etc.",
        isGreen: true
      }]
    }
  },
  8: {
    mr: {
      orangeDesc: "१.२.४ शाळेत संस्थात्मक सहाध्यायी अध्ययन पद्धतीचा अवलंब केला जातो.",
      options: [{
        text: "१.१ प्रशिक्षित शिक्षकांच्या देखरेखीखाली आणि सुरक्षिततेच्या पैलूंची योग्य काळजी घेऊन सहकारी विद्यार्थ्यांसाठी सहाध्यायी अध्ययन हा ऐच्छिक आणि आनंददायक कृती कार्यक्रम घेतला जातो."
      }, {
        text: "२.१ शाळा सहाध्यायी अध्ययनाला आणि स्वयंप्रेरणेने केलेल्या कृती कार्यक्रमांना चालना देऊन विद्यार्थ्यांना सहाय्यता करण्यासाठी नावीन्यपूर्ण सहाध्यायी अध्ययनाचे नमुना तयार करते."
      }, {
        text: "३.१ शाळा सहाध्यायी मूल्यमापन करते व त्याची नोंद समग्र प्रगती पत्रकात पुरावा म्हणून करते."
      }, {
        text: "४.१ शाळा शिक्षकांच्या मूल्यांकनासह स्वयं-मूल्यांकन आणि सहाध्यायी मूल्यांकन करून प्रकल्प-आधारित आणि पृच्छा -आधारित अध्ययन, प्रश्नमंजुषा, भूमिका, गटकार्य, पोर्टफोलिओ इत्यादी द्वारे मुलांच्या प्रगतीचा आढावा घेते.",
        isGreen: true
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/1rHWFIpAoEkFBCLI5N-xWjFhu5IakCyd"
    },
    en: {
      orangeDesc: "1.2.4 Institutional peer learning method is adopted in the school.",
      options: [{
        text: "1.1 Under the supervision of trained teachers and taking proper care of safety aspects, peer learning is conducted as an optional and enjoyable activity for fellow students."
      }, {
        text: "2.1 The school promotes peer learning and self-motivated activity programs to help students by creating innovative models of peer learning."
      }, {
        text: "3.1 The school conducts peer assessment and records it as evidence in the holistic progress card."
      }, {
        text: "4.1 The school reviews children's progress through project-based and inquiry-based learning, quizzes, role plays, group work, portfolios, etc., along with teacher evaluation, self-evaluation, and peer evaluation.",
        isGreen: true
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/1rHWFIpAoEkFBCLI5N-xWjFhu5IakCyd"
    }
  },
  9: {
    mr: {
      orangeDesc: "१.२.५ शाळेने पर्यावरणपूरक वृत्ती व जीवनशैलीचा अवलंब करणे यावर लक्ष केंद्रित केले आहे.",
      options: [{
        text: "१.१ प्रत्येक विद्यार्थ्याला पर्यावरण संवर्धन आणि हवामान बदलाविषयी पुरेशी जागरूकता संपादन करण्यासाठी प्रोत्साहित केले जाते.",
        isGreen: true
      }, {
        text: "२.१ शाळा दरवर्षी पर्यावरण शिक्षणावर लक्ष केंद्रित करण्यासाठी किमान दोन कार्यशाळा किंवा उद्बोधन वर्ग आयोजित करते.\n२.२ पर्यावरण/इको क्लब सक्रिय आहेत"
      }, {
        text: "३.१ शाळा किमान तीन-चार पर्यावरण संवर्धन विषयक कार्यशाळा व उद्बोधन वर्गाचे आयोजन करते."
      }, {
        text: "४.१ शाळा विद्यार्थ्यांच्या मनोवृत्तीत परिवर्तन करते आणि पर्यावरणपूरक जीवनशैली अंगीकारते."
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/16yVtKPEe8xi64xREXi4cB48fxFW334"
    },
    en: {
      orangeDesc: "1.2.5 The school focuses on adopting eco-friendly attitude and lifestyle.",
      options: [{
        text: "1.1 Every student is encouraged to gain adequate awareness about environmental conservation and climate change.",
        isGreen: true
      }, {
        text: "2.1 The school organizes at least two workshops or orientation classes every year to focus on environmental education.\n2.2 Environment/Eco clubs are active."
      }, {
        text: "3.1 The school organizes at least three to four workshops and orientation classes on environmental conservation."
      }, {
        text: "4.1 The school brings about a change in students' attitude and they adopt an eco-friendly lifestyle."
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/16yVtKPEe8xi64xREXi4cB48fxFW334"
    }
  },
  10: {
    mr: {
      orangeDesc: "१.३.१ शाळा विद्यार्थ्यांमध्ये रोजगार क्षमता आणि उद्योजकीय कौशल्य विकसित करते.",
      options: [{
        text: "१.१ शाळा पूर्व माध्यमिक आणि माध्यमिक स्तरावर व्यावसायिक अभ्यासक्रम राबवण्यासाठी आवश्यक ती पूर्तता करते."
      }, {
        text: "२.१ विद्यार्थ्यांनी घेतलेल्या अभ्यासक्रमांमध्ये विद्यार्थ्यांना प्रत्यक्ष अनुभव देण्यासाठी शाळा स्थानिक उद्योगाशी सहसंबंध प्रस्थापित करते."
      }, {
        text: "३.१ अभ्यासक्रमांच्या व्यतिरिक्त, शाळा आनंददायी कृती कार्यक्रमांद्वारे स्थानिक व्यावसायिक हस्तकलेचा अनुभव प्रदान करते."
      }, {
        text: "४.१ इयत्ता सहावी ते आठवीपर्यंतच्या विद्यार्थ्यांना पूर्वव्यावसायिक कौशल्यांची संधी विकासासाठी स्थानिक व्यावसायिक व हस्त कलाकार यांचे सहकार्य घेतले जाते.\n४.२ इयत्ता नववीपासूनच्या विद्यार्थ्यांसाठी कौशल्य आधारित अभियोग्यता चाचणी घेऊन विद्यार्थ्यांना करिअरची निवड करण्यासाठी समुपदेशन केले जाते.\n४.३ इयत्ता बारावीमधून उत्तीर्ण झालेल्या प्रत्येक मुलाने किमान एक व्यवसाय शिकलेला आहे. विद्यार्थ्याना इंटर्नशिप, अप्रेंटिसशिप मिळवण्यासाठी मदत केली जाते."
      }]
    },
    en: {
      orangeDesc: "1.3.1 The school develops employability and entrepreneurial skills among students.",
      options: [{
        text: "1.1 The school fulfills the necessary requirements for implementing vocational courses at the pre-primary and secondary levels."
      }, {
        text: "2.1 The school establishes relations with local industries to provide practical experience to students in the courses taken."
      }, {
        text: "3.1 Apart from the curriculum, the school provides experience in local professional crafts through enjoyable activities."
      }, {
        text: "4.1 Cooperation of local professionals and handcraft artists is taken to develop pre-vocational skills for students from class VI to VIII.\n4.2 Skill-based aptitude tests are conducted for students from class IX to counsel them on career selection.\n4.3 The school ensures that every student passing out of class XII has learned at least one trade. Students are assisted in getting internship and apprenticeship."
      }]
    }
  },
  11: {
    mr: {
      orangeDesc: "१.३.२ शाळा सर्व विद्यार्थ्यांमध्ये स्तरनिहाय डिजिटल, आर्थिक, संप्रेषण, लिंग समभाव आणि आरोग्य साक्षरता याविषयी जाणीव जागृती निर्माण करते.",
      options: [{
        text: "१.१ महाराष्ट्र राज्य शिक्षण मंडळाने निर्धारित करून विकसित केलेली डिजिटल, आर्थिक, पर्यावरणीय, माहिती आणि माध्यमे, लिंग आणि आरोग्य साक्षरता नियमावली/मार्गदर्शक तत्त्वे/SOPs, शाळेच्या ग्रंथालयात उपलब्ध आहेत."
      }, {
        text: "२.१ विद्यार्थ्यांमध्ये ही कौशल्ये विकसित करण्यासाठी शाळा प्रकल्प-आधारित शिक्षण/रोल प्ले/क्विझ/केस स्टडी/हँड-ऑन सेशन्स/कृती आधारित शिक्षण वापरते."
      }, {
        text: "३.१ विद्यार्थी हे उत्तमरित्या संवाद साधतात. विद्यार्थी हे आर्थिक साक्षरता शिकतात.\n३.२ फिट इंडिया योजनेअंतर्गत शाळा कृती कार्यक्रमांमध्ये क्रीडा-एकात्मिक शिक्षण पद्धतीचे अवलंबन करते.\n३.३ विद्यार्थी डिजिटल साधनांचा वापर करतात.\n३.४ शाळा विविध उपक्रमांमध्ये सहभागी मुला-मुलींना समान संधी देते"
      }, {
        text: "४.१ विद्यार्थी समाजाशी सुसंवाद साधण्यासाठी आयोजित उपक्रमांमध्ये सहभागी होऊन त्यांची कौशल्य दाखवितात."
      }, {
        text: "लागू नाही",
        isGreen: true
      }]
    },
    en: {
      orangeDesc: "1.3.2 The school creates awareness among all students level-wise regarding digital, financial, communication, gender equality and health literacy.",
      options: [{
        text: "1.1 Digital, financial, environmental, information and media, gender and health literacy manuals/guidelines/SOPs prescribed and developed by the Maharashtra State Board of Education are available in the school library."
      }, {
        text: "2.1 The school uses project-based learning/role play/quiz/case study/hands-on sessions/activity-based learning to develop these skills among students."
      }, {
        text: "3.1 Students communicate effectively. Students learn financial literacy.\n3.2 Under the Fit India scheme, the school adopts sports-integrated education methods in activity programs.\n3.3 Students use digital tools.\n3.4 The school provides equal opportunities to boys and girls participating in various activities."
      }, {
        text: "4.1 Students participate in organized activities to interact with society and showcase their skills."
      }, {
        text: "Not Applicable",
        isGreen: true
      }]
    }
  },
  12: {
    mr: {
      orangeDesc: "१.३.३ शाळा त्यांच्या इंटर्नशिप योजनेअंतर्गत स्थानिक उद्योगांच्या माध्यमाने इंटर्नशिप, दप्तर विना शाळा व उद्योजकतेच्या संधी प्रदान करते.",
      options: [{
        text: "१.१ शालेय कामाचे दहा दिवस हे 'दप्तराविना शाळा' दिवस म्हणून निर्धारित केले जातात व या दिवसांमध्ये शाळेत सर्व प्रकारच्या आनंददायी उपक्रमांचे आयोजन केले जाते."
      }, {
        text: "२.१ शाळा पारंपरिक स्थानिक कला, व्यावसायिक हस्तकला, उद्योजकता, कृषी किंवा इतर कोणत्याही विषयात जेथे स्थानिक कौशल्य अस्तित्त्वात आहे अशा विविध विषयांमध्ये स्थानिक प्रतिष्ठित व्यक्ती किंवा तज्ञांना 'तज्ञ मार्गदर्शक' म्हणून नियुक्त करण्यास प्राधान्य देते."
      }, {
        text: "३.१ शाळेचे सर्व विद्यार्थी दहा दिवसांच्या दप्तर विना शाळा या उपक्रमात सहभागी होतात आणि शाळेने व्यवस्था केल्यानुसार शाळेच्या आवारात किंवा बाहेर स्थानिक तज्ञ व्यवसायिकांसोबत राहून प्रशिक्षण घेतात."
      }, {
        text: "४.१ विविध व्यवसायातील पालकांशी संवाद साधून शाळा विद्यार्थ्यांना विविध व्यवसाय आणि उद्योग याविषयी माहिती देते."
      }, {
        text: "लागू नाही",
        isGreen: true
      }]
    },
    en: {
      orangeDesc: "1.3.3 Under its internship scheme, the school provides opportunities for internships, bagless school, and entrepreneurship through local industries.",
      options: [{
        text: "1.1 Ten days of school work are designated as 'Bagless School' days, during which all kinds of enjoyable activities are organized in the school."
      }, {
        text: "2.1 The school prioritizes appointing local prominent personalities or experts as 'expert mentors' in traditional local arts, professional crafts, entrepreneurship, agriculture, or any other subject where local expertise exists."
      }, {
        text: "3.1 All students of the school participate in the ten-day bagless school activity and receive training with local expert professionals inside or outside the school premises as arranged by the school."
      }, {
        text: "4.1 The school connects with parents from various professions to provide students with information about various businesses and industries."
      }, {
        text: "Not Applicable",
        isGreen: true
      }]
    }
  },
  13: {
    mr: {
      orangeDesc: "१.३.४ शाळा वैचारिक, सामाजिक आणि भावनिक कौशल्यांवर लक्ष केंद्रित करणारा जीवन कौशल्य विकास कार्यक्रम आयोजित करते.",
      options: [{
        text: "१.१ शाळेमध्ये वैचारिक, सामाजिक आणि भावनिक कौशल्यांवर लक्ष केंद्रित करणारा इयत्ता आणि वय आधारित जीवन कौशल्य विकास कार्यक्रम राबविला जातो"
      }, {
        text: "२.१ सर्व शिक्षकांना एकात्मिक पद्धतीने जीवनकौशल्ये देण्याचे प्रशिक्षण दिले आहे."
      }, {
        text: "३.१ विशेषतः शाळेत किशोरवयीन विद्यार्थ्यांना समुपदेशन उपलब्ध करून दिले जाते.\n३.२ शाळेचे समुपदेशक विद्यार्थ्यांना मार्गदर्शन करण्यात शिक्षकांसोबत सक्रियपणे सहभागी होतात."
      }, {
        text: "४.१ दैनंदिन जीवन हाताळण्याच्या आव्हानांना सामोरे जाण्यासाठी विद्यार्थ्यांनी अपेक्षित जीवन कौशल्ये आत्मसात केली आहेत."
      }, {
        text: "लागू नाही",
        isGreen: true
      }]
    },
    en: {
      orangeDesc: "1.3.4 The school organizes a life skills development program focusing on cognitive, social, and emotional skills.",
      options: [{
        text: "1.1 An age-appropriate and grade-appropriate life skills development program focusing on cognitive, social, and emotional skills is implemented in the school."
      }, {
        text: "2.1 All teachers are trained in imparting life skills in an integrated manner."
      }, {
        text: "3.1 Counseling is specifically made available to adolescent students in the school.\n3.2 The school counselor actively participates with teachers in guiding students."
      }, {
        text: "4.1 Students have acquired the expected life skills to face the challenges of daily life."
      }, {
        text: "Not Applicable",
        isGreen: true
      }]
    }
  },
  14: {
    mr: {
      orangeDesc: "१.३.५ शाळा अत्याधुनिक ज्ञान आणि भविष्यातील तंत्रज्ञानाच्या विकासाशी संबंधित संधी प्रदान करते. उदा. आयटी, अटल टिंकरिंग लॅब, आर्टिफिशियल इंटेलिजन्स, मशिन लर्निंग, ३-डी प्रिंटिंग, आयओटी, तंत्रज्ञान, डेटा अनॅलिटिक्स, स्पेस टेक्नॉलॉजी, कृत्रिम बुद्धिमत्ता, व्यवसायिक बुद्धिमत्ता, ऑगमेंटेड रियालिटी, व्हर्च्युअल रियालिटी, सायबर सिक्युरिटी, डेटा सायन्स, रोबोटिक्स इत्यादी.",
      options: [{
        text: "१.१ शाळेकडे तंत्रज्ञान वापराच्या योजना आहेत."
      }, {
        text: "२.१ शाळा शिक्षक आणि कर्मचाऱ्यांना भविष्यातील तंत्रज्ञानासाठी योग्य प्रशिक्षण आणि अभिमुखता प्रशिक्षणाच्या सुविधा उपलब्ध करून देते."
      }, {
        text: "३.१ शाळा आधुनिक तंत्रज्ञानाची ओळख करून देऊन सुनियोजित पद्धतीने नवीन तंत्रज्ञान शिकण्याच्या संधी निर्माण करते"
      }, {
        text: "४.१ शाळा भविष्यकालीन तंत्रज्ञानाशी संबंधित क्षेत्रांमध्ये विद्यार्थ्यांना प्रकल्प-कार्य, समस्या सोडवणे, हॅकाथॉन सहभाग इत्यादी द्वारे नवीन तंत्रज्ञानाचा वापर करतात."
      }, {
        text: "लागू नाही",
        isGreen: true
      }]
    },
    en: {
      orangeDesc: "1.3.5 The school provides opportunities related to cutting-edge knowledge and development of future technologies. e.g., IT, Atal Tinkering Lab, Artificial Intelligence, Machine Learning, 3-D Printing, IoT, Technology, Data Analytics, Space Technology, Artificial Intelligence, Business Intelligence, Augmented Reality, Virtual Reality, Cybersecurity, Data Science, Robotics, etc.",
      options: [{
        text: "1.1 The school has plans for technology usage."
      }, {
        text: "2.1 The school provides appropriate training and orientation facilities for teachers and staff in future technologies."
      }, {
        text: "3.1 The school introduces modern technologies and creates opportunities to learn new technologies in a well-planned manner."
      }, {
        text: "4.1 The school enables students to use new technology in areas related to future technologies through project work, problem-solving, hackathon participation, etc."
      }, {
        text: "Not Applicable",
        isGreen: true
      }]
    }
  },
  15: {
    mr: {
      orangeDesc: "१.३.६ शाळा स्थानिक 'लोकविद्ये' चा प्रचार करते आणि विद्यार्थ्यांना त्यांच्या व्यावहारिक आणि सैद्धांतिक बाबींबद्दल परिचय करून देते.",
      options: [{
        text: "१.१ शाळा स्थानिक लोक-विद्या, व्यापार, उद्योग आणि शेतीविषयक उपक्रमांचे सर्वेक्षण करून माहिती संकलित करते."
      }, {
        text: "२.१ शाळा परिचित असणाऱ्या व्यापार उद्योग / शेती / क्षेत्रातील तज्ञांना शालेय उपक्रमात सहभागी करून घेते व त्यांचे ज्ञान, कौशल्य आणि कुशलता विद्यार्थ्यांसोबत सामायिक करण्यास प्रोत्साहन देते."
      }, {
        text: "३.१ शाळा विद्यार्थ्यांना व्यापार, उद्योग आणि शेतीविषयक तज्ञांकडून लोकविद्या, व्यावसायिक कौशल्य तसेच शेतीविषयक माहिती जाणून घेण्याच्या संधी उपलब्ध करून देते"
      }, {
        text: "४.१ शाळा विद्यार्थ्यांना व्यापार, उद्योग आणि शेतीविषयक तज्ञांकडून लोकविद्या, व्यावसायिक कौशल्य तसेच शेतीविषयक माहितीचा दैनंदिन जीवनात उपयोग करण्यासाठी प्रोत्साहन देतात."
      }, {
        text: "लागू नाही",
        isGreen: true
      }]
    },
    en: {
      orangeDesc: "1.3.6 The school promotes local 'folk arts/indigenous knowledge' (Lokvidya) and introduces students to their practical and theoretical aspects.",
      options: [{
        text: "1.1 The school collects information by conducting surveys of local folk art/indigenous knowledge, business, industry, and agriculture-related activities."
      }, {
        text: "2.1 The school involves familiar experts from the business, industry, or agricultural sectors in school activities and encourages them to share their knowledge, skills, and expertise with students."
      }, {
        text: "3.1 The school provides opportunities for students to learn about folk art, vocational skills, and agricultural information from experts in business, industry, and agriculture."
      }, {
        text: "4.1 The school encourages students to use folk art, vocational skills, and agricultural information obtained from business, industry, and agriculture experts in their daily lives."
      }, {
        text: "Not Applicable",
        isGreen: true
      }]
    }
  },
  16: {
    mr: {
      orangeDesc: "१.३.७ शाळा प्रत्येक विद्यार्थ्याला शिक्षक/स्थानिक कलाकार/पालक/संयुक्त विषय मंडळे किंवा शेजारच्या शाळा/ऑनलाईन क्लासेससह क्लब यांच्या मदतीने कोणत्याही एका कला क्षेत्रात किंवा क्षेत्रांच्या संयोजनात प्रत्येक विद्यार्थ्याला कला शिक्षणासाठी भरपूर संधी उपलब्ध करून देते. (उदा – लोककला, रेखाचित्र आणि चित्रकला, नृत्य, संगीत, साहित्य आणि कविता, थिएटर, ग्राफिक डिझायनिंग, ॲनिमेशन इ.)",
      options: [{
        text: "१.१ शाळा वेळापत्रकात कला, संगीत आणि नृत्य नाट्य इ. तासिकांचा समावेश करते."
      }, {
        text: "२.१ शाळा विद्यार्थ्यांना विविध कला प्रदर्शनांमध्ये सहभागी होण्याची संधी उपलब्ध करून देते. शाळा स्थानिक लोककला आणि हस्तकला यांना प्रोत्साहन देते."
      }, {
        text: "३.१ कला शिक्षणाचे महत्त्व पालक आणि शाळा व्यवस्थापन यांच्या निदर्शनास आणून देऊन त्यांच्यामध्ये जागरूकता निर्माण करण्यासाठी अभिमुखता कार्यक्रम आयोजित केले जातात."
      }, {
        text: "४.१ विद्यार्थी विभागीय/राज्य/राष्ट्रीय स्तरावरील संबंधित स्पर्धा/इव्हेंट/क्रियाकलाप (उदा. कला मंडळे/क्लब इत्यादी) मध्ये भाग घेतात."
      }]
    },
    en: {
      orangeDesc: "1.3.7 The school provides plenty of opportunities for art education to every student in any one art area or combination of areas with the help of teachers/local artists/parents/joint subject committees or neighboring schools/clubs with online classes. (e.g. - folk art, drawing and painting, dance, music, literature and poetry, theater, graphic designing, animation, etc.)",
      options: [{
        text: "1.1 The school includes periods for art, music, dance, drama, etc. in the timetable."
      }, {
        text: "2.1 The school provides opportunities for students to participate in various art exhibitions. The school promotes local folk art and crafts."
      }, {
        text: "3.1 Orientation programs are organized to bring the importance of art education to the notice of parents and school management and create awareness among them."
      }, {
        text: "4.1 Students participate in relevant competitions/events/activities (e.g. art circles/clubs, etc.) at divisional/state/national levels."
      }]
    }
  },
  17: {
    mr: {
      orangeDesc: "१.४.१ विद्यार्थ्यांमध्ये आरोग्य, खेळ आणि तंदुरुस्त राहण्याची आजीवन सवय आणि संस्कृती रुजवण्यासाठी शाळेचे धोरण आहे.",
      options: [{
        text: "१.१ शाळेमध्ये बैठे खेळ,मैदानी खेळ व योगाभ्यास घेतला जातो. या मध्ये दिव्यांगाना सहभागी केले जाते. शाळेमध्ये दिव्यांगासह प्राथमिक खेळाची सुविधा उपलब्ध आहे.",
        isGreen: true
      }, {
        text: "२.१ शाळेत नियमित शारीरिक शिक्षण देणारे क्रीडा शिक्षक आहेत. विद्यार्थ्यांना नियमितपणे योग- प्राणायाम, ध्यान, संतुलित आहार, व्यायाम यासारख्या निरोगी जीवनशैलीतील महत्त्वाच्या घटकांची माहिती दिली जाते."
      }, {
        text: "३.१ भारतीय क्रीडा प्राधिकरणाच्या फिट इंडिया ॲपच्या मदतीने शाळा दिव्यांगासह विद्यार्थ्यांचे आरोग्य आणि तंदुरुस्तीचे मूल्यांकन करते."
      }, {
        text: "४.१ शालेय विकास आराखड्यात शारीरिक शिक्षण आणि खेळ यांचा समावेश करण्यात आला आहे.\n४.२ शालेय क्रीडा संघ/ वैयक्तिक खेळाडू दिव्यांगासह स्थानिक ते राष्ट्रीय स्तरापर्यंतच्या क्रीडास्पर्धांमध्ये सक्रिय सहभागी होतात.\n४.३ विद्यार्थ्यांना निरोगी जीवनशैलीचा पाठपुरावा करता यावा म्हणून प्रोत्साहित करण्यासाठी प्रतिभावान, व्यावसायिक आणि उत्साही क्रीडा व्यक्तींशी संपर्क साधला जातो.\n४.४ खेलो इंडियामध्ये दिव्यांगासह सर्व विद्यार्थी सहभागी होतात."
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/17D2Qzkl-WW69EIksz2PKJLy9DsWKWJVg"
    },
    en: {
      orangeDesc: "1.4.1 The school has a policy to instill health, sports, and fitness as a lifelong habit and culture among students.",
      options: [{
        text: "1.1 Indoor games, outdoor games, and yoga practices are conducted in the school, involving divyang (specially-abled) students. Primary play facilities are available in the school including for divyang students.",
        isGreen: true
      }, {
        text: "2.1 The school has regular physical education teachers. Students are regularly informed about the importance of yoga, pranayama, meditation, balanced diet, exercise, and other key components of a healthy lifestyle."
      }, {
        text: "3.1 The school evaluates student health and fitness, including for divyang students, with the help of the Fit India app by the Sports Authority of India."
      }, {
        text: "4.1 Physical education and sports are included in the school development plan.\n4.2 School sports teams/individual players, including divyang students, actively participate in sports competitions from local to national levels.\n4.3 Talented, professional, and enthusiastic sports personalities are contacted to encourage students to pursue a healthy lifestyle.\n4.4 All students, including divyang students, participate in Khelo India."
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/17D2Qzkl-WW69EIksz2PKJLy9DsWKWJVg"
    }
  },
  18: {
    mr: {
      orangeDesc: "१.४.२ शाळेतील सर्व मुलांची वार्षिक आरोग्य तपासणी केली जाते.",
      options: [{
        text: "१.१ शाळेतील सर्व मुलांची वार्षिक आरोग्य तपासणी केली जाते.",
        isGreen: true
      }, {
        text: "२.१ शाळेतील १००% मुलांची नियमित आरोग्य तपासणी केली जाते\n२.२ १००% मुलांच्या लसीकरणाची पडताळणी केली जाते.\n२.३ आरोग्य तपासणी संदर्भातील संनियंत्रणासाठी हेल्थ कार्ड दिले जातात."
      }, {
        text: "३.१ सर्व मुलांकडे ABHA -ID (आयुष्यमान भारत ओळखपत्र ) आहे.\nABHA – ID आयुष्यमान भारत ओळखपत्रानुसार आरोग्य विषयक नोंदी डिजिटल पद्धतीने ठेवल्या जातात."
      }, {
        text: "४.१ आरोग्य तपासणीच्या आधारे पालकांचे समुपदेशन केले जाते.\n४.२ फिट इंडिया ॲप आणि त्यांच्या शिक्षकांनी परीक्षण करून निर्देशित केलेले व साध्य करता येण्यायोग्य आरोग्य विषयक उद्दिष्ट निश्चित करून त्यांच्या आरोग्याची जबाबदारी विद्यार्थी स्वतः घेतात."
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/17D1pR9XLgPIVX3h5wpuP8NPqCHVNJJtP"
    },
    en: {
      orangeDesc: "1.4.2 Annual health check-ups are conducted for all children in the school.",
      options: [{
        text: "1.1 Annual health check-ups are conducted for all children in the school.",
        isGreen: true
      }, {
        text: "2.1 Regular health check-ups are conducted for 100% of children in the school.\n2.2 Verification of vaccination is done for 100% of children.\n2.3 Health cards are distributed for monitoring health check-up records."
      }, {
        text: "3.1 All children have an ABHA ID (Ayushman Bharat Health Account ID).\nHealth-related records are digitally maintained according to the ABHA ID."
      }, {
        text: "4.1 Counseling is provided to parents based on the health check-up results.\n4.2 Students themselves take responsibility for their health by setting achievable health-related goals evaluated and directed by the Fit India app and their teachers."
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/17D1pR9XLgPIVX3h5wpuP8NPqCHVNJJtP"
    }
  },
  19: {
    mr: {
      orangeDesc: "१.४३ शाळेतील सर्व मुलांची तपासणी (screening) प्रशस्थ ॲपवर (PRASHASHT App) केली जाते (PRASHASHT App अपंगत्व तपासण्यासाठी NCERT ने विकसित केले आहे.)",
      options: [{
        text: "१.१ शाळा संबंधित यंत्रणेकडून शिक्षकांना (PRASHASHT) प्रशस्त ॲपचा वापर करण्याबाबतचे व विद्यार्थ्यांच्या प्राथमिक आरोग्य तपासणीचे (screening) प्रशिक्षण आयोजन करते."
      }, {
        text: "२.१ शाळा सर्व मुलांचे PASHASHT प्रशस्त ॲप द्वारे प्राथमिक तपासणी (screening) केल्याची खात्री करते.\nशिक्षक त्यांचे PRASHAST वर आधारित निरीक्षण पालकांच्या निदर्शनास आणून देतात",
        isGreen: true
      }, {
        text: "३.१ शाळा सर्व मुलांचे PASHASHT प्रशस्त ॲपवर तपासणी (screening) करते.\nतपासणी (स्क्रीनिंग) आणि तज्ञांच्या मूल्यांकनानंतर ओळखल्या जाणाऱ्या स्पेसिफिक लर्निंग डिसॅबिलिटीजी आणि ऑटिझम स्पेक्ट्रम डिसऑर्डर असलेल्या विद्यार्थ्यांना अध्ययनासाठी विशेष शिक्षकांकडे पाठविले जाते."
      }, {
        text: "४.१ सर्व शिक्षकांना त्यांच्या वर्गातील दिव्यांग असणाऱ्या विद्यार्थ्यांना हाताळण्याचे प्रशिक्षण दिले जाते.\n४.२ दिव्यांग विद्यार्थ्यांच्या सोयीसाठी शाळा नियमित पालकांचे समुपदेशन करते."
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/17zzQtM6vZIsEpwkHt9ZyaXkdRDF5-szO"
    },
    en: {
      orangeDesc: "1.4.3 Screening of all children in the school is conducted on the PRASHASHT App (PRASHASHT App is developed by NCERT for disability screening).",
      options: [{
        text: "1.1 The school organizes training for teachers on using the PRASHASHT app and conducting primary health screening for students from the concerned agency."
      }, {
        text: "2.1 The school ensures primary screening of all children using the PRASHASHT app.\nTeachers bring their PRASHASHT-based observations to the attention of parents.",
        isGreen: true
      }, {
        text: "3.1 The school conducts screening of all children on the PRASHASHT app.\nStudents identified with Specific Learning Disabilities (SLD) and Autism Spectrum Disorder (ASD) after screening and expert evaluation are referred to special educators for learning."
      }, {
        text: "4.1 All teachers receive training in handling specially-abled (divyang) students in their classrooms.\n4.2 The school conducts regular parent counseling for the benefit of divyang students."
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/17zzQtM6vZIsEpwkHt9ZyaXkdRDF5-szO"
    }
  },
  20: {
    mr: {
      orangeDesc: "१.५.१ शाळा काळजी, करूणा आणि आदरार्थी वातावरणात मूल्ये वृद्धिंगत करते. विविधतेचे स्वागत करते आणि सर्व शालेय भागधारकांत सांस्कृतिक मूल्यांची रुजवणूक करते.",
      options: [{
        text: "१.१ मूल्यशिक्षणाचा समावेश असलेला अभ्यासक्रम आराखडा SCERT ने तयार केलेला उपलब्ध असून शिक्षक तो वापरतात.\n१.२ अध्ययन अध्यापन प्रक्रियेत मूल्यांचा अंतर्भाव केला जातो.\n१.३ शाळा संबंधित मूल्ये विद्यार्थ्यांमध्ये रुजवण्यासाठी उपक्रमांची आखणी करते"
      }, {
        text: "२.१ एकात्मिक अभ्यासक्रमाच्या माध्यमातून मूल्ये प्रदर्शित केली जातात.\n२.२ शाळा समाजातील अनादर, असमानता आणि भेदभाव कमी करून आपसात समभाव प्रस्थापित करते."
      }, {
        text: "३.१ पारंपरिक भारतीय मूल्ये, (ज्येष्ठांचा, पर्यावरणाचा, अन्न, प्राणी, वनस्पती) इत्यादींचा आदर करणेबाबत शाळा विद्यार्थ्यांना मदत करते.\n३.२ शाळा विविध पार्श्वभूमी आणि दृष्टिकोनाचे विद्यार्थी आणि शिक्षकांचे स्वागत करते आणि त्या अनुषंगाने विशेष कार्यक्रम/प्रसंग साजरे करते."
      }, {
        text: "४.१ शालेय धोरण, अभ्यासक्रम, वर्तणूक आणि शाळेतील नातेसंबंध हे सर्व- समावेशक, नैतिक आणि आदरपूर्ण असून प्रभावीपणे अंमलात आणले जातात आणि त्याचे नियमितपणे पुनरावलोकन केले जाते.\n४.२ सर्व भागधारकांद्वारे माहितीच्या आधारे व एकमेकांच्या सहकार्याने घेतले गेलेले निर्णय विद्यार्थ्यांच्या हितासाठी असतात. व ते नैतिकता, समानता आणि प्रतिष्ठेची संहिता प्रतिबिंबित करतात.\n४.३ विद्यार्थी अध्ययन निष्पत्ती साध्यता या शालेय नोंदी, विद्यार्थी संचयी नोंदपत्रक, दैनंदिन निरीक्षण आणि परस्पर आंतरक्रिया यामधून प्रतिबिंबित होतात.",
        isGreen: true
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/1823j7cZftCs_5pOgBN_dyrtwaOMgOm_4"
    },
    en: {
      orangeDesc: "1.5.1 The school fosters values in a caring, compassionate, and respectful environment. It welcomes diversity and instills cultural values among all school stakeholders.",
      options: [{
        text: "1.1 A curriculum framework incorporating value education prepared by SCERT is available and used by teachers.\n1.2 Values are integrated into the teaching-learning process.\n1.3 The school plans activities to instill relevant values in students."
      }, {
        text: "2.1 Values are demonstrated through the integrated curriculum.\n2.2 The school establishes harmony by reducing disrespect, inequality, and discrimination in society."
      }, {
        text: "3.1 The school helps students respect traditional Indian values (respect for elders, environment, food, animals, plants, etc.).\n3.2 The school welcomes students and teachers from diverse backgrounds and perspectives and celebrates special programs/occasions accordingly."
      }, {
        text: "4.1 School policies, curriculum, behavior, and relationships in the school are all-inclusive, ethical, and respectful, effectively implemented, and regularly reviewed.\n4.2 Decisions taken by all stakeholders based on information and mutual cooperation are in the best interest of students and reflect the code of ethics, equality, and dignity.\n4.3 Student learning outcome achievement is reflected in school records, student cumulative cards, daily observations, and mutual interactions.",
        isGreen: true
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/1823j7cZftCs_5pOgBN_dyrtwaOMgOm_4"
    }
  },
  21: {
    mr: {
      orangeDesc: "१.५.२ : शाळा वर्गातील आंतरक्रियांमध्ये भारताचा वारसा, सभ्यता, नैतिकता आणि मूल्यांचे ज्ञान समाविष्ट असल्याचे सुनिश्चित करते आणि विद्यार्थ्यांना समाज, प्राणी आणि निसर्गाप्रती कर्तव्यांची जाणीव ठेवण्यास प्रोत्साहित करते.",
      options: [{
        text: "१.१ सर्व शिक्षकांना भारतीय संस्कृतीचा वारसा, सभ्यता आणि नैतिकता यांचे पुरेसे ज्ञान आहे."
      }, {
        text: "२.१ वर्गातील आंतरक्रियात भारतीय संस्कृतीचे ज्ञान, भारताचा समृद्ध वारसा, आचार आणि मूल्ये अंतर्भूत केले जातात."
      }, {
        text: '३.१ इतर देशातील सर्व संस्कृतीचा आदर करताना विद्यार्थ्यांना भारताच्या इतिहासाचा आणि वारशाचा अभिमान वाटतो.\n३.२ विद्यार्थी त्यांच्या निर्णय आणि कृतींचे मार्गदर्शन करणारी मूल्ये आणि तत्त्वे ओळखतात. उदा: "एक भारत श्रेष्ठ भारत" अंतर्गत विविध उपक्रम हाती घेतले जातात.'
      }, {
        text: "४.१ विद्यार्थ्यांना त्यांच्या समाज, प्राणी आणि निसर्गाप्रती असलेल्या कर्तव्यांची जाणीव करून दिली जाते.",
        isGreen: true
      }]
    },
    en: {
      orangeDesc: "1.5.2: The school ensures that knowledge of India's heritage, civilization, ethics, and values is included in classroom interactions and encourages students to remain aware of their duties towards society, animals, and nature.",
      options: [{
        text: "1.1 All teachers have adequate knowledge of Indian cultural heritage, civilization, and ethics."
      }, {
        text: "2.1 Knowledge of Indian culture, rich heritage of India, conduct, and values are integrated into classroom interactions."
      }, {
        text: `3.1 Students feel proud of India's history and heritage while respecting all cultures of other countries.
3.2 Students identify values and principles that guide their decisions and actions. E.g., various activities are undertaken under "Ek Bharat Shreshtha Bharat".`
      }, {
        text: "4.1 Students are made aware of their duties towards society, animals, and nature.",
        isGreen: true
      }]
    }
  },
  22: {
    mr: {
      orangeDesc: "१.६.१ विद्यार्थ्यांच्या कामगिरीचे मूल्यांकन करण्यासाठी शिक्षक मूल्यांकनाच्या बहुविध पद्धती वापरतात.",
      options: [{
        text: "१.१ शाळेत सर्व विद्यार्थ्यांचे सातत्यपूर्ण आकारिक व संकलित मूल्यमापन केले जाते."
      }, {
        text: "२.१ विद्यार्थ्यांचे मूल्यमापन झाल्यावर विद्यार्थी तसेच पालकांना प्रगतीबाबत अवगत केले जाते"
      }, {
        text: "३.१ विद्यार्थ्यांचे मूल्यमापन झाल्यावर विद्यार्थ्यांची संपादणूक वाढविण्यासाठी आवश्यकतेनुसार कृती कार्यक्रम हाती घेतला जातो",
        isGreen: true
      }, {
        text: "४.१ शाळेकडे स्वनिर्मित बहुविध पद्धतींची प्रश्नपेढी उपलब्ध आहे. शिक्षक मूल्यमापनासाठी रुब्रिक्सचा वापर करतात.\n४.२ विद्यार्थ्यांची तोंडी परीक्षा इतर शिक्षकांकडून घेतली जाते.\n४.३ विद्यार्थ्यांचे स्वयंमूल्यांकन व सहाध्यायी मूल्यमापन विचारात घेतले जाते.\nNAS,SLAS,SEAS,बहि:स्थ संस्थांच्या निकषांच्या आधारे विद्यार्थ्यांच्या संपादनुकीची प्रभुता ठरवली जाते.\n४.४ माहिती तंत्रज्ञानाच्याआधारे विद्यार्थ्यांच्या प्रगतीचा आढावा घेतला जातो."
      }]
    },
    en: {
      orangeDesc: "1.6.1 Teachers use multiple methods of assessment to evaluate student performance.",
      options: [{
        text: "1.1 Continuous formative and summative assessment of all students is conducted in the school."
      }, {
        text: "2.1 After student assessment, students as well as parents are informed about their academic progress."
      }, {
        text: "3.1 After student assessment, action programs are undertaken as required to enhance student achievement.",
        isGreen: true
      }, {
        text: "4.1 A self-developed question bank of multiple assessment methods is available in the school. Teachers use rubrics for assessment.\n4.2 Oral examinations of students are conducted by other teachers.\n4.3 Self-assessment and peer assessment of students are taken into consideration.\nMastery of student achievement is determined based on the criteria of NAS, SLAS, SEAS, and external organizations.\n4.4 Student progress is reviewed using information technology."
      }]
    }
  },
  23: {
    mr: {
      orangeDesc: "१.६.२ सहयोगी आणि स्व-मूल्यांकन तंत्र समजून एकात्मकरण केले आहे.",
      options: [{
        text: "१.१ शाळेचे मुख्याध्यापक आणि शिक्षकांना सहयोगी आणि स्वयं-मूल्यांकन तंत्रांबद्दल माहिती आहे."
      }, {
        text: "२.१ शाळेतील शिक्षक मूल्यांकनाच्या विविध पद्धतींमध्ये प्रशिक्षित आहेत आणि त्यांनी सर्व इयत्तांमध्ये सहयोगी आणि स्व-मूल्यांकन करण्यास सुरुवात केली आहे.",
        isGreen: true
      }, {
        text: "३.१ विद्यार्थी समवयस्कांच्या मूल्यांकनावर सकारात्मक आणि विधायक अभिप्राय देतात."
      }, {
        text: "४.१ स्वयं-मूल्यांकनाद्वारे विद्यार्थी, त्यांची बलस्थाने आणि आव्हानांबद्दल सजग आहेत.\n४.२ शाळा समग्र प्रगती पत्रकात (HPC) सहयोगी आणि स्व-मूल्यांकन समावेश करते."
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/18H7GA8LZH_1YGX4bvltJptIIc-ieCo"
    },
    en: {
      orangeDesc: "1.6.2 Peer and self-assessment techniques are understood and integrated.",
      options: [{
        text: "1.1 The headmaster and teachers of the school are aware of peer and self-assessment techniques."
      }, {
        text: "2.1 Teachers in the school are trained in various assessment methods and have started peer and self-assessment across all grades.",
        isGreen: true
      }, {
        text: "3.1 Students provide positive and constructive feedback on peer assessments."
      }, {
        text: "4.1 Through self-assessment, students are aware of their strengths and challenges.\n4.2 The school includes peer and self-assessment in the Holistic Progress Card (HPC)."
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/18H7GA8LZH_1YGX4bvltJptIIc-ieCo"
    }
  },
  24: {
    mr: {
      orangeDesc: "१.६.३ अध्ययनाचे मूल्यांकन करण्यासाठी क्षमता/ अध्ययन निष्पत्ती या श्रेणी स्तर म्हणून वापरतात. राष्ट्रीय आविष्कार अभियानात विज्ञान आणि गणित शिक्षण आनंददायी व अर्थपूर्ण बनविण्यासाठी कृती एकत्रित केल्या आहेत.",
      options: [{
        text: "१.१ शाळेकडे NCERT ने परिभाषित केलेल्या वेगवेगळ्या वर्गासाठीच्या अध्ययन निष्पत्ती आणि क्षमता या संदर्भातील दस्तऐवज उपलब्ध आहेत.\n१.२ राष्ट्रीय आविष्कार अभियानाचा हेतू आणि उद्दिष्टे या बाबत शाळा शिक्षकांसाठी जागृती कार्यक्रम आयोजित करते."
      }, {
        text: "२.१ विज्ञान आणि गणितातील विद्यार्थ्यांचे मूल्यमापन पाठ्यपुस्तकातील प्रश्नावर आधारित आहे.\n२.२ शिक्षक त्यांच्या विज्ञान/ गणिताच्या घटकांचे अभ्यासक्रमानुसार नियोजन करतात.\n२.३ विज्ञान/ गणिताच्या अध्ययन निष्पत्ती विद्यार्थी व पालकांसोबत चर्चा करून त्यांना स्पष्ट करून सांगतात.\n२.४ शाळा पृच्छां आधारित शिक्षणाला चालना देण्यासाठी विचार करण्याची, शोध लावण्याची, नवनिर्मिती आणि कृती प्रवण संस्कृतीची निर्मिती करतात.",
        isGreen: true
      }, {
        text: "३.१ प्रत्येक घटकासाठी परिभाषित केलेल्या क्षमता, अध्ययन निष्पत्तीनुसार शिक्षकांनी स्वतः निश्चित केलेल्या मूल्यांकन कार्यानुसार विद्यार्थ्यांचे मूल्यमापन करतात.\n३.२ शाळा वैज्ञानिक दृष्टीकोन आणि पुराव्यावर आधारित विचार प्रक्रिया विकसित करण्यासाठी विज्ञानासह विविध विषयावर आधारित अनेक उपक्रम/प्रदर्शन/ संशोधन कार्यशाळा/सेमिनार घेते.\n३.३ विद्यार्थ्यांना मध्यस्तर पासून कोडींग शिकण्यासह विविध कृतीद्वारे गणितीय आणि संगणकीय विचारावर लक्ष केंद्रित करण्यासाठी प्रोत्साहित केले जाते."
      }, {
        text: "४.१ क्षमता/ अध्ययन निष्पत्तीचा उपयोग पाठ्यपुस्तकातील आशय आणि माहितीच्या ऐवजी संकल्पनात्मक स्पष्टता आणि वास्तविक जीवनातील परिस्थितीमध्ये ज्ञानाचा वापर करण्याच्या प्रगतीचे मूल्यमापन करण्यासाठी केला जातो.\n४.२ वास्तव जीवनातील परिस्थितीमधून शिकण्यावर लक्ष केंद्रित करून विद्यार्थ्यांनी विज्ञान आणि गणिताचे प्रकल्प विकसित केले आहेत.\n४.३ शाळेमध्ये पूर्वतयारी स्तरापासून माध्यमिक स्तरापर्यंत सक्रीय विज्ञान आणि गणित क्लब/मंडळे आहेत.\n४.४ शाळा नियमितपणे विज्ञान आणि गणिताशी संबंधित जिल्हा, राज्य, राष्ट्रीय स्तरावरील उपक्रम हॅकेथॉन्स (जांबोरी) इत्यादीमध्ये भाग घेते."
      }, {
        text: "उच्च माध्यमिक शाळा फक्त आर्ट व कॉमर्स कॉलेज साठी लागू नसणारे मानक"
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/18FLCYLO0Yz7__pPG0NC3aVMqw0wZDu6l"
    },
    en: {
      orangeDesc: "1.6.3 Competency/learning outcomes are used as grading levels to evaluate learning. Under Rashtriya Avishkar Abhiyan, activities are integrated to make science and mathematics education enjoyable and meaningful.",
      options: [{
        text: "1.1 Documents regarding learning outcomes and competencies defined by NCERT for different classes are available in the school.\n1.2 The school organizes awareness programs for teachers regarding the purpose and objectives of the Rashtriya Avishkar Abhiyan."
      }, {
        text: "2.1 Evaluation of students in science and mathematics is based on textbook questions.\n2.2 Teachers plan their science/mathematics units according to the curriculum.\n2.3 Teachers discuss and explain science/mathematics learning outcomes to students and parents.\n2.4 The school creates a culture of thinking, exploration, innovation and action to promote inquiry-based learning.",
        isGreen: true
      }, {
        text: "3.1 Teachers evaluate students based on self-determined assessment tasks according to defined competencies and learning outcomes for each unit.\n3.2 The school organizes various activities/exhibitions/research workshops/seminars based on science and other subjects to develop a scientific attitude and evidence-based thinking process.\n3.3 Students are encouraged to focus on mathematical and computational thinking through various activities, including learning coding from the middle stage."
      }, {
        text: "4.1 Competencies/learning outcomes are used to evaluate progress in conceptual clarity and application of knowledge in real-life situations rather than textbook content and information.\n4.2 Students have developed science and mathematics projects focusing on learning from real-life situations.\n4.3 There are active science and mathematics clubs/circles in the school from the preparatory stage to the secondary stage.\n4.4 The school regularly participates in district, state, and national level activities, hackathons (jamboree), etc., related to science and mathematics."
      }, {
        text: "Standard not applicable for Higher Secondary Schools with only Art and Commerce streams"
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/18FLCYLO0Yz7__pPG0NC3aVMqw0wZDu6l"
    }
  },
  25: {
    mr: {
      orangeDesc: "१.६.४ प्रत्येक मुलासाठी समग्र प्रगती पत्रक तयार केले आहे. सर्व विद्यार्थी त्यांची प्रगती करून सातत्यपूर्ण विकासाकडे निरंतर वाटचाल करतात.",
      options: [{
        text: "१.१ संबंधित विषय शिक्षकांकडून मूल्यांकन केले जाते."
      }, {
        text: "२.१ शाळेत समग्र प्रगती पत्रक (HPC) आहे.",
        isGreen: true
      }, {
        text: "३.१ प्रत्येक मुलाची सर्वांगीण प्रगती अनौपचारिक पद्धतीने नोंदवली जाते आणि वर्गातील विद्यार्थ्यांमध्ये कोणतीही क्रमवारी किंवा स्पर्धा अस्तित्वात नाही याची खात्री केली जाते."
      }, {
        text: "४.१ मूल्यांकनातून प्राप्त माहितीवर आधारित विद्यार्थी विकासाचा कार्यक्रम हाती घेतला जातो.\n४.२ विद्यार्थ्यांना त्यांची वैयक्तिक आणि सामूहिक विकासाची उद्दिष्टे साध्य करता यावी यासाठी मूल्यांकन, निरीक्षण आणि पुनरावलोकनाची यंत्रणा आहे."
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/189uOMXYCKgfUOaN3x7rk_a6iiART_iFc"
    },
    en: {
      orangeDesc: "1.6.4 A holistic progress card is prepared for every child. All students make progress and move continuously towards sustainable development.",
      options: [{
        text: "1.1 Evaluation is done by the concerned subject teachers."
      }, {
        text: "2.1 The school has a Holistic Progress Card (HPC).",
        isGreen: true
      }, {
        text: "3.1 The all-round progress of each child is recorded informally and it is ensured that no ranking or competition exists among the students in the class."
      }, {
        text: "4.1 A student development program is undertaken based on the information obtained from the evaluation.\n4.2 There is a mechanism of evaluation, monitoring, and review to help students achieve their individual and collective development goals."
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/189uOMXYCKgfUOaN3x7rk_a6iiART_iFc"
    }
  },
  26: {
    mr: {
      orangeDesc: "१.६.५ SLAS/PAT/NAS/SEAS च्या जिल्हा अहवालावर आधारित कृती उपक्रम निर्धारित केले आहेत.",
      options: [{
        text: "१.१ शिक्षकांनी SLAS/PAT/NAS/SEAS चा जिल्हा अहवाल समजून घेतला आहे."
      }, {
        text: "२.१ SLAS/PAT/NAS/SEAS नंतर करावयाच्या कृती कार्यक्रमांसाठी शिक्षकांना प्रशिक्षित केले आहे.\n२.२ शिक्षकांनी विद्यार्थ्यांच्या अध्ययन निष्पत्तीचे मूल्यांकन करण्यासाठी तसेच अध्ययन वृद्धीसाठी विविध नाविन्यपूर्ण अध्यापनशास्त्र आणि मूल्यमापन पद्धती तयार केल्या आहेत"
      }, {
        text: "३.१ SLAS/PAT/NAS/SEAS च्या जिल्हा अहवालावर आधारित कृती कार्यक्रम तयार केला आहे.\n३.२ SLAS/PAT/NAS/SEAS जिल्हा निकालावर आधारित अध्ययन निष्पत्तीनुसार सर्व विद्यार्थ्यांना अतिरिक्त अध्ययनाच्या संधी उपलब्ध करून दिल्या जातात."
      }, {
        text: "४.१ SLAS/PAT/NAS/SEAS नुसार विविध स्तरांवर आणि विविध विषय/डोमेनमधील विद्यार्थ्यांच्या यशाच्या पातळीने त्या स्तरांवर आणि त्या विषय/डोमेनमधील राष्ट्रीय/राज्य सरासरीला मागे टाकले आहे."
      }, {
        text: "लागू नाही",
        isGreen: true
      }]
    },
    en: {
      orangeDesc: "1.6.5 Action programs are determined based on the district reports of SLAS/PAT/NAS/SEAS.",
      options: [{
        text: "1.1 Teachers have understood the district report of SLAS/PAT/NAS/SEAS."
      }, {
        text: "2.1 Teachers are trained for action programs to be conducted after SLAS/PAT/NAS/SEAS.\n2.2 Teachers have designed various innovative pedagogy and evaluation methods to assess student learning outcomes and enhance learning."
      }, {
        text: "3.1 An action program based on the district report of SLAS/PAT/NAS/SEAS has been prepared.\n3.2 Additional learning opportunities are provided to all students according to learning outcomes based on SLAS/PAT/NAS/SEAS district results."
      }, {
        text: "4.1 According to SLAS/PAT/NAS/SEAS, the achievement levels of students at various levels and in different subjects/domains have surpassed the national/state averages at those levels and in those subjects/domains."
      }, {
        text: "Not Applicable",
        isGreen: true
      }]
    }
  },
  27: {
    mr: {
      orangeDesc: "१.६.६ शाळा आपल्या विद्यार्थ्यांची उच्चतम / अधिकाधिक उपस्थिती सुनिश्चित करते.",
      options: [{
        text: "१.१ शाळा विद्यार्थ्यांच्या उपस्थितीच्या नोंदी ठेवते.\n१.२ शाळेतील गळती झालेले विद्यार्थी परत आणण्यासाठी धोरणे तयार आहेत."
      }, {
        text: "२.१ मुख्याध्यापक आणि शिक्षकांना नियमितपणे गैरहजर राहणारे विद्यार्थी माहिती असतात आणि पालकांना नियमित गैरहजर असलेल्या मुलाबद्दल माहिती दिली जाते"
      }, {
        text: "३.१ शाळा सोडलेल्या विद्यार्थ्यांचा मागोवा घेतला जातो आणि त्यांना वर्गात परत आणले जाते.\n३.२ शाळा आपल्या विद्यार्थ्यांची किमान ७५% उपस्थिती सुनिश्चित करते."
      }, {
        text: "४.१ मुख्याध्यापक, शिक्षक आणि इतर भागधारकांनी विद्यार्थ्यांच्या उपस्थिती वाढीसाठी संयुक्त योजना तयार केली आहे.\n४.२ जोखीम असलेल्या विद्यार्थ्यांना (मुलगी, विविध सामाजिक-आर्थिक वंचित गटातील विद्यार्थी आणि दिव्यांग) त्यांचे शालेय शिक्षण पूर्ण करण्यासाठी मदत आणि प्रोत्साहन दिले जाते.\n४.३ शाळा आपल्या विद्यार्थ्यांची किमान १००% उपस्थिती सुनिश्चित करते.",
        isGreen: true
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/19zRNuwiQLmywV-Vx8_mCEIMrO9UUIqAZ"
    },
    en: {
      orangeDesc: "1.6.6 The school ensures highest/maximum attendance of its students.",
      options: [{
        text: "1.1 The school maintains attendance records of students.\n1.2 Policies are in place to bring back school dropouts."
      }, {
        text: "2.1 The headmaster and teachers are aware of regularly absent students, and parents are informed about the child's regular absence."
      }, {
        text: "3.1 Dropped-out students are tracked and brought back to the class.\n3.2 The school ensures at least 75% attendance of its students."
      }, {
        text: "4.1 The headmaster, teachers and other stakeholders have prepared a joint plan to increase student attendance.\n4.2 At-risk students (girls, students from various socio-economically disadvantaged groups and divyang) are helped and encouraged to complete their school education.\n4.3 The school ensures at least 100% attendance of its students.",
        isGreen: true
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/19zRNuwiQLmywV-Vx8_mCEIMrO9UUIqAZ"
    }
  },
  28: {
    mr: {
      orangeDesc: "१.६.७ PAT च्या अहवालावर आधारित कृती उपक्रम निर्धारित केले आहेत.",
      options: [{
        text: "१.१ शिक्षकांनी PAT चा अहवाल समजून घेतला आहे."
      }, {
        text: "२.१ PAT नंतर करावयाच्या कृतीकार्यक्रमासाठी शिक्षकांना प्रशिक्षित केले आहे.\n२.२ शिक्षकांनी विद्यार्थ्यांच्या अध्ययन निष्पत्तीचे मूल्यांकन करण्यासाठी तसेच अध्ययन वृद्धीसाठी विविध नाविन्यपूर्ण अध्यापनशास्त्र आणि मूल्यमापन पद्धती तयार केल्या आहेत."
      }, {
        text: "३.१ PAT च्या अहवालावर आधारित कृतीकार्यक्रम तयार केला आहे.\n३.२ PAT च्या निकालावर आधारित अध्ययन निष्पत्तीनुसार सर्व विद्यार्थ्यांना अतिरिक्त अध्यायाच्या संधी उपलब्ध करून दिल्या जातात.",
        isGreen: true
      }, {
        text: "४.१ PAT नुसार विविध स्तरावर आणि विविध विषय/ डोमेन मधील विद्यार्थ्यांच्या यशाच्या पातळीने त्या स्तरावर आणि त्या विषय/ डोमेन मधील राष्ट्रीय/ राज्य सरासरीला मागे टाकले आहे."
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/1A0IVJaf42Qf1bBYXqEYflwscNPRO0C52"
    },
    en: {
      orangeDesc: "1.6.7 Action programs are determined based on PAT reports.",
      options: [{
        text: "1.1 Teachers have understood the PAT report."
      }, {
        text: "2.1 Teachers are trained for action programs to be conducted after PAT.\n2.2 Teachers have prepared various innovative pedagogy and evaluation methods to assess student learning outcomes and enhance learning."
      }, {
        text: "3.1 An action program based on the PAT report has been prepared.\n3.2 Additional learning opportunities are provided to all students according to learning outcomes based on PAT results.",
        isGreen: true
      }, {
        text: "4.1 According to PAT, the achievement levels of students at various levels and in different subjects/domains have surpassed the national/state averages at those levels and in those subjects/domains."
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/1A0IVJaf42Qf1bBYXqEYflwscNPRO0C52"
    }
  },
  29: {
    mr: {
      orangeDesc: "१.७.१ शाळेमध्ये पायाभूत तीन ते सहा वयोगटातील मुलांसाठी एक ते तीन वर्षाचे बालवाटिका शिक्षण आहे.",
      options: [{
        text: "१.१ शाळांनी पायाभूत अभ्यासक्रम व अध्यापन संरचना सुरू केली आहे."
      }, {
        text: "२.१ पायाभूत स्तरावर बालवाटिका/ अंगणवाडी कार्यरत आहे."
      }, {
        text: "३.१ इयत्ता पहिली ते तिसरीला अध्यापन करणाऱ्या सर्व शिक्षकांनी FLN/NISHTHA मॉड्युल पूर्ण केले आहे.\n३.२. पूर्वतयारी स्तरावर इयत्ता चौथी आणि पाचवीला अध्यापन करणाऱ्या सर्व शिक्षकांनी निष्ठा प्राथमिक मॉड्युल पूर्ण केले आहे.",
        isGreen: true
      }, {
        text: "४.१ पायाभूत स्तरातील शिकणाऱ्या विद्यार्थ्यांनी 'निपुण भारत' मध्ये नमूद केलेली सर्व 'लक्ष्य' १००% साध्य केली आहेत याची सुनिश्चिती शिक्षक करतात."
      }, {
        text: "लागू नाही"
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/1A0ZiB6epnp3ZDvWw5Gk5J-66vjWSpH1Z"
    },
    en: {
      orangeDesc: "1.7.1 The school offers one to three years of Balvatika education for children in the foundational age group of three to six years.",
      options: [{
        text: "1.1 The school has initiated foundational curriculum and pedagogical structure."
      }, {
        text: "2.1 Balvatika/Anganwadi is functional at the foundational stage."
      }, {
        text: "3.1 All teachers teaching classes I to III have completed FLN/NISHTHA modules.\n3.2 All teachers teaching classes IV and V at the preparatory stage have completed NISHTHA primary modules.",
        isGreen: true
      }, {
        text: "4.1 Teachers ensure that foundational stage students have achieved 100% of the 'Lakshya' targets mentioned in 'NIPUN Bharat'."
      }, {
        text: "Not Applicable"
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/1A0ZiB6epnp3ZDvWw5Gk5J-66vjWSpH1Z"
    }
  },
  30: {
    mr: {
      orangeDesc: "१.७.२ वैविध्यपूर्ण अध्ययन अध्यापन साहित्य स्थानिक भाषेत उपलब्ध करून दिले आहे.",
      options: [{
        text: "१.१ NCF/SCF वर आधारित प्रादेशिक भाषेत वाचन साक्षरता आणि गणित साक्षरतेसाठी अध्ययन अध्यापन साहित्याची (TLM) उपलब्धता आहे."
      }, {
        text: "२.१ पायाभूत स्तरावर पाठ्यपुस्तक व विद्यार्थी (प्रमाण) गुणोत्तर १:२ आहे किंवा पूर्वतयारीच्या स्तरावर २ पेक्षा जास्त आहे. (वाचन साक्षरता आणि संख्याशास्त्राची पाठ्यपुस्तके पायाभूत स्तरावर एकत्र केल्यास, गुणोत्तर १:१ असेल)."
      }, {
        text: "३.१ वाचन साक्षरता आणि गणित साक्षरतेसाठी कथा पुस्तके, व्हिडिओ गेम, फ्लॅशकार्ड, चित्र पुस्तके, ॲप्स इत्यादी अध्ययन-अध्यापन साहित्य (TLM) प्रादेशिक भाषेत तसेच मुलांची स्थानिक भाषेत/मातृभाषेत ऑफलाइन तसेच ऑनलाइन पद्धतीने उपलब्धता आहे.\n३.२ शाळेत डिजिटल आणि पुस्तकांच्या प्रती असणारे (भौतिक) ग्रंथालये उपलब्ध आहेत."
      }, {
        text: "१. पायाभूत आणि पूर्वतयारी वर्गातील (इयत्ता पहिली ते पाचवी) शंभर टक्के विद्यार्थ्यांना प्रादेशिक/स्थानिक भाषेतील इयत्ता निहाय पूरक अध्यापन साहित्य वापरण्यासाठी उपलब्ध आहे.",
        isGreen: true
      }, {
        text: "लागू नाही"
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/1A6KCuKZtaJAuexE0nQy8X3gQli-zoEnR"
    },
    en: {
      orangeDesc: "1.7.2 Diverse teaching-learning material (TLM) is made available in the local language.",
      options: [{
        text: "1.1 Availability of teaching-learning material (TLM) for reading literacy and mathematical literacy in regional language based on NCF/SCF."
      }, {
        text: "2.1 Textbook to student ratio is 1:2 at the foundational stage or more than 2 at the preparatory stage. (If reading literacy and numeracy textbooks are integrated at the foundational stage, the ratio will be 1:1)."
      }, {
        text: "3.1 Teaching-learning material (TLM) like storybooks, video games, flashcards, picture books, apps etc. for reading literacy and mathematical literacy is available offline and online in regional/local/mother tongue of children.\n3.2 Digital and physical libraries with book copies are available in the school."
      }, {
        text: "1. One hundred percent of students in foundational and preparatory stages (grades I to V) have access to grade-wise supplementary teaching learning materials in regional/local languages.",
        isGreen: true
      }, {
        text: "Not Applicable"
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/1A6KCuKZtaJAuexE0nQy8X3gQli-zoEnR"
    }
  },
  31: {
    mr: {
      orangeDesc: "१.७.३ शाळा मातृभाषा/प्रादेशिक भाषा जोपासते आणि शिक्षक भाषेच्या विविधतेद्वारे समवयस्क संबंध बळकट करून त्यांची जोпасना करतात.",
      options: [{
        text: "१.१ NCF/SCF मध्ये नमूद केल्याप्रमाणे वाचन साक्षरता आणि गणित साक्षरतेसाठी प्रादेशिक भाषेत अध्ययन अध्यापन साहित्यांची उपलब्धता आहे.\n१.२ शाळा मुलांना त्यांच्या मातृभाषेत लिहिलेली पुस्तके शाळेत आणण्यासाठी वर्गात सामायिक करण्यासाठी प्रोत्साहित करते."
      }, {
        text: "२.१ वाचन साक्षरता आणि गणित साक्षरतेसाठी प्रादेशिक भाषेत तसेच स्थानिक भाषेत /बोली/ मातृभाषेत अध्ययन अध्यापन साहित्याची उपलब्धता आहे.\n२.२ मुले त्यांच्या भाषेतील कथापुस्तकांमधून लहान लहान उतारे मोठ्याने वाचतात, वाचन कौशल्य दाखवितात, त्यांना त्यांच्या स्वतःच्या संस्कृतीबद्दल अभिमान वाटतो आणि त्याच वेळी शाळेतील सर्व संस्कृतींचा ते आदर करतात",
        isGreen: true
      }, {
        text: "३.१ ग्रंथालयात प्रादेशिक भाषेतील तसेच स्थानिक भाषेतील,बोली भाषेतील,मातृभाषेत पुस्तके ऑनलाइन आणि ऑफलाईन उपलब्ध आहेत.यात कथा,पुस्तके,व्हिडिओ गेम,फ्लॅश कार्ड ,चित्र,पुस्तके,अॅप्स इत्यादी\n३.२ स्थानिक नेते, आजी - आजोबा,इतर समुदाय सदस्यइत्यादींच्या मदतीने कथा सांगण्याच्या कार्यक्रमाचे आयोजन करतात."
      }, {
        text: "४.१ पायाभूत वर्षांतील (इयत्ता १ ते ३) शंभर टक्के विद्यार्थ्यांना इयत्तेनुसार त्यांच्या प्रादेशिक स्थानिक भाषेतील अध्ययन पूरक साहित्य उपलब्ध करून दिलेले आहे\n४.२ पायाभूत विद्यार्थ्यांनी त्यांच्या स्थानिक भाषा/ मातृभाषेत उल्लेखनीय यश संपादन केलेले आहे."
      }, {
        text: "लागू नाही"
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/1ADUFzMNZAxnOCQI3-XqKj-96wOwlD1g9"
    },
    en: {
      orangeDesc: "1.7.3 The school preserves the mother tongue/regional language and teachers foster peer relationships by strengthening linguistic diversity.",
      options: [{
        text: "1.1 Availability of teaching-learning materials in the regional language for reading literacy and mathematical literacy as specified in NCF/SCF.\n1.2 The school encourages children to bring books written in their mother tongue to school for sharing in the classroom."
      }, {
        text: "2.1 Availability of teaching-learning materials for reading literacy and mathematical literacy in the regional language as well as local language/dialect/mother tongue.\n2.2 Children read aloud short passages from storybooks in their language, demonstrate reading skills, feel proud of their own culture, and at the same time respect all cultures in the school.",
        isGreen: true
      }, {
        text: "3.1 Books in regional, local, dialect, and mother tongue are available online and offline in the library, including stories, books, video games, flash cards, picture books, apps, etc.\n3.2 The school organizes storytelling programs with the help of local leaders, grandparents, and other community members."
      }, {
        text: "4.1 One hundred percent of students in the foundational years (classes 1 to 3) are provided with grade-appropriate supplementary teaching-learning materials in their regional/local language.\n4.2 Foundational stage students have achieved remarkable success in their local language/mother tongue."
      }, {
        text: "Not Applicable"
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/1ADUFzMNZAxnOCQI3-XqKj-96wOwlD1g9"
    }
  },
  32: {
    mr: {
      orangeDesc: "१.७.४ शाळांनी पायाभूत स्तरावरील पाच वर्षासाठी नवोपक्रमशील खेळ आणि खेळणी आधारित कृतीयुक्त अध्यापनचा स्वीकार केला आहे.",
      options: [{
        text: "१.१ शाळेत पायाभूत स्तरावर खेळ आणि खेळणी आधारित कृतीयुक्त अध्यापन पद्धतीचा वापर केला जातो."
      }, {
        text: "२.१ शाळेतील २५% शिक्षक वर्गात नाविन्यपूर्ण अध्यापन पद्धती वापरत आहेत, उदाहरणार्थ - खेळणी/खेळ-आधारित अध्यापन,कला- एकात्मिक शिक्षण, खेळ-एकात्मिक शिक्षण, अनुभवात्मक शिक्षण, कथा-कथन अध्यापन."
      }, {
        text: "३.१ शाळेतील ५०% शिक्षक वर्गात नाविन्यपूर्ण अध्यापन पद्धती वापरत आहेत, उदाहरणार्थ - खेळणी/खेळ-आधारित अध्यापन ,कला- एकात्मिक शिक्षण, खेळ-एकात्मिक शिक्षण, अनुभवात्मक शिक्षण, कथा-कथन अध्यापन पद्धती ."
      }, {
        text: "४.१ पायभूत आणि पूर्व तयारी वर्गातील (इयत्ता पहिली ते पाचवी ) १००% विद्यार्थ्यांना प्रादेशिक/ स्थानिक भाषेतील इयत्तानिहाय पूरक अध्यापन साहित्य वापरण्यासाठी उपलब्ध आहे.",
        isGreen: true
      }, {
        text: "लागू नाही"
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/1AM9SHrgUARde9GGHVvdXCOI301S2fpK"
    },
    en: {
      orangeDesc: "1.7.4 Schools have adopted innovative play and toy-based active teaching at the foundational stage for five years.",
      options: [{
        text: "1.1 Play and toy-based active teaching methods are used at the foundational stage in the school."
      }, {
        text: "2.1 25% of teachers in the school use innovative teaching methods in classrooms, e.g., toy/play-based teaching, art-integrated learning, sports-integrated learning, experiential learning, storytelling teaching."
      }, {
        text: "3.1 50% of teachers in the school use innovative teaching methods in classrooms, e.g., toy/play-based teaching, art-integrated learning, sports-integrated learning, experiential learning, storytelling teaching methods."
      }, {
        text: "4.1 100% of students in foundational and preparatory classes (grades I to V) have access to grade-wise supplementary teaching learning materials in regional/local languages.",
        isGreen: true
      }, {
        text: "Not Applicable"
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/1AM9SHrgUARde9GGHVvdXCOI301S2fpK"
    }
  },
  33: {
    mr: {
      orangeDesc: "१.७.५ प्रत्येक मुलाची प्रगती सुनिश्चित करण्यासाठी, इयत्ता पहिली व दुसरी मध्ये शाळा निरीक्षण-आधारित मूल्यमापन करते.",
      options: [{
        text: "१.१ शाळा इयत्ता पहिली व दुसरीसाठी वयोमानानुसार मूल्यांकन पद्धतींची योजना विकसित करते."
      }, {
        text: "२.१ शिक्षक विद्यार्थ्यांचे तोंडी/श्रवण आणि निरीक्षण पद्धतीने मूल्यांकन करण्यात प्रशिक्षित आहेत"
      }, {
        text: "३.१ शिक्षक शाळेतील इयत्ता पहिली व दुसरीसाठी तोंडी/श्रवण आणि निरीक्षण-आधारित मूल्यमापनाचा वापर करतात."
      }, {
        text: "४.१ शिक्षक इयत्ता पहिली व दुसरीच्या विद्यार्थ्यांच्या मूल्यांकन निष्कर्षाचा वापर करून संबंधित वर्गातील प्रत्येक विद्यार्थ्याच्या शिक्षणातील अंतर भरून काढण्यासाठी वैयक्तिक अध्ययन योजना विकसित करतात.",
        isGreen: true
      }, {
        text: "लागू नाही"
      }],
      hasEvidence: true
    },
    en: {
      orangeDesc: "1.7.5 To ensure the progress of every child, the school conducts observation-based assessment in classes I and II.",
      options: [{
        text: "1.1 The school develops an age-appropriate assessment methodology plan for classes I and II."
      }, {
        text: "2.1 Teachers are trained in assessing students through oral/listening and observation methods."
      }, {
        text: "3.1 Teachers in the school use oral/listening and observation-based assessment for classes I and II."
      }, {
        text: "4.1 Teachers develop individual learning plans to bridge the learning gaps of each student in the respective class using assessment findings of class I and II students.",
        isGreen: true
      }, {
        text: "Not Applicable"
      }],
      hasEvidence: true
    }
  },
  34: {
    mr: {
      orangeDesc: "१.७.६ इयत्ता तिसरी पर्यंत पोहोचलेल्या सर्व मुलांनी साक्षरता आणि संख्याज्ञानाची मूलभूत कौशल्ये आत्मसात केली आहेत हे सुनिश्चित करण्यासाठी शाळा FLN कृतींचे बारकाईने निरीक्षण करते.",
      options: [{
        text: "१.१ शाळेने निपुण भारत आराखडा स्वीकारले आहे.\n१.२ सर्व शिक्षकांचे FLN/ निष्ठा प्रशिक्षण झाले आहे"
      }, {
        text: "२.१ शाळा विद्यार्थ्यांसाठी आणि पालकांसाठी FLN उपक्रम राबवते.\nउदा. वाचन चळवळ अंतर्गत गोष्टींचा शनिवार, दोन वाचन तासिका, आनंदाचा तास इ."
      }, {
        text: "३.१ शिक्षकांनी अभ्यास योजना तयार करून त्याची अंमलबजावणी केल्यामुळे विद्यार्थ्यांची साहित्यिक आणि मूलभूत भाषा कौशल्य विकसित होत आहेत"
      }, {
        text: "४.१ इयत्ता तिसरी पर्यंत पोहोचलेल्या सर्व मुलांनी साक्षरता आणि संख्याज्ञानाची मूलभूत कौशल्ये आत्मसात केली आहेत हे सुनिश्चित करण्यासाठी शाळा FLN कृतींचे बारकाईने निरीक्षण करते.",
        isGreen: true
      }, {
        text: "लागू नाही"
      }],
      hasEvidence: true
    },
    en: {
      orangeDesc: "1.7.6 The school closely monitors FLN activities to ensure that all children reaching class III have acquired basic literacy and numeracy skills.",
      options: [{
        text: "1.1 The school has adopted the NIPUN Bharat framework.\n1.2 All teachers have received FLN/NISHTHA training."
      }, {
        text: "2.1 The school conducts FLN initiatives for students and parents.\ne.g., Story Saturday under the reading movement, two reading periods, happy hour, etc."
      }, {
        text: "3.1 Students' literary and basic language skills are developing due to teachers preparing and implementing lesson plans."
      }, {
        text: "4.1 The school closely monitors FLN activities to ensure that all children reaching class III have acquired basic literacy and numeracy skills.",
        isGreen: true
      }, {
        text: "Not Applicable"
      }],
      hasEvidence: true
    }
  },
  35: {
    mr: {
      orangeDesc: "१.७.७ समृद्ध अध्ययन अनुभवासाठी शिक्षक आणि विद्यार्थ्यांच्या आपापसातील भेटींचे आयोजन केले जाते.",
      options: [{
        text: "१.१ शाळेकडे शेजारच्या शाळा/शैक्षणिक संस्था आणि अंगणवाड्यांसोबत शिक्षक आणि विद्यार्थ्यांच्या आपापसातील भेटींचे नियोजन केले आहे."
      }, {
        text: "२.१ शिक्षक जवळच्या शाळांसोबत अध्ययन अध्यापन अनुभव देवाणघेवाण कार्यक्रम आयोजित करतात.",
        isGreen: true
      }, {
        text: "३.१ आजूबाजूच्या शाळा/शैक्षणिक संस्था आणि अंगणवाड्या यांच्या सहकार्याने अनेक संयुक्त उपक्रम राबवले जातात, जसे की संयुक्त क्रीडा दिन, कला प्रदर्शन, इको क्लब आणि विद्यार्थ्यांसाठी इतर विषय मंडळे, हॅकाथॉन संघ, विज्ञान प्रदर्शने, 'एक भारत श्रेष्ठ भारत' उपक्रम इ."
      }, {
        text: "४.१ शाळेने आजूबाजूच्या शाळा/शैक्षणिक संस्था आणि अंगणवाड्यांमधील शिक्षक आणि विद्यार्थी दोघांच्या अध्ययन अध्यापन अनुभूतींची देवाणघेवाण केल्याने फायदा झाला आहे."
      }, {
        text: "लागू नाही"
      }],
      hasEvidence: true
    },
    en: {
      orangeDesc: "1.7.7 Inter-school visits for teachers and students are organized for an enriched learning experience.",
      options: [{
        text: "1.1 The school has planned mutual visits of teachers and students with neighboring schools/educational institutions and Anganwadis."
      }, {
        text: "2.1 Teachers organize learning-teaching experience exchange programs with nearby schools.",
        isGreen: true
      }, {
        text: "3.1 Several joint activities are implemented in cooperation with surrounding schools/educational institutions and Anganwadis, such as joint sports day, art exhibition, eco club and other subject circles for students, hackathon teams, science exhibitions, 'Ek Bharat Shreshtha Bharat' initiative, etc."
      }, {
        text: "4.1 The school has benefited from exchanging learning-teaching experiences of both teachers and students from neighboring schools/educational institutions and Anganwadis."
      }, {
        text: "Not Applicable"
      }],
      hasEvidence: true
    }
  },
  36: {
    mr: {
      orangeDesc: "१.८.१ विद्यार्थ्यांना त्यांच्या करिअर मार्गदर्शन, मानसिक आरोग्य आणि भावनिक आरोग्याशी संबंधित समस्यांचे निराकरणासाठी समुपदेशक उपलब्ध करून दिले जातात.",
      options: [{
        text: "१.१ शाळेमध्ये विद्यार्थ्यांना त्यांच्या करिअर मार्गदर्शन, मानसिक आरोग्य आणि भावनिक आरोग्याशी संबंधित समस्यांमध्ये समुपदेशन केले जाते .",
        isGreen: true
      }, {
        text: "२.१ शाळेमध्ये समुपदेशकाची व्यवस्था आहे.\n२.२ समुपदेशक प्रत्येकाचे वैयक्तिक समुपदेशन करतात."
      }, {
        text: "३.१ पालकांना त्यांच्या पाल्याबद्दल माहिती दिली जाते आणि त्यांच्या मुलाचे मानसिक आरोग्य आणि कल्याण सुनिश्चित करण्यासाठी शाळेच्या प्रयत्नांना पाठिंबा देण्यात पालकांचा सहभाग असतो."
      }, {
        text: "४.१ गट/वर्ग समुपदेशन नियमितपणे आयोजित केले जाते.\n४.२ मुलांना मानसिक आरोग्याच्या समस्यांच्या लक्षणांबद्दल तात्काळ माहिती दिली जाते. विद्यार्थी यासाठी सहाय्य मागू शकतात असे शिक्षक/विद्यार्थी संबंध प्रस्थापित केले आहेत."
      }, {
        text: "लागू नाही"
      }],
      hasEvidence: true
    },
    en: {
      orangeDesc: "1.8.1 Counselors are made available to students to address issues related to their career guidance, mental health, and emotional well-being.",
      options: [{
        text: "1.1 Students are provided counseling in the school for issues related to their career guidance, mental health, and emotional well-being.",
        isGreen: true
      }, {
        text: "2.1 There is an arrangement for a counselor in the school.\n2.2 The counselor conducts individual counseling for everyone."
      }, {
        text: "3.1 Parents are informed about their children, and parents are involved in supporting the school's efforts to ensure their child's mental health and well-being."
      }, {
        text: "4.1 Group/class counseling is organized regularly.\n4.2 Children are promptly informed about the symptoms of mental health issues. Teacher-student relations are established so that students can seek help for this."
      }, {
        text: "Not Applicable"
      }],
      hasEvidence: true
    }
  },
  37: {
    mr: {
      orangeDesc: "१.९.१ शिक्षक शालेय शिक्षणामध्ये गुणात्मक सुधारणा घडवून आणण्यासाठी अध्ययन आणि अध्यापन, अध्ययन-अध्यापन साधनांचा विकास (TLM), आणि शिक्षक क्षमता विकसन उपक्रम या क्षेत्रांशी संबंधित नवीन विषय/घटक इत्यादींमध्ये नाविन्यपूर्ण प्रकल्प हाती घेतात.",
      options: [{
        text: "१.१ शाळेने गेल्या वर्षभरात अध्ययन अध्यापनाची गुणवत्ता सुधारण्यासाठी एक नाविन्यपूर्ण /अभिनव प्रकल्प हाती घेतला आहे.",
        isGreen: true
      }, {
        text: "२.१ शालेय शिक्षणामध्ये गुणात्मक सुधारणा घडवून आणण्यासाठी, अध्यापन आणि अध्ययन, TLM विकास आणि शिक्षक क्षमता विकसन उपक्रम या क्षेत्रांमध्ये शाळा सतत नाविन्यपूर्ण प्रकल्प राबवत असते."
      }, {
        text: "३.१ शिक्षक शालेय शिक्षणात गुणात्मक सुधारणा घडवून आणण्यासाठी अध्ययन आणि अध्यापन इत्यादींमध्ये राबविल्या जाणाऱ्या नाविन्यपूर्ण प्रकल्पांमध्ये सहभागी होण्यासाठी शाळा समुदाय आणि इतर भागधारकांना शिक्षक प्रोत्साहित करतात."
      }, {
        text: "४.१ शालेय शिक्षणात नविण्यपूर्ण प्रकल्पांच्या अंमलबजावणीमुळे शालेय शिक्षणात गुणात्मक सुधारणा झालेली आहे."
      }, {
        text: "लागू नाही"
      }],
      hasEvidence: true
    },
    en: {
      orangeDesc: "1.9.1 Teachers undertake innovative projects related to fields such as learning and teaching, development of teaching-learning materials (TLM), and teacher capacity building initiatives to bring about qualitative improvement in school education.",
      options: [{
        text: "1.1 The school has undertaken an innovative/novel project to improve the quality of learning and teaching over the past year.",
        isGreen: true
      }, {
        text: "2.1 The school continuously implements innovative projects in the areas of teaching and learning, TLM development, and teacher capacity building to bring about qualitative improvement in school education."
      }, {
        text: "3.1 Teachers encourage the school community and other stakeholders to participate in innovative projects implemented in learning and teaching to bring about qualitative improvement in school education."
      }, {
        text: "4.1 Qualitative improvement has been achieved in school education due to the implementation of innovative projects in school education."
      }, {
        text: "Not Applicable"
      }],
      hasEvidence: true
    }
  },
  38: {
    mr: {
      orangeDesc: "१.१०.१ शिक्षक विद्यार्थ्यांना चिकित्सक विचार, सर्जनशीलता, समस्या-निराकरण कौशल्ये आणि डिझाइन थिंकिंग स्किल आत्मसात करण्यासाठी मार्गदर्शन करतात, ज्यामुळे त्यांना विविध सामाजिक-आर्थिक आव्हानांना सामोरे जाऊन त्यावर उपाय शोधता येतात.",
      options: [{
        text: "१.१ शाळा वरील क्षमतांच्या विकसनासाठी उपक्रमाची आखणी करते."
      }, {
        text: "२.१ शाळा वरील क्षमता विकसनाच्या उपक्रमांची अंमलबजावणी करते"
      }, {
        text: "३.१ विद्यार्थी वरील कौशल्यांवर आधारित प्रकल्प हाती घेतात."
      }, {
        text: "४.१ शाळा विविध सामाजिक,आर्थिक आव्हानांना सामोरे जाण्यासाठी लागणाऱ्या क्षमता विकासासाठी विद्यार्थ्यांना संधी देते व विद्यार्थी अशा आव्हानांना सामोरे जाऊन त्यावर उपाय शोधतात.",
        isGreen: true
      }, {
        text: "लागू नाही"
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/"
    },
    en: {
      orangeDesc: "1.10.1 Teachers guide students to acquire critical thinking, creativity, problem-solving skills, and design thinking skills, enabling them to face various socio-economic challenges and find solutions.",
      options: [{
        text: "1.1 The school plans activities for the development of the above competencies."
      }, {
        text: "2.1 The school implements activities for the development of the above competencies."
      }, {
        text: "3.1 Students undertake projects based on the above skills."
      }, {
        text: "4.1 The school provides opportunities for students to develop capacity needed to face various socio-economic challenges, and students face such challenges and find solutions.",
        isGreen: true
      }, {
        text: "Not Applicable"
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/"
    }
  },
  39: {
    mr: {
      orangeDesc: "१.१०.२ माहिती साक्षरता, माध्यम साक्षरता आणि तंत्रज्ञान साक्षरता या एकविसाव्या शतकातील कौशल्यांमध्ये शिकणारे विद्यार्थी निष्णात आहेत.",
      options: [{
        text: "१.१ एकविसाव्या शतकातील शिकण्याची कौशल्ये पूर्ण करण्यासाठी शाळा विविध उपक्रमाची आखणी करते."
      }, {
        text: "२.१ एकविसाव्या शतकातील शिकण्याच्या कौशल्यांमध्ये निष्णात होण्यासाठी विद्यार्थ्यांना संधी आणि संसाधने शाळा उपलब्ध करून देते. (जसे की मीडिया हाऊस, CSO, टेक कंपन्या इ. सह एक्सपोजर/सहयोग)"
      }, {
        text: "३.१ विद्यार्थी एकविसाव्या शतकातील कौशल्यांवर आधारित प्रकल्प हाती घेतात."
      }, {
        text: "४.१ विद्यार्थी एकविसाव्या शतकातील कौशल्यांमध्ये निष्णात होऊन त्याचा दैनंदिन जीवनात वापर करतात.",
        isGreen: true
      }, {
        text: "लागू नाही"
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/1AqFM-"
    },
    en: {
      orangeDesc: "1.10.2 Learning students are proficient in 21st-century skills such as information literacy, media literacy, and technology literacy.",
      options: [{
        text: "1.1 The school plans various activities to fulfill 21st-century learning skills."
      }, {
        text: "2.1 The school provides opportunities and resources to students to become proficient in 21st-century learning skills (such as exposure/collaboration with media houses, CSOs, tech companies, etc.)."
      }, {
        text: "3.1 Students undertake projects based on 21st-century skills."
      }, {
        text: "4.1 Students become proficient in 21st-century skills and apply them in their daily lives.",
        isGreen: true
      }, {
        text: "Not Applicable"
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/1AqFM-"
    }
  },
  40: {
    mr: {
      orangeDesc: "१.११.१ शाळा नागरिकत्व कौशल्ये,संविधानातील मूल्ये आणि मूलभूत कर्तव्यांबद्दलच्या जबाबदारीचे ज्ञान आणि समज वाढवते.",
      options: [{
        text: "१.१ शाळेच्या ग्रंथालयात विविध मूल्यांवर आधारित पुस्तके, संदर्भ ग्रंथ उपलब्ध आहेत."
      }, {
        text: "२.१ शाळा वर्गातील कृती कार्यक्रमात व अध्यापनात भारताचा वारसा, संस्कृती, सभ्यता, भारतीय मूल्यांचे ज्ञान याची दखल घेते.",
        isGreen: true
      }, {
        text: "३.१ विद्यार्थी नागरिकत्व कौशल्ये आणि संविधानातील मूल्ये यांच्या संवर्धनावर आणि मूलभूत कर्तव्यांबद्दलचे ज्ञान समजून घेण्यासाठी प्रकल्प कार्याचे आयोजन करतात. उदा. 'एक भारत श्रेष्ठ भारत' अंतर्गत विविध उपक्रम हाती घेतले जातात."
      }, {
        text: "४.१ विद्यार्थी हे पालक आणि समुदाय सदस्यांसाठी संविधानातील मूल्ये आणि नागरिकत्व कौशल्ये, निवडणूक अधिकार आणि कर्तव्ये इत्यादींबद्दल जागरूकता कार्यक्रमांचे आयोजन करतात.\n४.२ विद्यार्थी जबाबदारीने वर्तन करतात."
      }, {
        text: "लागू नाही"
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/"
    },
    en: {
      orangeDesc: "1.11.1 The school enhances knowledge and understanding of citizenship skills, constitutional values, and responsibility towards fundamental duties.",
      options: [{
        text: "1.1 Books and reference materials based on various values are available in the school library."
      }, {
        text: "2.1 The school takes note of India's heritage, culture, civilization, and knowledge of Indian values in classroom activities and teaching.",
        isGreen: true
      }, {
        text: "3.1 Students organize project work to promote citizenship skills and constitutional values and to understand knowledge of fundamental duties. e.g., various activities are undertaken under 'Ek Bharat Shreshtha Bharat'."
      }, {
        text: "4.1 Students organize awareness programs for parents and community members about constitutional values, citizenship skills, electoral rights, and duties.\n4.2 Students behave responsibly."
      }, {
        text: "Not Applicable"
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/"
    }
  },
  41: {
    mr: {
      orangeDesc: "१.११.२ शाळा भारताचे ज्ञान सर्व स्तरांवर समाविष्ट करते.",
      options: [{
        text: "१.१ शाळेत भारतीय ज्ञान एकात्मिक करणारा वार्षिक अभ्यासक्रम आणि अध्यापन योजनेचा आराखडा उपलब्ध आहे."
      }, {
        text: "२.१ शिक्षक, कर्मचारी, विद्यार्थी आणि पालकांसह भारताचे ज्ञान एकत्रित करणारा वार्षिक अभ्यासक्रम आणि शैक्षणिक योजना सामायिक करण्यासाठी बैठका /कार्यशाळा/ सेमिनार आयोजित केले जातात."
      }, {
        text: "३.१ शिक्षक वर्गातील उपक्रमांमध्ये भारतातील ज्ञानाचे पैलू एकत्रित करून अध्ययन-अध्यापन पद्धतींमध्ये स्वतः सहभागी होतात.",
        isGreen: true
      }, {
        text: "४.१ विद्यार्थी त्यांचे भारतीय आचार आणि संस्कृतीचे ज्ञान प्रदर्शित करणारे प्रकल्प आयोजित करतात."
      }, {
        text: "लागू नाही"
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/1AzzHAC6yF86DB_wvMa5YniMzQ7"
    },
    en: {
      orangeDesc: "1.11.2 The school integrates knowledge of India at all levels.",
      options: [{
        text: "1.1 An annual curriculum and teaching plan framework integrating Indian knowledge is available in the school."
      }, {
        text: "2.1 Meetings/workshops/seminars are organized to share the annual curriculum and educational plan integrating knowledge of India with teachers, staff, students, and parents."
      }, {
        text: "3.1 Teachers integrate aspects of Indian knowledge into classroom activities and actively participate in teaching-learning methods.",
        isGreen: true
      }, {
        text: "4.1 Students organize projects demonstrating their knowledge of Indian ethos and culture."
      }, {
        text: "Not Applicable"
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/1AzzHAC6yF86DB_wvMa5YniMzQ7"
    }
  },
  42: {
    mr: {
      orangeDesc: "१.११.३ शाळा वर्तमान घडामोडींची जागरूकता आणि समज तसेच स्थानिक समुदाय, राज्ये, देश आणि जग सामोरे जात असलेल्या गंभीर समस्यांचे ज्ञान सुनिश्चित करते.",
      options: [{
        text: "१.१ शाळा वरील समस्यांच्या निरकरणासाठी उपक्रमाची आखणी करते."
      }, {
        text: "२.१ उपक्रमामध्ये विद्यार्थी, शिक्षक, पालक सहभागी होतात."
      }, {
        text: "३.१ विद्यार्थी या समस्यांच्या तीव्रता कमी करण्यासाठी जागरूक राहून प्रकल्पांचे आयोजन करतात."
      }, {
        text: "४.१ विद्यार्थ्यांच्या उपक्रमाची दखल जिल्हा, राज्य, राष्ट्रीय पातळीवर घेतली आहे.",
        isGreen: true
      }, {
        text: "लागू नाही"
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/1B4foWsK49NCKVQ3aeW7vkbJa-2PzgKT1"
    },
    en: {
      orangeDesc: "1.11.3 The school ensures awareness and understanding of current affairs and knowledge of critical issues facing the local community, states, country, and the world.",
      options: [{
        text: "1.1 The school plans activities to address the above issues."
      }, {
        text: "2.1 Students, teachers, and parents participate in the activities."
      }, {
        text: "3.1 Students organize projects to create awareness and mitigate the severity of these issues."
      }, {
        text: "4.1 Students' initiatives are recognized at the district, state, and national levels.",
        isGreen: true
      }, {
        text: "Not Applicable"
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/1B4foWsK49NCKVQ3aeW7vkbJa-2PzgKT1"
    }
  },
  43: {
    mr: {
      orangeDesc: "१.१२.१ शिक्षक - आशय, संकल्पना, साहित्य, अध्यापन पद्धती इ. बाबत अद्ययावत राहतात.",
      options: [{
        text: "१.१ शिक्षक विषयातील आशय, संकल्पना, नाविन्यपूर्ण अध्यापन पद्धती यांचे विविध स्त्रोतातून वाचन करतात व बदल जाणून घेतात."
      }, {
        text: "२.१ शिक्षक वाचलेल्या माहितीचा अध्ययन अध्यापनात वापर करतात व विद्यार्थ्यांना जाणून घेण्याविषयी प्रोत्साहन देतात."
      }, {
        text: "३.१ शिक्षक वाचलेली माहिती केंद्र परिषदेमध्ये, तालुका, जिल्हास्तर प्रशिक्षणात इतर शिक्षकांबरोबर सामायिक करतात.",
        isGreen: true
      }, {
        text: "४.१ शिक्षक विविध शैक्षणिक मासिक, वर्तमानपत्रे, यामध्ये शैक्षणिक बदल, आशय, शैक्षणिक साधने, उपाययोजना याविषयी लेखन करतात"
      }, {
        text: "लागू नाही"
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/1BEC9VEznb7zcTuNuLJUrm5V52P1"
    },
    en: {
      orangeDesc: "1.12.1 Teachers stay updated regarding content, concepts, materials, pedagogy, etc.",
      options: [{
        text: "1.1 Teachers read about subject content, concepts, and innovative pedagogy from various sources and understand changes."
      }, {
        text: "2.1 Teachers use the read information in teaching-learning and encourage students to learn/explore."
      }, {
        text: "3.1 Teachers share the read information with other teachers in cluster conferences, block, and district level trainings.",
        isGreen: true
      }, {
        text: "4.1 Teachers write about educational changes, content, teaching aids, and solutions in various educational magazines and newspapers."
      }, {
        text: "Not Applicable"
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/1BEC9VEznb7zcTuNuLJUrm5V52P1"
    }
  },
  44: {
    mr: {
      orangeDesc: "१.१२.२ शिक्षक विविध स्तरावर अभ्यासक्रम, उपक्रम निर्मिती, मोड्यूल निर्मिती, शैक्षणिक साहित्य निर्मिती, प्रशिक्षणात मार्गदर्शक म्हणून योगदान देतात.",
      options: [{
        text: "१.१ शिक्षक शाळा स्तरावर मोड्यूल, उपक्रम निर्मिती, शैक्षणिक साहित्य निर्मिती, नाविन्यपूर्ण योजना, प्रशिक्षणात मार्गदर्शक म्हणून योगदान देतात."
      }, {
        text: "२.१ शिक्षक केंद्र/तालुका स्तरावर मोड्यूल, उपक्रम निर्मिती, शैक्षणिक साहित्य निर्मिती, नाविन्यपूर्ण योजना, प्रशिक्षणात मार्गदर्शक म्हणून योगदान देतात.",
        isGreen: true
      }, {
        text: "३.१ शिक्षक जिल्हा स्तरावर मोड्यूल, उपक्रम निर्मिती, शैक्षणिक साहित्य निर्मिती, नाविन्यपूर्ण योजना, प्रशिक्षणात मार्गदर्शक म्हणून योगदान देतात."
      }, {
        text: "४.१ शिक्षक राज्य/देश स्तरावर अभ्यासक्रम,उपक्रम निर्मिती, मोड्यूल निर्मिती, शैक्षणिक साहित्य निर्मितीत, प्रशिक्षणात मार्गदर्शक म्हणून योगदान देतात."
      }, {
        text: "लागू नाही"
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/1BEOr8fEBiyAs9r3KiD9w5wAM9UgLRI80"
    },
    en: {
      orangeDesc: "1.12.2 Teachers contribute as mentors/guides in curriculum development, activity creation, module design, teaching aid preparation, and training at various levels.",
      options: [{
        text: "1.1 Teachers contribute as guides in module design, activity creation, teaching aid preparation, innovative schemes, and training at the school level."
      }, {
        text: "2.1 Teachers contribute as guides in module design, activity creation, teaching aid preparation, innovative schemes, and training at the cluster/block level.",
        isGreen: true
      }, {
        text: "3.1 Teachers contribute as guides in module design, activity creation, teaching aid preparation, innovative schemes, and training at the district level."
      }, {
        text: "4.1 Teachers contribute as guides in curriculum development, activity creation, module design, and teaching aid preparation at the state/national level."
      }, {
        text: "Not Applicable"
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/1BEOr8fEBiyAs9r3KiD9w5wAM9UgLRI80"
    }
  },
  45: {
    mr: {
      orangeDesc: "२.१.१ शिकण्यास पुरेसा अनुकूल वर्गखोल्या आहेत आणि शाळेने एका सत्रात विद्यमान पायाभूत सुविधांचे बळकटीकरण करण्याचे नियोजन केले आहे.",
      options: [{
        text: "१.१ शिक्षक व विद्यार्थी यांच्या प्रमाणात वर्गखोल्या उपलब्ध आहेत .\n१.२ शाळेत (अडथळाविरहीत )प्रवेश करण्यास सुलभ वर्गखोल्या आहेत ."
      }, {
        text: "२.१ सहशालेय उपक्रमासाठी वर्गखोल्यांचा बहुउद्देशीय वापर केला जातो .\n२.२ शालेय परिसराचा सहशालेय उपक्रमासाठी उपयोग केला जातो.",
        isGreen: true
      }, {
        text: "३.१ शाळेकडे ग्रंथालय, प्रयोगशाळा, मनोरंजक कार्यक्रमासाठी किमान एक तरी जादा वर्गखोली उपलब्ध आहे.\n३.२ विद्यार्थ्यांना बसण्यास आरामदायी व पुरेशी जागा उपलब्ध आहे.\n३.३ वर्गखोली , व्हरांडा व जिना येथील जागा विद्यार्थ्यांना वावरण्यास सुरक्षित आहेत. (विशेषतः CWSN विद्यार्थ्यांसाठी)"
      }, {
        text: "४.१ ग्रंथालय, विज्ञान कक्ष, संगणक कक्ष इ.साठी स्वतंत्र वर्गखोली आहे.\n४.२ सामुदायिक उपक्रमासाठी सर्व सोयींनीयुक्त हॉल उपलब्ध आहे .\n४.३ शाळेच्या दर्शनी भागात दिशादर्शक फलक उपलब्ध आहे.\n४.४ शाळा नेहमी पायाभूत सुविधांचा आढावा घेते. (विशेषतः CWSN विद्यार्थ्यांसाठी)"
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/1BIif3LRYwTja0hAH_CQECKdIsfBI4sE0"
    },
    en: {
      orangeDesc: "2.1.1 There are adequate conducive classrooms for learning, and the school has planned to strengthen existing infrastructure within a session.",
      options: [{
        text: "1.1 Classrooms are available in proportion to teachers and students.\n1.2 The school has barrier-free accessible entry to classrooms."
      }, {
        text: "2.1 Classrooms are used multi-purposefully for co-curricular activities.\n2.2 The school premises are used for co-curricular activities.",
        isGreen: true
      }, {
        text: "3.1 The school has at least one additional classroom available for library, laboratory, and recreational programs.\n3.2 Safe and comfortable seating space is available for students.\n3.3 Classroom, veranda, and staircase spaces are safe for students to move around (especially for CWSN students)."
      }, {
        text: "4.1 There are separate classrooms for library, science room, computer room, etc.\n4.2 A well-equipped hall is available for community activities.\n4.3 Directional signage boards are available in front of the school.\n4.4 The school regularly reviews infrastructure (especially for CWSN students)."
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/1BIif3LRYwTja0hAH_CQECKdIsfBI4sE0"
    }
  },
  46: {
    mr: {
      orangeDesc: "२.१.२ शाळेत मुले, मुली, ट्रान्स जेन्डर व CWSN यांच्यासाठी पुरेशा प्रमाणात स्वतंत्र शौचालय उपलब्ध आहेत. स्वच्छतागृहासाठी मुबलक पाणी उपलब्ध असून सर्व स्वच्छतागृहे वापरण्यास योग्य आहेत.",
      options: [{
        text: "१.१ शाळेत मुले, मुली, ट्रान्स जेन्डर व CWSN यांच्यासाठी पुरेशा प्रमाणात स्वतंत्र शौचालय उपलब्ध आहेत.\n१.२. Hand Wash स्टेशन अथवा हात धुण्याची सोय विशिष्ठ जागी केली आहे."
      }, {
        text: "२.१ स्वच्छतागृहाची नियमित देखभाल व स्वच्छता केली जाते.\n२.२ स्वच्छतागृहाच्या वापराबाबत सर्व विद्यार्थी दक्ष आहेत.\n२.३ स्वच्छतागृहात पाण्याचा वापर काटकसरीने करतात.\n२.४ CWSN विद्यार्थ्यांसाठी स्वतंत्र स्वच्छतागृहाची सोय उपलब्ध आहे.",
        isGreen: true
      }, {
        text: "३.१ स्वच्छतागृहाचा नियमित वापर करतात.\n३.२ स्वच्छतागृह दिवसातून किमान एकदा स्वच्छ केले जाते. त्यासाठी पुरेशे पाणी उपलब्ध आहे.\n३.३ स्वच्छतागृहाची वेळोवेळी देखभाल व दुरुस्ती केली जाते."
      }, {
        text: "४.१ शाळेकडे परिपूर्ण सुविधा व वाहत्या पाण्यासहित स्वच्छतागृह उपलब्ध आहे.\n४.२ शाळेने स्वच्छतादूताची नेमणूक केली आहे.\n४.३ स्वच्छतागृह नियमित वापरा बाबत स्वच्छतादूतामार्फत जाणीव जागृती केली आहे."
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/1BNbNlPiiEFUalREG0f6ETG1fBEIiXeWm"
    },
    en: {
      orangeDesc: "2.1.2 The school has adequate separate toilets for boys, girls, transgender, and CWSN students. Sufficient water is available for the toilets, and all toilets are fit for use.",
      options: [{
        text: "1.1 The school has adequate separate toilets for boys, girls, transgender, and CWSN students.\n1.2 Hand wash stations or handwashing facilities are provided at specific locations."
      }, {
        text: "2.1 Regular maintenance and cleaning of toilets are conducted.\n2.2 All students are mindful of toilet usage.\n2.3 Water is used economically in toilets.\n2.4 Separate toilet facility is available for CWSN students.",
        isGreen: true
      }, {
        text: "3.1 Toilets are used regularly.\n3.2 Toilets are cleaned at least once a day, and sufficient water is available for this.\n3.3 Regular maintenance and repair of toilets are carried out."
      }, {
        text: "4.1 The school has well-equipped toilets with running water.\n4.2 The school has appointed a cleanliness ambassador (Swachhtadoot).\n4.3 Cleanliness ambassadors create awareness regarding regular toilet usage."
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/1BNbNlPiiEFUalREG0f6ETG1fBEIiXeWm"
    }
  },
  47: {
    mr: {
      orangeDesc: "२.१.३ शाळेत ग्रंथालय सुविधा उपलब्ध आहे. नसेल तर समाज सहभाग /इतर संस्थेकडील ग्रंथालय/शेजारील ग्रंथालयांचा वापर करतात.",
      options: [{
        text: "१.१ शाळेत स्वतंत्र ग्रंथालय आहे. नसेल तर ग्रंथालय पेट्यांचा वापर केला जातो.\n१.२ ग्रंथालयात विद्यार्थ्यांच्या प्रमाणात पुरेशी पुस्तके उपलब्ध आहेत.",
        isGreen: true
      }, {
        text: "२.१ शाळेत ग्रंथालयातील पुस्तकांची देव-घेव रजिस्टर मध्ये नोंद घेतली जाते.\n२.२ ग्रंथालयामध्ये सर्व धर्म, जात, वंश, लिंग इत्यादी बाबींचा आदर करणाऱ्या पुस्तकांचा समावेश आहे.\n२.३ शिक्षक व विद्यार्थी ग्रंथालयातील पुस्तकांचा वापर नियमितपणे करतात.\n२.४ किमान ५०% विद्यार्थी पुस्तके वाचन करतात.\n२.५ शाळा मासिक/ साप्ताहिक यांची वर्गणीदार आहे."
      }, {
        text: "३.१ शाळेत स्वतंत्र ग्रंथालय व वाचन खोली उपलब्ध आहे.\n३.२ ग्रंथालयातील पुस्तके विद्यार्थ्यांच्या गरजेनुसार वयोगटानुसार अद्ययावत ठेवली जातात.\n३.३ ग्रंथालयातील पुस्तकांचा वापर अध्ययन-अध्यापनात केला जातो.\n३.४ किमान ७५% विद्यार्थी पुस्तके वाचन करतात.\n३.५ विशेष गरजा असलेल्या विद्यार्थ्यांसाठी ऑडिओ बुक, ब्रेल बुक इ. उपलब्ध आहेत."
      }, {
        text: "४.१ शाळेत विद्यार्थ्यांसाठी व शिक्षकांसाठी आंतरजाल, ई- पुस्तक, डिजिटल साहित्य उपलब्ध आहे.\n४.२ ग्रंथालयातील सुविधे बाबत विद्यार्थ्यांच्या सूचनेचा विचार केला जातो.\n४.३ पालक ग्रंथालयाचा वापर करतात.\n४.४ ग्रंथालयासाठी लोक सहभागातून पुस्तके भेट दिली जातात.\n४.५ सर्व विद्यार्थी ग्रंथालयाचा नियमितपणे वापर करतात.\n४.६ विद्यार्थी, शिक्षक, कर्मचारी यांच्या गरजेनुसार वेळोवेळी पुस्तके खरेदी केली जातात."
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/1BRFLbCAFmMVPugTfijIojtRiMfmTS-PC"
    },
    en: {
      orangeDesc: "2.1.3 The school has a library facility. If not, they use community libraries/libraries of other institutions/neighboring libraries.",
      options: [{
        text: "1.1 The school has a separate library. If not, library boxes are used.\n1.2 Sufficient books are available in proportion to the number of students.",
        isGreen: true
      }, {
        text: "2.1 Register entries are maintained for issuing and receiving library books.\n2.2 The library includes books respecting all religions, castes, creeds, genders, etc.\n2.3 Teachers and students use library books regularly.\n2.4 At least 50% of students read books.\n2.5 The school subscribes to monthly/weekly periodicals."
      }, {
        text: "3.1 A separate library and reading room are available in the school.\n3.2 Library books are updated according to the age group and needs of students.\n3.3 Library books are utilized in learning and teaching.\n3.4 At least 75% of students read books.\n3.5 Audiobooks, braille books, etc., are available for students with special needs."
      }, {
        text: "4.1 Internet, e-books, and digital content are available for students and teachers in the library.\n4.2 Students' suggestions regarding the library facility are considered.\n4.3 Parents utilize the library.\n4.4 Books are donated to the library through public participation.\n4.5 All students utilize the library regularly.\n4.6 Books are purchased from time to time based on the needs of students, teachers, and staff."
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/1BRFLbCAFmMVPugTfijIojtRiMfmTS-PC"
    }
  },
  48: {
    mr: {
      orangeDesc: "२.१.४ भाषा/गणित/ विज्ञान इ. विषयासाठी अद्ययावत व सुसज्ज प्रयोगशाळा उपलब्ध आहे",
      options: [{
        text: "१.१ भाषा, गणित, विज्ञान प्रयोगशाळा उपलब्ध आहे.\n१.२ भाषापेटी, विज्ञानपेटी, गणितपेटी उपलब्ध आहे.\n१.३ शाळेत भाषा कोपरा, विज्ञान कोपरा, गणित कोपरा आहे."
      }, {
        text: "२.१भाषापेटी, विज्ञानपेटी, गणितपेटी यांचा वापर अध्ययन अध्यापनात केला जातो.\n२.२ प्रयोगशाळेतील साहित्य वापरून प्रयोग केले जातात. विद्यार्थ्यांना प्रयोग करण्याची संधी दिली जाते.",
        isGreen: true
      }, {
        text: "३.१ सुसज्ज प्रयोगशाळा शाळेकडे उपलब्ध आहे.\n३.२ विद्यार्थी व शिक्षक यांना प्रयोगशाळेतील विविध रसायने व साहित्य वापराचे ज्ञान आहे.\n३.३ दिव्यांग विद्यार्थ्यांना इतर विद्यार्थ्यांच्या मदतीने ज्यादा वेळ देऊन प्रयोग करण्याची संधी दिली जाते.\n३.४ शाळेत गणित व विज्ञान मंडळाची स्थापना केली आहे."
      }, {
        text: "४.१ प्रयोगशाळेत पूर्णवेळ प्रयोगशाळा परिचारक यांची नियुक्ती केले आहे. नसल्यास पर्यायी व्यवस्था केली आहे.\n४.२ प्रयोगशाळेत सर्व सुरक्षितता दर्शविणारे फलक लावले आहेत.\n४.३ प्रयोगशाळा सुरक्षिततेचे सर्व निकष शाळा पूर्ण करते.\n४.४ प्रयोगशाळेबाबत विद्यार्थी व शिक्षक यांचे अभिप्राय घेतले जातात."
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/1BSFEEs7Jc-jvnO_UFbl16jZEXgQIvV4r"
    },
    en: {
      orangeDesc: "2.1.4 An updated and well-equipped laboratory is available for languages/mathematics/science etc.",
      options: [{
        text: "1.1 Language, mathematics, and science laboratories are available.\n1.2 Language kits, science kits, and mathematics kits are available.\n1.3 There are language, science, and mathematics corners in the school."
      }, {
        text: "2.1 Language kits, science kits, and mathematics kits are utilized in learning and teaching.\n2.2 Experiments are conducted using laboratory materials. Students are given opportunities to perform experiments.",
        isGreen: true
      }, {
        text: "3.1 A well-equipped laboratory is available in the school.\n3.2 Students and teachers have knowledge of using various chemicals and materials in the laboratory.\n3.3 Students with special needs (Divyang) are given extra time and help from other students to perform experiments.\n3.4 Mathematics and science clubs are established in the school."
      }, {
        text: "4.1 A full-time laboratory assistant is appointed. If not, alternative arrangements are made.\n4.2 Safety signs and boards are displayed in the laboratory.\n4.3 The school meets all safety criteria for the laboratory.\n4.4 Feedback is collected from students and teachers regarding the laboratory."
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/1BSFEEs7Jc-jvnO_UFbl16jZEXgQIvV4r"
    }
  },
  49: {
    mr: {
      orangeDesc: "२.१.५ शाळा आणि शालेय व्यवस्थापन यांना साह्यभूत होण्यासाठी संगणक व ICT सुविधेचा वापर केला जातो.",
      options: [{
        text: "१.१ शिक्षक व विद्यार्थी यांच्या उपयोगासाठी पुरेशा प्रमाणात संगणक व ICT सुविधा उपलब्ध आहे"
      }, {
        text: "२.१ शिक्षक व विद्यार्थी संगणक व ICT चा अध्ययन - अध्यापनात वापर करतात.\n२.२ शाळेत आंतरजाल सुविधा (इंटरनेट) उपलब्ध आहे.",
        isGreen: true
      }, {
        text: "३.१ शाळा अध्ययन- अध्यापनासाठी ई - साहित्याचा वापर करते.\n३.२ शाळा CWSN विद्यार्थ्यांचे शिकणे सुलभ व्हावे यासाठी अद्ययावत उपकरणांचा वापर करते."
      }, {
        text: "४.१ पालक सहभागातून संगणक व ICT सुविधेची बळकटीकरण केले जाते.\n४.२ शाळा सातत्याने संगणक व ICT सुविधेची देखभाल व दुरुस्ती करते.\n४.३ शाळेने विद्या अमृत पोर्टलवर व्हिडिओ अपलोड केले आहेत."
      }, {
        text: "लागू नाही"
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/"
    },
    en: {
      orangeDesc: "2.1.5 Computers and ICT facilities are used to support the school and school management.",
      options: [{
        text: "1.1 Sufficient computers and ICT facilities are available for the use of teachers and students."
      }, {
        text: "2.1 Teachers and students use computers and ICT in teaching and learning.\n2.2 Internet facility is available in the school.",
        isGreen: true
      }, {
        text: "3.1 The school uses e-content for teaching and learning.\n3.2 The school uses modern equipment to facilitate learning for CWSN students."
      }, {
        text: "4.1 Computer and ICT facilities are strengthened through parent contribution.\n4.2 The school continuously maintains and repairs computer and ICT facilities.\n4.3 The school has uploaded videos on the Vidya Amrit portal."
      }, {
        text: "Not Applicable"
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/"
    }
  },
  50: {
    mr: {
      orangeDesc: "२.१.६ कला, शिल्पकला, नृत्य, नाट्य, विविध मंडळे/क्लब यासाठी शाळेत पुरेशी जागा/ खोल्या आहेत.",
      options: [{
        text: "१.१ शाळा वर्गखोलीचा विविध कलागुणांसाठी वापर करते."
      }, {
        text: "२.१ शाळेतील वर्गखोलीची रचना व वापर विविध कला प्रकारानुसार केला जातो.\n२.२ कलागुणांच्या वापरासाठी असणाऱ्या खोल्या चांगल्या स्थितीत आहेत."
      }, {
        text: "३.१ शाळेत विविध क्लब स्थापन केले आहेत.\n३.२ शाळेतील विद्यार्थी विविध उपक्रमात नियमितपणे सहभागी होतात.\n३.३ कला, शिल्पकला, नृत्य, नाट्य, विविध मंडळे यांचे आयोजन करत असताना अध्ययन-अध्यापनात बाधा येऊ नये म्हणून काळजी घेतली जाते."
      }, {
        text: "४.१ शाळेत खुल्या जागेचा वापर विविध सहशालेय उपक्रमासाठी केला जातो.\n४.२ विद्यार्थ्यांच्या वयानुसार शाळेत विविध कलागुणांसाठीचे साहित्य उपलब्ध असून त्याचा वापर प्रभावीपणे केला जातो.",
        isGreen: true
      }, {
        text: "लागू नाही"
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/"
    },
    en: {
      orangeDesc: "2.1.6 The school has adequate space/rooms for art, craft, dance, drama, and various committees/clubs.",
      options: [{
        text: "1.1 The school utilizes classrooms for various artistic talents."
      }, {
        text: "2.1 Classrooms are designed and utilized according to different art forms.\n2.2 Rooms used for artistic activities are in good condition."
      }, {
        text: "3.1 Various clubs are established in the school.\n3.2 Students regularly participate in various activities.\n3.3 Care is taken to ensure that organizing art, craft, dance, drama, and various committees does not disrupt regular learning and teaching."
      }, {
        text: "4.1 Open space in the school is utilized for various co-curricular activities.\n4.2 Material for various artistic talents is available according to the age of students, and is used effectively.",
        isGreen: true
      }, {
        text: "Not Applicable"
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/"
    }
  },
  51: {
    mr: {
      orangeDesc: "२.२.१ शाळेमध्ये आवश्यकतेनुसार प्राचार्य/मुख्याध्यापक, कर्मचारी आणि प्रशासनासाठी पुरेशी जागा आहे.",
      options: [{
        text: "१.१ शाळेमध्ये मुख्याध्यापक कार्यालय आहे."
      }, {
        text: "२.१ मुख्याध्यापक, शिक्षक व शाळेमध्ये प्रशासकीय कर्मचाऱ्यांसाठी पुरेशी जागा उपलब्ध आहे."
      }, {
        text: "३.१ मुख्याध्यापक कार्यालय व्यतिरिक्त शिक्षकांसाठी व कर्मचाऱ्यांसाठी स्वतंत्र कक्ष उपलब्ध आहेत."
      }, {
        text: "४.१ मुख्याध्यापक कक्ष व इतर कक्ष स्वच्छ सुंदर, आकर्षक व कलात्मक दृष्ट्या सजवलेले आहेत (माझे कार्यालय सुंदर कार्यालय)\n४.२ शाळेचे कार्यालय ICT ने सज्ज आहे.\n४.३ कार्यालयामध्ये शालेय समित्यांचे फलक लावलेले आहेत.",
        isGreen: true
      }, {
        text: "लागू नाही"
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/1BdIKu70bm8qNmu65zrDEFH_Yq1"
    },
    en: {
      orangeDesc: "2.2.1 There is adequate space in the school for the principal/headmaster, staff, and administration as required.",
      options: [{
        text: "1.1 A headmaster's office is available in the school."
      }, {
        text: "2.1 Adequate space is available for the headmaster, teachers, and administrative staff."
      }, {
        text: "3.1 Apart from the headmaster's office, separate rooms are available for teachers and staff."
      }, {
        text: "4.1 The headmaster's office and other rooms are clean, beautiful, attractive, and artistically decorated (My Beautiful Office concept).\n4.2 The school office is equipped with ICT.\n4.3 School committee boards are displayed in the office.",
        isGreen: true
      }, {
        text: "Not Applicable"
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/1BdIKu70bm8qNmu65zrDEFH_Yq1"
    }
  },
  52: {
    mr: {
      orangeDesc: "२.३.१ विद्यार्थ्यांच्या शारीरिक व मानसिक आरोग्यासंबंधी शाळेला जाणीव असून आरोग्य सेवा आणि व्यवस्थापन सुविधा उपलब्ध आहेत.",
      options: [{
        text: "१.१ प्रथमोपचार पेटी आहे.\n१.२ आपत्कालीन परिस्थितीत आवश्यक औषधपुरवठा केला आहे.\n१.३ दर्शनी भागात आपत्कालीन वैद्यकीय सहाय्यता क्रमांक प्रकाशित केले आहेत.\n१.४ शाळेने दर्शनी भागात तंबाखू मुक्त परिसर असा फलक लावला आहे."
      }, {
        text: "२.१ वार्षिक आरोग्य तपासणी केली आहे.\n२.२ शिक्षक व विद्यार्थी यांनी प्रथमोपचाराचे प्रशिक्षण घेतले आहे.\n२.३ आरोग्यसेविका/ सेवकामार्फत प्रतिबंधात्मक तपासणी केली जात आहे.\n२.४ लसीकरण केले आहे.\n२.५ शाळेने तंबाखू मुक्त परिसर घोषित केला आहे.",
        isGreen: true
      }, {
        text: "३.१ आरोग्य तपासणीचे अहवाल पालकांच्या निदर्शनास आणून चर्चा केली जाते.\n३.२ पालकांच्या सूचना, विद्यार्थी आरोग्यविषयक तक्रारी समर्थनासह अद्यावत नोंदी केल्या जातात व पूर्तता केली जाते.\n३.३ मानसिक, शारीरिक आरोग्यासाठी समुपदेशन यंत्रणा उपलब्ध आहे.\n३.४ सर्व विद्यार्थ्यांचे 'आभाकार्ड' (ABHA) काढले आहे.\n३.५ तंबाखू मुक्त शाळा प्रमाणपत्र प्राप्त केले आहे."
      }, {
        text: "४.१ शाळेत आरोग्य सुधारणेला प्राधान्य असून त्याची अंमलबजावणी सुरू आहे.\n४.१ शाळेत हेल्थ अँड वेलनेस क्लब उपलब्ध आहे तसेच सामाजिक व शालेय आरोग्यासाठी सेवा पुरविली जाते.\n४.३ शाळेत प्राथमिक आरोग्य केंद्र किंवा तत्सम रुग्णालयाशी कराराद्वारे आरोग्यसेवक/सेविका उपलब्ध आहे.\n४.४ सॅनिटरी पॅड मशीनद्वारे पुरवले जातात."
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/1BfdrAOMZjkqLmBFyuG_TSKy4BGQtmXdy"
    },
    en: {
      orangeDesc: "2.3.1 The school is aware of the physical and mental health of students and health services and management facilities are available.",
      options: [{
        text: "1.1 First aid box is available.\n1.2 Necessary medicine supply is provided in emergency situations.\n1.3 Emergency medical assistance numbers are displayed in the visible area.\n1.4 The school has displayed a tobacco-free zone board in the visible area."
      }, {
        text: "2.1 Annual health check-up is conducted.\n2.2 Teachers and students have received training in first aid.\n2.3 Preventive check-ups are conducted by health worker/assistant.\n2.4 Vaccination is done.\n2.5 The school has declared a tobacco-free zone.",
        isGreen: true
      }, {
        text: "3.1 Health check-up reports are brought to the notice of parents and discussed.\n3.2 Up-to-date records are maintained and compliance is done with supporting evidence for parent suggestions and student health complaints.\n3.3 Counseling system is available for mental and physical health.\n3.4 'ABHA' cards have been generated for all students.\n3.5 Tobacco-free school certificate is obtained."
      }, {
        text: "4.1 Health improvement is prioritized in school and its implementation is ongoing.\n4.1 Health and Wellness Club is available in the school, and services are provided for social and school health.\n4.3 Health worker/assistant is available through an agreement with Primary Health Center or similar hospital.\n4.4 Sanitary pads are provided through machines."
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/1BfdrAOMZjkqLmBFyuG_TSKy4BGQtmXdy"
    }
  },
  53: {
    mr: {
      orangeDesc: "२.४.१ शाळा स्वच्छता आणि स्वच्छतेविषयी जाणीव जागृतीस चालना देते.",
      options: [{
        text: "१.१ शालेय परिसर स्वच्छ ठेवला आहे."
      }, {
        text: "२.१ स्वच्छतेसाठी पुरेसा प्रमाणात स्वच्छता साहित्य (साबण, जंतूनाशक, झाडू , ब्रश , बादल्या आणि मग इत्यादी साहित्य) उपलब्ध आहे."
      }, {
        text: "३.१ पुरुष व महिला यांच्यासाठी स्वतंत्र स्वच्छतागृह असून तसे बोर्ड लावलेले आहेत.",
        isGreen: true
      }, {
        text: "४.१ मासिक पाळी व्यवस्थापन (MHM) अंतर्गत मुलींसाठी सॅनिटरी पॅड डिस्पेंसर आहे.\n४.२ नियमितपणे पाणी व स्वच्छतेबाबत शाळा व्यवस्थापन समितीद्वारा तपासणी केली जाते.\n४.३ शौचालय स्वच्छ करण्यासाठी स्वच्छक (स्वीपर) नेमले आहेत."
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/1AEXMZSW5Qrbpwis74zoRg6FQn"
    },
    en: {
      orangeDesc: "2.4.1 The school promotes cleanliness and awareness about hygiene/cleanliness.",
      options: [{
        text: "1.1 School premises are kept clean."
      }, {
        text: "2.1 Adequate cleaning materials (soap, disinfectant, broom, brush, buckets and mugs, etc.) are available for cleanliness."
      }, {
        text: "3.1 Separate toilets are available for males and females, and signs/boards are put up.",
        isGreen: true
      }, {
        text: "4.1 Sanitary pad dispenser is available for girls under Menstrual Hygiene Management (MHM).\n4.2 Regular inspections regarding water and cleanliness are conducted by the School Management Committee.\n4.3 Cleaners (sweepers) are appointed to clean the toilets."
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/1AEXMZSW5Qrbpwis74zoRg6FQn"
    }
  },
  54: {
    mr: {
      orangeDesc: "२.४.२ शाळेत पिण्याचे सुरक्षित पाणी आणि पुरेसा स्वच्छतेच्या सुविधा उपलब्ध आहेत.",
      options: [{
        text: "१.१ शाळामध्ये पिण्यायोग्य पाण्याची सुविधा आहे."
      }, {
        text: "२.१ शाळांमध्ये पिण्यासाठी व वापरण्यासाठी स्वतंत्र पाणी व्यवस्था आहे.\n२.२ शाळेमध्ये सांडपाणी व्यवस्था आहे.",
        isGreen: true
      }, {
        text: "३.१ पाण्याची गुणवत्ता चाचणी वेळोवेळी केली जाते.\n३.२ साठवलेल्या पाण्याच्या साधनांची वेळोवेळी स्वच्छता केली जाते.\n३.३ पाण्याची निर्जंतुकीकरणाची साधने उपलब्ध आहेत. उदाहरणार्थ - फिल्टर, जंतुनाशक औषधे."
      }, {
        text: "४.१ जलशुद्धीकरण यंत्र सुविधा आहे.\n४.२ विद्यार्थी संख्येनुसार नळसंख्या उपलब्ध असून सहज वापरता येतील अशी रचना आहे.\n४.३ पिण्याचे पाणी, पुरेशी स्वच्छता, कचरा व्यवस्थापन इत्यादीची समिती मार्फत तपासणी केली जाते."
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/"
    },
    en: {
      orangeDesc: "2.4.2 Safe drinking water and adequate sanitation facilities are available in the school.",
      options: [{
        text: "1.1 Drinking water facility is available in the school."
      }, {
        text: "2.1 Separate water systems for drinking and other usage are available in the school.\n2.2 Wastewater management system is available in the school.",
        isGreen: true
      }, {
        text: "3.1 Water quality testing is conducted from time to time.\n3.2 Cleanliness of stored water resources is done periodically.\n3.3 Disinfection facilities/materials for water are available, e.g., filters, disinfectants."
      }, {
        text: "4.1 Water purification system (RO/filter) facility is available.\n4.2 Number of taps is available according to student strength, designed for easy access/use.\n4.3 Inspection of drinking water, adequate cleanliness, waste management, etc., is conducted by the committee."
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/"
    }
  },
  55: {
    mr: {
      orangeDesc: "२.५.१ शाळेमध्ये पुरेसे सुरक्षित, आरामदायक वयोमानानुसार आणि आकर्षक रचना केलेले फर्निचर आहे.",
      options: [{
        text: "१.१ विद्यार्थी आणि शिक्षक संख्येनुसार पुरेसे फर्निचर उपलब्ध आहे."
      }, {
        text: "२.१ फर्निचर सुरक्षित व आरामदायक, आकर्षक आहे."
      }, {
        text: "३.१ सहशालेय उपक्रमांच्या आयोजनासाठी शाळेकडे अतिरिक्त फर्निचर उपलब्ध असून त्याचा योग्य वापर केला जातो.",
        isGreen: true
      }, {
        text: "४.१.आवश्यकतेनुसार वेळोवेळी साहित्यामध्ये दुरुस्ती/ बदल केला जातो.\n४.२. SMC मार्फत फर्निचरचा आढावा घेतला जातो.\n४.३. CWSN विद्यार्थ्यांसाठी फर्निचर उपलब्ध आहे"
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/1C3Z8qJLmslU5GZeytuoPF5RrogZM"
    },
    en: {
      orangeDesc: "2.5.1 The school has adequate, safe, comfortable, age-appropriate, and attractively designed furniture.",
      options: [{
        text: "1.1 Sufficient furniture is available according to the number of students and teachers."
      }, {
        text: "2.1 Furniture is safe, comfortable, and attractive."
      }, {
        text: "3.1 Additional furniture is available in the school for organizing co-curricular activities and is used properly.",
        isGreen: true
      }, {
        text: "4.1 Repair/change in materials is made from time to time as per requirement.\n4.2 Furniture review is conducted through SMC.\n4.3 Furniture is available for CWSN students."
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/1C3Z8qJLmslU5GZeytuoPF5RrogZM"
    }
  },
  56: {
    mr: {
      orangeDesc: "२.६.१ शाळेमध्ये प्रकाश आणि वायुवीजन व्यवस्था आहे.",
      options: [{
        text: "१.१ वर्गखोल्यांमध्ये पुरेशी प्रकाश व्यवस्था आहे.\n१.२ सर्व उपकरणे कार्यरत आहेत."
      }, {
        text: "२.१ वर्गखोल्यांमध्ये नैसर्गिक प्रकाशव्यवस्था आणि खिडक्या आहेत.\n२.२ सर्व वर्गखोल्यात हवा व वातावरण हवेशीर आहे.\n२.३ विजेची उपकरणे सुरक्षित हाताळण्यासंदर्भात प्रशिक्षणाचे आयोजन केले आहे."
      }, {
        text: "३.१ वर्गखोल्या उत्साहवर्धक होण्यासाठी आकर्षक रंगात रंगवलेल्या आहेत.\n३.२ वर्गामध्ये प्रकाश व वायुवीजन व्यवस्थेसाठी योग्य क्षमतेचे दिवे व पंखे लावले आहेत."
      }, {
        text: "४.१ शाळेची संपूर्ण इमारत हवेशीर आणि अध्ययनास पूरक वातावरण निर्माण करणारी आहे.",
        isGreen: true
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/1CAMACWoI0lwxdChrkkzJt2cDYoFZC1rG"
    },
    en: {
      orangeDesc: "2.6.1 The school has lighting and ventilation systems.",
      options: [{
        text: "1.1 There is adequate lighting in the classrooms.\n1.2 All equipment is functional."
      }, {
        text: "2.1 Classrooms have natural lighting and windows.\n2.2 All classrooms have airy and well-ventilated atmospheres.\n2.3 Training is organized regarding the safe handling of electrical equipment."
      }, {
        text: "3.1 Classrooms are painted in attractive colors to make them encouraging.\n3.2 Lights and fans of appropriate capacity are installed for lighting and ventilation systems in classrooms."
      }, {
        text: "4.1 The entire school building is well-ventilated and creates a conducive learning environment.",
        isGreen: true
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/1CAMACWoI0lwxdChrkkzJt2cDYoFZC1rG"
    }
  },
  57: {
    mr: {
      orangeDesc: "२.६.२ शाळेत अग्निसुरक्षा उपाययोजना केल्या आहेत.",
      options: [{
        text: "१.१ अग्निशामक यंत्र उपलब्ध आहे."
      }, {
        text: "२.१ अग्निशामक यंत्र वापरण्याचे निर्देश भिंतीवर लावलेले आहेत."
      }, {
        text: "३.१ शिक्षक, कर्मचारी आणि विद्यार्थी यांना अग्निशामक यंत्र वापरण्यासाठीचे प्रशिक्षण दिले आहे."
      }, {
        text: "४.१ आपती व्यवस्थापन प्रशिक्षण दिले आहे.\n४.२ अग्निजन्य पदार्थांची यादी शाळेत लावलेली आहे.\n४.३ अग्निशमन यंत्राची निगा राखली जाते.",
        isGreen: true
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/1CIED9oU9acnZc4swkMmLg-U-1Ch4744s"
    },
    en: {
      orangeDesc: "2.6.2 Fire safety measures have been implemented in the school.",
      options: [{
        text: "1.1 Fire extinguishers are available."
      }, {
        text: "2.1 Instructions for using fire extinguishers are put up on the walls."
      }, {
        text: "3.1 Training has been provided to teachers, staff, and students on using fire extinguishers."
      }, {
        text: "4.1 Disaster management training has been provided.\n4.2 A list of flammable materials is displayed in the school.\n4.3 Maintenance of fire extinguishers is regularly done.",
        isGreen: true
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/1CIED9oU9acnZc4swkMmLg-U-1Ch4744s"
    }
  },
  58: {
    mr: {
      orangeDesc: "२.६.३ आपत्ती व्यवस्थापनासाठी प्रभावी उपाययोजना केल्या आहेत. शाळेची स्वतःची आपत्तीकालीन सज्जता योजना आहे व प्रत्येक वर्गात ठळकपणे प्रदर्शित केली आहे.",
      options: [{
        text: "१.१ आपत्ती व्यवस्थापनासाठी शाळेने योजना विकसित केली आहे",
        isGreen: true
      }, {
        text: "२.१ शाळेने प्रत्येक वर्गात स्वतःची आपत्ती व्यवस्थापन सज्जता योजना ठळकपणे प्रदर्शित केली आहे."
      }, {
        text: "३.१ शाळा वर्षातून किमान दोन वेळा आपत्ती व्यवस्थापन प्रात्यक्षिक राबवते."
      }, {
        text: "४.१ आपत्ती व्यवस्थापनासंबंधी जनजागृती म्हणून नाविन्यपूर्ण उपक्रम राबवते.\n४.२ विद्यार्थी समाजामध्ये आपत्ती व्यवस्थापनासंबंधी जनजागृती करतात."
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/1CTdXeHpbXep6BK3hbQwFI9peXWh_Dk91"
    },
    en: {
      orangeDesc: "2.6.3 Effective measures have been taken for disaster management. The school has its own disaster preparedness plan, which is prominently displayed in every classroom.",
      options: [{
        text: "1.1 The school has developed a plan for disaster management.",
        isGreen: true
      }, {
        text: "2.1 The school has prominently displayed its disaster preparedness plan in every classroom."
      }, {
        text: "3.1 The school conducts disaster management drills at least twice a year."
      }, {
        text: "4.1 The school runs innovative programs to raise awareness about disaster management.\n4.2 Students create awareness about disaster management in the community."
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/1CTdXeHpbXep6BK3hbQwFI9peXWh_Dk91"
    }
  },
  59: {
    mr: {
      orangeDesc: "२.७.१ शाळा पर्यावरणपूरक पद्धतीचे पालन करते. शिक्षक, विद्यार्थी, पालक, समाज, पर्यावरणाचे संवर्धन करण्यासाठी कार्यशाळा /उपक्रम आयोजित करते. शाळा हवामान बदल, सेंद्रिय जीवनशैलीचा समावेश करण्यासाठी एकत्र येऊन जागरूकता निर्माण करते.",
      options: [{
        text: "१.१ शालेय परिसरात हिरवीगार झाडे/हिरवळ उपलब्ध आहे.\n१.२ शाळेकडून ओला कचरा व सुका कचरा यांचे वर्गीकरण केले जाते."
      }, {
        text: "२.१ शालेय परिसरात हिरवी झाडे व त्यांची जोपासना/पोषण होण्यासाठी सुयोग्य नियोजन केलेले आहे.\n२.२ शाळेत कंपोस्ट खत निर्मिती खड्डा आहे.\n२.३ शाळेने पर्यावरण जाणीवजागृतीबाबत उपक्रमाचा अंतर्भाव केला आहे.",
        isGreen: true
      }, {
        text: "३.१ शाळा पर्यावरण संरक्षण व संवर्धन यासाठी विविध उपक्रम राबविते.\n३.२ कार्बन वाढ, तापमान वाढ , हवामान बदल, सेंद्रिय जीवनशैली इ. बाबत शाळा व समाज एकत्र येऊन जागरूकतेबाबत उपक्रम राबवितात."
      }, {
        text: "४.१ इको क्लबची स्थापना केली आहे.\n४.२ कचऱ्यावर प्रक्रिया करून सेंद्रिय खत निर्मिती केली जाते.\n४.३ वीज बचत करण्यासाठी आठवड्यातून किमान १ तास वीज बंद उपक्रम राबविला जातो."
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/1CZCI1Mve0G9CYqbjOQL7FDyTRPhNI93R"
    },
    en: {
      orangeDesc: "2.7.1 The school follows eco-friendly practices. It organizes workshops/activities to conserve the environment involving teachers, students, parents, and community. The school comes together with the community to raise awareness for addressing climate change and adopting an organic lifestyle.",
      options: [{
        text: "1.1 Green trees/lawns are available in the school premises.\n1.2 Wet and dry waste are segregated by the school."
      }, {
        text: "2.1 Proper planning has been done for planting and nurturing green trees on school premises.\n2.2 There is a compost fertilizer pit in the school.\n2.3 The school has integrated activities on environmental awareness.",
        isGreen: true
      }, {
        text: "3.1 The school conducts various initiatives for environmental protection and conservation.\n3.2 The school and community come together to run awareness programs regarding carbon footprint increase, temperature rise, climate change, organic lifestyle, etc."
      }, {
        text: "4.1 Eco Club has been established.\n4.2 Organic compost is produced by processing waste.\n4.3 A 'Power Off' activity of at least 1 hour per week is conducted to save electricity."
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/1CZCI1Mve0G9CYqbjOQL7FDyTRPhNI93R"
    }
  },
  60: {
    mr: {
      orangeDesc: "२.७.२ शाळा ऊर्जा बचतीसाठी LED प्रकाश/सौरऊर्जेचा वापर, टाकाऊ वस्तूचे व्यवस्थापन/पुनर्वापर, जल पुनर्भरण व प्लास्टिक मुक्तीसाठी विविध उपक्रमांचे आयोजन करते.",
      options: [{
        text: "१.१ शाळा ऊर्जाबचतीसाठी कमी विद्युतवर चालणारी उपकरणे वापरते. उदा. LED बल्ब ,एनर्जी सेवर उपकरणे, ५ स्टार उपकरणे."
      }, {
        text: "२.१ शाळा विद्यार्थ्यांकडून ऊर्जा, पाणी व कचरा व्यवस्थापन यांचे नियोजन करून योग्य प्रकारे अंमलबजावणी करून घेते.",
        isGreen: true
      }, {
        text: "३.१ शाळा समाज सहभागातून ऊर्जा पाणी कचरा व्यवस्थापन या बाबतीत जाणीवजागृतीचे उपक्रम राबवते."
      }, {
        text: "४.१ शाळा सौर विद्युतचा वापर करते.\n४.२ अपारंपरिक ऊर्जा, सेंद्रिय शेती, जल पुनर्भरण,प्लास्टिक मुक्ती व पुनर्वापर, सांडपाणी व्यवस्थापन इ.उपक्रमाची प्रभावी अंमलबजावणी करते."
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/1CbRQoYaSq-OEMFjD5zYGsjBSwQwf95y"
    },
    en: {
      orangeDesc: "2.7.2 The school organizes various initiatives for energy conservation (using LED lighting/solar energy), waste management/reuse, water recharging, and plastic-free campaigns.",
      options: [{
        text: "1.1 The school uses low-electricity-consuming equipment for energy savings, e.g., LED bulbs, energy saver appliances, 5-star rated equipment."
      }, {
        text: "2.1 The school ensures proper planning and implementation of energy, water, and waste management by students.",
        isGreen: true
      }, {
        text: "3.1 The school organizes awareness programs in the community regarding energy, water, and waste management."
      }, {
        text: "4.1 The school uses solar power.\n4.2 The school effectively implements initiatives such as renewable energy, organic farming, water recharging, plastic ban/reuse, wastewater management, etc."
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/1CbRQoYaSq-OEMFjD5zYGsjBSwQwf95y"
    }
  },
  61: {
    mr: {
      orangeDesc: "२.७.३ शाळेकडे प्रधानमंत्री पोषण शक्ती निर्माण योजनेसाठी स्वतंत्र स्वयंपाकगृह असून परसबाग/ किचन गार्डन मधील सेंद्रिय/ नैसर्गिक पद्धतीने पिकवलेला भाजीपाल्याचा वापर करतात.",
      options: [{
        text: "१.१ शाळेत स्वयंपाकगृह आहे.\n१.२ स्वयंपाकगृहात आहार शिजवण्यासाठी व वितरणासाठी पुरेशी भांडी आहेत.\n१.३ शाळेकडे परसबाग/ किचन गार्डनचे नियोजन केले आहे."
      }, {
        text: "२.१ स्वयंपाकगृहासाठी स्वतंत्र खोली असून विद्यार्थी जेवणाची जागा व परिसर स्वच्छ ठेवला जातो.\n२.२ परसबाग/ किचन गार्डन मध्ये भाजीपाला पिकविला जातो."
      }, {
        text: "३.१ स्वयंपाकगृह व धान्य साठवण्याची जागा स्वतंत्र असून स्वच्छता ठेवली जाते.\n३.२ परसबाग/ किचन गार्डन मधील भाजीपाला सेंद्रिय/ नैसर्गिक पद्धतीने पिकविला जातो.\n३.३ पूरक पोषण मूल्ये मिळतील अशा प्रकारचा आहार दिला जातो.",
        isGreen: true
      }, {
        text: "४.१ स्वयंपाकगृह स्वतंत्र खोली असून अग्नी सुरक्षेची योग्य ती खबरदारी घेतली जाते.\n४.२ धान्य साठवण्याची खोली हवेशीर/स्वच्छ व निर्जंतुकीकरण केली जाते.\n४.३ विद्यार्थ्यांना सेंद्रिय शेतीबाबत प्रत्यक्ष अनुभव दिला जातो.\n४.४ शाळा सेंद्रिय शेतीबाबत पालक व समाजाला प्रोत्साहन देते.\n४.५ परसबागेतील पिकवलेला अतिरिक्त भाजीपाला समाजात विकला जातो."
      }, {
        text: "लागू नाही"
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/1CcuXXmzg-OEMFjD5zYGsjBSwQwf95y"
    },
    en: {
      orangeDesc: "2.7.3 The school has a separate kitchen for the Pradhan Mantri Poshan Shakti Nirman Yojana and uses organic/natural vegetables grown in the kitchen garden.",
      options: [{
        text: "1.1 The school has a kitchen.\n1.2 The kitchen has adequate utensils for cooking and distribution of food.\n1.3 The school has planned for a kitchen garden."
      }, {
        text: "2.1 There is a separate room for the kitchen, and the students' dining area and surroundings are kept clean.\n2.2 Vegetables are grown in the kitchen garden."
      }, {
        text: "3.1 The kitchen and grain storage area are separate and hygiene is maintained.\n3.2 Vegetables in the kitchen garden are grown organically/naturally.\n3.3 Food is served that provides supplementary nutritional value.",
        isGreen: true
      }, {
        text: "4.1 The kitchen is in a separate room and proper fire safety precautions are taken.\n4.2 The grain storage room is airy, clean, and disinfected.\n4.3 Students are given hands-on experience in organic farming.\n4.4 The school encourages parents and the community regarding organic farming.\n4.5 Excess vegetables grown in the kitchen garden are sold to the community."
      }, {
        text: "Not Applicable"
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/1CcuXXmzg-OEMFjD5zYGsjBSwQwf95y"
    }
  },
  62: {
    mr: {
      orangeDesc: "२.८.१ विद्यार्थ्यांमध्ये इनडोअर आणि आऊटडोअर खेळ, योग, व्यायामविषयक जाणीव असून यासाठीची आवश्यक उपकरणे शाळेत उपलब्ध आहेत. दिव्यांगासाठी स्वतंत्र सोय आहे.",
      options: [{
        text: "१.१ शाळेकडे स्वतःचे क्रीडांगण उपलब्ध आहे. नसल्यास पर्यायी व्यवस्था आहे.\n१.२ क्रीडाखोली उपलब्ध असून आवश्यकतेनुसार क्रीडासाहित्य उपलब्ध करून दिले जाते, नोंदी ठेवल्या जातात.\n१.३ शाळेने विविध क्रीडा प्रकारात सहभाग घेतला आहे.",
        isGreen: true
      }, {
        text: "२.१ खेळाची मैदाने आखलेली आहेत.\n२.२ योगविषयक जाणीव असून प्रात्यक्षिक घेतले जाते.\n२.३ डिजिटल तंत्रज्ञानाचा वापर करून खेळ, खेळाडू, नियम, स्पर्धा, खेळांची रचना याविषयी विद्यार्थ्यांची समज विकसित केली जाते.\n२.४ शाळेने विविध क्रीडा प्रकारात केंद्रस्तरावर बक्षिसे मिळवली आहेत."
      }, {
        text: "३.१ विविध खेळांची क्रीडांगणे आखली आहेत. किंवा त्याची मापे शाळेच्या दर्शनी भागात लावली आहेत.\n३.२ शाळेत शाळा अंतर्गत किंवा आंतरशाळा क्रीडास्पर्धा आयोजित केल्या जातात.\n३.३ क्रीडा तज्ज्ञ मार्गदर्शकांचा उपयोग शाळेतील विद्यार्थ्यांना करून दिला जातो.\n३.४ शाळेने विविध क्रीडा प्रकारात तालुकास्तरावर बक्षिसे मिळवली आहेत."
      }, {
        text: "४.१ विद्यार्थ्यांना खेळाचे प्रशिक्षण देण्यासाठी शिक्षकाची उपलब्धता आहे.\n४.२ शाळेत दिव्यांगासाठी क्रीडा सुविधा उपलब्ध आहे.\n४.३ शाळेतील खेळाडूंनी जिल्हा, राज्य, राष्ट्रस्तरापर्यंत प्राविण्य मिळवले आहे.\n४.४ विविध क्रीडा मंडळे सामाजिक संस्था युवा मंडळ यांचे संयुक्त विद्यमाने शाळेत किंवा शाळेच्या मैदानावर क्रीडा स्पर्धा आयोजित केल्या जातात.\n४.५ समूह शाळा अंतर्गत इतर शाळेतील क्रीडा साहित्याचा वापर केला जातो. ( लागू असल्यास)"
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/1Ck13rhMrbhfWo3UrPh-gyBvWTxHfuiVJ"
    },
    en: {
      orangeDesc: "2.8.1 Students have awareness about indoor and outdoor sports, yoga, and exercise, and the necessary equipment for this is available in the school. There is separate provision for CWSN students.",
      options: [{
        text: "1.1 The school has its own playground. If not, alternative arrangement is available.\n1.2 Sports room is available and sports equipment is provided as per need, records are maintained.\n1.3 The school has participated in various sports.",
        isGreen: true
      }, {
        text: "2.1 Playgrounds are marked.\n2.2 There is awareness about yoga and practical sessions are conducted.\n2.3 Using digital technology, students' understanding about games, players, rules, tournaments, and structure of games is developed.\n2.4 The school has won prizes in various sports at the cluster level."
      }, {
        text: "3.1 Various sports grounds are marked, or their dimensions are displayed in the visible area of the school.\n3.2 Intra-school or inter-school sports competitions are organized in the school.\n3.3 Services of sports experts/guides are provided to the students.\n3.4 The school has won prizes in various sports at the block level."
      }, {
        text: "4.1 Teacher is available to provide sports training to students.\n4.2 Sports facilities are available for CWSN students in the school.\n4.3 Students of the school have achieved proficiency up to district, state, and national levels.\n4.4 Sports competitions are organized in the school or on the school ground in collaboration with various sports clubs, social organizations, and youth clubs.\n4.5 Sports equipment of other sports under the school complex is used (if applicable)."
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/1Ck13rhMrbhfWo3UrPh-gyBvWTxHfuiVJ"
    }
  },
  63: {
    mr: {
      orangeDesc: "२.९.१ निवासी शाळेत पुरेषा खोल्या/वसतिगृहे, मनोरंजनाची जागा, शौचालये, पिण्याचे पाणी ठिकाण, वार्डन, कर्मचारी निवासस्थान, अभ्यांगत खोली, कपडे धुण्याची खोली, धान्यकोठी, कॉमन रूम, अतिरिक्त खोली उपलब्ध आहे.",
      options: [{
        text: "१.१ पायाभूत व बोर्डिंग सुविधा उपलब्ध आहे.\n१.२ मुले वा मुलींसाठी वेगवेगळ्या इमारती आहेत.\n१.३ शयनगृहे उपलब्ध आहेत.\n१.४ पिण्यासाठी, स्वयंपाकासाठी आणि स्वच्छतागृहांसाठी पुरेसे पाणी उपलब्ध आहे.\n१.५ वायुवीजन व पुरेशी प्रकाशव्यवस्था उपलब्ध आहे.\n१.६. वॉर्डन उपलब्ध असून त्यांचे संपूर्ण वसतिगृहावर लक्ष आहे."
      }, {
        text: "२.१ शौचालय, बाथरूम, वॉश बेसिन, मुतारी (स्वच्छतागृह), विद्यार्थी संख्येच्या प्रमाणात उपलब्ध आहे. ( शासकीय निकषाप्रमाणे )\n२.२ वैयक्तिक व सामूहिक वापरासाठी पायाभूत सुविधा उपलब्ध आहेत.\n२.३ पाणी, साबण, हँडवॉशची सुविधा स्वच्छतागृहात उपलब्ध आहे.\n२.४ स्वच्छतागृहासाठी वीज/जनरेटर सुविधा आहे.\n२.५ सुरक्षा संदर्भात नियमांचे पालन करून सुरक्षा रक्षकाची नेमणूक केली आहे."
      }, {
        text: "३.१ दैनिक स्वच्छता व इतर जबाबदाऱ्या शासकीय निर्देशानुसार नेमून दिल्या आहेत.\n३.२ अभ्यागत व अतिथीसाठी गेस्ट रूम उपलब्ध आहे.\n३.३ वसतिगृहातील खोल्या, स्वयंपाक घर, स्वच्छतागृह,धान्याचे कोठार,परिसर यांची देखभाल दुरूस्ती केली जाते."
      }, {
        text: "१. वसतिगृहामध्ये विद्यार्थ्यांसाठी टी.व्ही. कॉर्नर, ग्रंथालय ,खेळासाठी सामूहिक खोली उपलब्ध आहे.\n२. इंटरनेट वापरासह संसाधन कक्ष उपलब्ध आहे.\n३. अतिथिगृह, Loundri Room, आणि दैनिक वापरतील सुविधा उपलब्ध आहे.\n४. सर्व सुविधा वापरत असून त्या सुस्थितीत आहेत.\n५. सोलर सिस्टिम उपलब्ध असून ती वापरात आहे."
      }, {
        text: "लागू नाही",
        isGreen: true
      }]
    },
    en: {
      orangeDesc: "2.9.1 Residential schools have adequate rooms/hostels, recreation areas, toilets, drinking water facilities, warden, staff quarters, visitor rooms, laundry rooms, grain stores, common rooms, and additional rooms available.",
      options: [{
        text: "1.1 Foundational and boarding facilities are available.\n1.2 Separate buildings are available for boys and girls.\n1.3 Dormitories are available.\n1.4 Adequate water is available for drinking, cooking, and toilets.\n1.5 Ventilation and adequate lighting are available.\n1.6 Warden is available and oversees the entire hostel."
      }, {
        text: "2.1 Toilets, bathrooms, wash basins, urinals are available in proportion to the student strength (as per government norms).\n2.2 Infrastructure is available for personal and collective use.\n2.3 Water, soap, and handwash facilities are available in toilets.\n2.4 Electricity/generator facility is available for toilets.\n2.5 Security guard has been appointed following security norms."
      }, {
        text: "3.1 Daily cleaning and other responsibilities are assigned as per government guidelines.\n3.2 Guest room is available for visitors and guests.\n3.3 Hostel rooms, kitchen, toilets, grain store, and premises are maintained and repaired."
      }, {
        text: "1. TV corner, library, and common room for games are available for students in the hostel.\n2. Resource room with internet access is available.\n3. Guest house, laundry room, and daily use facilities are available.\n4. All facilities are in use and in good condition.\n5. Solar system is available and in use."
      }, {
        text: "Not Applicable",
        isGreen: true
      }]
    }
  },
  65: {
    mr: {
      orangeDesc: "२.९.३ शाळा निवासी सुविधांमध्ये विद्यार्थ्यांची सुरक्षितता आणि सुरक्षा निश्चित करते.",
      options: [{
        text: "१.१ शालेय परिसरात सर्व बाजूंनी संरक्षण भिंत आहे.\n१.२ प्रवेशद्वारावर २४ तास सुरक्षा रक्षक आहे.\n१.३ अधिकृत व्यक्तीशिवाय प्रवेश दिला जात नाही.\n१.४ शाळेत अग्निशामक यंत्र व प्रथमोपचार पेटी उपलब्ध आहे.\n१.५ शाळेत पूर्णवेळ डॉक्टर व परिचारिका उपलब्ध आहे अथवा जवळच्या रुग्णालयाशी करार केला आहे.\n१.६ आपत्कालीन वैद्यकीय सेवा क्रमांक दर्शनी भागात लावले आहे.\n१.७ आपत्कालीन परिस्थितीमध्ये बाहेर पडण्याचा नकाशा दर्शनी भागात प्रदर्शित केला आहे.\n१.८ बाल सुरक्षा समिती स्थापन केली आहे."
      }, {
        text: "२.१ अभ्यांगतासाठी शाळेने पास दिले आहेत.\n२.२ विद्यार्थ्यांची नियमित आरोग्य तपासणी केली जाते.\n२.३ विद्यार्थी आरोग्य तपासणी कार्ड ठेवले आहे.\n२.४ अग्निशामक यंत्र व प्रथमोपचार पेटी योग्य ठिकाणी आहे.\n२.५ आपत्कालीन परिस्थितीत खोलीतून बाहेर पडण्याचा नकाशा प्रदर्शित असून मॉक ड्रील केले जाते.\n२.६ विलगीकरण कक्ष सुस्थितीत आहे.\n२.७ सूचना पेटी ठेवली आहे."
      }, {
        text: "३.१ विद्यार्थ्यांच्या सुरक्षिततेचा आराखडा तयार आहे.\n३.२ पालकांना पाल्यास भेटण्यास उचित आचारसंहितेचे पालन केले जाते.\n३.३ रुग्णवाहिकेची सुविधा उपलब्ध आहे.\n३.४ विद्यार्थ्यांचे गैरवर्तन, गुंडगिरी, रॅगिंग यांचे वेळीच निराकरण केले जाते.\n३.५ सर्व विद्यार्थी व कर्मचारी यांना आपत्कालीन स्थितीस सामोरे जाण्याचे प्रशिक्षण दिले जाते.\n३.६ जवळच्या रुग्णालयाशी शाळेने करार केला आहे."
      }, {
        text: "४.१ प्रवेशद्वाराजवळ सुरक्षा रक्षकामार्फत सर्व अभ्यांगतांच्या नोंदी ठेवल्या जातात.\n४.२ मॉक-ड्रील मधील आलेल्या अनुभवाच्या आधारे सुरक्षा व्यवस्थेत बदल केले जातात.\n४.३ CCTV द्वारे शालेय परिसर सुरक्षित केला आहे.\n४.४ शालेय परिसरात आंतरजाल सुविधा उपलब्ध आहे.\n४.५ कर्मचारी नियुक्तीपूर्वी चारित्र्याचा दाखला घेतला जातो.\n४.६ विद्यार्थ्यांच्या सुरक्षिततेसाठी माजी विद्यार्थी व कर्मचारी यांच्या सल्ल्याने वसतिगृहाची रचना केली जाते.\n४.७ धोक्याची सूचना देणारी यंत्रणा उपलब्ध आहे."
      }, {
        text: "लागू नाही",
        isGreen: true
      }]
    },
    en: {
      orangeDesc: "2.9.3 The school ensures the safety and security of students in residential facilities.",
      options: [{
        text: "1.1 There is a boundary wall surrounding the school premises on all sides.\n1.2 There is a 24-hour security guard at the entrance.\n1.3 Entry is not permitted without authorized personnel.\n1.4 Fire extinguishers and first aid boxes are available in the school.\n1.5 Full-time doctor and nurse are available in the school or agreement is made with a nearby hospital.\n1.6 Emergency medical service numbers are displayed in the visible area.\n1.7 An evacuation map for emergency situations is displayed in the visible area.\n1.8 Child safety committee has been established."
      }, {
        text: "2.1 School passes have been issued for visitors.\n2.2 Regular health check-ups of students are conducted.\n2.3 Student health check-up cards are maintained.\n2.4 Fire extinguishers and first aid boxes are kept in appropriate places.\n2.5 An evacuation map from rooms in emergency situations is displayed and mock drills are conducted.\n2.6 Isolation room is in good condition.\n2.7 Suggestion box is placed."
      }, {
        text: "3.1 Safety plan for students is ready.\n3.2 Proper code of conduct is followed for parents visiting their children.\n3.3 Ambulance facility is available.\n3.4 Students' misbehavior, bullying, and ragging are addressed timely.\n3.5 Training is provided to all students and staff to face emergency situations.\n3.6 Agreement has been made by the school with a nearby hospital."
      }, {
        text: "4.1 Records of all visitors are maintained by the security guard near the entrance.\n4.2 Security arrangements are modified based on experiences from mock drills.\n4.3 School premises are secured through CCTV.\n4.4 Internet facility is available on the school premises.\n4.5 Character certificate is obtained before employee appointment.\n4.6 Hostel structure is designed for student safety in consultation with alumni and staff.\n4.7 Hazard warning system is available."
      }, {
        text: "Not Applicable",
        isGreen: true
      }]
    }
  },
  66: {
    mr: {
      orangeDesc: "२.९.४ शाळा विद्यार्थ्यांच्या शारीरिक, मानसिक, सामाजिक, भावनिक व बौद्धिक विकासासाठी विविध उपक्रमाचे आयोजन करते.",
      options: [{
        text: "१.१ विद्यार्थ्यांची वेळोवेळी आरोग्य तपासणी केली जाते.\n१.२ वसतिगृहात दिनचर्या / वेळापत्रक आहे.\n१.३ शारीरिक व्यायाम व खेळ यांचे वेळापत्रक करून लावले आहे.\n१.४ शैक्षणिक दिनचर्या वेळापत्रकानुसार आयोजित केली आहे."
      }, {
        text: "२.१ नियमितपणे विद्यार्थ्यांच्या शैक्षणिक क्षमता आणि जीवन कौशल्य विकसित करण्यासाठी शिबिरे आयोजित केली जातात.\n२.२ क्रीडास्पर्धा व सांस्कृतिक कार्यक्रम आयोजित केले जातात.\n२.३ विद्यार्थ्यांसाठी समुपदेशन कार्यशाळेचे सत्र भरवले जाते."
      }, {
        text: "३.१ विद्यार्थ्यांचे शैक्षणिक आणि वैयक्तिक जीवन विकसित करण्यासाठी शिक्षक व मार्गदर्शक समितीची नियुक्ती केली आहे.\n३.२ विद्यार्थ्यांचे जीवन विकसित करण्यासाठी आरोग्य आणि कल्याणासाठी विविध उपक्रम राबविले जातात .\n३.३ विद्यार्थी सल्लागार योजना राबविली आहे.\n३.४ मानसिक आरोग्यासाठी प्रतिबंधात्मक उपाय योजना केल्या आहेत.\n३.५ करिअर मार्गदर्शन शिबीर आयोजित केले जाते.\n३.६ कर्मचारी आणि विद्यार्थ्यांना गुंडगिरी (रॅगिंग ) कायद्याविषयी माहिती दिली जाते."
      }, {
        text: "४.१ वसतिगृहातील विद्यार्थ्यांच्या आरोग्यासंबंधीत धोरणांचा वेळोवेळी आढावा घेण्यात येतो.\n४.२ पूर्णवेळ प्रशिक्षित अधीक्षकांची निवड करण्यात आली आहे.\n४.३ विद्यार्थ्यांच्या सुरक्षेसाठी स्वतंत्र यंत्रणा कार्यान्वित आहे.\n४.४ वसतिगृहामध्ये शिक्षक, विद्यार्थी व पालक यांच्यासाठी नियम व मार्गदर्शन फलक लावण्यात आले आहेत.\n४.५ विविध क्षेत्रातील स्पर्धा परीक्षेच्या तयारीसाठी करिअर मार्गदर्शन, समुपदेशन आणि प्रशिक्षणाचे आयोजन केले जाते."
      }, {
        text: "लागू नाही",
        isGreen: true
      }]
    },
    en: {
      orangeDesc: "2.9.4 The school organizes various activities for students' physical, mental, social, emotional, and intellectual development.",
      options: [{
        text: "1.1 Regular health check-ups of students are conducted.\n1.2 There is a daily routine / timetable in the hostel.\n1.3 Timetable for physical exercise and sports is put up.\n1.4 Educational routine is organized according to the timetable."
      }, {
        text: "2.1 Camps are regularly organized to develop students' academic capacities and life skills.\n2.2 Sports competitions and cultural programs are organized.\n2.3 Counseling workshop sessions are conducted for students."
      }, {
        text: "3.1 Teacher and guide committee is appointed to develop students' academic and personal lives.\n3.2 Various initiatives are run for health and well-being to develop students' lives.\n3.3 Student mentoring scheme is implemented.\n3.4 Preventive measures are implemented for mental health.\n3.5 Career guidance camp is organized.\n3.6 Staff and students are informed about laws regarding ragging/bullying."
      }, {
        text: "4.1 Health policies of hostel students are reviewed from time to time.\n4.2 Full-time trained superintendents have been selected.\n4.3 Separate mechanism is functional for students' safety.\n4.4 Rules and guidance boards for teachers, students, and parents are displayed in the hostel.\n4.5 Career guidance, counseling, and training are organized for preparation of competitive examinations in various fields."
      }, {
        text: "Not Applicable",
        isGreen: true
      }]
    }
  },
  67: {
    mr: {
      orangeDesc: "२.१०.१ शाळेत स्वच्छ, आरोग्यदायी व सुरक्षिततेच्या निकषाचे पालन करणारे उपहारगृह/स्वयंपाकगृह आहे.",
      options: [{
        text: "१.१ शाळेत उपहारगृह/स्वयंपाकगृह उपलब्ध आहे.\n१.२ उपहारगृह /स्वयंपाकगृहामध्ये साठवलेले पदार्थ स्वच्छतेचे निकष पाळून ठेवले आहेत.\n१.३ उपहारगृहात/स्वयंपाकगृहात दर्शनी भागात दरफलक लावला आहे.\n१.४ सुरक्षा व स्वच्छतेच्या सर्व मानकाचे पालन केले आहे.",
        isGreen: true
      }, {
        text: "२.१ उपहारगृह/स्वयंपाकगृह हवेशीर, प्रशस्त असून वायूविजन चांगले आहे.\n२.२ विद्यार्थ्यांसाठी पुरेशी भांडी व सर्व्हिस काउंटर उपलब्ध आहे.\n२.३ उपहारगृहात/स्वयंपाकगृहात आचारी, वेटर व सफाई कामगार उपलब्ध आहेत.\n२.४ उपहारगृह/स्वयंपाकगृहात तयार झालेल्या अन्नाची साठवण सुविधा दर्जेदार आहे.\n२.५ स्वयंपाकासाठी आणि पिण्यासाठी स्वच्छ पाणी उपलब्ध आहे.\n२.६ हात धुण्यासाठी स्वतंत्र व्यवस्था आहे. ( washbasin )"
      }, {
        text: "३.१ उपहारगृह/स्वयंपाकगृह स्वतः अथवा ठेकेदारांमार्फत सर्व निकषांचे पालन करून चालवले जाते. करारपत्र उपलब्ध आहे.\n३.२ उपहारगृहातील/स्वयंपाकगृहातील सर्व स्टाफ प्रशिक्षित आहे.\n३.३ उपहारगृहात/स्वयंपाकगृहात पुरवले जाणारे पदार्थ ज्या भांड्यातून दिले जातात ती भांडी वेळोवेळी निर्जंतुक करतात.\n३.४ FSSAI च्या ( Food Safety And Standards Authority Of India) निकषानुसार उपहारगृहातील/स्वयंपाकगृहातील पदार्थांची खरेदी, साठवणूक व हाताळणी केली जाते."
      }, {
        text: "४.१ उपहारगृहात/स्वयंपाकगृहात सेवेचे पुनरावलोकन करण्यासाठी सुचनावही/ अभिप्राय उपलब्ध असून त्याचा वेळोवेळी पाठपुरावा केला जातो.\n४.२ उपहारगृहातील/स्वयंपाकगृहातील सर्व कर्मचाऱ्यांची नियमितपणे वैद्यकीय तपासणी केली जाते."
      }, {
        text: "लागू नाही"
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/"
    },
    en: {
      orangeDesc: "2.10.1 The school has a clean, healthy, and safe canteen/kitchen adhering to safety and hygiene norms.",
      options: [{
        text: "1.1 Canteen/kitchen is available in the school.\n1.2 Items stored in the canteen/kitchen are kept adhering to cleanliness norms.\n1.3 Price list is displayed in the visible area of the canteen/kitchen.\n1.4 All safety and cleanliness standards are followed.",
        isGreen: true
      }, {
        text: "2.1 Canteen/kitchen is airy, spacious, and has good ventilation.\n2.2 Adequate utensils and service counters are available for students.\n2.3 Cook, waiter, and cleaning staff are available in the canteen/kitchen.\n2.4 Storage facility for cooked food in the canteen/kitchen is of high quality.\n2.5 Clean water is available for cooking and drinking.\n2.6 Separate arrangement (washbasin) is available for hand washing."
      }, {
        text: "3.1 Canteen/kitchen is run by the school itself or through contractors adhering to all norms, agreement is available.\n3.2 All staff in the canteen/kitchen are trained.\n3.3 Utensils used to serve food in the canteen/kitchen are periodically sanitized.\n3.4 Purchase, storage, and handling of items in the canteen/kitchen are done according to FSSAI (Food Safety and Standards Authority of India) norms.",
        isGreen: true
      }, {
        text: "4.1 Suggestion book/feedback register is available in the canteen/kitchen to review services, and follow-up is done periodically.\n4.2 Regular medical check-ups of all employees in the canteen/kitchen are conducted."
      }, {
        text: "Not Applicable"
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/"
    }
  },
  68: {
    mr: {
      orangeDesc: "२.११.१ शाळेत ICT/स्मार्ट क्लास सुविधा उपलब्ध असून अभ्यासक्रम लोड केलेले टॅब/डिजिटल लायब्ररी आहे.",
      options: [{
        text: "१.१ शाळेमध्ये शैक्षणिक उपक्रमांना समर्थन देण्यासाठी आयसीटी लॅब/स्मार्ट क्लास सुविधा आहे.",
        isGreen: true
      }, {
        text: "२.१ शाळेत अभ्यासक्रम लोड केलेले टॅब्लेट/ डिजिटल लायब्ररी उपलब्ध आहे."
      }, {
        text: "३.१ किमान ५० टक्के पेक्षा अधिक विद्यार्थी, शिक्षक हे डिजिटल लायब्ररीचा उपयोग करतात."
      }, {
        text: "४.१ १०० टक्के विद्यार्थी, शिक्षक हे डिजिटल लायब्ररीचा उपयोग करतात.\n४.२ मुख्याध्यापक/ प्राचार्य ICT लायब्ररीमध्ये व स्मार्ट क्लासमध्ये जाऊन १०० टक्के या सुविधांच्या परिणामकारकतेचा प्रत्यक्ष अनुभव घेतात.\n४.३ ICT व स्मार्ट क्लास सुविधा देखभाल व दुरूस्ती वेळोवेळी केली जाते."
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/"
    },
    en: {
      orangeDesc: "2.11.1 The school has ICT/smart class facilities available and has curriculum-loaded tablets/digital library.",
      options: [{
        text: "1.1 The school has ICT lab/smart class facility to support educational activities.",
        isGreen: true
      }, {
        text: "2.1 Curriculum-loaded tablets/digital library are available in the school."
      }, {
        text: "3.1 More than 50 percent of students and teachers use the digital library."
      }, {
        text: "4.1 100 percent of students and teachers use the digital library.\n4.2 The headmaster/principal visits the ICT library and smart class to experience the effectiveness of these facilities 100 percent first-hand.\n4.3 Maintenance and repair of ICT and smart class facilities are done periodically."
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/"
    }
  },
  69: {
    mr: {
      orangeDesc: "२.११.२ शाळेकडे अविरत चालणारे आंतरजाल (इंटरनेट) सुविधा उपलब्ध आहे",
      options: [{
        text: "१.१ शाळेमध्ये अखंड इंटरनेट कनेक्शनची सुविधा उपलब्ध आहे. (मोबाईल/डोंगल)"
      }, {
        text: "२.१शाळा WiFi (वाय-फाय) सुविधेने जोडली आहे."
      }, {
        text: "३.१ शाळेकडून किमान १० Mb/s वेगाचे इंटरनेट प्रदान करते."
      }, {
        text: "४.१ शाळेकडून किमान २० Mb/s वेगाचे इंटरनेट प्रदान करते.\n४.२ विद्यार्थी, शिक्षक आणि शाळा ऑनलाइन कार्यासाठी इंटरनेट सुविधा वापरतात.",
        isGreen: true
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/1DFjjpRBFJ-QaoRRbii3uiDr6NDRBPAYB"
    },
    en: {
      orangeDesc: "2.11.2 The school has continuous internet facility available.",
      options: [{
        text: "1.1 Uninterrupted internet connection facility is available in the school (mobile/dongle)."
      }, {
        text: "2.1 The school is connected with WiFi facility."
      }, {
        text: "3.1 The school provides internet with speed of at least 10 Mb/s."
      }, {
        text: "4.1 The school provides internet with speed of at least 20 Mb/s.\n4.2 Students, teachers and the school use internet facilities for online work.",
        isGreen: true
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/1DFjjpRBFJ-QaoRRbii3uiDr6NDRBPAYB"
    }
  },
  70: {
    mr: {
      orangeDesc: "२.१२.१ शाळेने शिक्षकाकडून सर्वेक्षण करून दाखलपात्र सर्व विद्यार्थ्यांचे विशेषतः सामाजिक, आर्थिक, वंचित घटकातील विद्यार्थ्यांची पटनोंदणी केली आहे.",
      options: [{
        text: "१.१ शिक्षक पटनोंदणीसाठी सर्व्हेक्षण करतात."
      }, {
        text: "२.१शाळेकडे सर्व स्तरातील मुलांचा शोध घेण्याची योजना तयार करण्यात आली आहे.\n२.२ शाळाबाह्य विद्यार्थ्यांचा शोध घेऊन त्यांना शाळेच्या मुख्य प्रवाहात आणले जाते"
      }, {
        text: "३.१ शाळेने मुलांचा शोध घेण्यासाठी माहिती व तंत्रज्ञानांचा वापर केला आहे."
      }, {
        text: "४.१ नोंदणी झालेल्या मुलांची माहिती मॅप केली जाते व ती प्रदर्शित करून शाळेत प्रवेश घेण्यासाठी प्रोत्साहित केले जाते.\n४.२ परिसरातील अनुसूचित जाती, अनुसूचित जमाती, भटक्या जमाती, आर्थिक दुर्बल घटक, अल्पसंख्यांक, CWSN या घटकातील मुलांचा शोध घेऊन शाळेच्या मुख्य प्रवाहात आणले आहे.",
        isGreen: true
      }],
      hasEvidence: true
    },
    en: {
      orangeDesc: "2.12.1 The school has enrolled all eligible students, especially from social, economic, and disadvantaged sections, through a survey conducted by teachers.",
      options: [{
        text: "1.1 Teachers conduct surveys for enrollment."
      }, {
        text: "2.1 The school has prepared a plan to track children from all levels.\n2.2 Out-of-school children are identified and brought into the mainstream of the school."
      }, {
        text: "3.1 The school has used information technology to track children."
      }, {
        text: "4.1 Information of enrolled children is mapped and displayed to encourage school admission.\n4.2 Children from Scheduled Castes, Scheduled Tribes, nomadic tribes, economically weaker sections, minorities, and CWSN in the area are tracked and brought into the mainstream of the school.",
        isGreen: true
      }],
      hasEvidence: true
    }
  },
  71: {
    mr: {
      orangeDesc: "२.१२.२ शाळा सर्व इयत्तांमध्ये शून्य गळतीदर आणि १०० % संक्रमण दर राखते.",
      options: [{
        text: "१.१ अध्ययनपूरक वातावरण निर्मिती करून शाळा सर्व विद्यार्थ्यांना प्रवेश व पायाभूत सुविधा पुरवते त्यासाठी प्रशिक्षित शिक्षक उपलब्ध आहेत.\n१.२ शाळा इमारत व वर्ग खोल्या आकर्षक आहेत."
      }, {
        text: "२.१ सर्व स्तरातील विद्यार्थ्यांना शाळेच्या मुख्य प्रवाहात आणले जाते व गळतीचा दर शून्य ठेवला जातो.\n२.२ मुले शाळाबाह्य राहण्याची कारणे शोधून त्यांच्यासाठी कृती कार्यक्रम विकसित केला आहे."
      }, {
        text: "३.१ शाळा समुपदेशक / सामाजिक कार्यकर्ते /NGO/ समाज यांच्या सहकार्याने सर्व मुले शाळेत उपस्थित राहतील याची खात्री करते."
      }, {
        text: "४.१ शाळा, शिक्षक, समाज, समाजसेवी संस्था यांच्या मदतीने गळतीदर शून्य ठेवते.\n४.२ शाळा सर्व इयत्तांमध्ये संक्रमण दर १०० % ठेवते.\n४.३ गळतीचा दर ० % ठेवण्यासाठी विविध योजनांचा लाभ दिला जातो.",
        isGreen: true
      }],
      hasEvidence: true
    },
    en: {
      orangeDesc: "2.12.2 The school maintains zero dropout rate and 100% transition rate in all classes.",
      options: [{
        text: "1.1 The school provides admission and basic facilities to all students by creating a learning-conducive environment, and trained teachers are available for it.\n1.2 The school building and classrooms are attractive."
      }, {
        text: "2.1 Students from all levels are brought into the mainstream of the school and the dropout rate is kept at zero.\n2.2 Reasons for children staying out of school are identified and action programs are developed for them."
      }, {
        text: "3.1 The school ensures that all children attend school with the cooperation of counselors / social workers / NGOs / community."
      }, {
        text: "4.1 The school, teachers, community, and social service organizations work together to keep the dropout rate at zero.\n4.2 The school maintains 100% transition rate in all classes.\n4.3 Various schemes are utilized to maintain 0% dropout rate.",
        isGreen: true
      }],
      hasEvidence: true
    }
  },
  72: {
    mr: {
      orangeDesc: "२.१२.३ शाळा सर्व शिक्षण स्तरातील सर्व विद्यार्थ्यांना शाळेत किंवा जवळच्या शाळेत प्रवेशाची संधी उपलब्ध करून देते.",
      options: [{
        text: "१.१ शाळा सर्व मुलांना शाळेत प्रवेश देते."
      }, {
        text: "२.१शाळेमध्ये पुढील वर्ग नसेल तर शेजारील शाळा / शैक्षणिक संस्था यांच्याशी संपर्क करुन पुढे प्रवेश दिला जातो."
      }, {
        text: "३.१ शाळा विद्यार्थ्यांच्या शैक्षणिक विकासासाठी नजिकच्या शाळेतील पायाभूत सुविधा उपलब्ध करुन देण्याचे नियोजन करते.",
        isGreen: true
      }, {
        text: "४.१ शाळेमध्ये शिक्षक Innovation Lab/ Science Lab/ व्यावसायिक संस्था /शैक्षणिक संस्था /सामाजिक संस्था यांच्याशी करार करुन शाळा प्रवेशासाठी प्रयत्न करते.\n४.२ शाळा शिक्षक व विदयार्थी यांना वैज्ञानिक प्रयोगशाळा (ISRO/ CSIR/ DRDO /DIO) वैज्ञानिक संस्थेमध्ये सहभागी होण्यास संधी उपलब्ध करुन देते"
      }],
      hasEvidence: true
    },
    en: {
      orangeDesc: "2.12.3 The school provides opportunities for admission to all students across all levels of education in the school or a nearby school.",
      options: [{
        text: "1.1 The school provides admission to all children."
      }, {
        text: "2.1 If the school does not have the next higher grade, contact is established with neighboring schools/educational institutions to facilitate further admission."
      }, {
        text: "3.1 The school plans to provide infrastructure facilities from nearby schools for the academic development of students.",
        isGreen: true
      }, {
        text: "4.1 The school endeavors for school admission by partnering with teachers' Innovation Lab / Science Lab / vocational / educational / social organizations.\n4.2 The school provides opportunities for teachers and students to participate in scientific laboratories (ISRO/CSIR/DRDO/DIO) and scientific institutions."
      }],
      hasEvidence: true
    }
  },
  73: {
    mr: {
      orangeDesc: "२.१२.४ माध्यमिक शिक्षण पूर्ण करून पुढील शिक्षण घेणाऱ्या विद्यार्थ्यांची संख्या दरवर्षी वाढते.",
      options: [{
        text: "१.१ उच्च शिक्षणाबाबत शाळा विद्यार्थ्यांमध्ये जागृती निर्माण करते.\n१.२ शालेय- सहशालेय संमेलने, विविध कार्यक्रम यामधून विद्यार्थ्यांमध्ये उच्च शिक्षणाबाबत ध्येय निर्मिती करते.\n१.३ विद्यार्थ्यांमध्ये आवड निर्मितीसाठी अभियोग्यता कल-चाचणी शिक्षक किंवा शाळेमार्फत आयोजित केली जाते.\n१.४ शाळेच्या दर्शनी भागात करिअर मार्गदर्शन तक्ता, चित्रे, लोगो काढले आहेत."
      }, {
        text: "२.१ महत्त्वपूर्ण अर्ज व त्याची मुदत याची माहिती शिक्षकांद्वारे विद्यार्थ्यांना करून दिली जाते.\n२.२ करिअर मार्गदर्शन शिबिर शाळेच्या प्रांगणात आयोजित केले जाते."
      }, {
        text: "३.१ आजी-माजी विद्यार्थ्यांना मार्गदर्शक म्हणून निमंत्रित केले जाते.\n३.२ करिअर समुपदेशन सत्रात समाजातील विविध कलाकार समाजघटकांना समाविष्ट केले जाते.\n३.३ संमेलन, शिबिर आयोजित करताना वेळ, ठिकाण आणि विद्यार्थ्यांच्या मानसिकतेचा विचार केला जातो."
      }, {
        text: "४.१शाळा उच्च शिक्षणासाठी सेवाभावी संस्थामार्फत सेमिनार व चर्चासत्रे आयोजित करते.\n४.२ चर्चासत्रे शिबिरे यांचा फायदा होऊन शाळेतील काही विद्यार्थी उच्च शिक्षित झाले आहेत.\n४.३ शिक्षक विद्यार्थ्यांसह पालकांचे समुपदेशन करतात."
      }, {
        text: "लागू नाही",
        isGreen: true
      }]
    },
    en: {
      orangeDesc: "2.12.4 The number of students pursuing higher education after completing secondary education increases every year.",
      options: [{
        text: "1.1 The school creates awareness among students about higher education.\n1.2 Through school and co-curricular conferences and programs, the school sets goals for higher education among students.\n1.3 To generate interest among students, aptitude/interest tests are organized by teachers or the school.\n1.4 Career guidance charts, pictures, and logos are displayed in the visible area of the school."
      }, {
        text: "2.1 Information about important applications and deadlines is provided to students by teachers.\n2.2 Career guidance camps are organized in the school premises."
      }, {
        text: "3.1 Alumni are invited as guides.\n3.2 Various artists and community members are included in career counseling sessions.\n3.3 While organizing conferences and camps, time, venue, and students' mindset are considered."
      }, {
        text: "4.1 The school organizes seminars and discussions through charitable organizations for higher education.\n4.2 Due to the benefit of discussions and camps, some students of the school have become highly educated.\n4.3 Teachers counsel parents along with students."
      }, {
        text: "Not Applicable",
        isGreen: true
      }]
    }
  },
  74: {
    mr: {
      orangeDesc: "२.१२.५ शाळेने माजी विद्यार्थी संघाची स्थापना करून त्यांचा शालेय विकासात उपयोग करून घेतला आहे.",
      options: [{
        text: "१.१ शाळेने सर्व माजी विद्यार्थ्यांच्या नोंदी घेतल्या आहेत.",
        isGreen: true
      }, {
        text: "२.१ शाळेतील माजी विद्यार्थ्यांचे पदवी पर्यंत शिक्षण घेतलेल्यांची नोंद घेतली जाते."
      }, {
        text: "३.१ माजी विद्यार्थ्यांना विविध कार्यक्रमांमध्ये अनुभव कथन करण्यासाठी व करिअर मार्गदर्शनासाठी बोलवले जाते.\n३.२ शाळा माजी विद्यार्थ्यांचा मेळावा आयोजित करते."
      }, {
        text: "४.१ माजी विद्यार्थ्यांचे ऑनलाईन गट बनवून प्रत्येकांशी संवाद व शिक्षणाविषयी मार्गदर्शन आयोजित केले जाते.\n४.२ माजी विद्यार्थ्यांचा शाळेतील विविध उपक्रमामध्ये सहभाग घेतला जातो. (आर्थिक/ शैक्षणिक )"
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/"
    },
    en: {
      orangeDesc: "2.12.5 The school has established an alumni association and utilized them in school development.",
      options: [{
        text: "1.1 The school has recorded details of all alumni.",
        isGreen: true
      }, {
        text: "2.1 The details of school alumni who have completed education up to graduation are recorded."
      }, {
        text: "3.1 Alumni are invited to share their experiences in various programs and for career guidance.\n3.2 The school organizes alumni meets."
      }, {
        text: "4.1 Online groups of alumni are created to communicate with everyone and organize guidance on education.\n4.2 Alumni are involved in various activities of the school (financial / educational)."
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/"
    }
  },
  75: {
    mr: {
      orangeDesc: "३.१.१ शाळेत पात्र आणि सक्षम कर्मचारी शाळेच्या ध्येय आणि उद्दिष्ट पूर्तीसाठी शाळेत शासनाने निर्देशित केलेल्या निकषानुसार पुरेसे पात्र आणि सक्षम कर्मचारी आहेत.",
      options: [{
        text: "१.१ शाळेत पुरेसे शिक्षक व शिक्षकेत्तर कर्मचारी नियुक्त केले आहेत."
      }, {
        text: "२.१ शैक्षणिक वर्ष सुरु होण्यापूर्वी संच मान्यतेनुसार आवश्यक कर्मचाऱ्यांच्या संख्येची पडताळणी केली आहे.\n२.२ शाळेतील सर्व कर्मचाऱ्यांच्या नियुक्त्या या शासनाने विहित केलेल्या पद्धतीने केल्या आहेत."
      }, {
        text: "३.१ व्यावसायिक क्षमतेनुसार शालेय कामकाजाच्या जबाबदाऱ्या शिक्षकांना व शिक्षकेत्तर कर्मचाऱ्यांना देण्यात येतात.\n३.२ समता व समावेशित दृष्टीकोन ठेऊन कर्मचाऱ्यांच्या नेमणुका केल्या आहेत.",
        isGreen: true
      }, {
        text: "४.१ शाळेत शैक्षणिक व प्रशासकीय बाबींसाठी पुरेशा प्रमाणात कर्मचारी नियुक्त केले आहेत.\n४.२ विद्यार्थी संख्येनुसार शाळा पूर्णवेळ समुपदेशक व विशेष शिक्षक नियुक्त करते.\n४.३ सध्याच्या धोरणानुसार / मार्गदर्शक तत्वानुसार शाळा समुपदेशक , क्रीडा शिक्षक व कला शिक्षक यांची नेमणूक करते."
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/1DU-57DGZJkkKpzCYB-jBShWGboMA0Djt"
    },
    en: {
      orangeDesc: "3.1.1 There are adequate qualified and competent staff in the school as per the criteria directed by the government for achieving the goals and objectives of the school.",
      options: [{
        text: "1.1 Adequate teaching and non-teaching staff are appointed in the school."
      }, {
        text: "2.1 Before the start of the academic year, the number of required staff is verified as per the staff approval.\n2.2 All appointments of staff in the school are done in the manner prescribed by the government."
      }, {
        text: "3.1 Responsibilities of school work are given to teachers and non-teaching staff according to their professional capacity.\n3.2 Staff appointments are made with an equity and inclusive approach.",
        isGreen: true
      }, {
        text: "4.1 Adequate staff are appointed in the school for academic and administrative matters.\n4.2 The school appoints full-time counselors and special educators according to the student strength.\n4.3 According to current policy/guidelines, the school appoints counselors, sports teachers, and art teachers."
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/1DU-57DGZJkkKpzCYB-jBShWGboMA0Djt"
    }
  },
  76: {
    mr: {
      orangeDesc: "३.१.२ शाळेमधील नवनियुक्त कर्मचारी / कर्मचारी यांचा राज्य / जिल्हा / तालुका / केंद्र स्तरावरील उदबोधन कार्यक्रमामध्ये सहभाग घेतात.",
      options: [{
        text: "१.१ कर्मचारी हे त्यांची कामे स्वतः , वरिष्ठ सहकारी यांच्या मार्गदर्शनात आत्मसात करतात."
      }, {
        text: "२.१ नवीन कर्मचारी यांना त्यांची जबाबदारी व कर्तव्ये या बाबत शाळाप्रमुख / मुख्याध्यापक / व्यवस्थापन यांचेकडून मार्गदर्शन केले जाते.",
        isGreen: true
      }, {
        text: "३.१ शाळाप्रमुख / व्यवस्थापन यांचेकडून सर्व कर्मचाऱ्यांकरिता उदबोधन वर्गाचे आयोजन केले जाते. या करिता सर्व कर्मचारी यांची उपस्थिती व सक्रिय सहभाग अनिवार्य असतो.\n३.२ नवीन कर्मचारी शाळेच्या जबाबदाऱ्या, कर्तव्ये आणि मूल्ये, प्रणाली याविषयी परिचय आहेत.\n३.३ कर्मचाऱ्यांना स्वतःच्या व्यक्तिमत्व विकासाची जाणीव असून ते याबाबत जागृत / अद्ययावत आहेत."
      }, {
        text: "४.१ शाळेची निर्धारित उद्दिष्टे (ध्येय) प्राप्त करणाऱ्या शिक्षकांकरिता व कर्मचाऱ्यांकरिता प्रोत्साहनपर योजना राबविली जाते.\n४.२ NEP२०२० नुसार प्रत्येक कर्मचाऱ्याच्या किमान ५० तास व्यावसायिक विकास संदर्भाने शाळास्तरावर नियोजन केले आहे.\n४.३ प्रत्येक कर्मचाऱ्यांच्या वैयक्तिक व व्यावसायिक विकासाचे पुनरावलोकन केले जाते."
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/1DVHSui6gR8Kezh3KxD77cPj-kg-fidLs"
    },
    en: {
      orangeDesc: "3.1.2 Newly appointed staff / staff in the school participate in orientation programs at the state / district / block / cluster level.",
      options: [{
        text: "1.1 Employees acquire their work on their own, under the guidance of senior colleagues."
      }, {
        text: "2.1 New employees are guided by the school head / headmaster / management regarding their responsibilities and duties.",
        isGreen: true
      }, {
        text: "3.1 Orientation classes are organized for all employees by the school head / management. Attendance and active participation of all employees is mandatory for this.\n3.2 New employees are familiar with the school's responsibilities, duties, values, and system.\n3.3 Employees are aware of their personal development and are active/updated about it."
      }, {
        text: "4.1 Incentive schemes are implemented for teachers and staff who achieve the set goals of the school.\n4.2 As per NEP 2020, planning has been done at the school level for at least 50 hours of professional development for each employee.\n4.3 Review of personal and professional development of each employee is conducted."
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/1DVHSui6gR8Kezh3KxD77cPj-kg-fidLs"
    }
  },
  77: {
    mr: {
      orangeDesc: "३.१.३ शाळा / केंद्र / तालुका स्तरावर कर्मचाऱ्यांचे मूल्यांकन केले जाते.",
      options: [{
        text: "१.१ मुख्याध्यापक लॉगबुक मध्ये वर्ग निरीक्षणाच्या नोंदी करतात.\n१.२ मुख्याध्यापक शिक्षक मूल्यांकनाचे पूर्वनिर्धारित निकष शिक्षकांच्या निदर्शनास आणून देतात.",
        isGreen: true
      }, {
        text: "२.१ पूर्वनिर्धारित निकषांच्या आधारे शालेय कर्मचाऱ्यांचे मूल्यांकन केले जाते."
      }, {
        text: "३.१ कर्मचारी कामाबाबत समाधान व कामात येणाऱ्या अडचणी संदर्भात शाळा अधिकाऱ्यांसह चर्चा करतात.\n३.२ मूल्यमापनाच्या अंती कर्मचाऱ्याला चर्चा करण्यासाठी संधी दिली जाते."
      }, {
        text: "४.१ कर्मचाऱ्यांना त्यांच्या मूल्यमापनाच्या निकालाचे विश्लेषण करून शाळा, अधिकारी योग्य ते विश्लेषण करतात.\n४.२ शाळा प्रमुख / मुख्याध्यापक प्रत्येक कर्मचाऱ्यांशी वर्षभरात ठराविक कालावधीत सतत चर्चा करतात. (SWOT विश्लेषण)\n४.३ NCERT द्वारे प्रकाशित PINDICS (कार्य प्रदर्शन निर्देशांक) वापरून शिक्षकांना स्व-मूल्यमापन करण्यास प्रोत्साहित केले जाते."
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/1D_DOQrqYLkg4epHH2ItvGu7EN9vVlvVy"
    },
    en: {
      orangeDesc: "3.1.3 Staff evaluation is conducted at school / cluster / block level.",
      options: [{
        text: "1.1 Headmaster records classroom observations in the logbook.\n1.2 Headmaster brings the pre-determined criteria of teacher evaluation to the notice of teachers.",
        isGreen: true
      }, {
        text: "2.1 School staff evaluation is conducted on the basis of pre-determined criteria."
      }, {
        text: "3.1 Staff discuss job satisfaction and difficulties in work with school officials.\n3.2 At the end of the evaluation, opportunity is given to the employee for discussion."
      }, {
        text: "4.1 School and officials analyze the evaluation results of employees and provide appropriate analysis.\n4.2 School head / headmaster discusses continuously with each employee at specified intervals throughout the year (SWOT analysis).\n4.3 Teachers are encouraged to conduct self-evaluation using PINDICS (Performance Indicators for Teachers) published by NCERT."
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/1D_DOQrqYLkg4epHH2ItvGu7EN9vVlvVy"
    }
  },
  78: {
    mr: {
      orangeDesc: "३.१.४ शाळा CRC / BRC / DIET / प्रादेशिक कार्यालयाशी सल्लामसलत करून, कर्मचारी विकास कार्यक्रम आणि शिक्षकांची क्षमता वाढवते.",
      options: [{
        text: "१.१ शिक्षक शैक्षणिक विचारांचे आदानप्रदान करण्यासाठी शिक्षण परिषदेत सहभागी होतात."
      }, {
        text: "२.१ नवोपक्रम, सहशालेय उपक्रमांमध्ये शिक्षक CRC / BRC / DIET / राज्य स्तरावर सहभागी होऊन सादरीकरण करतात.\n२.२ शाळेतील इतर कर्मचारी कार्यसंस्कृती कार्यशाळेत सहभागी होतात.",
        isGreen: true
      }, {
        text: "३.१ सर्व कर्मचारी सदस्यांना समान संधी प्रदान केल्या जातात.\n३.२ नवीन कल्पनांच्या अंमलबजावणीचा परिणाम म्हणून विद्यार्थ्यांमध्ये होणारा बदल नोंदवला जातो.\n३.३ सर्व कर्मचाऱ्यांसाठी कार्यसंस्कृती विकसित करण्याची संधी उपलब्ध केली जाते."
      }, {
        text: "४.१ शाळेकडे मुख्याध्यापक, शिक्षक आणि इतर कर्मचारी यांच्या क्षमता वाढीसाठी त्यांच्या गरजेनुसार योजना आहेत.\n४.२ शाळा सर्व शिक्षक गरज असेल तेव्हा एका वर्षाच्या कालावधीत ज्ञान, कौशल्य आणि क्षमतांवर आधारित 'व्यावसायिक विकास ओळख' या कार्यशाळेतून गेले आहेत याची खात्री करते.\n४.३ शाळा हे सुनिश्चित करते की, कर्मचारी क्षमता विकास कार्यक्रमातून प्राप्त बाबींची अंमलबजावणी करतात.\n४.४ कर्मचाऱ्यांचे नियमित अंतराने mentoring केले जाते.\n४.५ शाळा कर्मचाऱ्यांसाठी ASK प्रणालीवर आधारित सक्षमीकरण कार्यक्रम राबविते."
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/1DhmML4sGbNaz7YY0YBQgYVHWODsr25az"
    },
    en: {
      orangeDesc: "3.1.4 The school consults with CRC / BRC / DIET / regional office to enhance staff development programs and teachers' capacities.",
      options: [{
        text: "1.1 Teachers participate in educational conferences to exchange educational ideas."
      }, {
        text: "2.1 Teachers participate and present in innovations and co-curricular activities at CRC / BRC / DIET / state level.\n2.2 Other school staff participate in work culture workshops.",
        isGreen: true
      }, {
        text: "3.1 Equal opportunities are provided to all staff members.\n3.2 Student behavioral change is recorded as a result of implementing new ideas.\n3.3 Opportunity is provided to develop work culture for all employees."
      }, {
        text: "4.1 The school has plans as per need to enhance capacities of headmaster, teachers and other staff.\n4.2 The school ensures all teachers have attended workshops based on knowledge, skills and capacities under 'Professional Development Profile' during a one-year period when needed.\n4.3 The school ensures that staff implement things learned from capacity development programs.\n4.4 Mentoring of employees is done at regular intervals.\n4.5 The school runs empowerment programs based on ASK system for staff."
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/1DhmML4sGbNaz7YY0YBQgYVHWODsr25az"
    }
  },
  79: {
    mr: {
      orangeDesc: "३.१.५ शाळा त्यांच्या नाविन्यपूर्ण / प्रभावी योगदानासाठी कर्मचाऱ्यांच्या कामाची ओळख आणि प्रशंसा प्रदान करते.",
      options: [{
        text: "१.१ परिपाठ व शाळा स्तरावरील सभांमध्ये कर्मचाऱ्यांचा सन्मान केला जातो."
      }, {
        text: "२.१ कर्मचाऱ्यांची गुणग्राहकता ओळखून त्यांच्या विविध स्तरावरील (स्थानिक / केंद्र / तालुका/ जिल्हा/ राज्य / राष्ट्रीय) प्राप्त प्रशिक्षण प्रमाणपत्राची दखल घेऊन सन्मानपत्र देण्यात येते.",
        isGreen: true
      }, {
        text: "३.१ शाळेत महिन्याचे सर्वोत्कृष्ट कर्मचारी धोरण तसेच तिमाही व वर्षातील सर्वोत्कृष्ट कर्मचारी धोरण सुरु आहे."
      }, {
        text: "४.१ कर्मचाऱ्यांना प्रेरित करण्यासाठी त्यांनी केलेल्या नाविन्यपूर्ण कामाचे सादरीकरण केले जाते व यशोगाथा लेखनासाठी प्रोत्साहित केले जाते.\n४.२ कर्मचाऱ्यांना नाविन्यपूर्ण कामकाजासाठी प्रोत्साहित केले जाते तसेच विविध स्तरावर कार्य करण्यासाठी संधी दिली जाते."
      }],
      hasEvidence: true
    },
    en: {
      orangeDesc: "3.1.5 The school provides recognition and praise for employees' work for their innovative / effective contributions.",
      options: [{
        text: "1.1 Employees are honored in assemblies and school-level meetings."
      }, {
        text: "2.1 Recognition is given by acknowledging training certificates received at various levels (local / cluster / block / district / state / national) and certificates of appreciation are awarded.",
        isGreen: true
      }, {
        text: "3.1 Best employee of the month policy, as well as quarterly and annual best employee policy, is active in the school."
      }, {
        text: "4.1 Presentation of innovative work done by employees is made to inspire them and they are encouraged to write success stories.\n4.2 Employees are encouraged for innovative work and given opportunities to work at various levels."
      }],
      hasEvidence: true
    }
  },
  80: {
    mr: {
      orangeDesc: "३.१.६ शाळेमध्ये कर्मचाऱ्यांच्या सदुपदेशनासाठी चांगली विकसित यंत्रणा आहे. (Online / Offline)",
      options: [{
        text: "१.१ शिक्षक, मुख्याध्यापक/ शाळा प्रमुख यांच्याशी शाळेतील आव्हानात्मक बाबींसंबंधी चर्चा करतात.",
        isGreen: true
      }, {
        text: "२.१ शाळेत ऑनलाईन आणि ऑफलाईन सदुपदेशन (Mentoring) करण्याचे नियोजन तथा वेळापत्रक तयार केलेले आहे"
      }, {
        text: "३.१ CRC/BRC/DIETयांचे सोबत प्रत्येक महिन्यात सदुपदेशन (Mentoring) कार्यक्रमाची सुयोग्य विषय सूचीसह नियोजन केलेले आहे.\n३.२ सदुपदेशन कार्यक्रमात शिक्षकांच्या अध्ययन -अध्यापन प्रक्रियेशी संबंधित मुद्द्यांबद्दल चर्चा केली जाते."
      }, {
        text: "४.१ सदुपदेशक (Mentor) आणि सदुपदेशी (Mentee) यांच्यात परस्पर सहमतीने सुधारणेकरिता कृती आराखडा बनविला जातो.\n४.२ आखलेल्या योजनेचे ठराविक कालावधीत पर्यवेक्षण आणि पुनरावलोकन करून आवश्यक ते बदल केले जातात.\n४.३ सदुपदेशन (Mentoring) कार्यक्रमात सहयोगी दृष्टीकोनाविरून उपाय शोधले जातात."
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/1DvtRkmbSdzXQO66lJIZilAGlqzyGN2TD"
    },
    en: {
      orangeDesc: "3.1.6 The school has a well-developed mechanism for mentoring of employees. (Online / Offline)",
      options: [{
        text: "1.1 Teachers discuss challenging school matters with headmaster/school head.",
        isGreen: true
      }, {
        text: "2.1 Planning and schedule have been prepared in the school for conducting online and offline mentoring."
      }, {
        text: "3.1 Mentoring programs with proper subject lists are planned with CRC/BRC/DIET every month.\n3.2 Issues related to teachers' learning-teaching process are discussed in mentoring programs."
      }, {
        text: "4.1 Action plan for improvement is created with mutual agreement between mentor and mentee.\n4.2 Required changes are made by supervising and reviewing the planned scheme at specified intervals.\n4.3 Solutions are sought from a collaborative perspective in mentoring programs."
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/1DvtRkmbSdzXQO66lJIZilAGlqzyGN2TD"
    }
  },
  81: {
    mr: {
      orangeDesc: "३.२.१ मुख्याध्यापक यांचेकडे शाळेला प्रगतीकडे नेण्याकरिता स्पष्ट दृष्टी आणि दिशा आहे.",
      options: [{
        text: "१.१ मुख्याध्यापक आपले निर्णय शालेय सहकाऱ्यांशी सामायिक करतात."
      }, {
        text: "२.१ मुख्याध्यापक हे पाठ नियोजन आणि अध्यापनशास्त्राबाबत शिक्षकांना मार्गदर्शन करतात तसेच कार्य-विभाजनाची सुनिश्चिती करतात.\n२.२ दैनंदिन कामाच्या व्यवस्थापनामध्ये शिक्षकांचा समावेश केला जातो.",
        isGreen: true
      }, {
        text: "३.१ इयत्ता व विषय निहाय अध्यापनशास्त्रीय वार्षिक आराखडा तयार करण्यासाठी शाळा प्रमुख पुढाकार घेतात.\n३.२ शाळा विकास आराखडा तयार करतांना Vision आणि Mission याबाबत कर्मचाऱ्यांच्या सभेत चर्चा केली जाते.\n३.३ मुख्याध्यापकहे अध्यापन आणि मूल्यमापनातील नाविन्यपूर्ण बाबी अवगत होण्यासाठी अध्ययन समूह, संशोधन किंवा तशाचप्रकारच्या उपक्रमात सहभागी असतात."
      }, {
        text: "४.१ मुख्याध्यापक हे वार्षिक अध्यापनशास्त्रीय आराखड्याची अंमलबजावणी करून परीक्षण करतात.\n४.२ विद्यार्थ्यांच्या अध्ययन निष्पत्तीत वृद्धी करण्यासाठी शाळा हस्तपुस्तिका तयार करून सराव करण्याची प्रक्रिया स्वीकारते.\n४.३ शाळा कर्मचारी विद्यार्थ्यांच्या सर्व स्तरावरील प्रगतीबाबत आढावा घेण्यासाठी तसेच प्रतिक्रिया देण्यासाठी विहित कालावधीत एकत्र येतात."
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/1E7ZZJ87m7d5nWm-8U0c3ybpy6VHLcKoY"
    },
    en: {
      orangeDesc: "3.2.1 The headmaster has a clear vision and direction to lead the school towards progress.",
      options: [{
        text: "1.1 The headmaster shares decisions with school colleagues."
      }, {
        text: "2.1 The headmaster guides teachers regarding lesson planning and pedagogy and ensures division of work.\n2.2 Teachers are involved in the management of daily work.",
        isGreen: true
      }, {
        text: "3.1 The school head takes initiative to prepare a pedagogical annual plan grade-wise and subject-wise.\n3.2 The vision and mission are discussed in the staff meeting while preparing the school development plan.\n3.3 The headmaster participates in learning groups, research, or similar activities to be aware of innovative aspects in teaching and evaluation."
      }, {
        text: "4.1 The headmaster implements and monitors the annual pedagogical plan.\n4.2 The school adopts the practice of preparing handbooks and practicing to increase learning outcomes of students.\n4.3 School staff meet within specified periods to review and give feedback on the progress of students at all levels."
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/1E7ZZJ87m7d5nWm-8U0c3ybpy6VHLcKoY"
    }
  },
  82: {
    mr: {
      orangeDesc: "३.३.१ मुख्याध्यापक शाळा विकास घडवून आणण्यासाठी भागधारकांशी प्रभावी संप्रेषणाद्वारे सहयोग आणि सुसंबंध प्रस्थापित करतात.",
      options: [{
        text: "१.१ मुख्याध्यापक सहकार्यांमध्ये होणाऱ्या संप्रेषणाची खात्री करतात.\n१.२ विद्यालय केंद्र स्तरावरील इतर शाळेशी सक्रीय शैक्षणिक आंतरक्रिया घडवून आणतात."
      }, {
        text: "२.१ महत्त्वपूर्ण माहितीचे आदानप्रदान पालक आणि इतर शालेय घटकांशी केले जाते.\n२.२ मुख्याध्यापक, शाळा प्रमुख आवश्यकतेनुसार शालेय घटकांशी संवाद साधतात आणि सक्रीय सहभागासाठी प्रयत्न करतात."
      }, {
        text: "३.१ विद्यार्थी सक्षमीकरण कार्यक्रमामध्ये विद्यार्थी आपले नैपुण्य दाखवितात.\n३.२ शाळेमध्ये सर्व भागधारक शाळा विकासासाठी व विद्यार्थी सक्षमीकरणासाठी प्रयत्न करतात."
      }, {
        text: "४.१ मुख्याध्यापक विद्यालयातील विविध घटकांशी मजबूत संबंध जोपासण्यासाठी विविध क्रियाकलापांचा उपयोग करतात.\n४.२ विद्यार्थ्यांना दर्जेदार शिक्षण अनुभव देण्यासाठी विविध स्वयंसेवी संस्था (सरकारी व बिगर सरकारी) यांचे सहकार्य घेतले जाते.\n४.३ मुख्याध्यापक शाळा सुधार योजना तयार करण्यासाठी विद्यालयातील विविध घटकांचे प्रतिसाद, अभिप्राय, सूचना विचारात घेतात.",
        isGreen: true
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/1EDo-fj9wtXJ8OAXZCFTjF7dzjsJ9SNFD"
    },
    en: {
      orangeDesc: "3.3.1 The headmaster establishes cooperation and good relations through effective communication with stakeholders to bring about school development.",
      options: [{
        text: "1.1 The headmaster ensures communication among colleagues.\n1.2 Active academic interactions are conducted with other schools at the cluster resource center level."
      }, {
        text: "2.1 Critical information is exchanged with parents and other school stakeholders.\n2.2 The headmaster, school head communicates with school stakeholders as per need and endeavors for active participation."
      }, {
        text: "3.1 Students showcase their skills in student empowerment programs.\n3.2 All stakeholders in the school make efforts for school development and student empowerment."
      }, {
        text: "4.1 The headmaster uses various activities to foster strong relationships with various stakeholders of the school.\n4.2 Cooperation of various non-governmental organizations (governmental and non-governmental) is taken to provide quality learning experience to students.\n4.3 The headmaster considers responses, feedback, and suggestions of various stakeholders in the school to prepare school improvement plans.",
        isGreen: true
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/1EDo-fj9wtXJ8OAXZCFTjF7dzjsJ9SNFD"
    }
  },
  83: {
    mr: {
      orangeDesc: "३.४.१ शाळा व्यवस्थापन,मुख्याध्यापक आणि सर्व कर्मचारी मिळून चालू असलेल्या बदलांचे मार्गदर्शन करणारी परिवर्तनात्मक भूमिका विकसित करतात आणि नियमितपणे पुनर्विलोकन करतात.",
      options: [{
        text: "१.१ शाळा होऊ घातलेले बदल आणि गुणवत्ता व्यवस्थापनासाठी प्रणाली स्वीकार करते."
      }, {
        text: "२.१ आवश्यकतेनुसार कर्मचाऱ्यांची क्षमता वाढविली जाते (शाळा / केंद्र / तालुका / जिल्हा / राज्य स्तरावर होणाऱ्या CBP( Capacity Building Program) मध्ये सहभागी होण्याची संधी दिली जाते)."
      }, {
        text: "३.१ कर्मचाऱ्यांच्या क्षमतेनुसार कामांची जबाबदारी सोपवतात.\n३.२ सोपविलेल्या जबाबदारीचा आढावा नियमितपणे घेतला जातो.",
        isGreen: true
      }, {
        text: "४.१ मुख्याध्यापक हे शिक्षण क्षेत्रात सुरु असलेल्या अद्ययावत उपक्रमांविषयी सातत्याने जाणून घेण्यासाठी विविध शैक्षणिक संशोधनात्मक किंवा अनुषंगिक मंचाशी संलग्न आहेत.\n४.२ विविध शैक्षणिक मंचांमधील सहभागाद्वारे अद्ययावत बदलांची अंमलबजावणी शाळेत करतात."
      }],
      hasEvidence: true
    },
    en: {
      orangeDesc: "3.4.1 The school management, headmaster, and all staff together develop a transformative role guiding ongoing changes and regularly conduct reviews.",
      options: [{
        text: "1.1 The school adopts systems for impending changes and quality management."
      }, {
        text: "2.1 Capacity of staff is built as per need (opportunities are given to participate in CBP (Capacity Building Program) held at school / cluster / block / district / state level)."
      }, {
        text: "3.1 Responsibilities of tasks are assigned according to the capacities of employees.\n3.2 Review of assigned responsibilities is conducted regularly.",
        isGreen: true
      }, {
        text: "4.1 The headmaster is continuously connected with various educational research or allied forums to keep abreast of current initiatives in the field of education.\n4.2 The headmaster implements updated changes in the school through participation in various educational forums."
      }],
      hasEvidence: true
    }
  },
  84: {
    mr: {
      orangeDesc: "३.५.१. SCERT / DIET अशा व्यावसायिक विकास संस्थांच्या सहाय्याने शिक्षक, क्षमता बांधणी व व्यावसायिक विकासाच्या प्रक्रियेत सहभागी होतात.",
      options: [{
        text: "१.१ SCERT / DIET अशा व्यावसायिक विकास संस्थांच्या सहाय्याने शिक्षक क्षमता बांधणी व व्यावसायिक विकासाच्या प्रक्रियेत सहभागी होतात."
      }, {
        text: "२.१.शाळा शिक्षकांच्या व्यावसायिक विकास / क्षमता बांधणीकरिता विविध नावीन्यपूर्ण प्रक्रिया पद्धती / कृती / उपक्रम इ. वर लक्ष केंद्रित करते."
      }, {
        text: "३.१ शिक्षकांच्या कामाचे वेळोवेळी मूल्यमापन केले जाते व त्यानुसार गरजेनुरूप शिक्षकांच्या व्यावसायिक विकास / क्षमता बांधणीविषयीचे नियोजनपूर्वक उपाय अवलंबिले जातात."
      }, {
        text: "४.१ व्यावसायिक विकास आणि क्षमताबाधणी करिता सर्वांना समान संधी उपलब्ध करून दिली जाते.\n४.२ शिक्षकांच्या क्षमताबाधणीचा लाभ हा विद्यार्थ्यांना होतो.",
        isGreen: true
      }],
      hasEvidence: true
    },
    en: {
      orangeDesc: "3.5.1. With the help of professional development institutions like SCERT / DIET, teachers participate in the process of capacity building and professional development.",
      options: [{
        text: "1.1 With the help of professional development institutions like SCERT / DIET, teachers participate in the process of capacity building and professional development."
      }, {
        text: "2.1 The school focuses on various innovative processes/methods/activities/initiatives etc. for professional development/capacity building of teachers."
      }, {
        text: "3.1 Teachers' work is evaluated from time to time and planned measures for professional development/capacity building of teachers are adopted accordingly as per need."
      }, {
        text: "4.1 Equal opportunities are provided to everyone for professional development and capacity building.\n4.2 Students benefit from the capacity building of teachers.",
        isGreen: true
      }],
      hasEvidence: true
    }
  },
  85: {
    mr: {
      orangeDesc: "३.५.२. शाळेच्या एकूण उपलब्ध वेळेपैकी शिक्षकांकडे अध्यापनाकरिता वापरलेल्या वेळेची टक्केवारी / प्रमाण.",
      options: [{
        text: "१.१ अध्यापकीय तसेच अध्यापनाव्यतिरिक्त कामे यासाठी शाळा/शाळेत विचारपूर्वक कृती आराखडा व वेळापत्रक तयार करते/केला जातो."
      }, {
        text: "२.१ शाळा अध्यापनाकरिता वापरलेल्या वेळेचे पुनर्विलोकन करते आणि गरज असेल तिथे आवश्यक उपाय, योजनात्मक पावले उचलते."
      }, {
        text: "३.१ शाळा सहाध्यायी अध्यापन आणि निवृत्त शिक्षक, माजी विद्यार्थी, स्वयंसेवक व समुपदेशक इत्यादींच्या सहाय्याने शाळेतील अध्ययन अध्यापन प्रक्रिया समृद्ध करते.",
        isGreen: true
      }, {
        text: "४.१ शाळा पुरेसा प्रमाणात शिक्षक आणि शिक्षकेत्तर कर्मचाऱ्यांची नियुक्ती करते.\n४.२ शालेय कामासाठी स्वच्छता कर्मचारी तसेच सुरक्षा रक्षक इत्यादींची नियुक्ती करते."
      }],
      hasEvidence: true
    },
    en: {
      orangeDesc: "3.5.2. Percentage / proportion of time used for teaching by teachers out of the total available school time.",
      options: [{
        text: "1.1 The school prepares/makes a thoughtful action plan and timetable for teaching as well as non-teaching tasks."
      }, {
        text: "2.1 The school reviews the time used for teaching and takes necessary remedies/systematic steps where needed."
      }, {
        text: "3.1 The school enriches the teaching-learning process in the school with the help of peer teaching and retired teachers, alumni, volunteers, and counselors etc.",
        isGreen: true
      }, {
        text: "4.1 The school appoints adequate number of teaching and non-teaching staff.\n4.2 The school appoints cleaning staff and security guards etc. for school work."
      }],
      hasEvidence: true
    }
  },
  86: {
    mr: {
      orangeDesc: "३.५.३ शिक्षकांचे वर्गातील एकंदरीत कामगिरीबाबत पालक व विद्यार्थ्यांचे अभिप्राय.",
      options: [{
        text: "१.१ शिक्षक-पालकसंघ सभेमध्ये पालकांची उपस्थिती लक्षणीय आहे."
      }, {
        text: "२.१ शिक्षक- पालकसंघ सभेमध्ये वर्गातील अध्यापन कार्य, आंतरक्रिया याबाबत पालक समाधान व्यक्त करतात."
      }, {
        text: "३.१ शिक्षकांच्या वर्गाध्यापनातील कामगिरीबाबत अभिप्राय व्यक्त करण्यासाठी विद्यार्थी सूचना पेटी ठेवली आहे."
      }, {
        text: "४.१ मुख्याध्यापक व शिक्षकांच्या वर्ग अध्यापनाविषयी पालक व विद्यार्थ्यांकडून अभिप्राय प्राप्त करून घेऊन कार्यवाही केली जाते.",
        isGreen: true
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/1ELnMUe9Up-j98rY6G3-ZjHPtSTItE"
    },
    en: {
      orangeDesc: "3.5.3 Feedbacks of parents and students regarding the overall performance of teachers in the classroom.",
      options: [{
        text: "1.1 Parents' attendance in parent-teacher association meetings is significant."
      }, {
        text: "1.2 Parents express satisfaction regarding classroom teaching work and interactions in parent-teacher association meetings."
      }, {
        text: "1.3 A student suggestion box is kept to express feedback regarding teachers' classroom teaching performance."
      }, {
        text: "1.4 The headmaster takes action after receiving feedback from parents and students about the classroom teaching of teachers.",
        isGreen: true
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/1ELnMUe9Up-j98rY6G3-ZjHPtSTItE"
    }
  },
  87: {
    mr: {
      orangeDesc: "४.१.१ शाळा दिव्यांग आणि सर्व सामाजिक आर्थिक पार्श्वभूमीतील विद्यार्थ्यांना भौतिक वातावरणाच्या दृष्टीने (रॅम्प, हँड्रील, अपंगासाठी अनुकूल शौचालय) अडथळा मुक्त प्रवेश प्रदान करते.",
      options: [{
        text: "१.१ सर्वसमावेशक विद्यार्थ्यांकरिता शाळेत पायाभूत सुविधा उपलब्ध आहेत."
      }, {
        text: "२.१ शाळेत अध्ययनशैलीला अनुसरून अध्ययन - अध्यापन साहित्य उपलब्ध आहे.\n२.२ विद्यार्थ्यांच्या गरजेनुसार वर्गात बैठक व्यवस्था उपलब्ध आहे."
      }, {
        text: "३.१ पायाभूत सुविधांचे अवलोकन करून आवश्यक सेवा, सुविधा, साहित्य पुरविले जाते."
      }, {
        text: "४.१ विद्यार्थी पायाभूत सुविधांचा वापर करून समाधानी आहेत.",
        isGreen: true
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/1EO4LqhtplBN7elBebWibu71s37_"
    },
    en: {
      orangeDesc: "4.1.1 The school provides barrier-free access in terms of physical environment (ramps, handrails, disabled-friendly toilets) to disabled students and students from all socio-economic backgrounds.",
      options: [{
        text: "1.1 Infrastructure facilities are available in the school for inclusive students."
      }, {
        text: "2.1 Teaching-learning materials matching learning styles are available in the school.\n2.2 Seating arrangements in the classroom are available according to the needs of students."
      }, {
        text: "3.1 Necessary services, facilities, and materials are provided after observing the infrastructure."
      }, {
        text: "4.1 Students are satisfied using the infrastructure facilities.",
        isGreen: true
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/1EO4LqhtplBN7elBebWibu71s37_"
    }
  },
  88: {
    mr: {
      orangeDesc: "४.१.२ शाळा दिव्यांग विद्यार्थ्यांना अभ्यासक्रमाच्या दृष्टीने अडथळा मुक्त प्रवेश प्रदान करते.",
      options: [{
        text: "१.१ वर्ग आंतरक्रियेत दिव्यांग, आर्थिक, सामाजिक पार्श्वभूमीतील विद्यार्थ्यांचा समावेश केला जातो.",
        isGreen: true
      }, {
        text: "२.१ दिव्यांग विद्यार्थ्यासाठी असणारे विविध शैक्षणिक Apps आणि संसाधने,साहित्य (BARKHA , PARAKH आणि इतर साधने) वापरण्यास शिक्षकांना प्रोत्साहन दिले जाते.\n२.२ सर्व विद्यार्थ्यांचा स्तर लक्षात घेऊन शिक्षक विविध अध्ययनशैलीचा वापर करतात.\n२.३ शिक्षक दिव्यांग विद्यार्थ्यांना त्यांचे वर्ग काम / स्वाध्याय पूर्ण करण्यासाठी अतिरिक्त वेळ देतात."
      }, {
        text: "३.१ दिव्यांग विद्यार्थ्यासाठी समुपदेशक आणि प्रशिक्षित कर्मचारी शाळेत नियुक्त केले जातात.\n३.२ विद्यार्थ्यांच्या गरजानुसार व्यावसायिक अभ्यासक्रम व कौशल्य आधारित कृती घेतल्या जातात."
      }, {
        text: "४.१ शाळा समता आणि समावेशित शिक्षणाच्या दृष्टीने नियोजन करतात.\n४.२ विद्यार्थ्यांच्या शैक्षणिक गरजा निश्चित करण्यासाठी विशिष्ट यंत्रणा आहे.\n४.३ दिव्यांग विद्यार्थ्यांच्या सर्वांगीण विकासाच्या उद्देशाने वेळ, संसाधने, अध्ययन-अध्यापन पद्धती/ सादरीकरण यामध्ये लवचिकता बाळगून कृती कार्यक्रम आयोजित केला जातो.\n४.४ RTE-२००९ नुसार २५%प्रवेश प्रदान करते. ( इ.पहिली स्वयं अर्थसहाय्य शाळा ) विद्यार्थ्यांच्या अध्ययन निष्पत्तीचे नियमितपणे पुनरावलोकन केले जाते आणि विश्लेषणावर आधारित कृतीची योजना आखली जाते."
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/1EOAACWijMYC7MD8f3_BCoSr9QsFtUerh"
    },
    en: {
      orangeDesc: "4.1.2 The school provides barrier-free access in terms of curriculum to disabled students.",
      options: [{
        text: "1.1 Disabled, socio-economically disadvantaged students are included in classroom interaction.",
        isGreen: true
      }, {
        text: "2.1 Teachers are encouraged to use various educational Apps and resources, materials (BARKHA, PARAKH and other resources) for disabled students.\n2.2 Teachers use different learning styles considering the level of all students.\n2.3 Teachers give extra time to disabled students to complete their classwork / assignments."
      }, {
        text: "3.1 Counselors and trained staff are appointed in the school for disabled students.\n3.2 Vocational courses and skill-based activities are conducted according to the needs of students."
      }, {
        text: "4.1 The school plans from the perspective of equity and inclusive education.\n4.2 There is a specific mechanism to identify the educational needs of students.\n4.3 Flexibility is maintained in time, resources, learning-teaching methods/presentation to conduct action programs aiming at the overall development of disabled students.\n4.4 Under RTE-2009, 25% admission is provided (Std 1st self-financed school). Learning outcomes of students are reviewed regularly and action is planned based on analysis."
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/1EOAACWijMYC7MD8f3_BCoSr9QsFtUerh"
    }
  },
  89: {
    mr: {
      orangeDesc: "४.१.३ शाळा दिव्यांग विद्यार्थ्यांना शिकविण्याच्या आणि मूल्यमापनाबाबत अडचणीमुक्त प्रवेश प्रदान करते.",
      options: [{
        text: "१.१ शिक्षक दिव्यांग विद्यार्थ्यांना इतर विद्यार्थ्यांसोबत शिकवतात व मूल्यमापन करतात.",
        isGreen: true
      }, {
        text: "२.१ शिक्षक अध्यापनाच्या विविध पद्धतींचा वापर करतात.\n२.२ शिक्षक दिव्यांग विद्यार्थ्यांना संप्रेषणाच्या संधी, आंतरक्रिया आणि अध्ययनपूरक वातावरण मिळावे अशी बैठक व्यवस्था करतात."
      }, {
        text: "३.१ शिक्षक दिव्यांग विद्यार्थ्याच्या अध्ययन गरजा आधारित आकारिक आणि उपचारात्मक मूल्यमापनाचे आयोजन करतात. .\n३.२ शाळा विशेष गरजा असणाऱ्या विद्यार्थ्यांच्या अध्ययन गरजांसाठी बाह्य प्रशिक्षकांची मदत घेते."
      }, {
        text: "४.१ शिक्षक विशेष शिक्षक, पालक, थेरपिस्ट, समुपदेशक आणि प्रशासक यांच्या निकट सहकार्याने काम करतात.\n४.२ शिक्षक विद्यार्थ्यांच्या वैयक्तिक अध्ययन नियोजनानुसार सर्वांगीण विकासाचे नियोजन करतात."
      }],
      hasEvidence: true
    },
    en: {
      orangeDesc: "4.1.3 The school provides barrier-free access in terms of teaching and evaluation to disabled students.",
      options: [{
        text: "1.1 Teachers teach and evaluate disabled students along with other students.",
        isGreen: true
      }, {
        text: "2.1 Teachers use various methods of teaching.\n2.2 Teachers arrange seating to provide opportunities for communication, interaction, and a learning-supportive environment for disabled students."
      }, {
        text: "3.1 Teachers organize formative and diagnostic/remedial evaluations based on the learning needs of disabled students.\n3.2 The school takes the help of external trainers for the learning needs of students with special needs."
      }, {
        text: "4.1 Teachers work in close cooperation with special education teachers, parents, therapists, counselors, and administrators.\n4.2 Teachers plan for overall development according to the individual learning plans of students."
      }],
      hasEvidence: true
    }
  },
  90: {
    mr: {
      orangeDesc: "४.१.४ दिव्यांग विद्यार्थ्यांना अडथळा विरहित शिक्षण घेण्यासाठी आर्थिक सहाय्य व साहित्य साधने पुरविली जातात.",
      options: [{
        text: "१.१ शाळा शैक्षणिक / आर्थिक सेवा सुविधा लाभार्थी यादी तयार करते."
      }, {
        text: "२.१ शाळा पालकांना समुपदेशन करते.\n२.२ शाळा संबंधीत लाभार्थ्यांना शासन आयोजित शिबिरात उपस्थित ठेवते.\n२.३ शाळा लाभार्थी विद्यार्थ्यांचे प्रस्ताव वरिष्ठ कार्यालयात सादर करतात.",
        isGreen: true
      }, {
        text: "३.१ शाळा शैक्षणिक / साहित्य व आर्थिक लाभ मिळण्याकरिता प्रयत्न करते."
      }, {
        text: "४.१ शाळेस मिळालेल्या साहित्याचा विद्यार्थ्याकडून वापर केला जातो याचे निरीक्षण व पुनरावलोकन केले जाते."
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/1mCRFeHsTDmFaDPpBf4mSBFUT-dOBxY9M-"
    },
    en: {
      orangeDesc: "4.1.4 Disabled students are provided with financial assistance and materials/tools to access barrier-free education.",
      options: [{
        text: "1.1 The school prepares a list of beneficiaries of educational / financial services and facilities."
      }, {
        text: "2.1 The school counsels parents.\n2.2 The school ensures the attendance of concerned beneficiaries in government-organized camps.\n2.3 The school submits proposals of beneficiary students to senior offices.",
        isGreen: true
      }, {
        text: "3.1 The school makes efforts to obtain educational / material and financial benefits."
      }, {
        text: "4.1 The use of materials received by the school by students is monitored and reviewed."
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/1mCRFeHsTDmFaDPpBf4mSBFUT-dOBxY9M-"
    }
  },
  91: {
    mr: {
      orangeDesc: "४.२.१ शाळा दिव्यांग विद्यार्थ्यांना पुरेसा बैठे आणि मैदानी खेळ तसेच इतर मनोरंजनाच्या सुविधा पुरविते.",
      options: [{
        text: "१.१ दिव्यांग विद्यार्थी शाळेच्या बैठे खेळ आणि मैदानी खेळामध्ये व इतर कृतीमध्ये सहभागी होतात.",
        isGreen: true
      }, {
        text: "२.१ दिव्यांग मुलांना इच्छित खेळ खेळण्यासाठी वैद्यकीय प्रमाणपत्र / पालकांकडून संमती घेतली जाते.\n२.२ दिव्यांग विद्यार्थ्यांना बैठे खेळ आणि मैदानी खेळासाठी सोयी सुविधा उपलब्ध आहेत."
      }, {
        text: "३.१ दिव्यांग मुलांना खेळण्यामध्ये सहभागी होण्यासाठी शिक्षक पालकांना समुपदेशन आणि प्रोत्साहन देतात.\n३.२ दिव्यांगाच्या गरजा समजून शिक्षक त्यांच्यासाठी सुरक्षित आणि आरोग्यदायी अनुभव पुरवितात."
      }, {
        text: "४.१ खेळ व मनोरंजन सुविधा या प्रक्रियेचे मार्गदर्शन, निरीक्षण आणि पुनरावलोकन केले जाते.\n४.२ पूर्व निर्धारित निकषांवर विद्यार्थ्यांच्या प्रगतीचे नियमितपणे परीक्षण केले जाते."
      }],
      hasEvidence: true
    },
    en: {
      orangeDesc: "4.2.1 The school provides adequate indoor and outdoor sports as well as other recreational facilities for disabled students.",
      options: [{
        text: "1.1 Disabled students participate in school indoor sports and outdoor sports and other activities.",
        isGreen: true
      }, {
        text: "2.1 Medical certificate / consent from parents is taken for disabled children to play desired sports.\n2.2 Facilities are available for disabled students for indoor sports and outdoor sports."
      }, {
        text: "3.1 Teachers counsel and encourage parents to involve disabled children in sports.\n3.2 Understanding the needs of disabled students, teachers provide safe and healthy experiences for them."
      }, {
        text: "4.1 Guidance, monitoring, and review of play and recreation facilities are conducted.\n4.2 Student progress is regularly tested on pre-determined criteria."
      }],
      hasEvidence: true
    }
  },
  92: {
    mr: {
      orangeDesc: "४.३.१ शाळा दिव्यांगाना पुरेशी वाहतूक सुविधा पुरवते. (मानकानुसार वाहतूक सुविधा पुरविणाऱ्या शाळांच्या बाबतीत)",
      options: [{
        text: "१.१ शाळेतील इतर मुलांसह दिव्यांग मुलांनाही वाहतूक सुविधा पुरविली जाते."
      }, {
        text: "२.१ परिवहन समितीची स्थापना केली आहे व नियमित बैठक होतात.\n२.२ लागू असल्यास शाळेच्या बस मध्ये दिव्यांगासोबत मदतनीस उपलब्ध करून दिले जाते."
      }, {
        text: "३.१ दिव्यांग, सहअध्यायी/ वर्गमित्र, मदतनीस आणि शिक्षक यांना वाहतूक संबंधित प्रशिक्षण दिले जाते."
      }, {
        text: "४.१ दिव्यांग विद्यार्थी परिवहन सुविधा संदर्भात अंमलबजावणी प्रक्रियेचे नियमित निरीक्षण आणि पुनरावलोकन केले जाते."
      }, {
        text: "वाहतूक सुविधा न पुरविणाऱ्या शाळांच्या बाबतीत लागू नाही.",
        isGreen: true
      }]
    },
    en: {
      orangeDesc: "4.3.1 The school provides adequate transport facilities to disabled students (for schools providing transport facilities as per standards).",
      options: [{
        text: "1.1 Transport facility is provided to disabled children along with other children in the school."
      }, {
        text: "2.1 Transport committee is established and regular meetings are held.\n2.2 Assistant is provided with disabled students in school bus, if applicable."
      }, {
        text: "3.1 Training related to transport is provided to disabled students, peers/classmates, assistants, and teachers."
      }, {
        text: "4.1 Regular monitoring and review of implementation process regarding transport facility for disabled students is conducted."
      }, {
        text: "Not Applicable for schools not providing transport facility.",
        isGreen: true
      }]
    }
  },
  93: {
    mr: {
      orangeDesc: "४.४.१ शाळा सर्व सामाजिक, आर्थिक व वंचित पार्श्वभूमीतील आणि दिव्यांग विद्यार्थ्यांबाबत सर्व भागधारकांसाठी प्रशिक्षण आणि जाणीव जागृतीविषयक कार्यक्रम आयोजित करते.",
      options: [{
        text: "१.१ शाळेकडे समता, समानता व समावेशनाबाबत धोरण आहे."
      }, {
        text: "२.१ समावेशित शिक्षणाबाबत मुख्याध्यापक आणि शिक्षक यांची जाणीव जागृती केली जाते.\n२.२ शाळा सामान्य शिक्षकांचे दिव्यांगाबाबत क्षमता विकसन करते."
      }, {
        text: "३.१ शाळा पालक, SMC सदस्य यांना दिव्यांगाबाबत उद्बोधन वर्ग आयोजित करते.\n३.२ शाळा विविध पार्श्वभूमीतील पालकांना उपक्रमामध्ये सहभागी होण्यासाठी प्रोत्साहित करते."
      }, {
        text: "४.१ सर्व शिक्षक विद्यार्थ्यांच्या सामाजिक, सांस्कृतिक पार्श्वभूमीबद्दल जागृत असून कोणत्याही कारणास्तव भेदभाव करत नाहीत.",
        isGreen: true
      }]
    },
    en: {
      orangeDesc: "4.4.1 The school organizes training and awareness programs for all stakeholders regarding students from all social, economic, and disadvantaged backgrounds, and disabled students.",
      options: [{
        text: "1.1 The school has a policy on equity, equality, and inclusion."
      }, {
        text: "2.1 Headmaster and teachers are sensitized about inclusive education.\n2.2 The school builds the capacity of general teachers regarding disabled students."
      }, {
        text: "3.1 The school organizes orientation classes for parents and SMC members regarding disabled students.\n3.2 The school encourages parents from various backgrounds to participate in activities."
      }, {
        text: "4.1 All teachers are aware of the social and cultural backgrounds of students and do not discriminate for any reason.",
        isGreen: true
      }]
    }
  },
  94: {
    mr: {
      orangeDesc: "४.५.१ शाळा विद्यार्थी सर्व्हेक्षणाद्वारे शाळाबाह्य बालकांचा मागोवा घेते.",
      options: [{
        text: "१.१ शाळा नियमितपणे विद्यार्थी पटनोंदणी सर्वेक्षण करते व नोंदणीकृत विद्यार्थ्यांचा मागोवा घेते."
      }, {
        text: "२.१ शाळाबाह्य (OOSC) नोंदणीनुसार सर्व विद्यार्थ्यांची शाळेत नोंदणी आहे व मुख्य प्रवाहात आहेत.\n२.२ शाळा विद्यार्थ्यांची स्थगिती व प्रगतीसाठी प्रयत्न करते."
      }, {
        text: "३.१ शाळा विद्यार्थ्यांची गैरहजेरी व गळती रोखण्यासाठी पावले उचलते."
      }, {
        text: "४.१ सर्व नोंदणीकृत मुले कायम ठेवली आणि पुढील इयत्तेमध्ये शंभर टक्के संक्रमण केली जातात.",
        isGreen: true
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/1EzfcyGjMuW1XolVe7nCyopoHkLT6"
    },
    en: {
      orangeDesc: "4.5.1 The school tracks out-of-school children through student surveys.",
      options: [{
        text: "1.1 The school regularly conducts student enrollment surveys and tracks enrolled students."
      }, {
        text: "2.1 All students are enrolled in school and mainstreamed as per Out-of-School Children (OOSC) registration.\n2.2 The school makes efforts for retention and progress of students."
      }, {
        text: "3.1 The school takes steps to prevent student absenteeism and dropout."
      }, {
        text: "4.1 All enrolled children are retained and transitioned 100% to the next grade.",
        isGreen: true
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/1EzfcyGjMuW1XolVe7nCyopoHkLT6"
    }
  },
  95: {
    mr: {
      orangeDesc: "४.६.१ शाळा दिव्यांगासाठी विशेष शिक्षक किंवा प्रशिक्षित शिक्षक उपलब्ध करुन देते व शिक्षकांची क्षमतावृद्धी करते.",
      options: [{
        text: "१.१ शाळेत दिव्यांगांच्या गरजा ओळखून त्यानुसार विशेष शिक्षक किंवा प्रशिक्षित शिक्षकांची नियुक्ती केली जाते."
      }, {
        text: "२.१ शाळा शिक्षकांना दिव्यांगांना शिकवण्यासाठी आवश्यक ते प्रशिक्षण आणि मार्गदर्शन पुरवते."
      }, {
        text: "३.१ विशेष शिक्षक नियमितपणे दिव्यांग विद्यार्थ्यांच्या प्रगतीचे मूल्यमापन करतात आणि पालकांशी संपर्क साधतात."
      }, {
        text: "४.१ दिव्यांग विद्यार्थ्यांसाठी स्वतंत्र शैक्षणिक योजना (IEP) राबवली जाते आणि त्यानुसार १००% अंमलबजावणी केली जाते.",
        isGreen: true
      }]
    },
    en: {
      orangeDesc: "4.6.1 The school provides special teachers or trained teachers for disabled students and builds the capacity of teachers.",
      options: [{
        text: "1.1 The school appoints special educators or trained teachers identifying the needs of disabled students."
      }, {
        text: "2.1 The school provides necessary training and guidance to teachers for teaching disabled students."
      }, {
        text: "3.1 Special teachers regularly evaluate the progress of disabled students and communicate with parents."
      }, {
        text: "4.1 Individualized Education Plan (IEP) is implemented for disabled students and 100% execution is ensured.",
        isGreen: true
      }]
    }
  },
  96: {
    mr: {
      orangeDesc: "४.७.१ विज्ञान, गणित, तंत्रज्ञान, कला, क्रीडा इत्यादी क्षेत्रातील विविध सामाजिक, आर्थिक पार्श्वभूमीतील प्रतिभावान मुलांना शाळा मार्गदर्शन करते.",
      options: [{
        text: "१.१ प्रतिभावान, हुशार मुले शोधण्यासाठी शाळा विविध प्रणाली/पद्धती/साधने वापरते."
      }, {
        text: "२.१ शाळा विविध वयोगटातील प्रतिभावान, हुशार बालकांसाठी उपलब्ध online साहित्याच्या माध्यमातून विविध अध्ययन पर्याय मिळवून देते."
      }, {
        text: "३.१ प्रतिभासंपन्न, हुशार मुले आणि त्यांच्या पालकांसाठी सेमिनारचे आयोजन केले जाते.\n३.२ पालक, समाज आणि स्वयंसेवी संस्थांमार्फत मार्गदर्शन केले जाते.",
        isGreen: true
      }, {
        text: "४.१ विविध सामाजिक, आर्थिक पार्श्वभूमी असलेल्या विद्यार्थ्यांसाठी शाळा सहाय्यक सेवा व संसाधन उपलब्ध करून देते.\n४.२ शाळेमध्ये प्रतिभावान विद्यार्थ्यांनी यश संपादन केले आहे."
      }]
    },
    en: {
      orangeDesc: "4.7.1 The school guides talented children from diverse social and economic backgrounds in areas like science, mathematics, technology, art, sports, etc.",
      options: [{
        text: "1.1 The school uses various systems/methods/tools to identify talented, smart children."
      }, {
        text: "2.1 The school provides various learning options through available online materials for talented, smart children of different age groups."
      }, {
        text: "3.1 Seminars are organized for talented, smart children and their parents.\n3.2 Guidance is provided through parents, community, and NGOs.",
        isGreen: true
      }, {
        text: "4.1 The school provides support services and resources for students with diverse social and economic backgrounds.\n4.2 Talented students in the school have achieved success."
      }]
    }
  },
  97: {
    mr: {
      orangeDesc: "४.८.१ शाळा शिक्षकांना मातृभाषा /स्थानिक /बोली भाषेत शिकविण्याचे शैक्षणिक साहित्य पुरविते.",
      options: [{
        text: "१.१ शाळा मातृभाषा व स्थानिक/प्रादेशिक भाषेत विद्यार्थी व शिक्षकांना शैक्षणिक साहित्य (TLM) उपलब्ध करून देते."
      }, {
        text: "२.१ किमान २५% (TLM) शैक्षणिक साहित्य स्थानिक /प्रादेशिक भाषांमध्ये उपलब्ध आहे व त्याचा वापर करतात."
      }, {
        text: "३.१ किमान ५० % (TLM) शैक्षणिक साहित्य स्थानिक /प्रादेशिक भाषांमध्ये आहे व त्या साहित्याचा प्रमाणभाषेशी सांगड घालून वापर केला जातो."
      }, {
        text: "४.१ सर्व साहित्य स्थानिक /प्रादेशिक भाषेत उपलब्ध आहे व त्याचा वापर केला जातो.",
        isGreen: true
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/1F3BrrwNtsh7WymgNo9a3AT7GhY9"
    },
    en: {
      orangeDesc: "4.8.1 The school provides teaching-learning materials to teachers for teaching in mother tongue / local / dialect language.",
      options: [{
        text: "1.1 The school provides teaching-learning materials (TLM) in mother tongue and local/regional language to students and teachers."
      }, {
        text: "2.1 At least 25% of teaching-learning materials (TLM) are available in local/regional languages and are being used."
      }, {
        text: "3.1 At least 50% of teaching-learning materials (TLM) are available in local/regional languages and are used in conjunction with standard language materials."
      }, {
        text: "4.1 All materials are available in local/regional language and are being used.",
        isGreen: true
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/1F3BrrwNtsh7WymgNo9a3AT7GhY9"
    }
  },
  98: {
    mr: {
      orangeDesc: "४.९.१. शाळा नियमितपणे दिव्यांगत्वासाठी शालेय, केंद्र व तालुका स्तरावर तपासणी शिबीरात सहभाग व आयोजन करते.",
      options: [{
        text: "१.१ शाळा दिव्यांगत्वासाठी नियमितपणे शाळा, केंद्र, तालुका स्तरावर तपासणी शिबिरात सहभागी होतात",
        isGreen: true
      }, {
        text: "२.१ शाळास्तरावर दिव्यांगत्वासाठी शिबीरांचे आयोजन केले जाते."
      }, {
        text: "३.१ शाळा, केंद्र, तालुका स्तरावर दिव्यांगांच्या शिबीर आयोजनासाठी पालक व समाजाचा सहभाग घेतला जातो."
      }, {
        text: "४.१ दिव्यांग विद्यार्थ्यांचे समुपदेशन केले जाते."
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/1F49H-Y_obbT5WduXIDvicgkqSEoOz60d"
    },
    en: {
      orangeDesc: "4.9.1 The school regularly participates in and organizes screening camps for disabilities at school, cluster, and taluka levels.",
      options: [{
        text: "1.1 The school regularly participates in screening camps for disabilities at school, cluster, and taluka levels.",
        isGreen: true
      }, {
        text: "2.1 Camps for disability screening are organized at the school level."
      }, {
        text: "3.1 Parents and community participation is ensured in organizing disability camps at school, cluster, and taluka levels."
      }, {
        text: "4.1 Counseling of disabled students is conducted."
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/1F49H-Y_obbT5WduXIDvicgkqSEoOz60d"
    }
  },
  99: {
    mr: {
      orangeDesc: "४.१०.१ शाळा मुलींना भेदभाव विरहित क्रीडा, STEAM संधी, कलाशिक्षण, व्यवसायिक शिक्षण व संरक्षण प्रशिक्षण इत्यादी प्रदान करते तसेच संक्रमणाचा मागोवा घेऊन पुढील शिक्षणाची संधी देते.",
      options: [{
        text: "१.१ शाळेत मुलींना शिक्षणाच्या सर्व क्षेत्रात समान संधी देण्यास प्रोत्साहन व नियोजन केले जाते."
      }, {
        text: "२.१ सर्व मुलींना शाळेच्या सर्व क्षेत्र व सुविधा पुरविण्यासाठी समावेशित दृष्टीकोन विकसित करण्यासाठी शिक्षक व शिक्षकेत्तर कर्मचारी यांचे व्यावसायिक क्षमता विकसन प्रशिक्षण कार्यक्रम राबविले जातात.",
        isGreen: true
      }, {
        text: "३.१ शाळा मुलींना शाळेत टिकवणे(गळती थांबवणे) व संक्रमणासाठी स्वसंरक्षण प्रशिक्षणाचे आयोजन करते.\n३.२ शाळा मुलींच्या सर्वकष शिक्षणासाठी विविध कार्यक्रम राबवते."
      }, {
        text: "४.१ शाळा निश्चित धोरणे राबवून आणि सूक्ष्म नियोजनाद्वारे अंमलबजावणी करून विद्यार्थींनीचे स्थैर्य सुनिश्चित करते.\n४.२ विद्यार्थींनी आत्मनिर्भरतेने वावरतात."
      }, {
        text: "शाळा केवळ मुलांची असल्याने लागू नाही."
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/1F4DJumLXFqD1dqEnuNQjja9bSrbgnz4u"
    },
    en: {
      orangeDesc: "4.10.1 The school provides girls with non-discriminatory sports, STEAM opportunities, art education, vocational education and safety training etc., and also tracks transition and provides opportunities for further education.",
      options: [{
        text: "1.1 The school encourages and plans to provide equal opportunities to girls in all areas of education."
      }, {
        text: "2.1 Professional capacity development training programs are conducted for teachers and non-teaching staff to develop an inclusive approach for providing all areas and facilities of the school to all girls.",
        isGreen: true
      }, {
        text: "3.1 The school organizes self-defense training for retaining girls (preventing dropout) and transition.\n3.2 The school implements various programs for comprehensive education of girls."
      }, {
        text: "4.1 The school ensures the stability of girl students by implementing definite policies and micro-planning.\n4.2 Girl students conduct themselves with self-reliance."
      }, {
        text: "Not applicable as the school is boys-only."
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/1F4DJumLXFqD1dqEnuNQjja9bSrbgnz4u"
    }
  },
  100: {
    mr: {
      orangeDesc: "४.११.१ शाळा सामाजिक, आर्थिकदृष्ट्या वंचित घटकांच्या(SEDGs) सर्व स्तरांवरील अध्ययन निष्पत्तीत सुधारणा करते.",
      options: [{
        text: "१.१ शाळेच्या दर्शनी भागात इयत्तानिहाय विषयनिहाय अध्ययन निष्पत्ती दर्शविण्यात आली आहे.",
        isGreen: true
      }, {
        text: "२.१ शाळा सर्व श्रेणीतील सांस्कृतिक संदर्भातील TLM वापरते.\n२.२ शाळा पालक, शिक्षक, विद्यार्थी यांच्यासाठी अध्ययन निष्पत्तीबाबत जागरूकता निर्माण होण्यासाठी उद्बोधन सत्राचे आयोजन करते."
      }, {
        text: "३.१ पालक, शिक्षक, विद्यार्थी अध्ययन निष्पत्तीबाबत जागरूक आहेत.\n३.२ शिक्षक आर्थिक व सामाजिक गटातील विद्यार्थींचे अध्ययन पाठपुरावा घेण्यासाठी माहिती तंत्रज्ञान साधनाचा वापर करून प्रत्याभरण करतात."
      }, {
        text: "४.१ SEDG च्या अध्ययन निष्पत्तीच्या प्रगतीत पालक/ कुटुंब व समाज सहभागी होतो.\n४.२ अध्यायनार्थी जिल्हा/ राज्य/ राष्ट्रीय पातळीवरील विविध स्पर्धामध्ये सहभागी होतात व यश मिळवतात."
      }]
    },
    en: {
      orangeDesc: "4.11.1 The school improves learning outcomes at all levels for Socially and Economically Disadvantaged Groups (SEDGs).",
      options: [{
        text: "1.1 Grade-wise and subject-wise learning outcomes are displayed in the front area of the school.",
        isGreen: true
      }, {
        text: "2.1 The school uses culturally relevant TLM from all categories.\n2.2 The school organizes orientation sessions to create awareness about learning outcomes for parents, teachers, and students."
      }, {
        text: "3.1 Parents, teachers, and students are aware of learning outcomes.\n3.2 Teachers use information technology tools to follow up on the learning of students from economically and socially disadvantaged groups."
      }, {
        text: "4.1 Parents/family and community participate in the progress of SEDG learning outcomes.\n4.2 Learners participate in various competitions at district/state/national levels and achieve success."
      }]
    }
  },
  101: {
    mr: {
      orangeDesc: "५.१.१ शाळा दृष्टी व ध्येय विधान आणि मानकानुसार कार्य करते.",
      options: [{
        text: "१.१ शाळेने दृष्टी आणि ध्येय विधान लिहिलेले आहे.\n१.२ विधानामध्ये विद्यार्थ्यांच्या बौद्धिक आणि सामाजिक विकासासाठीची मुल्ये व संधी यांचा विचार केला आहे."
      }, {
        text: "२.१ शाळेने विकसित केलेले दृष्टी आणि ध्येय विधान भाग-धारकांना अवगत केलेले आहे.\n२.२ विधान शाळेच्या धोरणांशी सुसंगत आहे."
      }, {
        text: "३.१ शाळेने दृष्टी व ध्येय विधान हे सर्व भागधारकांच्या सहभागाने विकसित केलेले आहे.\n३.२ शाळेची मार्गदर्शक तत्वे ठरवितांना सर्व भागधारकांची मते विचारात घेतली जातात याची सनियंत्रण समिती खात्री करते.",
        isGreen: true
      }, {
        text: "४.१ शाळेची ध्येये, उद्दिष्ट्ये यांचा वेळोवेळी आढावा घेऊन सुधारणात्मक कृती आराखडा विकसित केला जातो.\n४.२ पुनरावलोकन व शिस्तबद्ध सनियंत्रण प्रक्रिया राबविली जाते."
      }]
    },
    en: {
      orangeDesc: "5.1.1 The school functions as per its vision and mission statement and standards.",
      options: [{
        text: "1.1 The school has a written vision and mission statement.\n1.2 The statement considers the values and opportunities for intellectual and social development of students."
      }, {
        text: "2.1 The vision and mission statement developed by the school has been communicated to stakeholders.\n2.2 The statement is consistent with the school's policies."
      }, {
        text: "3.1 The school's vision and mission statement has been developed with the participation of all stakeholders.\n3.2 The monitoring committee ensures that the opinions of all stakeholders are considered while setting the school's guiding principles.",
        isGreen: true
      }, {
        text: "4.1 The school's goals and objectives are periodically reviewed and a corrective action plan is developed.\n4.2 Review and disciplined monitoring processes are implemented."
      }]
    }
  },
  102: {
    mr: {
      orangeDesc: "५.२.१ शालेय अल्पकालीन व दीर्घकालीन नियोजन हे संस्थात्मक नियोजनाच्या दृष्टी आणि ध्येय विधानाशी सुसंगत आहे.",
      options: [{
        text: "१.१ शाळा प्रमुखांच्या मार्गदर्शनाखाली शिक्षक आपल्या दैनंदिन कामकाजाचे नियोजन करतात.",
        isGreen: true
      }, {
        text: "२.१ शाळेकडे लिखित स्वरुपात दीर्घकालीन नियोजन आहे.\n२.२ विशिष्ट ध्येय आणि भूमिका निर्धारित केलेल्या आहेत."
      }, {
        text: "३.१ अल्पकालीन व दीर्घकालीन उद्दिष्टांची निर्मिती आणि विकसन हे व्यवस्थापन आणि कर्मचारी यांनी केलेले आहे.\n३.२ लिखित धोरण आणि कार्यपद्धती यांबाबत व्यवस्थापन आणि कर्मचारी यांना अवगत केलेले आहे."
      }, {
        text: "४.१ शाळेची दीर्घकालीन व अल्पकालीन ध्येय विकसित करण्यासाठी पालक, माजी विद्यार्थी व इतर भागधारकांचा सहभाग घेतला जातो.\n४.२ ध्येय व योजना या शाळेच्या दृष्टी व ध्येय विधान यांच्या अनुरूप आर्थिक व इतर संसाधनांचे विश्लेषण करून परिभाषित केल्या जातात.\n४.३ अंमलबजावणी प्रक्रियेच्या यशाचे निर्देशक आणि आवश्यक बदलांचे वेळोवेळी पुनरावलोकन केले जाते."
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/1FEHoHqvdAka8nK93lYoUnfz2YOs"
    },
    en: {
      orangeDesc: "5.2.1 School short-term and long-term planning is consistent with the institutional planning's vision and mission statement.",
      options: [{
        text: "1.1 Teachers plan their daily work under the guidance of the school head.",
        isGreen: true
      }, {
        text: "2.1 The school has long-term planning in written form.\n2.2 Specific goals and roles have been determined."
      }, {
        text: "3.1 The creation and development of short-term and long-term objectives has been done by management and staff.\n3.2 Management and staff have been informed about written policies and procedures."
      }, {
        text: "4.1 Parents, alumni, and other stakeholders are involved in developing the school's long-term and short-term goals.\n4.2 Goals and plans are defined by analyzing financial and other resources in line with the school's vision and mission statement.\n4.3 Success indicators of the implementation process and necessary changes are periodically reviewed."
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/1FEHoHqvdAka8nK93lYoUnfz2YOs"
    }
  },
  103: {
    mr: {
      orangeDesc: "५.३.१ शालेय नेतृत्व / व्यवस्थापन हे शाळा आणि शाळेबाहेरील समुदायामध्ये प्रभावी समन्वय सुनिश्चित करते.",
      options: [{
        text: "१.१ शाळेचे व्यवस्थापन, शाळा सनियंत्रण समिती व शाळा प्रमुख यांच्यामध्ये सहकार्यात्मक प्रभावी कामकाजाचा समन्वय आहे.",
        isGreen: true
      }, {
        text: "२.१ शाळा व्यवस्थापन हे शाळेचे प्रमुख आणि कर्मचारी यांच्यातील सहसंबंधाची आणि त्यांच्या भूमिका व जबाबदाऱ्या याविषयी स्पष्ट खात्री देते."
      }, {
        text: "३.१ शाळा व्यवस्थापन हे आपली उद्दिष्टे साध्य करण्यासाठी इतर शैक्षणिक संस्थांसोबत सहसंबंध प्रस्थापित करून निकष निश्चिती करते आणि कार्यवाही करते.\n३.२ ध्येये आणि उद्दिष्टे साध्य करण्यासाठी शाळा समाजासोबत समन्वय साधते."
      }, {
        text: "४.१ शाळा आणि समुदायामध्ये प्रभावी समन्वय स्थापित करण्यासाठी शाळा नियोजन करते.\n४.२ शिक्षकांना त्यांच्या उद्दिष्टांच्या पूर्ततेसाठी सहयोगी नियोजन आणि चिंतनासाठी समर्पित वेळ आणि समर्थन प्रदान केले जाते.\n४.३ शालेय घटकांमध्ये सहसंबंध स्पष्टपणे दिसतात.\n४.४ मार्गदर्शन, सनियंत्रण आणि पुनरावलोकन केले जाते ."
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/1FERrHV8HAYnNRqq4FtIm8mZr9P4hMkp7"
    },
    en: {
      orangeDesc: "5.3.1 School leadership / management ensures effective coordination within the school and with the community outside the school.",
      options: [{
        text: "1.1 There is cooperative and effective coordination of work among the school management, school monitoring committee, and school head.",
        isGreen: true
      }, {
        text: "2.1 School management ensures clarity about the relationship between the school head and staff and their roles and responsibilities."
      }, {
        text: "3.1 School management establishes relationships with other educational institutions to set criteria and takes action to achieve its objectives.\n3.2 The school coordinates with the community to achieve goals and objectives."
      }, {
        text: "4.1 The school plans to establish effective coordination between the school and community.\n4.2 Teachers are provided dedicated time and support for collaborative planning and reflection to fulfill their objectives.\n4.3 Relationships among school components are clearly visible.\n4.4 Guidance, monitoring, and review are conducted."
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/1FERrHV8HAYnNRqq4FtIm8mZr9P4hMkp7"
    }
  },
  104: {
    mr: {
      orangeDesc: "५.४.१ स्रोत संसाधन व्यवस्थापनासाठी यंत्रणा कार्यरत आहे.",
      options: [{
        text: "१.१ मुख्याध्यापक संसाधनांचे नियमित पर्यवेक्षण करतात व अहवाल सादर करतात."
      }, {
        text: "२.१ शाळेकडे उपलब्ध असलेले संसाधने जतन करण्यासाठी सुधारात्मक उपाय केले जातात."
      }, {
        text: "३.१ शाळेव्यतिरिक्त वेळेमध्ये शाळेतील संसाधनांचा उपयोग सामुदायिक कार्यक्रमांसाठी जसे की सर्वांसाठी शिक्षण, मुलींचा कौशल्य विकास, आरोग्य व स्वच्छतेसंदर्भात जाणीव जागृती, DIGITAL LITERACY (संगणक साक्षरता) इ. साठी केला जातो.",
        isGreen: true
      }, {
        text: "४.१ उपलब्ध असलेल्या संसाधनांचे व साहित्याचे योग्य उपयोजन केले जाते तसेच नवीन संसाधने उपलब्ध करून घेण्यापूर्वी संसाधनाची गरज निश्चिती केली जाते.\n४.२ ग्रामसभा, स्थानिक प्रशासन, शालेय व्यवस्थापन सदस्य, शिक्षक-पालक संघ, स्वयंसहायता संघ, महिला समूह आणि वंचित गटातील सदस्य इत्यादींच्या सहाय्याने सामाजिक लेखापरीक्षण केले जाते."
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/1FMAjTo0UDZrdA0q6aggch4U0NzRX_Hk-"
    },
    en: {
      orangeDesc: "5.4.1 A mechanism for resource management is operational.",
      options: [{
        text: "1.1 The headmaster regularly supervises resources and submits reports."
      }, {
        text: "2.1 Corrective measures are taken to preserve the available resources at the school."
      }, {
        text: "3.1 School resources are used outside school hours for community programs such as education for all, girls' skill development, health and hygiene awareness, DIGITAL LITERACY, etc.",
        isGreen: true
      }, {
        text: "4.1 Proper utilization of available resources and materials is done and the need for resources is assessed before acquiring new ones.\n4.2 Social auditing is done with the help of gram sabha, local administration, school management members, parent-teacher associations, self-help groups, women's groups, and members of disadvantaged groups."
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/1FMAjTo0UDZrdA0q6aggch4U0NzRX_Hk-"
    }
  },
  105: {
    mr: {
      orangeDesc: "५.४.२ संसाधनांचा अपव्यय कमी करण्याच्या परिणामकारकतेच्या दृष्टीने शाळेच्या प्रगतीवर सनियंत्रण ठेवण्यासाठी योग्य यंत्रणा अस्तित्वात आहे.",
      options: [{
        text: "१.१ संसाधनांचा अपव्यय कमी करण्याच्या दृष्टीने शाळेकडे परिणामकारक व योग्य यंत्रणा आहे.\n१.२ पायाभूत सुविधा आणि प्रशासकीय व शैक्षणिक पैलूचे निरीक्षण व पुनरावलोकन ठराविक कालावधीत केले जाते."
      }, {
        text: "२.१ शाळेत संसाधनांचे जतन करण्यासाठी सुधारात्मक उपाययोजना आहेत.\n२.२ संसाधनांचा अपव्यय कमी करण्यासाठी एसएमसी/ शिक्षक/ पालक/ विद्यार्थी यांचेमार्फत सनियंत्रण केले जाते.",
        isGreen: true
      }, {
        text: "३.१ पायाभूत सुविधा आणि उपकरणाच्या स्वरूपात विद्यमान संसाधनांचा वापर केला जातो, नवीन संसाधने मिळविण्यापूर्वी त्याचे विश्लेषण केले जाते.\n३.२ संसाधनांचा अपव्यय कमी करण्याच्या परिणामकारकतेच्या दृष्टीने शाळा विकासावर लक्ष ठेवण्यासाठी, शिक्षक व विद्यार्थ्यांना संवेदनशील करण्यासाठी प्रशिक्षणे आयोजित केली जातात."
      }, {
        text: "४.१ शाळा प्रशासन व विद्यार्थ्यांकडून संसाधनांचा अपव्यय कमी करण्यासाठी व पुनर्वापर करण्यासाठी पावले उचलली जातात.\nसंसाधनांचा अपव्यय कमी करण्यात परिणामकारकता दिसून येते."
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/1FPr-10Qr7stj1gb57CzBNke3-byXSvay"
    },
    en: {
      orangeDesc: "5.4.2 An appropriate mechanism exists for monitoring the school's progress in terms of effectiveness in reducing resource wastage.",
      options: [{
        text: "1.1 The school has an effective and appropriate mechanism for reducing resource wastage.\n1.2 Infrastructure and administrative and academic aspects are inspected and reviewed periodically."
      }, {
        text: "2.1 The school has corrective measures for preserving resources.\n2.2 Monitoring is done through SMC/teachers/parents/students to reduce resource wastage.",
        isGreen: true
      }, {
        text: "3.1 Existing resources in the form of infrastructure and equipment are used, and analysis is done before acquiring new resources.\n3.2 Training is organized to sensitize teachers and students for monitoring school development from the perspective of reducing resource wastage."
      }, {
        text: "4.1 Steps are taken by school administration and students to reduce and reuse resources.\nEffectiveness in reducing resource wastage is evident."
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/1FPr-10Qr7stj1gb57CzBNke3-byXSvay"
    }
  },
  106: {
    mr: {
      orangeDesc: "५.५.१ शालेय संबंध व्यवस्थापनासाठी एक औपचारिक यंत्रणा आहे.",
      options: [{
        text: "१.१ शाळेचे कर्मचारी पालकांच्या समस्या स्विकारतात."
      }, {
        text: "२.१ शाळेचे कर्मचारी पालकांना त्यांच्या पाल्यांच्या आव्हानात्मक समस्यांना योग्य प्रतिसाद देतात.\n२.२ शाळा पालकांसोबत दूरध्वनीद्वारे किंवा प्रत्यक्ष समोरासमोर संवाद साधते",
        isGreen: true
      }, {
        text: "३.१ तात्काळ अनुधावन करून त्यावर सुधारात्मक कृती केली जाते.\n३.२ शालेय कर्मचारी भागधारकांबद्दल आदरपूर्वक आणि वेळेत आंतरक्रिया करण्यासंदर्भात प्रशिक्षित केले आहेत."
      }, {
        text: "४.१ भागधारक यांच्यासोबत व्यवहार करतांना पाळावयाची मार्गदर्शक तत्वे तयार केली आहेत व त्यांचे शालेय नेतृत्वाद्वारे वेळोवेळी पुनरावलोकन केले जाते.\n४.१ भागधारकांसोबत केलेल्या सर्व व्यवहारांचे दस्तावेजीकरण व विश्लेषण केले आहे त्याचा शालेय नेतृत्वाने समाधानकारक पाठपुरावा करून सादर केला आहे."
      }]
    },
    en: {
      orangeDesc: "5.5.1 A formal mechanism exists for school relationship management.",
      options: [{
        text: "1.1 School staff accept parents' concerns."
      }, {
        text: "2.1 School staff respond appropriately to parents' challenging issues regarding their children.\n2.2 The school communicates with parents through phone or face-to-face interaction.",
        isGreen: true
      }, {
        text: "3.1 Immediate follow-up is done and corrective action is taken.\n3.2 School staff are trained to interact respectfully and timely with stakeholders."
      }, {
        text: "4.1 Guidelines to be followed while dealing with stakeholders have been prepared and are periodically reviewed by school leadership.\n4.1 All transactions with stakeholders are documented and analyzed and satisfactory follow-up has been submitted by school leadership."
      }]
    }
  },
  107: {
    mr: {
      orangeDesc: "५.५.२ शाळेचा प्रति बालक खर्च योग्य आणि परिणामकारक आहे .",
      options: [{
        text: "१.१ शालेय खर्चाचा आराखडा तयार आहे .\n१.२ सर्व आर्थिक एस ओ पी एस (SOPs) उपलब्ध आहेत.\n१.३ आवश्यक धोरणानुसार शुल्क आकारणी केली जाते."
      }, {
        text: "२.१ दाखल विद्यार्थ्यांची खर्चाची माहिती संगणकीकृत करून ठेवली आहे.\n२.२ शाळेने खर्चाच्या संख्यात्मक नोंदी जतन केलेल्या आहेत व त्या वित्त विभाग व प्रशासनासाठी पारदर्शी ठेवल्या आहेत"
      }, {
        text: "३.१ प्रति विद्यार्थी खर्चाचे शाळा वार्षिक विश्लेषण करते."
      }, {
        text: "१ शाळा केंद्र व राज्य शासनाच्या धोरणानुसार प्रति विद्यार्थी खर्चाचे विवरणपत्र तयार करून पालकांसाठी व अंतर्गत उपयोगासाठी प्रकाशित करते.\n२ विद्यार्थी लाभाच्या योजना व आर्थिक व्यवहार PFMS प्रणाली, DBT द्वारे केले जातात.",
        isGreen: true
      }]
    },
    en: {
      orangeDesc: "5.5.2 The school's per child expenditure is appropriate and effective.",
      options: [{
        text: "1.1 The school expenditure plan is ready.\n1.2 All financial SOPs are available.\n1.3 Fee collection is done as per the required policy."
      }, {
        text: "2.1 Expenditure information of enrolled students has been computerized.\n2.2 The school has maintained quantitative records of expenditure and kept them transparent for the finance department and administration."
      }, {
        text: "3.1 The school conducts annual analysis of per student expenditure."
      }, {
        text: "1. The school prepares per student expenditure statements as per central and state government policies and publishes them for parents and internal use.\n2. Student benefit schemes and financial transactions are done through PFMS system, DBT.",
        isGreen: true
      }]
    }
  },
  108: {
    mr: {
      orangeDesc: "५.६.१ शाळेमध्ये संपूर्ण उपक्रमांची व्यवस्थापन यंत्रणा उपलब्ध आहे.",
      options: [{
        text: "१.१ शालेय उपक्रम आणि वार्षिक दिनदर्शिका तयार केली आहे."
      }, {
        text: "२.१ शाळेने शिक्षकांसोबत चर्चा करून शालेय उपक्रम आणि शैक्षणिक दिनदर्शिका तयार केली आहे."
      }, {
        text: "३.१ शालेय उपक्रम राबविण्याच्या जबाबदाऱ्यांचे काटेकोर नियोजनानंतर व्यापकपणे विकेंद्रीकरण केले जाते आणि ते पद्धतशीरपणे पार पाडले जातात."
      }, {
        text: "४.१ शालेय उपक्रमांचे नियोजन, अंमलबजावणी, सनियंत्रण आणि पुनरावलोकन यात विद्यार्थी, पालक व समाज यांचा सक्रिय सहभाग आहे.",
        isGreen: true
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/1FjYaFggWwXCrcfCqe5uqwWaq4qx3JCGI"
    },
    en: {
      orangeDesc: "5.6.1 A complete activity management system is available in the school.",
      options: [{
        text: "1.1 School activities and annual calendar have been prepared."
      }, {
        text: "2.1 The school has prepared school activities and academic calendar in discussion with teachers."
      }, {
        text: "3.1 Responsibilities for implementing school activities are widely decentralized after meticulous planning and are carried out systematically."
      }, {
        text: "4.1 Students, parents, and community have active participation in planning, implementation, monitoring, and review of school activities.",
        isGreen: true
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/1FjYaFggWwXCrcfCqe5uqwWaq4qx3JCGI"
    }
  },
  109: {
    mr: {
      orangeDesc: "५.७.१ शाळेमध्ये माहिती आणि अभिलेखे देखभाल करण्याची परिपूर्ण प्रणाली आहे.",
      options: [{
        text: "१.१ दस्तऐवजीकरणाच्या सर्व मानकांची शाळा पूर्तता करते."
      }, {
        text: "२.१ सर्व प्रकारची माहिती आणि दस्तऐवज संगणकीकृत/ पारंपारिक स्वरुपात जतन करून ठेवली जाते.\n२.२ सदर माहिती कर्मचाऱ्यांसाठी उपलब्ध आहे आणि दैनंदिन शालेय कामकाजासाठी, प्रणाली सुधारण्यासाठी वापरली जाते"
      }, {
        text: "३.१ सर्व प्रकारची माहिती आणि दस्तऐवज (विद्यार्थी विषयक, शिक्षक विषयक, वित्तीय संसाधन विषयक, शालेय आणि सहशालेय उपक्रम, सुविधा, विद्यार्थी लाभाच्या योजना, लोकसहभाग विषयक) इत्यादी शाळेने संगणकीकृत केलेले आहेत",
        isGreen: true
      }, {
        text: "४.१ माहितीची नोंद करणे, संग्रहित करणे, अद्ययावतीकरण करणे आणि पुन्हा प्राप्त करण्यासाठी यंत्रणा व प्रक्रिया उपलब्ध आहे.\n४.२ माहिती आणि दस्तऐवज देखभाल प्रक्रियेचे निरीक्षण केले जाते आणि त्याची परिणामकारकता निश्चित करण्यासाठी वेळोवेळी पुनरावलोकन केले जाते."
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/1Fk29K1-volaIbZnVjUAvsyKMu5hnzWF-"
    },
    en: {
      orangeDesc: "5.7.1 The school has a comprehensive system for maintaining information and records.",
      options: [{
        text: "1.1 The school fulfills all documentation standards."
      }, {
        text: "2.1 All types of information and documents are preserved in computerized/traditional format.\n2.2 The information is available to staff and is used for daily school operations and system improvement."
      }, {
        text: "3.1 All types of information and documents (student-related, teacher-related, financial resource-related, school and co-curricular activities, facilities, student benefit schemes, public participation-related) etc. have been computerized by the school.",
        isGreen: true
      }, {
        text: "4.1 Systems and processes are available for recording, storing, updating, and retrieving information.\n4.2 Information and document maintenance processes are inspected and periodically reviewed to ensure their effectiveness."
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/1Fk29K1-volaIbZnVjUAvsyKMu5hnzWF-"
    }
  },
  110: {
    mr: {
      orangeDesc: "५.८.१ नियमित आणि प्रभावी मौखिक / आभासी / ऑनलाईन /लिखित संप्रेषण प्रणाली अस्तित्वात असून कार्यरत आहे.",
      options: [{
        text: "१.१ भागधारकांसोबत संवाद करण्यासाठी मौखिक संभाषण वापरले जाते."
      }, {
        text: "२.१ संभाषण करण्यासाठी विविध पद्धतींचा वापर केला जातो.उदा.परिपत्रके, वर्तमानपत्रे, एसएमएस, वेबिनार, PTM इतिवृत्त, शाळा नियतकालिके."
      }, {
        text: "३.१ संभाषण हे द्विमार्ग पद्धतीने केले जाते.\n३.२ शाळा वर्षातून तीन-चार वेळेस शाळा भागधारकांकडून केलेल्या कामाबद्दल अभिप्राय घेते"
      }, {
        text: "४.१ शाळेकडे विद्यार्थ्यांची माहिती पालकांच्या सहभाग तसेच भागधारकांसोबत केल्या जाणाऱ्या आंतरक्रियेची माहिती व शाळा व्यवस्थापन बाबत केलेल्या कामाची माहिती देण्यासाठी प्रभावी यंत्रणा उपलब्ध आहे.\n(online उदा. ब्लॉग, वेबसाईट)\n४.२ सातत्यपूर्ण विकसन आराखड्याचा भाग म्हणून शाळा पालकांकडून / भागधारकांकडून आलेल्या सूचनांचे/ अभिप्रायांचे पालन करते जेणेकरून शाळा प्रशासनामध्ये बदल व्हावा.",
        isGreen: true
      }]
    },
    en: {
      orangeDesc: "5.8.1 A regular and effective oral / virtual / online / written communication system exists and is operational.",
      options: [{
        text: "1.1 Oral communication is used to communicate with stakeholders."
      }, {
        text: "2.1 Various methods are used for communication, e.g., circulars, newspapers, SMS, webinars, PTM minutes, school periodicals."
      }, {
        text: "3.1 Communication is done in a two-way manner.\n3.2 The school takes feedback from school stakeholders about the work done three to four times a year."
      }, {
        text: "4.1 The school has an effective mechanism to provide information about students, parent participation, interactions with stakeholders, and school management work.\n(online e.g., blog, website)\n4.2 As part of the continuous development plan, the school follows suggestions/feedback from parents/stakeholders to bring about changes in school administration.",
        isGreen: true
      }]
    }
  },
  111: {
    mr: {
      orangeDesc: "५.९.१ शाळेकडे दस्तऐवज ठेवणे, ताळेबंद, लेखापरीक्षण यासह वित्तीय व शुल्क नियमनासाठी यंत्रणा कार्यरत आहे.",
      options: [{
        text: "१.१ आर्थिक व्यवहार केले जातात परंतु अंशतः दस्तऐवज राखले जातात."
      }, {
        text: "२.१ शासन नियमानुसार शुल्क आकारले जाते.\n( लागू असल्यास )\n२.२ खरेदी -विक्रीची प्रक्रिया निकषानुसार राबविली जाते व जमाखर्चाच्या रकमेत संतुलन राखून आवश्यक शिल्लक ठेवली जाते."
      }, {
        text: "३.१ योग्य पात्रताधारक व्यक्तीला आर्थिक देखरेख आणि व्यवस्थापनाची जबाबदारी सोपवली आहे.\n३.२ शाळेने आपल्या संकेतस्थळावर/ सूचना फलकावर फी रचनेचा खुलासा केला आहे आणि तो नियमानुसार आहे."
      }, {
        text: "४.१ खात्यांचे अंतर्गत आणि बाह्य लेखापरीक्षण पूर्ण पारदर्शकपणे केले आहे.\n४.२ जमाखर्चाच्या हिशोबाचे पूर्ण निरीक्षण केले जाते आणि भविष्यातील खर्चाचे नियोजन केले जाते.\n४.३ सर्व सुधारणा आणि खर्चाची पूर्तता करून शाळेचा ताळेबंद तयार केला जातो.",
        isGreen: true
      }]
    },
    en: {
      orangeDesc: "5.9.1 The school has a mechanism for financial and fee regulation including document keeping, balance sheet, and auditing.",
      options: [{
        text: "1.1 Financial transactions are done but documents are partially maintained."
      }, {
        text: "2.1 Fees are charged as per government regulations.\n(if applicable)\n2.2 The purchase-sale process is carried out as per criteria and necessary balance is maintained in the income-expenditure amount."
      }, {
        text: "3.1 The responsibility of financial oversight and management has been entrusted to a qualified person.\n3.2 The school has disclosed the fee structure on its website/notice board and it is as per regulations."
      }, {
        text: "4.1 Internal and external auditing of accounts has been done with full transparency.\n4.2 Complete inspection of income-expenditure accounts is done and future expenditure is planned.\n4.3 All improvements and expenditure completion is done and the school's balance sheet is prepared.",
        isGreen: true
      }]
    }
  },
  112: {
    mr: {
      orangeDesc: "५.१०.१ शाळा प्रवेश धोरण आणि प्रक्रिया ही भेदभावरहित, तर्कसंगत, पारदर्शक आणि प्रचलित मार्गदर्शक तत्वे, आर. टी.ई. २००९ मार्गदर्शक तत्वे आणि निकषांशी सुसंगत आहे.",
      options: [{
        text: "१.१ शाळा प्रवेश प्रक्रिया भेदभावरहित, पारदर्शक आणि प्रचलित मार्गदर्शक तत्वांशी सुसंगत आहे.\nत्याचबरोबर आर.टी.ई. कायद्याच्या तत्वांच्या अनुरूप व नियमानुसार आहे.\n१.२ धर्म, वंश, जात, पंथ, जन्मस्थान असा कोणताही भेदभाव न करता प्रवेश दिला जातो."
      }, {
        text: "२.१ शाळेत प्रवेश होण्यासाठी परिसरातील बालकांचा आढावा घेतला जातो.\n२.२ शाळेत बालकांचे प्रवेश होण्यासाठी पालकांचे उद्बोधन करून शाळेची माहिती दिली जाते.\n२.३ पारदर्शकता सुनिश्चित करण्यासाठी शाळेच्या सूचना फलक/ वेबसाईट/ प्रचारात्मक माध्यमातून पुरेशी माहिती उपलब्ध आहे."
      }, {
        text: "३.१ शाळा RTE २००९ / EWS/ प्रायोजित संवर्ग किंवा मार्गदर्शक तत्वानुसार विशेष संवर्ग अंतर्गत विद्यार्थ्यांना प्रवेश देते.",
        isGreen: true
      }, {
        text: "४.१ शाळेतील प्रवेशीत विद्यार्थ्यांची लक्षणीय वाढ झाली आहे."
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/1FmXL2EivhbpVrkE_3mjec3zj1vxev3XE"
    },
    en: {
      orangeDesc: "5.10.1 The school admission policy and process is non-discriminatory, rational, transparent and consistent with prevailing guidelines, R.T.E. 2009 guidelines and criteria.",
      options: [{
        text: "1.1 The school admission process is non-discriminatory, transparent and consistent with prevailing guidelines.\nIt is also in accordance with the provisions and regulations of the R.T.E. Act.\n1.2 Admission is given without any discrimination of religion, race, caste, creed, or birthplace."
      }, {
        text: "2.1 A survey of children in the area is conducted for school admission.\n2.2 Parents are informed about the school to facilitate children's admission.\n2.3 Sufficient information is available through the school's notice board/website/promotional media to ensure transparency."
      }, {
        text: "3.1 The school admits students under special category as per RTE 2009 / EWS / sponsored category or guidelines.",
        isGreen: true
      }, {
        text: "4.1 There has been a significant increase in enrolled students in the school."
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/1FmXL2EivhbpVrkE_3mjec3zj1vxev3XE"
    }
  },
  113: {
    mr: {
      orangeDesc: "५.१०.२ SC / ST /OBC / अल्पसंख्यांक यांसारख्या वंचित समुदायांवर व शाळाबाह्य विद्यार्थ्यांवर लक्ष केंद्रित करून जवळपासच्या भागात नियमित प्रवेश प्रक्रियेचे अवलंबन करते.",
      options: [{
        text: "१.१ शाळा शाळाबाह्य विद्यार्थ्यांसाठी गृहभेटीतून सर्वेक्षण करते."
      }, {
        text: "२.१ शाळा SC/ ST/OBC/ अल्पसंख्यांक/ शाळाबाह्य आणि वंचित समुदायाचे पालक यांच्यासाठी नियमित सल्लामसलत (चर्चासत्र) सत्र आयोजित करते.\n२.२ शाळा समुपदेशन सत्र रजिस्टर अद्ययावत करते."
      }, {
        text: "३.१ शाळा जवळच्या भागातील कामगार SC/ST/OBC/ अल्पसंख्यांक/ शाळाबाह्य आणि वंचित समुदायावर लक्ष केंद्रित करून समुदाय, पालक, ग्रामपंचायत, शहरी स्थानिक शासन संस्था, अंगणवाडी सेविका यांच्या मदतीने जागृतीपर उपक्रमांची अंमलबजावणी करते."
      }, {
        text: "४.१ शाळेने सर्व शाळाबाह्य विद्यार्थ्यांना मुख्य प्रवाहात आणले आहे.\n४.२ परिसरातील कोणतीही मुले ही शाळेच्या मुख्य प्रवाहाच्या बाहेर नाहीत.",
        isGreen: true
      }]
    },
    en: {
      orangeDesc: "5.10.2 Focuses on disadvantaged communities like SC/ST/OBC/minorities and out-of-school students and follows regular admission process in nearby areas.",
      options: [{
        text: "1.1 The school conducts surveys through home visits for out-of-school students."
      }, {
        text: "2.1 The school organizes regular consultation (discussion) sessions for parents of SC/ST/OBC/minorities/out-of-school and disadvantaged communities.\n2.2 The school updates the counseling session register."
      }, {
        text: "3.1 The school implements awareness programs with the help of community, parents, gram panchayat, urban local government bodies, and anganwadi workers focusing on workers, SC/ST/OBC/minorities/out-of-school and disadvantaged communities in nearby areas."
      }, {
        text: "4.1 The school has brought all out-of-school students into the mainstream.\n4.2 No children in the area are outside the school's mainstream.",
        isGreen: true
      }]
    }
  },
  114: {
    mr: {
      orangeDesc: "५.११.१ शाळा संकुल.",
      options: [{
        text: "१.१ 'शाळा संकुल योजना' अंमलबजावणीसाठी संसाधनाच्या वापराची मार्गदर्शक तत्वे SMC च्या सहाय्याने तयार केली आहेत."
      }, {
        text: "२.१ मार्गदर्शक तत्वानुसार अंमलबजावणी सुरु आहे."
      }, {
        text: "३.१ या योजनेमुळे शाळा, विद्यार्थ्यांच्या गरजा पूर्ण होऊन फायदा होत आहे."
      }, {
        text: "४.१ सदर योजनेचा आढावा घेऊन SMC मध्ये चर्चा केली जाते. वेळोवेळी येत असलेल्या अडचणी व होत असलेल्या उपयोगाचा अहवाल वरिष्ठ कार्यालयास सादर केला जातो.\n४.२ शालेय नेतृत्व शिक्षकांना शिक्षणातील नवीनतम संशोधन पद्धती समजून घेण्यासाठी विविध संधी उपलब्ध करून देतात.\n४.३ अहवाल",
        isGreen: true
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/1FpcjsYBLhfj0c9hPHFdErLMzaAdcnhfO"
    },
    en: {
      orangeDesc: "5.11.1 School Complex.",
      options: [{
        text: "1.1 Guidelines for resource utilization for implementation of 'School Complex Scheme' have been prepared with the help of SMC."
      }, {
        text: "2.1 Implementation is underway as per guidelines."
      }, {
        text: "3.1 This scheme is benefiting the school and fulfilling the needs of students."
      }, {
        text: "4.1 The scheme is reviewed and discussed in SMC. Reports of difficulties encountered and utilization are submitted to the senior office from time to time.\n4.2 School leadership provides various opportunities for teachers to understand the latest research methods in education.\n4.3 Reports",
        isGreen: true
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/1FpcjsYBLhfj0c9hPHFdErLMzaAdcnhfO"
    }
  },
  115: {
    mr: {
      orangeDesc: "५.११.२ शाळा प्रमुख शाळेतील प्रणाली सुधारण्याची क्षमता प्रदर्शित करतात आणि जबाबदारी व उत्तरदायित्वाची नैतिकता सुनिश्चित करतात.",
      options: [{
        text: "१.१ शाळेतील प्रणाली सुधारण्यासाठी, जबाबदारी आणि उत्तरदायित्वाची नैतिकता सुनिश्चित करण्यासाठी शिक्षकांची क्षमता वाढवली जाते."
      }, {
        text: "२.१ शाळा विकास आराखड्यानुसार शाळेत सुधारणा केलेली आहे."
      }, {
        text: "३.१ भागधारकांकडून नियमितपणे अभिप्राय संकलन केले जातात.\n३.२ शालेय व्यवस्थेत सुधारणा करण्यासाठी आणि जबाबदारी सुनिश्चित करण्यासाठी शाळा प्रमुख पालकांना सामील करून घेतात.",
        isGreen: true
      }, {
        text: "४.१ प्रगतीची आव्हाने तपासण्यासाठी आणि पुढील नियोजन करण्यासाठी सुधारणा योजना आणि धोरण नियमितपणे सुधारित केले जाते.\n४.२ शाळाक्षमता निर्मिती आणि अध्ययन-अध्यापन प्रक्रिया सुधारण्यासाठी इतर शाळांना मार्गदर्शन करते."
      }]
    },
    en: {
      orangeDesc: "5.11.2 School heads demonstrate the ability to improve school systems and ensure the ethics of responsibility and accountability.",
      options: [{
        text: "1.1 Teachers' capacity is enhanced to improve school systems and ensure ethics of responsibility and accountability."
      }, {
        text: "2.1 School improvements have been made as per the school development plan."
      }, {
        text: "3.1 Feedback is regularly collected from stakeholders.\n3.2 School heads involve parents to improve school systems and ensure accountability.",
        isGreen: true
      }, {
        text: "4.1 Improvement plans and policies are regularly revised to examine progress challenges and plan ahead.\n4.2 The school guides other schools to build school capacity and improve the teaching-learning process."
      }]
    }
  },
  116: {
    mr: {
      orangeDesc: "५.११.३ शाळा प्रमुख विद्यार्थ्यांना व शाळेला एकविसाव्या शतकातील कौशल्यांनी सज्ज करतील अशा सर्जनशील पद्धती व तंत्रांची ओळख करून देऊन नाविण्यतेला प्रोत्साहित करतात.",
      options: [{
        text: "१.१ शाळा प्रमुख विद्यार्थ्यांना एकविसाव्या शतकातील कौशल्य प्राप्त करण्यासाठी सर्जनशील पद्धती आणि तंत्राचा परिचय करून देण्यासाठी शिक्षकांसाठी क्षमता वृद्धी कार्यक्रमाची बांधणी करतात."
      }, {
        text: "२.१ शाळाप्रमुख सभा आणि चर्चेमध्ये नवीन संकल्पनांचा परिचय करून देतात.\n२.२ शालेय प्रक्रियांमध्ये अभिप्राय/ सूचना स्वकारल्या जातात."
      }, {
        text: "३.१ शाळा प्रमुख विविध भागधारकांच्या सहभागाला प्रोत्साहन देतात आणि विविध भागधारकांनी सुचविलेल्या नाविन्यपूर्ण पद्धतीचा अवलंब करतात.",
        isGreen: true
      }, {
        text: "४.१ सदर आराखडा तयार करताना सर्व भागधारकांशी चर्चा केली जाते व त्यावर आधारित कृती आराखडा तयार केला जातो."
      }]
    },
    en: {
      orangeDesc: "5.11.3 School heads encourage innovation by introducing creative methods and techniques that will equip students and the school with 21st century skills.",
      options: [{
        text: "1.1 School heads build capacity building programs for teachers to introduce creative methods and techniques for students to acquire 21st century skills."
      }, {
        text: "2.1 School heads introduce new concepts in meetings and discussions.\n2.2 Feedback/suggestions are accepted in school processes."
      }, {
        text: "3.1 School heads encourage participation of various stakeholders and adopt innovative methods suggested by various stakeholders.",
        isGreen: true
      }, {
        text: "4.1 When preparing this plan, all stakeholders are consulted and an action plan based on it is prepared."
      }]
    }
  },
  117: {
    mr: {
      orangeDesc: "५.१२.१ शाळा PRABANDH, UDISE+, राष्ट्रीय व राज्य विद्या समीक्षा केंद्र (VSK) यांवर निर्धारित वेळेत माहिती भरते.",
      options: [{
        text: "१.१ शाळा PGI, PRABANDH, UDISE+ यांवर वर्षातून किमान दोनदा माहिती परिपूर्ण भरते.\n१.२ PGI, SQAAF संदर्भातील माहिती वेळेत भरली जाते."
      }, {
        text: "२.१ शाळा PGI, PRABANDH, UDISE+ यांवर दोनपेक्षा जास्त वेळा माहिती भरते.(माहिती अद्यायावत व कोणत्याही क्षणी भरलेली असेल किंवा जेव्हा जुनी पूर्वीची माहिती बदलणे गरजेचे असेल तेव्हा).\n२.२ शाळा राष्ट्रीय व राज्य विद्या समीक्षा केंद्रासाठी आवश्यक माहितीसाठी किंवा माहिती भरण्यासाठी सहाय्य व समर्थन करते.\n२.३ PGI, SQAAF माहिती भरताना शहानिशा करून योग्य माहिती भरली जाते. अहवाल जतन करून ठेवले आहेत."
      }, {
        text: "३.१ PGI, PRABANDH, UDISE+,बाबत शिक्षक व शिक्षकेतर कर्मचारी यांना प्रशिक्षण दिले जाते व वेळोवेळी अभिप्राय घेतले जातात.\n३.२ PGI, SQAAF अहवालांचे विश्लेषण करून कमतरता व चांगल्या बाबी निश्चित केलेल्या आहेत."
      }, {
        text: "४.१ PGI, PRABANDH, UDISE+, राज्य विद्या समीक्षा केंद्र (VSK) वरील पुराव्यावरून शाळेची पायाभूत सुविधा व अध्ययन निष्पत्ती मधील सुधारणा दिसून येते.\n४.२ PGI आणि SQAAF अहवालानुसार सुधारणा करावयाच्या बाबींचा कृती कार्यक्रम तयार करून अंमलबजावणी सुरु आहे.",
        isGreen: true
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/1FsrrVDXcwG-vO8bBod-ILfhZNVpF5Eqi"
    },
    en: {
      orangeDesc: "5.12.1 The school fills information on PRABANDH, UDISE+, National and State Vidya Samiksha Kendra (VSK) within the stipulated time.",
      options: [{
        text: "1.1 The school fills complete information on PGI, PRABANDH, UDISE+ at least twice a year.\n1.2 PGI, SQAAF related information is filled on time."
      }, {
        text: "2.1 The school fills information on PGI, PRABANDH, UDISE+ more than twice. (Information is updated and filled at any time or when old information needs to be changed).\n2.2 The school provides assistance and support for necessary information or filling information for National and State Vidya Samiksha Kendra.\n2.3 While filling PGI, SQAAF information, it is verified and correct information is filled. Reports are preserved."
      }, {
        text: "3.1 Teachers and non-teaching staff are trained about PGI, PRABANDH, UDISE+ and feedback is taken from time to time.\n3.2 PGI, SQAAF reports are analyzed and shortcomings and positive aspects are identified."
      }, {
        text: "4.1 Evidence on PGI, PRABANDH, UDISE+, State Vidya Samiksha Kendra (VSK) shows improvement in school infrastructure and learning outcomes.\n4.2 An action program for improvements as per PGI and SQAAF reports has been prepared and implementation is underway.",
        isGreen: true
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/1FsrrVDXcwG-vO8bBod-ILfhZNVpF5Eqi"
    }
  },
  118: {
    mr: {
      orangeDesc: "६.१.१ शाळा विद्यार्थ्यांना शैक्षणिक धोरणावर मते व सूचना मांडण्याची आणि शालेय निर्णयप्रक्रियेत सहभागी होण्याची संधी उपलब्ध करून देते.",
      options: [{
        text: "१.१. विद्यार्थी प्रतिनिधींची निवड सर्वानुमते केली जाते.\n१.२ शाळा विद्यार्थ्यांना शैक्षणिक धोरणांवर स्वतःची मते आणि सूचना व्यक्त करण्यासाठी संधी उपलब्ध करून देते."
      }, {
        text: "२.१ शाळा विद्यार्थ्यांना शालेय धोरणाबाबत त्यांची मते, सूचना, प्रतिक्रिया व्यक्त करण्यास प्रोत्साहित करते तसेच निर्णय प्रक्रियेत सहभागी करून घेते.\n२.२ शाळा विद्यार्थी प्रतिनिधींना शाळा व्यवस्थापनामध्ये सहभागाची संधी देते."
      }, {
        text: "३.१ विद्यार्थ्यांकडून आलेल्या अभिप्रायावर शाळा नियोजनबद्ध कृती आराखडा व ध्येय निश्चिती बाबत विकासाच्या दिशा ठरविते."
      }, {
        text: "४.१ शाळा विद्यार्थ्यांची मते, सूचना, दृश्य पुरावा यांचा निर्णय प्रक्रियेत समावेश करून विद्यार्थ्यांच्या समाधानाची खात्री करते.",
        isGreen: true
      }]
    },
    en: {
      orangeDesc: "6.1.1 The school provides students with the opportunity to express opinions and suggestions on educational policy and to participate in school decision-making processes.",
      options: [{
        text: "1.1. Student representatives are selected unanimously.\n1.2 The school provides students with the opportunity to express their own opinions and suggestions on educational policies."
      }, {
        text: "2.1 The school encourages students to express their opinions, suggestions, reactions on school policy and also involves them in the decision-making process.\n2.2 The school gives student representatives the opportunity to participate in school management."
      }, {
        text: "3.1 Based on feedback from students, the school determines the direction of development regarding planned action plans and goal setting."
      }, {
        text: "4.1 The school ensures student satisfaction by including students' opinions, suggestions, and visual evidence in the decision-making process.",
        isGreen: true
      }]
    }
  },
  119: {
    mr: {
      orangeDesc: "६.१.२ शाळा आनंददायी शिक्षणासाठी अनुकूल वातावरण तयार करते.",
      options: [{
        text: "१.१ शाळा सर्व विद्यार्थ्यांना अनुकूल वातावरणात आनंददायी शिक्षण पुरविते."
      }, {
        text: "२.१ शाळा सर्व विद्यार्थ्यांना शाळेत येण्यासाठी विविध कार्यक्रम व उपक्रमांचे आयोजन करते."
      }, {
        text: "३.१ शिक्षक विद्यार्थ्यांना स्वयंअध्यनाच्या योजना तयार करण्यास प्रोत्साहित करतात.\n३.२ शाळा विद्यार्थ्यांना आनंददायी शिक्षणाच्या आंतरक्रियांमध्ये सहभागी करते."
      }, {
        text: "४.१ विद्यार्थी स्वतःच्या अध्ययनाचे नियोजन करतात.",
        isGreen: true
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/1FwACy2w8FL51aO0GxPN1ygBosMDPc5Vr"
    },
    en: {
      orangeDesc: "6.1.2 The school creates a conducive environment for joyful learning.",
      options: [{
        text: "1.1 The school provides joyful learning to all students in a conducive environment."
      }, {
        text: "2.1 The school organizes various programs and activities for all students to come to school."
      }, {
        text: "3.1 Teachers encourage students to prepare plans for self-study.\n3.2 The school involves students in joyful learning interactions."
      }, {
        text: "4.1 Students plan their own learning.",
        isGreen: true
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/1FwACy2w8FL51aO0GxPN1ygBosMDPc5Vr"
    }
  },
  120: {
    mr: {
      orangeDesc: "६.१.३ विद्यार्थी नियमितपणे शालेय सुरक्षा, पाणी, पर्यावरण संवर्धन, स्वच्छता (सांडपाणी, घनकचरा व्यवस्थापन इ.) इत्यादींचा लेखाजोखा मांडण्याच्या व व्यवस्थापनाच्या प्रक्रियेत सहभागी होतो.",
      options: [{
        text: "१.१ शालेय सुरक्षा, पाणी, पर्यावरण संवर्धन, स्वच्छताबाबतचे परीक्षण मुद्देसूद मांडण्याची मार्गदर्शक तत्वे शाळेकडे उपलब्ध आहेत."
      }, {
        text: "२.१ शालेय सुरक्षा पर्यावरण संवर्धन,स्वच्छता व पाण्याचे वर्षातून किमान तीन वेळा शाळा परीक्षण करते आणि परीक्षणाचा अहवाल ठेवते."
      }, {
        text: "३.१ शालेय सुरक्षा, पाणी, पर्यावरण संवर्धन, स्वच्छता यांच्या परीक्षणात विद्यार्थी सहभागी होतात.",
        isGreen: true
      }, {
        text: "४.१ शाळेने सामाजिक लेखापरीक्षण करीत असताना विद्यार्थ्यांना सामावून घेतले आहे.\n४.२ शाळेने स्वच्छता, पर्यावरण संवर्धन, पाणी, सुरक्षा याबाबत कायमस्वरूपी उपाययोजना केलेली आहे."
      }]
    },
    en: {
      orangeDesc: "6.1.3 Students regularly participate in the process of accounting and management of school safety, water, environment conservation, cleanliness (wastewater, solid waste management, etc.).",
      options: [{
        text: "1.1 The school has guidelines for presenting the review of school safety, water, environment conservation, and cleanliness in a pointed manner."
      }, {
        text: "2.1 The school inspects school safety, environment conservation, cleanliness, and water at least three times a year and keeps an inspection report."
      }, {
        text: "3.1 Students participate in the inspection of school safety, water, environment conservation, and cleanliness.",
        isGreen: true
      }, {
        text: "4.1 The school has included students while conducting social audit.\n4.2 The school has made permanent arrangements regarding cleanliness, environment conservation, water, and safety."
      }]
    }
  },
  121: {
    mr: {
      orangeDesc: "६.१.४ अध्ययन - अध्यापन प्रक्रिया, मूल्यमापन, विविध उपक्रम, भौतिक सोयी - सुविधाबद्दल समाधानी आहेत.",
      options: [{
        text: "१.१ विद्यार्थी वर्गातील अध्ययन - अध्यापन प्रक्रिया, मूल्यमापन, विविध उपक्रमाचा लाभ घेतात तसेच भौतिक सोयी - सुविधांचा वापर करतात."
      }, {
        text: "२.१ विद्यार्थ्यांना स्तर- १ मध्ये दिलेल्या घटकांवर मते, प्रतिक्रिया, सूचना मांडण्याची व्यवस्था असून सूचना, मतांचा आदर केला जातो."
      }, {
        text: "३.१ विद्यार्थ्यांकडून आलेल्या योग्य सूचनानुसार योग्य कार्यवाही केली जाते."
      }, {
        text: "४.१ शाळेने केलेल्या कार्यवाहीनुसार विद्यार्थी समाधानी आहेत.",
        isGreen: true
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/1FwjNCUVnrcdEbKrf_EwB9iq0rVMJT"
    },
    en: {
      orangeDesc: "6.1.4 Students are satisfied with the learning-teaching process, evaluation, various activities, and physical facilities.",
      options: [{
        text: "1.1 Students benefit from the learning-teaching process, evaluation, various activities in the classroom and use physical facilities."
      }, {
        text: "2.1 Students have a system to express opinions, reactions, and suggestions on the components given in Level 1, and suggestions and opinions are respected."
      }, {
        text: "3.1 Appropriate action is taken based on appropriate suggestions received from students."
      }, {
        text: "4.1 Students are satisfied with the action taken by the school.",
        isGreen: true
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/1FwjNCUVnrcdEbKrf_EwB9iq0rVMJT"
    }
  },
  122: {
    mr: {
      orangeDesc: "६.२.१ शाळा शिक्षकांना त्यांचा अभिप्राय देण्यासाठी निर्धोक, भयमुक्त आणि काळजी घेणारे वातावरण तयार करते आणि या अभिप्रायाचे वेळोवेळी पुनरावलोकन करण्यासाठी आणि शिक्षकांच्या सुधारणा, नियोजन आणि मूल्यांकन यासाठीची यंत्रणा विकसित करते.",
      options: [{
        text: "१.१ शिक्षक शाळा सुधारणा, शाळा व्यवस्थापन समिती व शाळा व्यवस्थापन विकास समिती शाळा विकास आराखडा रचनेमध्ये सक्रिय सहभागी होतात.\n१.२ शिक्षकांना त्यांच्या शैक्षणिक व व्यावसायिक अर्हता विकासाची संधी दिली जाते."
      }, {
        text: "२.१ शिक्षकांच्या यशोगाथा, उत्तम कामिगिरी आणि विशेष उपक्रमांच्या देवाणघेवाणबाबत शिक्षकांना शिक्षण परिषद व इतर व्यासपीठे उपलब्ध करून दिली जातात.\n२.२ शाळेत शिक्षकांच्या अध्यापन कार्यासाठी अद्यायावत तंत्रज्ञान व डिजिटल सुविधांची उपलब्धता आहे",
        isGreen: true
      }, {
        text: "३.१ शाळेत शिक्षकांना त्यांचे व्यावसायिक समाधान मिळवण्यासाठी दस्ताऐवजीकरण प्रक्रिया किंवा मूल्यमापन पद्धत उपलब्ध आहे.\n३.२ शाळेकडून शिक्षकांचा त्यांच्या व्यावसायिक कामाबद्दल मिळालेल्या अभिप्रायाचा आढावा नियमितपणे घेतला जातो व त्यांचे विश्लेषण करून योग्य ती कार्यवाही केली जाते."
      }, {
        text: "४.१ शाळा किंवा संस्था शिक्षकांच्या कामाबद्दल त्यांच्या कामाचे कौतुक व बक्षीस, प्रमाणपत्र, पुरस्कार व इतर पारितोषिके देऊन करते.\n४.२ शाळेकडे शिक्षकांच्या समस्या मांडण्याची यंत्रणा उपलब्ध आहे."
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/1G-CIxiELuEI-Mem6oF0WeWxM2Sa9sx6T"
    },
    en: {
      orangeDesc: "6.2.1 The school creates a safe, fear-free and caring environment for teachers to give their feedback and develops a mechanism for periodically reviewing this feedback and for teachers' improvement, planning and evaluation.",
      options: [{
        text: "1.1 Teachers actively participate in school improvement, School Management Committee and School Management Development Committee school development plan formulation.\n1.2 Teachers are given opportunities for their educational and professional qualification development."
      }, {
        text: "2.1 Teachers are provided with education councils and other platforms for sharing teachers' success stories, excellent performance and special activities.\n2.2 Updated technology and digital facilities are available in the school for teachers' teaching work.",
        isGreen: true
      }, {
        text: "3.1 Documentation process or evaluation method is available in the school for teachers to achieve their professional satisfaction.\n3.2 Feedback given to teachers about their professional work is regularly reviewed by the school and appropriate action is taken after analysis."
      }, {
        text: "4.1 The school or institution recognizes teachers' work by giving appreciation, prizes, certificates, awards and other rewards for their work.\n4.2 The school has a mechanism for teachers to present their problems."
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/1G-CIxiELuEI-Mem6oF0WeWxM2Sa9sx6T"
    }
  },
  123: {
    mr: {
      orangeDesc: "६.२.२ शैक्षणिक प्रशिक्षण संस्थेच्या प्रशिक्षण नोंदणी योजना, पुरस्कार व इतर कृतीबाबत शिक्षक समाधानी आहेत.",
      options: [{
        text: "१.१. शाळा शिक्षकांना त्यांच्या क्षमता विकासासाठी योग्य वातावरण प्रदान करते."
      }, {
        text: "२.१ शालेय विकासासाठीचे नियोजन व विविध उपक्रम तसेच शाळा विकास आराखड्याबाबत शिक्षक जागरूक आहेत.\n२.२ शिक्षक व्यावसायिक विकासाच्या प्रशिक्षण कार्यक्रमात सहभागी होतात. (शिक्षण परिषद, चर्चा सत्रे, परिसंवाद इत्यादी)"
      }, {
        text: "३.१ शिक्षक विविध पुरस्कार आणि शिक्षक लाभाच्या योजने बाबत जागरूक आहेत.\n३.२ शिक्षक एकमेकांना सहकार्य करतात, एकमेकांचा आदर राखतात. शाळेत विशिष्ट अशी कार्यसंस्कृती रुजलेली आहे.",
        isGreen: true
      }, {
        text: "४.१ किमान एका शिक्षकाला जिल्हा, राज्य व राष्ट्रीय स्तरावरील पुरस्कार व प्रशस्तीपत्रे प्राप्त आहेत."
      }]
    },
    en: {
      orangeDesc: "6.2.2 Teachers are satisfied with the training registration scheme, awards and other activities of the educational training institution.",
      options: [{
        text: "1.1. The school provides a suitable environment for teachers for their capacity development."
      }, {
        text: "2.1 Teachers are aware of planning and various activities for school development as well as the school development plan.\n2.2 Teachers participate in professional development training programs. (Education councils, discussion sessions, seminars, etc.)"
      }, {
        text: "3.1 Teachers are aware of various awards and teacher benefit schemes.\n3.2 Teachers cooperate with each other and respect each other. A specific work culture has taken root in the school.",
        isGreen: true
      }, {
        text: "4.1 At least one teacher has received awards and certificates at district, state and national level."
      }]
    }
  },
  124: {
    mr: {
      orangeDesc: "६.३.१ शाळा कार्यालयीन कर्मचाऱ्यांना सुधारणाविषयक त्यांचे मत, सूचना व्यक्त करण्याची संधी देते.",
      options: [{
        text: "१.१ शाळेकडे तक्रार निवारण यंत्रणा उपलब्ध आहे."
      }, {
        text: "२.१ मुख्याध्यापक, शाळा प्रमुख, शाळेशी संबंधित सर्व घटकांशी समन्वय साधून प्रशासकीय कामकाज करतात."
      }, {
        text: "३.१ शालेय कर्मचाऱ्यांच्या समाधानाचे औपचारिक व अनौपचारिक माध्यमातून मूल्यांकन केले जाते."
      }, {
        text: "४.१ मुख्याध्यापक, शाळा प्रमुख वेळोवेळी कर्मचाऱ्यांशी संवाद साधून त्यांच्या कामासंबंधीच्या समाधानाची चाचपणी करतात.\n४.२ कर्मचाऱ्यांची मते व सूचना यांचा अंतर्भाव शाळा सुधारण्यासाठी केला जातो.",
        isGreen: true
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/1G37yIWcnsWh2uCyn6UK9yJfPaH"
    },
    en: {
      orangeDesc: "6.3.1 The school gives office staff the opportunity to express their opinions and suggestions regarding improvements.",
      options: [{
        text: "1.1 The school has a grievance redressal mechanism available."
      }, {
        text: "2.1 The headmaster, school head coordinate with all school-related stakeholders to carry out administrative work."
      }, {
        text: "3.1 Evaluation of school staff satisfaction is done through formal and informal means."
      }, {
        text: "4.1 The headmaster, school head periodically communicate with staff to assess their work-related satisfaction.\n4.2 Staff opinions and suggestions are incorporated for school improvement.",
        isGreen: true
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/1G37yIWcnsWh2uCyn6UK9yJfPaH"
    }
  },
  125: {
    mr: {
      orangeDesc: "६.४.१ शाळा व्यवस्थापन समिती, प्रशासकीय विभाग, शिक्षणसंस्था, व्यवस्थापन इत्यादी मुख्याध्यापकांना त्यांच्या सूचना, विचार आणि चिंता व्यक्त करण्यासाठी एक कार्यप्रणाली प्रदान करतात आणि सुधारणा करण्यासाठी वेळोवेळी पुनरावलोकन आणि मूल्यांकन करतात.",
      options: [{
        text: "१.१ प्रशासन, शाळा व्यवस्थापन समिती, शाळा व्यवस्थापन विकास समिती, शिक्षक, कर्मचारी, पालक, विद्यार्थी यांचे मुख्याध्यापकांना सहकार्य लाभते."
      }, {
        text: "२.१ शाळेच्या दैनंदिन व वार्षिक कामकाज सुरळीत चालावे यासाठी मुख्याध्यापक, शाळा व्यवस्थापन समिती, शाळा व्यवस्थापन विकास समिती, बी.आर.सी., यु.आर.सी. व्यवस्थापन, प्रशासन यांचे सहकार्य मिळवून समन्वयाने काम करतात व निर्णय घेतात."
      }, {
        text: "३.१ राष्ट्रीय, आंतरराष्ट्रीय कार्यक्रमामध्ये सहभागासाठी शिक्षक, विद्यार्थी, पालक यांना मुख्याध्यापक सहकार्यात्मक समर्थन पुरवतात, विविध संधी उपलब्ध करून देतात."
      }, {
        text: "४.१ मुख्याध्यापक शालेय विकासासाठी प्राप्त सूचनांचा, मतांचा जबाबदारीचा स्वीकार करून कार्यवाही करतात.\n४.२ मुख्याध्यापक / शाळाप्रमुख हे सर्व घटकांकडून मिळालेल्या सूचनांचा व मतांचा विचार करून विविध कार्यक्रम व उपक्रमाची प्रभावी अंमलबजावणी करतात.",
        isGreen: true
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/1G6vKvcd1uvKCVPGyccbSnO-GkzHVGi4l"
    },
    en: {
      orangeDesc: "6.4.1 The School Management Committee, administrative department, educational institution, management etc. provide a mechanism for headmasters to express their suggestions, thoughts and concerns and periodically review and evaluate for improvements.",
      options: [{
        text: "1.1 Administration, School Management Committee, School Management Development Committee, teachers, staff, parents, students provide cooperation to headmasters."
      }, {
        text: "2.1 For smooth daily and annual functioning of the school, the headmaster, School Management Committee, School Management Development Committee, BRC, URC management, administration work in coordination and make decisions together."
      }, {
        text: "3.1 For participation in national and international programs, headmasters provide collaborative support to teachers, students, parents and make various opportunities available."
      }, {
        text: "4.1 Headmasters accept responsibility for received suggestions and opinions for school development and take action.\n4.2 Headmasters/school heads consider suggestions and opinions from all stakeholders and effectively implement various programs and activities.",
        isGreen: true
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/1G6vKvcd1uvKCVPGyccbSnO-GkzHVGi4l"
    }
  },
  126: {
    mr: {
      orangeDesc: "६.५.१ शाळा पालकांचे, माजी विद्यार्थ्यांचे शाळेच्या प्रक्रियेबद्दल अभिप्राय घेते त्यानुसार शालेय कार्यक्षमतेत सुधारणा आणि त्यांच्या समाधानाचे मूल्यांकन करण्यासाठी एक प्रभावी व्यासपीठ उपलब्ध करून देते.",
      options: [{
        text: "१.१ शाळा पालक, माजी विद्यार्थी यांचा वर्षातून एकदा मेळावा आयोजित करते.",
        isGreen: true
      }, {
        text: "२.१ शाळा पालक, माजी विद्यार्थी यांचा तीन महिन्यातून एकदा मेळावा आयोजित करते."
      }, {
        text: "३.१ पालक, माजी विद्यार्थी, शाळा व्यवस्थापन समिती, मुख्याध्यापक, शिक्षक, विद्यार्थी व सर्वघटक समन्वयाने नियोजन आराखडा तयार करतात."
      }, {
        text: "४.१ पालक शिक्षकांना दोन महिन्यातून किमान एकदा शाळेत भेटतात व चर्चा करतात.\n४.२ माजी विद्यार्थी, पालक व शिक्षक वर्षातून एकदा शाळेत भेटून शालेय विकासाचा आराखडा तयार करतात व केलेल्या आराखड्यानुसार त्यावेळच्या शालेय परिस्थितीचा आढावा घेऊन पुनरावलोकन करतात. (एक दिवस शाळेसाठी) वेळप्रसंगी शाळेसाठी श्रमदान / योगदान देतात."
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/1GDsdHZ2G4ot4abRNsEsmEJiewZJ9AE24"
    },
    en: {
      orangeDesc: "6.5.1 The school takes feedback from parents and alumni about school processes, provides an effective platform for improving school efficiency and evaluating their satisfaction.",
      options: [{
        text: "1.1 The school organizes a meeting of parents and alumni once a year.",
        isGreen: true
      }, {
        text: "2.1 The school organizes a meeting of parents and alumni once every three months."
      }, {
        text: "3.1 Parents, alumni, School Management Committee, headmaster, teachers, students and all stakeholders prepare a planning framework in coordination."
      }, {
        text: "4.1 Parents meet teachers at school at least once every two months and discuss.\n4.2 Alumni, parents and teachers meet at school once a year to prepare a school development plan and review the school situation as per the plan. (One day for the school) They contribute labor/contributions for the school as needed."
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/1GDsdHZ2G4ot4abRNsEsmEJiewZJ9AE24"
    }
  },
  127: {
    mr: {
      orangeDesc: "६.६.१ शाळेचे मुख्याध्यापक सामाजिक उत्तरदायित्व संबंधित कार्यक्रम जसे - परिसर स्वच्छता, नवसाक्षरता व प्रौढ शिक्षण, पर्यावरणदूत, पर्यावरण संरक्षण, सांस्कृतिक वारसा जतन, वृद्धाश्रमांसोबत काम इत्यादी बाबींचा कार्यक्रम तयार करतात आणि सर्व वयोगटासाठी वार्षिक अभ्यासक्रम योजनेत त्यांचा समावेश करतात.",
      options: [{
        text: "१.१ शाळा मुख्याध्यापक सर्व वयोगटांसाठी वार्षिक नियोजन करतात आणि समाजोपयोगी कार्यक्रमाचे उपयोजन करतात."
      }, {
        text: "२.१ विविध सामाजिक आणि पर्यावरणाच्या समस्याचे निराकरण करण्यासाठी समाज प्रबोधनपर विविध कार्यक्रम आयोजित केले जातात."
      }, {
        text: "३.१ उद्योगक्षेत्र, शिक्षण तज्ज्ञ, माजी विद्यार्थी,स्वयंसेवक व इतर मानवी संसाधने यांना शाळेशी जोडण्यामध्ये समाजाचा सक्रिय सहभाग आहे."
      }, {
        text: "४.१ शाळेमध्ये किमान दोन शाश्वत सामाजिक परिवर्तनाचे परिणाम देणारे प्रकल्प सुरू आहेत.\n४.२ विद्यार्थ्यांमध्ये जीवन कौशल्ये रुजविण्यासाठी समाजोपयोगी कार्यक्रमांचा अभ्यासक्रमामध्ये उत्तमरित्या अंतर्भाव करून नियमित आयोजन केले जाते.",
        isGreen: true
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/1GGW9K8BcKk3zMICHpCLsLroGeMF4oZoW"
    },
    en: {
      orangeDesc: "6.6.1 The school's headmaster prepares programs related to social responsibility such as - neighborhood cleanliness, neo-literacy and adult education, environment ambassador, environment protection, cultural heritage preservation, working with old age homes etc. and includes them in the annual curriculum plan for all age groups.",
      options: [{
        text: "1.1 The school headmaster does annual planning for all age groups and implements socially useful programs."
      }, {
        text: "2.1 Various social awareness programs are organized to resolve various social and environmental problems."
      }, {
        text: "3.1 Industry, education experts, alumni, volunteers and other human resources have active participation of society in connecting with the school."
      }, {
        text: "4.1 At least two sustainable social transformation projects are underway in the school.\n4.2 Socially useful programs are regularly organized by excellently incorporating them into the curriculum to inculcate life skills in students.",
        isGreen: true
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/1GGW9K8BcKk3zMICHpCLsLroGeMF4oZoW"
    }
  },
  128: {
    mr: {
      orangeDesc: "६.७.१ व्यवस्थापन, शिक्षक पालक संघ (P.T.A.), शाळा व्यवस्थापन समिती/शाळा व्यवस्थापन विकास समितीचे पदाधिकारी शाळेच्या VISION व MISSION यांचे पुनरावलोकन करून मूल्यांकन व सतत सुधारणा करण्याची कार्यप्रणाली विकसित करते.",
      options: [{
        text: "१.१ शाळेच्या VISION व MISSION पुनरावलोकन करण्याची कार्यप्रणाली शिक्षक पालक संघ (P.T.A) शाळा व्यवस्थापन समिती/शाळा व्यवस्थापन विकास समिती कडे आहे."
      }, {
        text: "२.१ शाळा सुधारणा योजनेसाठी शाळेच्या विविध घटकांची नियमित बैठक घेऊन त्यांचे विचार अभिप्राय घेतले जातात व त्यावर चर्चा होते.",
        isGreen: true
      }, {
        text: "३.१ शाळा व्यवस्थापन समिती/शाळा व्यवस्थापन विकास समिती. शिक्षक- पालक संघ (P.T.A.), पदाधिकारी शाळेचे विद्यार्थी, पालक, शिक्षक, मुख्याध्यापक यांच्या प्रश्नांचे,समस्यांचे पुनरावलोकन करतात आणि त्यांचे निराकरण करतात."
      }, {
        text: "४.१ शिक्षक-पालक संघ (P.T.A.), शाळा व्यवस्थापन समिती/शाळा व्यवस्थापन विकास समिती पदाधिकारी शाळेची VISION व MISSION साध्य करण्यासाठी समर्थन देऊन आवश्यक ती संसाधने उपलब्ध करून देतात."
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/1GGX5O-Vsjffm_l-LDsrcFyBM8aHmuFGM"
    },
    en: {
      orangeDesc: "6.7.1 Management, Parent Teacher Association (P.T.A.), School Management Committee/School Management Development Committee officials review the school's VISION and MISSION and develop a system for evaluation and continuous improvement.",
      options: [{
        text: "1.1 The Parent Teacher Association (P.T.A), School Management Committee/School Management Development Committee has a system for reviewing the school's VISION and MISSION."
      }, {
        text: "2.1 Regular meetings of various school stakeholders are held for school improvement plans, their thoughts and feedback are taken and discussed.",
        isGreen: true
      }, {
        text: "3.1 School Management Committee/School Management Development Committee, Parent Teacher Association (P.T.A.), officials review and resolve the questions and problems of students, parents, teachers, and headmasters."
      }, {
        text: "4.1 Parent Teacher Association (P.T.A.), School Management Committee/School Management Development Committee officials provide support and make necessary resources available to achieve the school's VISION and MISSION."
      }],
      evidenceUrl: "https://drive.google.com/drive/folders/1GGX5O-Vsjffm_l-LDsrcFyBM8aHmuFGM"
    }
  }
};

function TeacherSqafPage() {
  const { profile } = useAuth();
  const [view, setView] = useState<"info" | "dashboard" | "summary" | "certificate">("info");
  const [selectedLang, setSelectedLang] = useState<"mr" | "en">("mr");
  const [pdfLang, setPdfLang] = useState<"mr" | "en">("mr");
  const [activeStandardDetails, setActiveStandardDetails] = useState<number | null>(null);

  // School Info Form State
  const loadSchoolInfo = () => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("sqaf_school_info");
      if (saved) {
        try { return JSON.parse(saved); } catch (e) { /* ignore */ }
      }
    }
    return null;
  };
  const savedInfo = loadSchoolInfo();
  const [infoSchoolName, setInfoSchoolName] = useState(savedInfo?.schoolName || profile?.schoolName || "");
  const [infoHeadmaster, setInfoHeadmaster] = useState(savedInfo?.headmaster || profile?.fullName || "");
  const [infoAddress, setInfoAddress] = useState(savedInfo?.address || profile?.address || "");
  const [infoCenterName, setInfoCenterName] = useState(savedInfo?.centerName || "");
  const [infoTaluka, setInfoTaluka] = useState(savedInfo?.taluka || "");
  const [infoDistrict, setInfoDistrict] = useState(savedInfo?.district || "");
  const [infoUdise, setInfoUdise] = useState(savedInfo?.udise || profile?.udise || "");

  const handleInfoSubmit = () => {
    const data = {
      schoolName: infoSchoolName,
      headmaster: infoHeadmaster,
      address: infoAddress,
      centerName: infoCenterName,
      taluka: infoTaluka,
      district: infoDistrict,
      udise: infoUdise,
    };
    localStorage.setItem("sqaf_school_info", JSON.stringify(data));
    toast.success(selectedLang === "mr" ? "माहिती जतन केली." : "Information saved.");
    setView("dashboard");
  };

  const [card1Checked, setCard1Checked] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("sqaf_card1_checked");
      return saved !== null ? saved === "true" : true;
    }
    return true;
  });

  const [card2Checked, setCard2Checked] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("sqaf_card2_checked");
      return saved !== null ? saved === "true" : false;
    }
    return false;
  });

  const [card3Checked, setCard3Checked] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("sqaf_card3_checked");
      return saved !== null ? saved === "true" : false;
    }
    return false;
  });

  const toggleCard1 = () => {
    const nextVal = !card1Checked;
    setCard1Checked(nextVal);
    localStorage.setItem("sqaf_card1_checked", String(nextVal));
  };

  const toggleCard2 = () => {
    const nextVal = !card2Checked;
    setCard2Checked(nextVal);
    localStorage.setItem("sqaf_card2_checked", String(nextVal));
  };

  const toggleCard3 = () => {
    const nextVal = !card3Checked;
    setCard3Checked(nextVal);
    localStorage.setItem("sqaf_card3_checked", String(nextVal));
  };

  const [certLang, setCertLang] = useState<"mr" | "en">("mr");
  const [isEditingCert, setIsEditingCert] = useState(false);

  const [certSchoolName, setCertSchoolName] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("sqaf_cert_school_name") || infoSchoolName || profile?.schoolName || "Z.P SCHOOL DHONDEWADIPED";
    }
    return "Z.P SCHOOL DHONDEWADIPED";
  });

  const [certUdise, setCertUdise] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("sqaf_cert_udise") || infoUdise || profile?.udise || "27350800701";
    }
    return "27350800701";
  });

  const [certTitleEn, setCertTitleEn] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("sqaf_cert_title_en") || "Self Assessment Completion Certificate";
    }
    return "Self Assessment Completion Certificate";
  });

  const [certTitleMr, setCertTitleMr] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("sqaf_cert_title_mr") || "स्वयं मूल्यमापन पूर्तता प्रमाणपत्र";
    }
    return "स्वयं मूल्यमापन पूर्तता प्रमाणपत्र";
  });

  const [certDescEn, setCertDescEn] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("sqaf_cert_desc_en") || "has successfully completed the Self Assessment of the School Quality Assessment and Assurance Framework (SQAAF) for the Academic Year 2025-26, in accordance with the prescribed framework and guidelines";
    }
    return "has successfully completed the Self Assessment of the School Quality Assessment and Assurance Framework (SQAAF) for the Academic Year 2025-26, in accordance with the prescribed framework and guidelines";
  });

  const [certDescMr, setCertDescMr] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("sqaf_cert_desc_mr") || "यांनी शैक्षणिक वर्ष २०२५-२६ साठी शालेय गुणवत्ता मूल्यमापन व खात्री आराखडा (SQAAF) अंतर्गत स्वयं मूल्यमापन विहित आराखडा आणि मार्गदर्शक तत्त्वांनुसार यशस्वीरित्या पूर्ण केले आहे.";
    }
    return "यांनी शैक्षणिक वर्ष २०२५-२६ साठी शालेय गुणवत्ता मूल्यमापन व खात्री आराखडा (SQAAF) अंतर्गत स्वयं मूल्यमापन विहित आराखडा आणि मार्गदर्शक तत्त्वांनुसार यशस्वीरित्या पूर्ण केले आहे.";
  });

  useEffect(() => {
    setPdfLang(selectedLang);
    setCertLang(selectedLang);
  }, [selectedLang]);

  const handleEditToggle = () => {
    if (isEditingCert) {
      localStorage.setItem("sqaf_cert_school_name", certSchoolName);
      localStorage.setItem("sqaf_cert_udise", certUdise);
      localStorage.setItem("sqaf_cert_title_en", certTitleEn);
      localStorage.setItem("sqaf_cert_title_mr", certTitleMr);
      localStorage.setItem("sqaf_cert_desc_en", certDescEn);
      localStorage.setItem("sqaf_cert_desc_mr", certDescMr);
      toast.success(certLang === "mr" ? "बदल जतन केले आहेत." : "Changes saved successfully.");
    }
    setIsEditingCert(!isEditingCert);
  };

  const currentDetail = activeStandardDetails !== null ? getStandardDetail(activeStandardDetails) : null;

  // Ref to the scrolling container in the summary view
  const gridRef = useRef<HTMLDivElement>(null);
  
  // Track last selected standard ID for scroll restore and highlighting
  const [lastSelectedStandard, setLastSelectedStandard] = useState<number | null>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("sqaf_last_selected_standard");
      return saved ? parseInt(saved, 10) : null;
    }
    return null;
  });

  // Track saved scroll position for restore
  const [savedScrollPosition, setSavedScrollPosition] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("sqaf_saved_scroll_position");
      return saved ? parseFloat(saved) : 0;
    }
    return 0;
  });

  // Track saved window scroll position
  const [savedWindowScrollPosition, setSavedWindowScrollPosition] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("sqaf_saved_window_scroll_position");
      return saved ? parseFloat(saved) : 0;
    }
    return 0;
  });

  // Ref to track the previous activeStandardDetails value
  const prevActiveRef = useRef<number | null>(null);

  // Restore scroll positions when returning from standard details page
  useEffect(() => {
    const wasInDetails = prevActiveRef.current !== null;
    prevActiveRef.current = activeStandardDetails;

    if (wasInDetails && activeStandardDetails === null && view === "summary") {
      const restore = () => {
        if (gridRef.current) {
          gridRef.current.scrollTop = savedScrollPosition;
        }
        window.scrollTo(0, savedWindowScrollPosition);
      };
      restore();
      const rAF = requestAnimationFrame(restore);
      const tO = setTimeout(restore, 100);
      return () => {
        cancelAnimationFrame(rAF);
        clearTimeout(tO);
      };
    }
  }, [activeStandardDetails, view, savedScrollPosition, savedWindowScrollPosition]);

  // Dynamic state for completed standards
  const [completedStandards, setCompletedStandards] = useState<Set<number>>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("sqaf_completed_standards");
      if (saved) {
        try {
          return new Set(JSON.parse(saved));
        } catch (e) {
          console.error(e);
        }
      }
    }
    return new Set(Array.from({ length: 128 }, (_, i) => i + 1));
  });

  // Dynamic state for selected options of detailed standards (1 to 87)
  const [selectedOptions, setSelectedOptions] = useState<Record<number, number>>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("sqaf_selected_options");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error(e);
        }
      }
    }
    return {};
  });

  const groupedOptions = useMemo(() => {
    if (!currentDetail || !currentDetail[selectedLang]) return [];
    
    const normalizeLevel = (char: string): string => {
      const mapping: Record<string, string> = {
        "१": "1", "२": "2", "३": "3", "४": "4", "५": "5", "६": "6", "७": "7", "८": "8", "९": "9",
        "1": "1", "2": "2", "3": "3", "4": "4", "5": "5", "6": "6", "7": "7", "8": "8", "9": "9"
      };
      return mapping[char] || char;
    };

    const opts = currentDetail[selectedLang].options;
    const groups: { text: string; isGreen?: boolean }[] = [];
    
    opts.forEach((opt) => {
      const trimmed = opt.text.trim();
      const match = trimmed.match(/^([1-9]|[१२३४५६७८९])/);
      const level = match ? normalizeLevel(match[1]) : null;
      
      let found = false;
      if (level) {
        const existingIndex = groups.findIndex((g) => {
          const gTrimmed = g.text.trim();
          const gMatch = gTrimmed.match(/^([1-9]|[१२३४५६७८९])/);
          return gMatch && normalizeLevel(gMatch[1]) === level;
        });
        if (existingIndex !== -1) {
          groups[existingIndex] = {
            text: groups[existingIndex].text + "\n" + opt.text,
            isGreen: groups[existingIndex].isGreen || opt.isGreen
          };
          found = true;
        }
      }
      
      if (!found) {
        groups.push({
          text: opt.text,
          isGreen: opt.isGreen
        });
      }
    });
    // Append "लागू नाही" / "Not applicable" as the last option
    groups.push({
      text: selectedLang === "mr" ? "लागू नाही" : "Not applicable",
      isGreen: false
    });
    return groups;
  }, [currentDetail, selectedLang]);

  const selectOption = (standardId: number, optionIdx: number) => {
    const updated = { ...selectedOptions, [standardId]: optionIdx };
    setSelectedOptions(updated);
    localStorage.setItem("sqaf_selected_options", JSON.stringify(updated));

    // Also mark the standard as completed
    const updatedCompleted = new Set(completedStandards);
    if (!updatedCompleted.has(standardId)) {
      updatedCompleted.add(standardId);
      setCompletedStandards(updatedCompleted);
      localStorage.setItem("sqaf_completed_standards", JSON.stringify(Array.from(updatedCompleted)));
    }
    
    toast.success(selectedLang === "mr" ? `पर्याय निवडला.` : `Option selected.`);
  };

  const toggleStandard = (num: number) => {
    const updated = new Set(completedStandards);
    if (updated.has(num)) {
      updated.delete(num);
      toast.info(`मानक क्र. ${toMarathiNumerals(num)} अपूर्ण केले.`);
    } else {
      updated.add(num);
      toast.success(`मानक क्र. ${toMarathiNumerals(num)} पूर्ण केले.`);
    }
    setCompletedStandards(updated);
    localStorage.setItem("sqaf_completed_standards", JSON.stringify(Array.from(updated)));
  };

  const toggleLanguage = () => {
    const nextLang = selectedLang === "mr" ? "en" : "mr";
    setSelectedLang(nextLang);
    toast.success(nextLang === "mr" ? "भाषा बदलली: मराठी" : "Language changed to English");
  };

  const getGroupedOptions = (standardId: number, lang: "mr" | "en") => {
    const detail = getStandardDetail(standardId);
    if (!detail || !detail[lang]) return [];
    
    const normalizeLevel = (char: string): string => {
      const mapping: Record<string, string> = {
        "१": "1", "२": "2", "३": "3", "४": "4", "५": "5", "६": "6", "७": "7", "८": "8", "९": "9",
        "1": "1", "2": "2", "3": "3", "4": "4", "5": "5", "6": "6", "7": "7", "8": "8", "9": "9"
      };
      return mapping[char] || char;
    };

    const options = detail[lang].options;
    const groups: { text: string; isGreen?: boolean }[] = [];
    
    options.forEach((opt) => {
      const trimmed = opt.text.trim();
      const match = trimmed.match(/^([1-9]|[१२३४५६७८९])/);
      const level = match ? normalizeLevel(match[1]) : null;
      
      let found = false;
      if (level) {
        const existingIndex = groups.findIndex((g) => {
          const gTrimmed = g.text.trim();
          const gMatch = gTrimmed.match(/^([1-9]|[१२३४५६७८९])/);
          return gMatch && normalizeLevel(gMatch[1]) === level;
        });
        if (existingIndex !== -1) {
          groups[existingIndex] = {
            text: groups[existingIndex].text + "\n" + opt.text,
            isGreen: groups[existingIndex].isGreen || opt.isGreen
          };
          found = true;
        }
      }
      
      if (!found) {
        groups.push({
          text: opt.text,
          isGreen: opt.isGreen
        });
      }
    });
    // Append "लागू नाही" / "Not applicable" as the last option
    groups.push({
      text: lang === "mr" ? "लागू नाही" : "Not applicable",
      isGreen: false
    });
    return groups;
  };

  const handleDownloadPdf = async () => {
    try {
      const toastId = toast.loading(selectedLang === "mr" ? "PDF तयार करत आहे..." : "Generating PDF...");
      
      // Dynamically import pdf-lib
      const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib');
      
      const pdfBytes = await fetch("/SQAAF_Self_Evaluation.pdf").then(res => res.arrayBuffer());
      const coordsRes = await fetch("/sqaaf_coords.json");
      const coordsMap = await coordsRes.json();
      
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const helveticaFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const pages = pdfDoc.getPages();
      
      // Coordinates logic derived from python script
      const SCALE = 1.18083684;
      const NEW_L1_START = 253.82;
      const NEW_L1_END = NEW_L1_START + 125.31 * SCALE;
      const NEW_L2_START = NEW_L1_END;
      const NEW_L2_END = NEW_L2_START + 125.30 * SCALE;
      const NEW_L3_START = NEW_L2_END;
      const NEW_L3_END = NEW_L3_START + 125.28 * SCALE;
      const NEW_L4_START = NEW_L3_END;
      const NEW_L4_END = NEW_L4_START + 125.28 * SCALE;
      const EVAL_COL_START = NEW_L4_END;
      const EVAL_COL_WIDTH = 22.38;
      
      const levelXCoords = [
        { x: NEW_L1_START, w: NEW_L1_END - NEW_L1_START },
        { x: NEW_L2_START, w: NEW_L2_END - NEW_L2_START },
        { x: NEW_L3_START, w: NEW_L3_END - NEW_L3_START },
        { x: NEW_L4_START, w: NEW_L4_END - NEW_L4_START },
      ];

      // Read selected options
      const savedSelectedOptions = localStorage.getItem("sqaf_selected_options");
      let selectedOptionsMap: Record<string, number> = {};
      if (savedSelectedOptions) {
        try {
          selectedOptionsMap = JSON.parse(savedSelectedOptions);
        } catch(e) {}
      }

      // Draw highlights and marks for each standard
      Object.keys(selectedOptionsMap).forEach((standardId) => {
        const selectedIndex = selectedOptionsMap[standardId];
        if (selectedIndex === undefined || selectedIndex === null) return;
        
        const coords = coordsMap[standardId.toString()];
        if (!coords) return;
        
        const pageIdx = coords.page;
        if (pageIdx >= pages.length) return;
        const page = pages[pageIdx];
        
        // y_top and y_bottom in PyMuPDF are from top-left.
        // pdf-lib origin is bottom-left.
        const { height } = page.getSize();
        const yTop = height - coords.y_top;
        const yBot = height - coords.y_bottom;
        // Add a tiny padding
        const rectY = yBot - 2; 
        const rectH = (yTop - yBot) + 4;
        
        if (selectedIndex < 4) {
          // Highlight the specific level
          const lx = levelXCoords[selectedIndex];
          page.drawRectangle({
            x: lx.x,
            y: rectY,
            width: lx.w,
            height: rectH,
            color: rgb(1, 0.95, 0.6), // Light Yellow
            opacity: 0.5,
          });
          
          // Add mark in Eval column
          const markValue = (selectedIndex + 1).toString();
          page.drawText(markValue, {
            x: EVAL_COL_START + (EVAL_COL_WIDTH / 2) - 3, // center roughly
            y: rectY + (rectH / 2) - 4, // middle roughly
            size: 11,
            font: helveticaFont,
            color: rgb(0, 0, 0),
          });
          
        } else if (selectedIndex === 4) {
          // Not applicable: fully highlight the row
          page.drawRectangle({
            x: NEW_L1_START,
            y: rectY,
            width: NEW_L4_END - NEW_L1_START, // Cover all levels
            height: rectH,
            color: rgb(0.9, 0.9, 0.9), // Grey
            opacity: 0.7,
          });
        }
      });
      
      const pdfBytesModified = await pdfDoc.save();
      const blob = new Blob([pdfBytesModified as unknown as BlobPart], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      
      toast.dismiss(toastId);
      toast.success(selectedLang === "mr" ? "PDF यशस्वीरित्या तयार झाली!" : "PDF Generated Successfully!");
      
      window.open(url, "_blank");
      
    } catch(err) {
      console.error("PDF generation error:", err);
      toast.error(selectedLang === "mr" ? "PDF बनवताना त्रुटी आली." : "Error generating PDF.");
    }
  };

  const handleSavePdf = async () => {
    const schoolName = certSchoolName;
    const udise = certUdise;
    const title = certLang === "mr" ? certTitleMr : certTitleEn;
    const description = certLang === "mr" ? certDescMr : certDescEn;

    const headerText = certLang === "mr" 
      ? "राज्य शैक्षणिक संशोधन व प्रशिक्षण परिषद महाराष्ट्र" 
      : "State Council For Educational Research and Training Maharashtra";
      
    const certifyText = certLang === "mr" 
      ? "याद्वारे प्रमाणित करण्यात येते की," 
      : "This is to certify that";

    const sigHeader = certLang === "mr" 
      ? "एस.सी.ई.आर.टी. महाराष्ट्र" 
      : "SCERT Maharashtra";

    const sigAddress = certLang === "mr"
      ? `राज्य शैक्षणिक संशोधन व प्रशिक्षण परिषद, महाराष्ट्र, पुणे.<br/>(एस.सी.ई.आर.टी.)<br/>७०८, सदाशिव पेठ, कुमठेकर मार्ग, पुणे – ४११0३0<br/>महाराष्ट्र, भारत`
      : `State Council For Educational Research and Training, Maharashtra, Pune.<br/>(SCERT)<br/>708, Sadashiv Peth, Kumthekar Marg, Pune – 411030<br/>Maharashtra, India`;

    const printContainer = document.createElement("div");
    
    const html = `
      <div style="
        font-family: 'Georgia', serif;
        width: 794px;
        height: 1122px;
        position: relative;
        background-color: #fff;
        padding: 50px;
        box-sizing: border-box;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        border: 1px solid #e2e8f0;
        margin: 0 auto;
        background-image: radial-gradient(circle, #fdfbf7 0%, #fff 100%);
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      ">
        <!-- Gold borders -->
        <div style="position: absolute; top: 20px; bottom: 20px; left: 20px; right: 20px; border: 3px double #d4af37; pointer-events: none;"></div>
        <div style="position: absolute; top: 28px; bottom: 28px; left: 28px; right: 28px; border: 1px solid #bf953f; pointer-events: none;"></div>

        <!-- Corners -->
        <!-- Top Left -->
        <svg style="position: absolute; top: 32px; left: 32px; width: 48px; height: 48px; color: #bf953f;" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M 48,2 L 2,2 L 2,48" />
          <path d="M 40,8 L 8,8 L 8,40" />
        </svg>
        <!-- Top Right -->
        <svg style="position: absolute; top: 32px; right: 32px; width: 48px; height: 48px; color: #bf953f;" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M 0,2 L 46,2 L 46,48" />
          <path d="M 8,8 L 40,8 L 40,40" />
        </svg>
        <!-- Bottom Left -->
        <svg style="position: absolute; bottom: 32px; left: 32px; width: 48px; height: 48px; color: #bf953f;" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M 48,46 L 2,46 L 2,0" />
          <path d="M 40,40 L 8,40 L 8,8" />
        </svg>
        <!-- Bottom Right -->
        <svg style="position: absolute; bottom: 32px; right: 32px; width: 48px; height: 48px; color: #bf953f;" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M 0,46 L 46,46 L 46,0" />
          <path d="M 8,40 L 40,40 L 40,8" />
        </svg>

        <!-- Gold waves -->
        <svg style="position: absolute; top: 0; right: 0; width: 350px; height: 350px; pointer-events: none;" viewBox="0 0 200 200" preserveAspectRatio="none">
          <defs>
            <linearGradient id="gold-grad-print" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#bf953f" />
              <stop offset="25%" stop-color="#fcf6ba" />
              <stop offset="50%" stop-color="#b38728" />
              <stop offset="75%" stop-color="#fbf5b7" />
              <stop offset="100%" stop-color="#aa771c" />
            </linearGradient>
          </defs>
          <path d="M 200,0 L 200,150 C 180,120 150,80 120,60 C 90,40 50,20 0,0 Z" fill="url(#gold-grad-print)" opacity="0.15" />
          <path d="M 200,0 L 200,120 C 170,100 145,60 115,45 C 85,30 55,15 15,0 Z" fill="url(#gold-grad-print)" opacity="0.3" />
          <path d="M 200,0 L 200,90 C 185,75 160,50 130,35 C 100,20 70,10 30,0 Z" fill="url(#gold-grad-print)" opacity="0.5" />
          <path d="M 200,0 L 200,60 C 190,50 170,30 145,20 C 120,10 90,5 50,0 Z" fill="url(#gold-grad-print)" opacity="0.8" />
        </svg>

        <svg style="position: absolute; bottom: 0; left: 0; width: 350px; height: 350px; pointer-events: none;" viewBox="0 0 200 200" preserveAspectRatio="none">
          <path d="M 0,200 L 0,50 C 20,80 50,120 80,140 C 110,160 150,180 200,200 Z" fill="url(#gold-grad-print)" opacity="0.15" />
          <path d="M 0,200 L 0,80 C 30,100 55,140 85,155 C 115,170 145,185 185,200 Z" fill="url(#gold-grad-print)" opacity="0.3" />
          <path d="M 0,200 L 0,110 C 15,125 40,150 70,165 C 100,180 130,190 170,200 Z" fill="url(#gold-grad-print)" opacity="0.5" />
          <path d="M 0,200 L 0,140 C 10,150 30,170 55,180 C 80,190 110,195 150,200 Z" fill="url(#gold-grad-print)" opacity="0.8" />
        </svg>

        <!-- Content -->
        <div style="position: relative; z-index: 10; display: flex; flex-direction: column; align-items: center; text-align: center; width: 100%; max-width: 600px;">
          <h1 style="color: #1e3b8b; font-family: 'Georgia', serif; font-weight: 900; font-size: 26px; line-height: 1.4; text-transform: uppercase; margin: 0; letter-spacing: 0.5px;">
            ${headerText}
          </h1>
          
          <div style="height: 2px; width: 120px; background-color: #bf953f; margin: 25px 0;"></div>

          <h2 style="color: #0e7490; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-weight: 900; font-size: 14px; tracking: 0.25em; text-transform: uppercase; margin: 0 0 50px 0; letter-spacing: 2.5px;">
            ${title}
          </h2>

          <p style="color: #64748b; font-family: 'Georgia', serif; font-style: italic; font-size: 18px; margin: 0 0 20px 0;">
            ${certifyText}
          </p>

          <h3 style="color: #0f172a; font-family: 'Georgia', serif; font-weight: 800; font-size: 24px; text-transform: uppercase; border-bottom: 2px solid #cbd5e1; padding-bottom: 5px; margin: 0 0 10px 0; display: inline-block; width: 90%; letter-spacing: 0.5px;">
            ${schoolName}
          </h3>

          <div style="display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 45px; color: #334155; font-family: 'Georgia', serif; font-weight: bold; font-size: 19px;">
            <span style="color: #bf953f;">—</span>
            <span style="letter-spacing: 3px;">${udise}</span>
            <span style="color: #bf953f;">—</span>
          </div>

          <p style="color: #334155; font-family: 'Georgia', serif; font-size: 16px; line-height: 1.6; max-width: 520px; margin: 0 0 70px 0;">
            ${description}
          </p>

          <div style="margin-top: 20px;">
            <p style="color: #1e3b8b; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-weight: 900; font-size: 13px; text-transform: uppercase; margin: 0 0 5px 0; letter-spacing: 1px;">
              ${sigHeader}
            </p>
            <p style="color: #64748b; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 10px; font-weight: bold; line-height: 1.5; margin: 0;">
              ${sigAddress}
            </p>
          </div>
        </div>
      </div>
    `;

    printContainer.innerHTML = html;

    const { default: printJS } = await import("print-js");
    printJS({
      printable: printContainer.innerHTML,
      type: 'raw-html',
      style: `
        @media print {
          @page {
            size: portrait;
            margin: 0;
          }
          body {
            margin: 0;
            padding: 0;
            background-color: #fff;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          * {
            box-sizing: border-box;
          }
        }
      `
    });
  };

  const standards = Array.from({ length: 128 }, (_, i) => i + 1);

  // Summary Metrics
  const totalStandards = 128;
  const completedCount = completedStandards.size;
  const uncompletedCount = totalStandards - completedCount;
  const totalMarks = 452;
  const obtainedMarks = Math.round((completedCount / totalStandards) * totalMarks);

  const t = {
    mr: {
      title: "स्वयं मूल्यांकन",
      subtitle: "School Quality Assessment Framework",
      teacherInCharge: "शिक्षक प्रभारी",
      location: "स्थान",
      jurisdiction: "भौगोलिक कार्यक्षेत्र",
      actions: "गुणवत्ता मूल्यांकन डेस्क",
      viewSub: "भरलेली माहिती पहा.",
      viewDesc: "तुमचे सबमिशन पहा",
      viewBtn: "View",
      downloadPdfSub: "डाऊनलोड करा (pdf)",
      downloadPdfDesc: "तुमचे सबमिशन पीडीएफ फाइल स्वरूपात डाऊनलोड करा.",
      downloadBtn: "Download",
      downloadCertSub: "प्रमाणपत्र डाऊनलोड करा",
      downloadCertDesc: "तुमचे प्रमाणपत्र डाऊनलोड करा",
      certBtn: "Download",
      partner: "Technical Partner",
      summaryTitle: "स्वयं मूल्यांकन सारांश",
      totalStands: "एकूण मानकांची संख्या",
      completedStands: "प्रतिसाद नोंदवलेल्या मानकांची संख्या",
      uncompletedStands: "प्रतिसाद न नोंदवलेल्या मानकांची संख्या",
      marksRatio: "प्राप्त गुण / एकूण गुण",
      standards: "मानके",
      clickHint: "प्रत्येक मानकाला क्लिक करून प्रतिसाद नोंदवा.",
      backBtn: "मागे जा (Back)",
      infoTitle: "शालेय माहिती",
      infoSubtitle: "कृपया खालील माहिती भरा / तपासा",
      infoSchoolName: "शाळेचे नाव",
      infoHeadmaster: "मुख्याध्यापकाचे नाव",
      infoAddress: "शाळेचा पत्ता",
      infoCenterName: "केंद्राचे नाव",
      infoTaluka: "तालुका",
      infoDistrict: "जिल्हा",
      infoUdise: "UDISE क्रमांक",
      infoProceed: "पुढे जा",
    },
    en: {
      title: "Self Evaluation",
      subtitle: "School Quality Assessment Framework",
      teacherInCharge: "Teacher In-Charge",
      location: "Location",
      jurisdiction: "Geographic Jurisdiction",
      actions: "Quality Assessment Desk",
      viewSub: "View Filled Information",
      viewDesc: "View your submission",
      viewBtn: "View",
      downloadPdfSub: "Download (pdf)",
      downloadPdfDesc: "Download your submission in PDF format.",
      downloadBtn: "Download",
      downloadCertSub: "Download Certificate",
      downloadCertDesc: "Download your certificate",
      certBtn: "Download",
      partner: "Technical Partner",
      summaryTitle: "Self Evaluation Summary",
      totalStands: "Total Number of Standards",
      completedStands: "Responded Standards Count",
      uncompletedStands: "Unresponded Standards Count",
      marksRatio: "Obtained Marks / Total Marks",
      standards: "Standards",
      clickHint: "Click on each standard to record your response.",
      backBtn: "Go Back",
      infoTitle: "School Information",
      infoSubtitle: "Please fill in / verify the details below",
      infoSchoolName: "School Name",
      infoHeadmaster: "Headmaster Name",
      infoAddress: "School Address",
      infoCenterName: "Center Name",
      infoTaluka: "Taluka",
      infoDistrict: "District",
      infoUdise: "UDISE Code",
      infoProceed: "Proceed",
    }
  }[selectedLang];

  return (
    <div className="min-h-screen bg-slate-50/50">
      {/* Hide header and sidebar if viewing detailed full-screen standard or certificate */}
      <div className={(activeStandardDetails !== null || view === "certificate") ? "hidden" : "block"}>
         <TeacherHeader />
         <TeacherSidebar />
      </div>

      <main className={`${(activeStandardDetails !== null || view === "certificate") ? "" : "lg:pl-64 pt-16"} min-h-screen transition-all duration-300`}>
        {activeStandardDetails === null && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
            <div className="absolute top-24 left-1/4 size-[500px] bg-amber-200/10 rounded-full blur-[100px] animate-pulse" />
            <div className="absolute bottom-24 right-1/4 size-[600px] bg-teal-200/10 rounded-full blur-[120px]" />
          </div>
        )}

        <div className={`w-full relative z-10 space-y-6 ${activeStandardDetails !== null ? "" : "p-4 md:p-6"}`}>
          <AnimatePresence mode="wait">
            {activeStandardDetails !== null && currentDetail ? (
              <motion.div
                key="details"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-white min-h-screen w-full flex flex-col items-center"
              >
                <div className="w-full max-w-lg p-5 md:p-8 flex flex-col space-y-6">
                  {/* Clean Mobile-like Header matching screenshots */}
                  <div className="flex items-center gap-4 py-2">
                    <button
                      onClick={() => setActiveStandardDetails(null)}
                      className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                    >
                      <ArrowLeft className="size-6 text-slate-800" strokeWidth={2.5} />
                    </button>
                    <div className="flex-1"></div>
                  </div>

                  <h2 className="text-[28px] font-black text-slate-900 tracking-tight">
                    {selectedLang === "mr" ? `मानक क्र. ${toMarathiNumerals(activeStandardDetails)}` : `Standard No. ${activeStandardDetails}`}
                  </h2>

                  {/* Orange Detail Box */}
                  <div className="bg-[#ffaf66] rounded-[1.5rem] p-6 shadow-sm text-slate-900 font-extrabold text-[15px] leading-relaxed">
                    {currentDetail[selectedLang].orangeDesc}
                  </div>

                  {/* Options Section */}
                  <div className="space-y-4 pt-2">
                    <h3 className="text-xl font-black text-slate-900">
                      {selectedLang === "mr" ? "पर्याय" : "Options"}
                    </h3>
                    <div className="space-y-3">
                      {groupedOptions.map((opt, idx) => {
                        const isSelected = selectedOptions[activeStandardDetails] === idx;
                        return (
                          <div
                            key={idx}
                            onClick={() => selectOption(activeStandardDetails, idx)}
                            className={`rounded-2xl p-5 border transition-all text-[13px] font-extrabold leading-relaxed cursor-pointer hover:scale-[1.01] hover:border-slate-300 whitespace-pre-line ${
                              isSelected
                                ? "bg-[#22c55e] text-slate-950 border-[#22c55e] shadow-md"
                                : "bg-[#f1eff7] text-slate-700 border-slate-200/60 shadow-sm"
                            }`}
                          >
                            {opt.text}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Evidences / Photo Upload Section */}
                  <PhotoUploader 
                    standardId={activeStandardDetails} 
                    lang={selectedLang} 
                    evidenceUrl={currentDetail[selectedLang].evidenceUrl} 
                  />

                  {/* Dark Pill "Go Back" Button at Bottom Center */}
                  <div className="flex justify-center pt-8 pb-10">
                    <button
                      onClick={() => setActiveStandardDetails(null)}
                      className="bg-[#0f1123] text-white font-black px-12 py-4 rounded-full hover:bg-slate-800 transition-colors uppercase tracking-widest text-[13px] shadow-xl shadow-slate-900/20 active:scale-95"
                    >
                      Go Back
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : view === "info" ? (
              <motion.div
                key="info"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="min-h-screen w-full flex flex-col items-center bg-gradient-to-br from-slate-50 via-white to-orange-50/30"
              >
                {/* Header Banner */}
                <div className="w-full bg-gradient-to-r from-orange-400 via-amber-500 to-yellow-500 px-6 md:px-10 py-8 flex items-center justify-between text-white relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-72 h-full bg-white/10 rounded-full blur-3xl pointer-events-none" />
                  <div className="flex items-center gap-4">
                    <div className="size-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner">
                      <School className="size-6 text-white" />
                    </div>
                    <div>
                      <h1 className="text-2xl md:text-3xl font-black tracking-tight">{t.infoTitle}</h1>
                      <p className="text-[11px] font-bold text-orange-50 mt-0.5">{t.infoSubtitle}</p>
                    </div>
                  </div>
                  {/* Language Toggle */}
                  <button
                    onClick={toggleLanguage}
                    className="p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-2xl transition-all shadow-sm flex items-center gap-2 text-white border border-white/20"
                  >
                    <Languages className="size-5" />
                    <span className="text-xs font-black uppercase tracking-wider hidden sm:inline">
                      {selectedLang === "mr" ? "English" : "मराठी"}
                    </span>
                  </button>
                </div>

                {/* Form Content */}
                <div className="w-full max-w-2xl px-4 md:px-0 py-8 md:py-12 space-y-6">
                  {/* Form Card */}
                  <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden">
                    {/* Card Header */}
                    <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-6 md:px-8 py-5 flex items-center gap-3">
                      <div className="size-9 rounded-xl bg-amber-500/20 flex items-center justify-center">
                        <FileText className="size-4 text-amber-400" />
                      </div>
                      <div>
                        <h2 className="text-white font-bold text-sm">{selectedLang === "mr" ? "शाळेची मूलभूत माहिती" : "Basic School Details"}</h2>
                        <p className="text-slate-400 text-[10px] font-semibold">{selectedLang === "mr" ? "ही माहिती SQAAF अहवालात वापरली जाईल" : "This information will be used in the SQAAF report"}</p>
                      </div>
                    </div>

                    {/* Form Fields */}
                    <div className="p-6 md:p-8 space-y-5">
                      {/* School Name */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500 ml-1 flex items-center gap-1.5">
                          <School className="size-3 text-orange-500" />
                          {t.infoSchoolName}
                        </label>
                        <input
                          type="text"
                          value={infoSchoolName}
                          onChange={(e) => setInfoSchoolName(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 focus:border-orange-400 focus:ring-4 focus:ring-orange-400/10 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 placeholder:text-slate-400 outline-none transition-all"
                          placeholder={selectedLang === "mr" ? "शाळेचे नाव टाका" : "Enter school name"}
                        />
                      </div>

                      {/* 2-Column Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        {/* Headmaster Name */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500 ml-1 flex items-center gap-1.5">
                            <User className="size-3 text-orange-500" />
                            {t.infoHeadmaster}
                          </label>
                          <input
                            type="text"
                            value={infoHeadmaster}
                            onChange={(e) => setInfoHeadmaster(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 focus:border-orange-400 focus:ring-4 focus:ring-orange-400/10 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 placeholder:text-slate-400 outline-none transition-all"
                            placeholder={selectedLang === "mr" ? "मुख्याध्यापकाचे नाव" : "Headmaster name"}
                          />
                        </div>

                        {/* UDISE */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500 ml-1 flex items-center gap-1.5">
                            <School className="size-3 text-orange-500" />
                            {t.infoUdise}
                          </label>
                          <input
                            type="text"
                            value={infoUdise}
                            onChange={(e) => setInfoUdise(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 focus:border-orange-400 focus:ring-4 focus:ring-orange-400/10 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 font-mono placeholder:text-slate-400 outline-none transition-all"
                            placeholder={selectedLang === "mr" ? "UDISE क्रमांक टाका" : "Enter UDISE code"}
                          />
                        </div>
                      </div>

                      {/* School Address */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500 ml-1 flex items-center gap-1.5">
                          <MapPin className="size-3 text-orange-500" />
                          {t.infoAddress}
                        </label>
                        <input
                          type="text"
                          value={infoAddress}
                          onChange={(e) => setInfoAddress(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 focus:border-orange-400 focus:ring-4 focus:ring-orange-400/10 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 placeholder:text-slate-400 outline-none transition-all"
                          placeholder={selectedLang === "mr" ? "शाळेचा पूर्ण पत्ता" : "Full school address"}
                        />
                      </div>

                      {/* Center Name */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500 ml-1 flex items-center gap-1.5">
                          <Building2 className="size-3 text-orange-500" />
                          {t.infoCenterName}
                        </label>
                        <input
                          type="text"
                          value={infoCenterName}
                          onChange={(e) => setInfoCenterName(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 focus:border-orange-400 focus:ring-4 focus:ring-orange-400/10 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 placeholder:text-slate-400 outline-none transition-all"
                          placeholder={selectedLang === "mr" ? "केंद्राचे नाव टाका" : "Enter center name"}
                        />
                      </div>

                      {/* 2-Column: Taluka & District */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        {/* Taluka */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500 ml-1 flex items-center gap-1.5">
                            <MapPin className="size-3 text-orange-500" />
                            {t.infoTaluka}
                          </label>
                          <input
                            type="text"
                            value={infoTaluka}
                            onChange={(e) => setInfoTaluka(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 focus:border-orange-400 focus:ring-4 focus:ring-orange-400/10 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 placeholder:text-slate-400 outline-none transition-all"
                            placeholder={selectedLang === "mr" ? "तालुका" : "Taluka"}
                          />
                        </div>

                        {/* District */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500 ml-1 flex items-center gap-1.5">
                            <MapPin className="size-3 text-orange-500" />
                            {t.infoDistrict}
                          </label>
                          <input
                            type="text"
                            value={infoDistrict}
                            onChange={(e) => setInfoDistrict(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 focus:border-orange-400 focus:ring-4 focus:ring-orange-400/10 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 placeholder:text-slate-400 outline-none transition-all"
                            placeholder={selectedLang === "mr" ? "जिल्हा" : "District"}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Submit Button */}
                    <div className="px-6 md:px-8 pb-8">
                      <button
                        onClick={handleInfoSubmit}
                        className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white font-black py-4 rounded-2xl text-sm uppercase tracking-widest shadow-lg shadow-orange-500/20 transition-all duration-300 active:scale-[0.98] flex items-center justify-center gap-3"
                      >
                        <span>{t.infoProceed}</span>
                        <ChevronRight className="size-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : view === "dashboard" ? (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="bg-white/80 backdrop-blur-md rounded-[3rem] shadow-2xl overflow-hidden border border-slate-100 flex flex-col min-h-[82vh] w-full"
              >
                {/* Header Banner */}
                <div className="bg-gradient-to-r from-orange-400 via-amber-500 to-yellow-500 px-8 py-8 flex items-center justify-between text-white border-b border-black/5 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-full bg-white/10 rounded-full blur-3xl pointer-events-none" />
                  <div className="flex items-center gap-4">
                    <div className="size-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner">
                      <School className="size-6 text-white" />
                    </div>
                    <div>
                      <h1 className="text-2xl md:text-3xl font-black tracking-tight font-sans">{t.title}</h1>
                      <p className="text-[10px] font-black uppercase tracking-widest text-orange-50">{t.subtitle}</p>
                    </div>
                  </div>
                  
                  {/* Language Selector Button with Automatic Toggle */}
                  <div>
                    <button
                      onClick={toggleLanguage}
                      className="p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-2xl transition-all shadow-sm flex items-center gap-2 text-white border border-white/20"
                    >
                      <Languages className="size-5" />
                      <span className="text-xs font-black uppercase tracking-wider hidden sm:inline">
                        {selectedLang === "mr" ? "English" : "मराठी"}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 md:p-10 space-y-10 flex flex-col flex-1 w-full max-w-6xl mx-auto">
                  {/* Read-only School details card matching first image */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 }}
                    className="bg-[#eef5cb] border border-slate-900 rounded-[1.5rem] md:rounded-[2.5rem] p-6 md:p-8 space-y-6 shadow-sm w-full"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <h2 className="text-xl md:text-2xl font-bold text-slate-900 uppercase tracking-wide">
                        {infoSchoolName || profile?.schoolName || "Z.P SCHOOL DHONDEWADIPED"}
                      </h2>
                      
                      <div className="inline-block bg-[#c4b5fd] text-slate-900 text-sm md:text-base font-bold px-5 py-2 rounded-xl border border-slate-900/10">
                        {infoUdise || profile?.udise || "27350800701"}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-slate-800 text-[13px] md:text-[15px] font-medium leading-relaxed uppercase tracking-wide border-t border-slate-900/10 pt-6">
                      <div>
                        <span className="text-[10px] md:text-xs font-black text-slate-500 tracking-widest block mb-1">Teacher In-Charge</span>
                        <p>{infoHeadmaster || profile?.fullName || "BALASAHEB RAMKISHAN KENDRE"}</p>
                      </div>
                      <div>
                        <span className="text-[10px] md:text-xs font-black text-slate-500 tracking-widest block mb-1">Jurisdiction</span>
                        <p>{infoAddress || profile?.address || "NARASEWADI, TASGAON, SANGLI"}</p>
                      </div>
                    </div>
                  </motion.div>

                  {/* Actions Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
                    {/* Card 1: View */}
                    <div className="bg-white border border-slate-900 rounded-[1.5rem] p-6 w-full relative shadow-sm flex flex-col justify-between h-full">
                      <div>
                        <div className="flex justify-between items-center mb-4">
                          <h4 className="text-[16px] font-bold text-slate-900">{t.viewSub}</h4>
                          <div 
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleCard1();
                            }}
                            className={`size-6 border-2 rounded flex items-center justify-center shrink-0 cursor-pointer hover:scale-105 transition-transform ${
                              card1Checked 
                                ? "border-slate-900 bg-slate-900 text-white" 
                                : "border-slate-400 bg-white text-transparent"
                            }`}
                          >
                             {card1Checked && <CheckCircle2 className="size-4" />}
                          </div>
                        </div>
                        <hr className="border-slate-900/40 mb-4" />
                        <p className="text-[14px] text-slate-700 mb-6">{t.viewDesc}</p>
                      </div>
                      <div className="flex justify-end mt-auto">
                        <button
                          onClick={() => setView("summary")}
                          className="bg-[#1e1b4b] text-white px-8 py-3 rounded-3xl text-sm font-medium hover:bg-slate-800 transition-colors shadow-sm"
                        >
                          {t.viewBtn}
                        </button>
                      </div>
                    </div>

                    {/* Card 2: Download PDF */}
                    <div className="bg-white border border-slate-900 rounded-[1.5rem] p-6 w-full relative shadow-sm flex flex-col justify-between h-full">
                      <div>
                        <div className="flex justify-between items-center mb-4">
                          <h4 className="text-[16px] font-bold text-slate-900">{t.downloadPdfSub}</h4>
                          <div 
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleCard2();
                            }}
                            className={`size-6 border-2 rounded flex items-center justify-center shrink-0 cursor-pointer hover:scale-105 transition-transform ${
                              card2Checked 
                                ? "border-slate-900 bg-slate-900 text-white" 
                                : "border-slate-400 bg-white text-transparent"
                            }`}
                          >
                             {card2Checked && <CheckCircle2 className="size-4" />}
                          </div>
                        </div>
                        <hr className="border-slate-900/40 mb-4" />
                        <p className="text-[14px] text-slate-700 mb-4">{t.downloadPdfDesc}</p>
                        
                        {/* Premium Language Selector Inside Card */}
                        <div className="mb-6 space-y-2">
                          <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider block">
                            {selectedLang === "mr" ? "अहवाल भाषा / Report Language" : "Report Language"}
                          </span>
                          <div className="flex bg-slate-100 rounded-xl p-1 gap-1 border border-slate-200">
                            <button
                              onClick={() => setPdfLang("mr")}
                              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                                pdfLang === "mr"
                                  ? "bg-[#1e1b4b] text-white shadow-sm"
                                  : "text-slate-600 hover:bg-slate-200/50"
                              }`}
                            >
                              मराठी
                            </button>
                            <button
                              onClick={() => setPdfLang("en")}
                              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                                pdfLang === "en"
                                  ? "bg-[#1e1b4b] text-white shadow-sm"
                                  : "text-slate-600 hover:bg-slate-200/50"
                              }`}
                            >
                              English
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-end mt-auto">
                        <button
                          onClick={handleDownloadPdf}
                          className="bg-[#1e1b4b] text-white px-8 py-3 rounded-3xl text-sm font-medium hover:bg-slate-800 transition-colors shadow-sm active:scale-95 transition-transform"
                        >
                          {t.downloadBtn}
                        </button>
                      </div>
                    </div>

                    {/* Card 3: Download Certificate */}
                    <div className="bg-white border border-slate-900 rounded-[1.5rem] p-6 w-full relative shadow-sm flex flex-col justify-between h-full">
                      <div>
                        <div className="flex justify-between items-center mb-4">
                          <h4 className="text-[16px] font-bold text-slate-900">{t.downloadCertSub}</h4>
                          <div 
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleCard3();
                            }}
                            className={`size-6 border-2 rounded flex items-center justify-center shrink-0 cursor-pointer hover:scale-105 transition-transform ${
                              card3Checked 
                                ? "border-slate-900 bg-slate-900 text-white" 
                                : "border-slate-400 bg-white text-transparent"
                            }`}
                          >
                             {card3Checked && <CheckCircle2 className="size-4" />}
                          </div>
                        </div>
                        <hr className="border-slate-900/40 mb-4" />
                        <p className="text-[14px] text-slate-700 mb-6">{t.downloadCertDesc}</p>
                      </div>
                      <div className="flex justify-end mt-auto">
                        <button
                          onClick={() => setView("certificate")}
                          className="bg-[#1e1b4b] text-white px-8 py-3 rounded-3xl text-sm font-medium hover:bg-slate-800 transition-colors shadow-sm"
                        >
                          {t.certBtn}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="pb-10 pt-4 flex justify-center bg-transparent mt-auto">
                  <button
                    onClick={handleDownloadPdf}
                    className="bg-[#1e1b4b] text-white hover:bg-slate-800 rounded-full py-4 px-8 flex items-center gap-3 shadow-lg shadow-indigo-950/20 justify-center font-bold text-[15px] transition-all duration-300 active:scale-95"
                  >
                    <FileText className="size-5 text-amber-400" />
                    <span>{selectedLang === "mr" ? "अहवाल डाऊनलोड करा" : "Download Report"}</span>
                  </button>
                </div>
              </motion.div>
            ) : view === "certificate" ? (
              <motion.div
                key="certificate"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-[#f8fafc] min-h-screen w-full flex flex-col items-center"
              >
                {/* Orange Header bar */}
                <div className="bg-[#ffaf66] px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between text-slate-900 border-b border-black/5 relative z-20 w-full gap-4">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setView("dashboard")}
                      className="p-2 hover:bg-black/10 rounded-full transition-colors"
                    >
                      <ArrowLeft className="size-6 text-slate-900" strokeWidth={2.5} />
                    </button>
                    <span className="text-lg font-bold tracking-tight">
                      {certLang === "mr" ? "प्रमाणपत्र" : "Certificate"}
                    </span>
                  </div>
                  
                  {/* Actions on the right side of orange header */}
                  <div className="flex items-center gap-3">
                    {/* Language Selector */}
                    <div className="flex bg-white/20 backdrop-blur-md rounded-xl p-1 gap-1 border border-black/15">
                      <button
                        onClick={() => setCertLang("mr")}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                          certLang === "mr"
                            ? "bg-[#1e1b4b] text-white shadow-sm"
                            : "text-slate-900 hover:bg-white/10"
                        }`}
                      >
                        मराठी
                      </button>
                      <button
                        onClick={() => setCertLang("en")}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                          certLang === "en"
                            ? "bg-[#1e1b4b] text-white shadow-sm"
                            : "text-slate-900 hover:bg-white/10"
                        }`}
                      >
                        English
                      </button>
                    </div>

                    {/* Edit / Save Button */}
                    <button
                      onClick={handleEditToggle}
                      className="flex items-center gap-2 px-4 py-2 bg-[#1e1b4b] text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors shadow-sm"
                    >
                      {isEditingCert ? (
                        <>
                          <CheckCircle2 className="size-4 text-green-400" />
                          <span>{certLang === "mr" ? "जतन करा" : "Save Changes"}</span>
                        </>
                      ) : (
                        <>
                          <Edit className="size-4 text-white" />
                          <span>{certLang === "mr" ? "संपादित करा" : "Edit Certificate"}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Certificate Canvas Area */}
                <div className="flex-1 w-full flex items-center justify-center p-4 md:p-8 overflow-y-auto">
                  <div 
                    id="certificate-container" 
                    className="relative bg-white shadow-2xl rounded-sm w-full max-w-[650px] aspect-[1/1.4] p-8 md:p-12 flex flex-col justify-between items-center overflow-hidden border border-slate-200"
                    style={{
                      backgroundImage: 'radial-gradient(circle, #fdfbf7 0%, #fff 100%)'
                    }}
                  >
                    {/* Gold Corner and Double Border Design */}
                    {/* Outer border */}
                    <div className="absolute inset-4 border-[3px] border-[#d4af37] pointer-events-none" />
                    {/* Inner thin border */}
                    <div className="absolute inset-6 border border-[#bf953f] pointer-events-none" />

                    {/* Top Left Corner */}
                    <svg className="absolute top-7 left-7 w-12 h-12 pointer-events-none text-[#bf953f]" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M 48,2 L 2,2 L 2,48" />
                      <path d="M 40,8 L 8,8 L 8,40" />
                    </svg>
                    {/* Top Right Corner */}
                    <svg className="absolute top-7 right-7 w-12 h-12 pointer-events-none text-[#bf953f]" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M 0,2 L 46,2 L 46,48" />
                      <path d="M 8,8 L 40,8 L 40,40" />
                    </svg>
                    {/* Bottom Left Corner */}
                    <svg className="absolute bottom-7 left-7 w-12 h-12 pointer-events-none text-[#bf953f]" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M 48,46 L 2,46 L 2,0" />
                      <path d="M 40,40 L 8,40 L 8,8" />
                    </svg>
                    {/* Bottom Right Corner */}
                    <svg className="absolute bottom-7 right-7 w-12 h-12 pointer-events-none text-[#bf953f]" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M 0,46 L 46,46 L 46,0" />
                      <path d="M 8,40 L 40,40 L 40,8" />
                    </svg>

                    {/* Elegant Gold Waves */}
                    <svg className="absolute top-0 right-0 w-[50%] h-[50%] pointer-events-none" viewBox="0 0 200 200" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="gold-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#bf953f" />
                          <stop offset="25%" stopColor="#fcf6ba" />
                          <stop offset="50%" stopColor="#b38728" />
                          <stop offset="75%" stopColor="#fbf5b7" />
                          <stop offset="100%" stopColor="#aa771c" />
                        </linearGradient>
                      </defs>
                      <path d="M 200,0 L 200,150 C 180,120 150,80 120,60 C 90,40 50,20 0,0 Z" fill="url(#gold-grad)" opacity="0.15" />
                      <path d="M 200,0 L 200,120 C 170,100 145,60 115,45 C 85,30 55,15 15,0 Z" fill="url(#gold-grad)" opacity="0.3" />
                      <path d="M 200,0 L 200,90 C 185,75 160,50 130,35 C 100,20 70,10 30,0 Z" fill="url(#gold-grad)" opacity="0.5" />
                      <path d="M 200,0 L 200,60 C 190,50 170,30 145,20 C 120,10 90,5 50,0 Z" fill="url(#gold-grad)" opacity="0.8" />
                    </svg>

                    <svg className="absolute bottom-0 left-0 w-[50%] h-[50%] pointer-events-none" viewBox="0 0 200 200" preserveAspectRatio="none">
                      <path d="M 0,200 L 0,50 C 20,80 50,120 80,140 C 110,160 150,180 200,200 Z" fill="url(#gold-grad)" opacity="0.15" />
                      <path d="M 0,200 L 0,80 C 30,100 55,140 85,155 C 115,170 145,185 185,200 Z" fill="url(#gold-grad)" opacity="0.3" />
                      <path d="M 0,200 L 0,110 C 15,125 40,150 70,165 C 100,180 130,190 170,200 Z" fill="url(#gold-grad)" opacity="0.5" />
                      <path d="M 0,200 L 0,140 C 10,150 30,170 55,180 C 80,190 110,195 150,200 Z" fill="url(#gold-grad)" opacity="0.8" />
                    </svg>

                    {/* Certificate Content */}
                    <div className="relative z-10 w-full flex flex-col items-center my-auto px-4 text-center space-y-4">
                      {/* Header */}
                      <h1 className="text-[#1e3b8b] font-serif font-black text-base sm:text-lg md:text-xl leading-snug tracking-wide max-w-[90%] uppercase">
                        {certLang === "mr" 
                          ? "राज्य शैक्षणिक संशोधन व प्रशिक्षण परिषद महाराष्ट्र" 
                          : "State Council For Educational Research and Training Maharashtra"}
                      </h1>
                      
                      <div className="h-[2px] w-24 bg-[#bf953f] my-2" />

                      {/* Certificate Title (Editable) */}
                      {isEditingCert ? (
                        <div className="w-full px-4">
                          <label className="text-[10px] text-slate-400 font-bold block mb-1 uppercase tracking-wider text-left">
                            {certLang === "mr" ? "प्रमाणपत्र शीर्षक" : "Certificate Title"}
                          </label>
                          <input
                            type="text"
                            value={certLang === "mr" ? certTitleMr : certTitleEn}
                            onChange={(e) => certLang === "mr" ? setCertTitleMr(e.target.value) : setCertTitleEn(e.target.value)}
                            className="w-full text-center bg-yellow-50/70 border border-[#bf953f]/50 rounded-xl p-2 text-[#0e7490] font-sans font-black text-xs md:text-sm tracking-[0.15em] uppercase focus:outline-none focus:ring-1 focus:ring-[#bf953f]"
                          />
                        </div>
                      ) : (
                        <h2 className="text-[#0e7490] font-sans font-black text-[10px] sm:text-xs tracking-[0.2em] uppercase">
                          {certLang === "mr" ? certTitleMr : certTitleEn}
                        </h2>
                      )}

                      {/* Certify Text */}
                      <p className="text-slate-500 font-serif italic text-xs sm:text-sm md:text-base">
                        {certLang === "mr" ? "याद्वारे प्रमाणित करण्यात येते की," : "This is to certify that"}
                      </p>

                      {/* School Name (Editable) */}
                      {isEditingCert ? (
                        <div className="w-full px-4">
                          <label className="text-[10px] text-slate-400 font-bold block mb-1 uppercase tracking-wider text-left">
                            {certLang === "mr" ? "शाळेचे नाव" : "School Name"}
                          </label>
                          <input
                            type="text"
                            value={certSchoolName}
                            onChange={(e) => setCertSchoolName(e.target.value)}
                            className="w-full text-center bg-yellow-50/70 border border-[#bf953f]/50 rounded-xl p-2 text-slate-900 font-serif font-bold text-sm sm:text-base uppercase focus:outline-none focus:ring-1 focus:ring-[#bf953f]"
                          />
                        </div>
                      ) : (
                        <h3 className="text-slate-900 font-serif font-bold text-sm sm:text-base md:text-lg uppercase border-b-2 border-slate-300 pb-1 px-4 min-w-[70%] tracking-wide">
                          {certSchoolName}
                        </h3>
                      )}

                      {/* UDISE (Editable) */}
                      {isEditingCert ? (
                        <div className="w-full max-w-[220px] px-4">
                          <label className="text-[10px] text-slate-400 font-bold block mb-1 uppercase tracking-wider text-left">
                            {certLang === "mr" ? "यू-डायस क्रमांक" : "UDISE Code"}
                          </label>
                          <div className="flex items-center justify-center gap-1.5 w-full">
                            <span className="text-[#bf953f] text-lg">—</span>
                            <input
                              type="text"
                              value={certUdise}
                              onChange={(e) => setCertUdise(e.target.value)}
                              className="text-center w-full bg-yellow-50/70 border border-[#bf953f]/50 rounded-xl p-1.5 text-slate-800 font-serif font-bold text-xs sm:text-sm tracking-wider focus:outline-none focus:ring-1 focus:ring-[#bf953f]"
                            />
                            <span className="text-[#bf953f] text-lg">—</span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-1.5 text-slate-700 font-serif font-bold text-sm sm:text-base">
                          <span className="text-[#bf953f] text-lg">—</span>
                          <span className="tracking-widest">{certUdise}</span>
                          <span className="text-[#bf953f] text-lg">—</span>
                        </div>
                      )}

                      {/* Description Paragraph (Editable) */}
                      {isEditingCert ? (
                        <div className="w-full px-4">
                          <label className="text-[10px] text-slate-400 font-bold block mb-1 uppercase tracking-wider text-left">
                            {certLang === "mr" ? "मुख्य मजकूर" : "Main Description"}
                          </label>
                          <textarea
                            value={certLang === "mr" ? certDescMr : certDescEn}
                            onChange={(e) => certLang === "mr" ? setCertDescMr(e.target.value) : setCertDescEn(e.target.value)}
                            rows={3}
                            className="w-full text-center bg-yellow-50/70 border border-[#bf953f]/50 rounded-xl p-2 text-slate-700 font-serif text-[11px] sm:text-xs md:text-sm leading-relaxed focus:outline-none focus:ring-1 focus:ring-[#bf953f]"
                          />
                        </div>
                      ) : (
                        <p className="text-slate-700 font-serif text-[11px] sm:text-xs md:text-sm leading-relaxed max-w-[90%] mx-auto">
                          {certLang === "mr" ? certDescMr : certDescEn}
                        </p>
                      )}

                      {/* Signature Footer */}
                      <div className="space-y-1 pt-4">
                        <p className="text-[#1e3b8b] font-sans font-black text-[10px] uppercase tracking-wider">
                          {certLang === "mr" ? "एस.सी.ई.आर.टी. महाराष्ट्र" : "SCERT Maharashtra"}
                        </p>
                        <p className="text-slate-500 text-[8px] sm:text-[9px] font-bold leading-normal">
                          {certLang === "mr" ? (
                            <>
                              राज्य शैक्षणिक संशोधन व प्रशिक्षण परिषद, महाराष्ट्र, पुणे.<br/>
                              (एस.सी.ई.आर.टी.)<br/>
                              ७०८, सदाशिव पेठ, कुमठेकर मार्ग, पुणे – ४११0३0<br/>
                              महाराष्ट्र, भारत
                            </>
                          ) : (
                            <>
                              State Council For Educational Research and Training, Maharashtra, Pune.<br/>
                              (SCERT)<br/>
                              708, Sadashiv Peth, Kumthekar Marg, Pune – 411030<br/>
                              Maharashtra, India
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Floating / fixed Save PDF button at bottom right */}
                <div className="fixed bottom-6 right-6 z-30">
                  <button
                    onClick={handleSavePdf}
                    className="bg-[#0f1123] text-white font-semibold px-8 py-3 rounded-full hover:bg-slate-800 transition-all uppercase tracking-wider text-xs shadow-2xl active:scale-95 flex items-center gap-2"
                  >
                    <FileText className="size-4" />
                    Save PDF
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="summary"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="bg-white/80 backdrop-blur-md rounded-[3rem] shadow-2xl overflow-hidden border border-slate-100 flex flex-col min-h-[82vh] w-full"
              >
                {/* Header navigation */}
                <div className="px-8 py-6 flex items-center justify-between text-slate-800 border-b border-slate-100 bg-slate-50/30">
                  <button
                    onClick={() => setView("dashboard")}
                    className="group px-6 py-2.5 bg-slate-100 hover:bg-slate-900 hover:text-white rounded-full transition-all duration-300 flex items-center gap-2 font-black text-slate-700 text-xs uppercase tracking-wider shadow-sm"
                  >
                    <ArrowLeft className="size-4 group-hover:-translate-x-1 transition-transform" />
                    <span>{t.backBtn}</span>
                  </button>
                  
                  {/* Language Selector Button with Automatic Toggle for Summary view */}
                  <div>
                    <button
                      onClick={toggleLanguage}
                      className="p-3 bg-slate-100 hover:bg-slate-900 hover:text-white rounded-2xl transition-all shadow-sm flex items-center gap-2 text-slate-700 border border-slate-200"
                    >
                      <Languages className="size-5" />
                      <span className="text-xs font-black uppercase tracking-wider hidden sm:inline">
                        {selectedLang === "mr" ? "English" : "मराठी"}
                      </span>
                    </button>
                  </div>
                </div>

                <div className="p-6 md:p-8 flex flex-col lg:flex-row gap-8 flex-1 w-full">
                  {/* Left Column: Premium Summary Analytics Card */}
                  <div className="w-full lg:w-[420px] flex-shrink-0">
                    <div className="bg-gradient-to-br from-orange-500 to-amber-500 text-white rounded-[2.5rem] p-8 space-y-8 shadow-xl relative overflow-hidden border border-orange-400/20 sticky top-24">
                      <div className="absolute top-0 right-0 size-32 bg-white/10 rounded-full blur-2xl" />
                      <div className="absolute -bottom-10 -left-10 size-40 bg-black/10 rounded-full blur-2xl" />

                      <div className="space-y-2 text-center border-b border-white/20 pb-6 relative z-10">
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-100">Audit Status</span>
                        <h2 className="text-2xl font-black tracking-tight">{t.summaryTitle}</h2>
                      </div>

                      <div className="space-y-4 font-bold text-[15px] relative z-10">
                        <div className="flex justify-between items-center py-3 border-b border-white/10">
                          <span className="text-orange-50 font-medium">{t.totalStands}</span>
                          <span className="bg-white/20 backdrop-blur-md text-white px-4 py-1.5 rounded-xl text-xs font-black min-w-[60px] text-center shadow-inner border border-white/30">{totalStandards}</span>
                        </div>
                        <div className="flex justify-between items-center py-3 border-b border-white/10">
                          <span className="text-orange-50 font-medium">{t.completedStands}</span>
                          <span className="bg-white/20 backdrop-blur-md text-white px-4 py-1.5 rounded-xl text-xs font-black min-w-[60px] text-center shadow-inner border border-white/30">{completedCount}</span>
                        </div>
                        <div className="flex justify-between items-center py-3 border-b border-white/10">
                          <span className="text-orange-55 font-medium">{t.uncompletedStands}</span>
                          <span className="bg-white/20 backdrop-blur-md text-white px-4 py-1.5 rounded-xl text-xs font-black min-w-[60px] text-center shadow-inner border border-white/30">{uncompletedCount}</span>
                        </div>
                        <div className="flex justify-between items-center py-3">
                          <span className="text-orange-50 font-medium">{t.marksRatio}</span>
                          <span className="bg-amber-300 text-slate-900 px-5 py-1.5 rounded-xl text-xs font-black min-w-[90px] text-center shadow-md">{obtainedMarks} / {totalMarks}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Premium Interactive Grid for 128 Standards */}
                  <div className="flex-1 space-y-6">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-3xl font-black text-slate-900 tracking-tight">{t.standards}</h3>
                        <span className="bg-teal-500 text-white font-black text-xs px-3.5 py-1 rounded-full shadow-md shadow-teal-500/20">{standards.length}</span>
                      </div>
                      <p className="text-slate-400 font-bold text-sm">{t.clickHint}</p>
                    </div>

                    {/* Desktop Premium Grid Layout */}
                    <div 
                      ref={gridRef}
                      className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5 max-h-[62vh] overflow-y-auto pr-3 scrollbar-thin"
                    >
                      {standards.map((num, i) => {
                        const isCompleted = completedStandards.has(num);
                        const isLastSelected = lastSelectedStandard === num;
                        return (
                          <motion.div
                            key={num}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: Math.min(i * 0.015, 0.3) }}
                            whileHover={{ scale: 1.03, y: -3 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => {
                              if (num <= 128) {
                                if (gridRef.current) {
                                  const scrollPos = gridRef.current.scrollTop;
                                  setSavedScrollPosition(scrollPos);
                                  localStorage.setItem("sqaf_saved_scroll_position", scrollPos.toString());
                                }
                                const winScrollPos = window.scrollY;
                                setSavedWindowScrollPosition(winScrollPos);
                                localStorage.setItem("sqaf_saved_window_scroll_position", winScrollPos.toString());

                                setLastSelectedStandard(num);
                                localStorage.setItem("sqaf_last_selected_standard", num.toString());
                                setActiveStandardDetails(num);
                              }
                            }}
                            className={`relative border-2 rounded-2xl p-4 flex flex-col justify-between transition-all duration-300 cursor-pointer group overflow-hidden ${
                              isCompleted
                                ? "bg-gradient-to-br from-green-50 to-green-100/50 border-green-500 hover:shadow-green-100"
                                : "bg-gradient-to-br from-white to-slate-50 border-slate-200/80 hover:border-slate-400 hover:shadow-slate-100"
                            } ${
                              isLastSelected
                                ? "ring-4 ring-indigo-600/50 border-indigo-500 shadow-xl scale-[1.02] z-10"
                                : ""
                            }`}
                          >
                            <div
                              className={`absolute -right-6 -bottom-6 size-20 rounded-full blur-lg transition-all duration-300 pointer-events-none ${
                                isCompleted
                                  ? "bg-green-500/10 group-hover:bg-green-500/20"
                                  : "bg-slate-500/5 group-hover:bg-slate-500/10"
                              }`}
                            />
                            
                            <div className="flex justify-between items-start gap-4">
                              <div className="space-y-1">
                                <span
                                  className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${
                                    isCompleted ? "text-green-700 bg-green-100" : "text-slate-500 bg-slate-100"
                                  }`}
                                >
                                  {selectedLang === "mr" ? "मानक" : "Standard"}
                                </span>
                                <h4
                                  className={`font-extrabold text-sm transition-colors ${
                                    isCompleted ? "text-green-950" : "text-slate-800"
                                  }`}
                                >
                                  {selectedLang === "mr"
                                    ? `मानक क्र. ${toMarathiNumerals(num)}`
                                    : `Standard No. ${num}`}
                                </h4>
                              </div>
                              <div
                                className={`size-8 rounded-full flex items-center justify-center shadow-md transition-all ${
                                  isCompleted
                                    ? "bg-green-500 text-white shadow-green-500/20 group-hover:scale-110"
                                    : "bg-slate-100 text-slate-300 group-hover:bg-slate-200"
                                }`}
                              >
                                <CheckCircle2 className="size-4" strokeWidth={2.5} />
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
