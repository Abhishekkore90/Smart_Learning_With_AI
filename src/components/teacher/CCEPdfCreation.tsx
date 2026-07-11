import { useState } from "react";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

const PDF_OPTIONS = [
  {
    id: "cce_register",
    label: "CCE मूल्यांकन नोंदवही",
    description: "संपूर्ण CCE मूल्यांकन नोंदवही PDF",
  },
  {
    id: "learning_outcomes",
    label: "अध्ययन निष्पतीनिहाय संपादणूक प्रगतीदर्शक नोंदतक्ता\n(विद्यार्थीनिहाय)",
    description: "विद्यार्थीनिहाय अध्ययन निष्पती प्रगती",
  },
  {
    id: "progress_card",
    label: "प्रगती पत्रक",
    description: "विद्यार्थी प्रगती पत्रक PDF",
  },
  {
    id: "annual_result",
    label: "वार्षिक निकाल पत्रक",
    description: "वार्षिक निकाल पत्रक PDF",
  },
  {
    id: "grade_result",
    label: "श्रेणीनिहाय-निकाल-संकलन-प्रपत्र",
    description: "श्रेणीनिहाय निकाल संकलन प्रपत्र",
  },
];

export function CCEPdfCreation({ selectedClass, academicYear, onBack }: { selectedClass: string; academicYear: string; onBack: () => void }) {
  const [generating, setGenerating] = useState<string | null>(null);

  const handleGenerate = async (optionId: string) => {
    setGenerating(optionId);
    // Simulate PDF generation delay
    await new Promise(r => setTimeout(r, 1500));
    toast.info("PDF निर्मिती लवकरच उपलब्ध होईल.");
    setGenerating(null);
  };

  return (
    <div className="bg-white text-slate-800 rounded-[2.5rem] border border-slate-200 shadow-2xl min-h-[600px] flex flex-col font-sans select-none" style={{ fontFamily: "'Inter', 'Noto Sans Devanagari', sans-serif" }}>
      {/* Header */}
      <div className="flex items-center gap-4 px-5 py-4 border-b border-slate-100">
        <button
          onClick={onBack}
          className="p-1.5 hover:bg-slate-100 rounded-full transition-colors cursor-pointer text-slate-600 flex items-center justify-center"
        >
          <ArrowLeft className="size-5" />
        </button>
        <h2 className="text-lg font-bold tracking-tight text-slate-800">PDF निर्मिती</h2>
      </div>

      {/* PDF Options List */}
      <div className="flex-1 overflow-y-auto">
        {PDF_OPTIONS.map((option, idx) => (
          <button
            key={option.id}
            onClick={() => handleGenerate(option.id)}
            disabled={generating === option.id}
            className={`w-full flex items-center justify-between px-5 py-4 text-left transition-colors cursor-pointer group ${
              idx < PDF_OPTIONS.length - 1 ? "border-b border-slate-100" : ""
            } ${generating === option.id ? "bg-blue-50/50" : "hover:bg-slate-50"}`}
          >
            <span className="text-[15px] font-medium text-slate-700 flex-1 pr-4 leading-snug whitespace-pre-line group-hover:text-blue-600 transition-colors">
              {generating === option.id ? (
                <span className="flex items-center gap-2">
                  <span className="inline-block w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  <span className="text-slate-400">तयार होत आहे...</span>
                </span>
              ) : (
                option.label
              )}
            </span>
            <ChevronRight className="size-5 text-slate-400 group-hover:text-blue-600 transition-colors flex-shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
}
