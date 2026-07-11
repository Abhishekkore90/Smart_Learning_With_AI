import React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { TeacherHeader } from "@/components/teacher/TeacherHeader";
import { TeacherSidebar } from "@/components/teacher/TeacherSidebar";
import { useState } from "react";
import { Download, Loader2, Camera, ChevronLeft, ChevronRight } from "lucide-react";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas-pro";

export const Route = createFileRoute("/teacher/stats-student")({
  component: StudentPortfolioPage,
});

/* ─── Shared A4 page style ─── */
const A4: React.CSSProperties = {
  width: "100%",
  maxWidth: "1000px",
  height: "1414px",
  padding: "24px 30px",
  background: "radial-gradient(circle at top left, #ffffff 0%, #f8faff 100%)",
  fontFamily: "'Noto Sans Devanagari', 'Playfair Display', Arial, sans-serif",
  fontSize: "var(--sanchika-font-size, 12pt)",
  lineHeight: "1.6",
  boxSizing: "border-box",
  color: "#0d1b4b", // navy text color
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  border: "8px double #0d1b4b", // page-inner navy double border
  position: "relative",
  borderRadius: "6px",
};

const IB = (w = "200px", extra?: React.CSSProperties): React.CSSProperties => ({
  display: "inline-block",
  borderBottom: "2px solid #c9a227", // premium gold line
  minWidth: w,
  verticalAlign: "bottom",
  padding: "0 4px",
  fontWeight: "700",
  color: "#0d1b4b",
  ...extra,
});

const TBL: React.CSSProperties = { width: "100%", borderCollapse: "separate", borderSpacing: "0" };

const TH = (extra?: React.CSSProperties): React.CSSProperties => ({
  border: "1.5px solid #cbd5e1",
  padding: "10px 8px",
  textAlign: "center",
  background: "linear-gradient(135deg, #0d1b4b 0%, #1a2e6e 100%)",
  color: "#f5d060", // gold-light
  fontWeight: "700",
  fontSize: "calc(var(--sanchika-font-size, 12pt) - 2pt)",
  borderBottom: "3px solid #c9a227",
  textShadow: "0 1px 2px rgba(0,0,0,0.4)",
  lineHeight: "1.2",
  ...extra,
});

const TD = (extra?: React.CSSProperties): React.CSSProperties => ({
  border: "1.5px solid #cbd5e1",
  padding: "8px 6px",
  textAlign: "center",
  fontSize: "calc(var(--sanchika-font-size, 12pt) - 2pt)",
  color: "#0d1b4b", // navy
  background: "#fff",
  lineHeight: "1.2",
  ...extra,
});

const CLASSES_MR = ["पहिली", "दुसरी", "तिसरी", "चौथी", "पाचवी", "सहावी", "सातवी", "आठवी"];

/* field row helper */
const FieldRow = ({ label, children, style }: { label: string; children?: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{ display: "flex", alignItems: "flex-end", gap: "10px", marginBottom: "0px", ...style }}>
    <span style={{ whiteSpace: "nowrap", fontWeight: "700", minWidth: "fit-content", color: "#0d1b4b" }}>{label}</span>
    {children ?? (
      <span
        contentEditable={true}
        suppressContentEditableWarning={true}
        style={{
          flex: 1,
          borderBottom: "2px solid #c9a227",
          minHeight: "22px",
          display: "block",
          outline: "none",
          padding: "0 8px",
          fontWeight: "700",
          color: "#0d1b4b"
        }}
      ></span>
    )}
  </div>
);

const PageHeader = ({ title }: { title: string }) => (
  <div className="page-header" style={{
    textAlign: "center",
    background: "linear-gradient(135deg, #0d1b4b 0%, #1a2e6e 100%)",
    color: "#f5d060",
    padding: "12px 24px",
    borderRadius: "6px",
    fontSize: "20px",
    fontWeight: "800",
    marginBottom: "16px",
    letterSpacing: "1px",
    boxShadow: "0 4px 15px rgba(13,27,75,0.25)",
    position: "relative",
    overflow: "hidden",
    border: "1px solid rgba(201,162,39,0.2)"
  }}>
    {title}
    <div style={{
      position: "absolute",
      bottom: 0, left: 0, right: 0, height: "3px",
      background: "linear-gradient(90deg, transparent, #c9a227, #f5d060, #c9a227, transparent)"
    }} />
  </div>
);

const SectionHeader = ({ title }: { title: string }) => (
  <div style={{
    fontWeight: "800",
    fontSize: "14pt",
    background: "linear-gradient(135deg, #9b1c1c 0%, #c62828 100%)",
    padding: "8px 16px",
    borderRadius: "6px",
    color: "#ffffff",
    marginBottom: "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 3px 10px rgba(155,28,28,0.25)",
    border: "1px solid rgba(255,255,255,0.1)",
    letterSpacing: "0.5px"
  }}>
    {title}
  </div>
);

const PageFooter = ({ pageNum }: { pageNum: number }) => null;

/* ════════════════════════════════════════════════════
   PAGE 1 – COVER
   Replicated the premium theme of teacher portfolio.
════════════════════════════════════════════════════ */
function Page1() {
  const marathiNums = ["१", "२", "३", "४", "५", "६", "७", "८"];
  
  const coverBorder: React.CSSProperties = {
    ...A4,
    border: "14px double #c9a227",
    padding: "15px 45px",
    background: "radial-gradient(circle at center, #ffffff 0%, #fdfaf3 100%)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    position: "relative",
    overflow: "hidden",
  };

  return (
    <div className="a4-sheet-card" style={coverBorder}>
      {/* Corner Ornaments */}
      <div style={{ position: "absolute", color: "#c9a227", fontSize: "38px", zIndex: 5, pointerEvents: "none", top: "25px", left: "25px" }}>✦</div>
      <div style={{ position: "absolute", color: "#c9a227", fontSize: "38px", zIndex: 5, pointerEvents: "none", top: "25px", right: "25px" }}>✦</div>
      <div style={{ position: "absolute", color: "#c9a227", fontSize: "38px", zIndex: 5, pointerEvents: "none", bottom: "25px", left: "25px" }}>✦</div>
      <div style={{ position: "absolute", color: "#c9a227", fontSize: "38px", zIndex: 5, pointerEvents: "none", bottom: "25px", right: "25px" }}>✦</div>

      {/* ZP Sindhudurg Logo on Top Right */}
      <div style={{ position: "absolute", top: "35px", right: "50px", zIndex: 10 }}>
        <img
          src="/zp_sindhudurg_logo.png"
          alt="जिल्हा परिषद, सिंधुदुर्ग लोगो"
          style={{
            width: "80px",
            height: "96px",
            objectFit: "contain",
          }}
        />
      </div>

      {/* Top Stripe */}
      <div style={{
        width: "100%",
        height: "8px",
        background: "linear-gradient(90deg, #0d1b4b 0%, #c9a227 30%, #9b1c1c 50%, #c9a227 70%, #0d1b4b 100%)",
        borderRadius: "4px",
        boxShadow: "0 1px 6px rgba(201,162,39,0.4)"
      }} />

      <div style={{ color: "#c9a227", fontSize: "20px", letterSpacing: "10px", opacity: 0.8, textAlign: "center", marginTop: "8px" }}>✻ ✻ ✻</div>

      {/* Saraswati Image */}
      <div style={{ margin: "8px 0" }}>
        <img
          src="/saraswati_lineart.png"
          alt="Saraswati"
          style={{
            border: "6px double #c9a227",
            borderRadius: "50%",
            padding: "8px",
            background: "#ffffff",
            boxShadow: "0 6px 18px rgba(13,27,75,0.15), inset 0 2px 6px rgba(201,162,39,0.15)",
            width: "110px",
            height: "110px",
            objectFit: "contain",
          }}
        />
      </div>

      {/* Title */}
      <div style={{
        fontSize: "30px",
        fontWeight: "900",
        background: "linear-gradient(135deg, #0d1b4b 0%, #1a2e6e 100%)",
        color: "#f5d060",
        textAlign: "center",
        padding: "8px 36px",
        borderRadius: "6px",
        border: "4px double #c9a227",
        boxShadow: "0 8px 24px rgba(13,27,75,0.25)",
        letterSpacing: "2px",
        textShadow: "0 2px 4px rgba(0,0,0,0.4)",
        marginTop: "8px",
        position: "relative"
      }}>
        विद्यार्थी संचिका
      </div>

      {/* Info Box */}
      <div className="cover-info-box" style={{
        width: "100%",
        border: "2px solid #1a2e6e",
        borderRadius: "8px",
        background: "#fff",
        overflow: "hidden",
        boxShadow: "0 5px 15px rgba(13,27,75,0.12)",
        marginTop: "12px",
      }}>
        <div className="cover-info-box-header" style={{
          background: "linear-gradient(90deg, #0d1b4b 0%, #1a2e6e 100%)",
          padding: "8px 20px",
          textAlign: "center",
          color: "#f5d060",
          fontSize: "14px",
          fontWeight: "700",
          letterSpacing: "0.5px"
        }}>
          विद्यार्थी व शाळा तपशील
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", padding: "8px 20px", borderBottom: "1px solid #e8eaf6" }}>
            <span style={{ fontWeight: "700", color: "#0d1b4b", minWidth: "160px", fontSize: "14px" }}>◆ विद्यार्थ्याचे नाव:</span>
            <span contentEditable={true} suppressContentEditableWarning={true} className="cover-ef" style={{ flex: 1, borderBottom: "2px solid #c9a227", outline: "none", padding: "2px 8px", fontSize: "14px", color: "#0d1b4b", fontWeight: "700" }}></span>
          </div>
          <div style={{ display: "flex", alignItems: "center", padding: "8px 20px", borderBottom: "1px solid #e8eaf6" }}>
            <span style={{ fontWeight: "700", color: "#0d1b4b", minWidth: "160px", fontSize: "14px" }}>◆ शाळेचे नाव:</span>
            <span contentEditable={true} suppressContentEditableWarning={true} className="cover-ef" style={{ flex: 1, borderBottom: "2px solid #c9a227", outline: "none", padding: "2px 8px", fontSize: "14px", color: "#0d1b4b", fontWeight: "700" }}></span>
          </div>
          <div style={{ display: "flex", alignItems: "center", padding: "8px 20px" }}>
            <span style={{ fontWeight: "700", color: "#0d1b4b", minWidth: "160px", fontSize: "14px" }}>◆ तालुका व जिल्हा:</span>
            <span contentEditable={true} suppressContentEditableWarning={true} className="cover-ef" style={{ flex: 1, borderBottom: "2px solid #c9a227", outline: "none", padding: "2px 8px", fontSize: "14px", color: "#0d1b4b", fontWeight: "700" }}></span>
          </div>
        </div>
      </div>

      {/* Paired वर्ग / वर्ष grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "4px 30px",
        width: "100%",
        marginTop: "12px",
        fontSize: "11pt"
      }}>
        {marathiNums.map((num) => (
          <React.Fragment key={num}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ minWidth: "70px", fontWeight: "700", color: "#0d1b4b" }}>इयत्ता {num} :</span>
              <span contentEditable={true} suppressContentEditableWarning={true} style={{ flex: 1, borderBottom: "2px solid #c9a227", outline: "none", padding: "1px 6px", fontWeight: "700", color: "#0d1b4b", textAlign: "center" }}></span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ minWidth: "50px", fontWeight: "700", color: "#0d1b4b" }}>वर्ष :</span>
              <span contentEditable={true} suppressContentEditableWarning={true} style={{ flex: 1, borderBottom: "2px solid #c9a227", outline: "none", padding: "1px 6px", fontWeight: "700", color: "#0d1b4b", textAlign: "center" }}></span>
            </div>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════
   PAGE 2 – अ) वैयक्तिक माहिती
════════════════════════════════════════════════════ */
interface Page2Props {
  studentPhoto: string | null;
  onPhotoChange: (photo: string | null) => void;
}

function Page2({ studentPhoto, onPhotoChange }: Page2Props) {
  return (
    <div className="a4-sheet-card" style={A4}>
      <PageHeader title="अ) वैयक्तिक माहिती" />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-evenly" }}>
        <div style={{ display: "flex", gap: "20px", alignItems: "flex-start" }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "12px" }}>
            <FieldRow label="विद्यार्थ्याचे नाव :" />
            <FieldRow label="विद्यार्थ्याचा सध्याचा पत्ता :" />
            <FieldRow label="विद्यार्थ्याचा कायमचा पत्ता :" />
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0, marginTop: "10px" }}>
            <div className="relative group" style={{
              width: "115px",
              height: "145px",
              border: "3px solid #c9a227",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              cursor: "pointer",
              background: "linear-gradient(135deg, #f5f7ff, #e8ecf8)",
              borderRadius: "6px",
              boxShadow: "0 3px 12px rgba(13,27,75,0.18)"
            }}>
              {studentPhoto ? (
                <>
                  <img src={studentPhoto} alt="Student" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                    <Camera className="size-5" />
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-1 text-[#0d1b4b]/60" style={{ textAlign: "center", padding: "8px" }}>
                  <Camera style={{ width: 28, height: 28 }} />
                  <span style={{ fontSize: "9px", fontWeight: "700" }}>फोटो अपलोड करा</span>
                </div>
              )}
              <input 
                type="file" 
                accept="image/*" 
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      onPhotoChange(reader.result as string);
                    };
                    reader.readAsDataURL(file);
                  }
                }} 
                className="absolute inset-0 opacity-0 cursor-pointer" 
              />
            </div>
            <span style={{ fontSize: "9pt", color: "#0d1b4b", marginTop: "4px", fontWeight: "600" }}>विद्यार्थ्याचा फोटो</span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "flex-end", gap: "10px" }}>
          <span style={{ fontWeight: "700", whiteSpace: "nowrap" }}>जन्मदिनांक :</span>
          <span contentEditable={true} suppressContentEditableWarning={true} style={{ ...IB("48px"), outline: "none", minHeight: "22px" }}></span>
          <span style={{ fontWeight: "700" }}>/</span>
          <span contentEditable={true} suppressContentEditableWarning={true} style={{ ...IB("48px"), outline: "none", minHeight: "22px" }}></span>
          <span style={{ fontWeight: "700" }}>/</span>
          <span contentEditable={true} suppressContentEditableWarning={true} style={{ ...IB("70px"), outline: "none", minHeight: "22px" }}></span>
          <span style={{ fontWeight: "700", whiteSpace: "nowrap", marginLeft: "16px" }}>अक्षरी :</span>
          <span contentEditable={true} suppressContentEditableWarning={true} style={{ flex: 1, borderBottom: "2px solid #c9a227", outline: "none", minHeight: "22px", padding: "0 8px" }}></span>
        </div>

        <FieldRow label="जन्मठिकाण :" />

        <div style={{ display: "flex", alignItems: "flex-end", gap: "16px" }}>
          <span style={{ fontWeight: "700", whiteSpace: "nowrap" }}>लिंग : स्त्री / पुरुष</span>
          <span contentEditable={true} suppressContentEditableWarning={true} style={{ ...IB("80px"), outline: "none", minHeight: "22px" }}></span>
          <span style={{ fontWeight: "700", whiteSpace: "nowrap", marginLeft: "20px" }}>रक्तगट +ve / -ve</span>
          <span contentEditable={true} suppressContentEditableWarning={true} style={{ ...IB("80px"), outline: "none", minHeight: "22px" }}></span>
        </div>

        <div style={{ display: "flex", alignItems: "flex-end", gap: "16px" }}>
          <span style={{ fontWeight: "700" }}>धर्म :</span>
          <span contentEditable={true} suppressContentEditableWarning={true} style={{ ...IB("120px"), outline: "none", minHeight: "22px" }}></span>
          <span style={{ fontWeight: "700", marginLeft: "20px" }}>जात :</span>
          <span contentEditable={true} suppressContentEditableWarning={true} style={{ ...IB("120px"), outline: "none", minHeight: "22px" }}></span>
        </div>

        <div style={{ display: "flex", alignItems: "flex-end", gap: "16px" }}>
          <span style={{ fontWeight: "700", whiteSpace: "nowrap" }}>अपंग आहे का ? होय / नाही</span>
          <span contentEditable={true} suppressContentEditableWarning={true} style={{ ...IB("80px"), outline: "none", minHeight: "22px" }}></span>
          <span style={{ fontWeight: "700", whiteSpace: "nowrap", marginLeft: "20px" }}>प्रवर्ग :</span>
          <span contentEditable={true} suppressContentEditableWarning={true} style={{ ...IB("120px"), outline: "none", minHeight: "22px" }}></span>
        </div>

        <FieldRow label="असल्यास प्रकार :" />
        <FieldRow label="आधार कार्ड क्र. :" />
      </div>
      <PageFooter pageNum={2} />
    </div>
  );
}

/* ════════════════════════════════════════════════════
   PAGE 3 – ब) कौटुंबिक माहिती
════════════════════════════════════════════════════ */
function Page3() {
  return (
    <div className="a4-sheet-card" style={A4}>
      <PageHeader title="ब) कौटुंबिक माहिती" />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-evenly" }}>
        {/* Father */}
        <div style={{ fontWeight: "bold", fontSize: "14pt" }}>
          १) वडिलांचे नाव :&nbsp;<span contentEditable={true} suppressContentEditableWarning={true} style={{ ...IB("300px"), outline: "none", minHeight: "22px" }}></span>
        </div>
        <div style={{ display: "flex", gap: "30px" }}>
          <div>शिक्षण :&nbsp;<span contentEditable={true} suppressContentEditableWarning={true} style={{ ...IB("150px"), outline: "none", minHeight: "22px" }}></span></div>
          <div>व्यवसाय :&nbsp;<span contentEditable={true} suppressContentEditableWarning={true} style={{ ...IB("160px"), outline: "none", minHeight: "22px" }}></span></div>
        </div>
        <div>संपर्कासाठी दूरध्वनी क्र. :&nbsp;<span contentEditable={true} suppressContentEditableWarning={true} style={{ ...IB("220px"), outline: "none", minHeight: "22px" }}></span></div>
        <div>
          दारिद्र्यरेषेखालील आहे का ?&nbsp;<span contentEditable={true} suppressContentEditableWarning={true} style={{ ...IB("90px"), outline: "none", minHeight: "22px" }}></span>
          &nbsp;&nbsp;असल्यास यादीतील क्र.&nbsp;<span contentEditable={true} suppressContentEditableWarning={true} style={{ ...IB("90px"), outline: "none", minHeight: "22px" }}></span>
        </div>

        <div style={{ borderTop: "2px dashed #cbd5e1", width: "100%" }} />

        {/* Mother */}
        <div style={{ fontWeight: "bold", fontSize: "14pt" }}>
          २) आईचे नाव :&nbsp;<span contentEditable={true} suppressContentEditableWarning={true} style={{ ...IB("310px"), outline: "none", minHeight: "22px" }}></span>
        </div>
        <div style={{ display: "flex", gap: "30px" }}>
          <div>शिक्षण :&nbsp;<span contentEditable={true} suppressContentEditableWarning={true} style={{ ...IB("150px"), outline: "none", minHeight: "22px" }}></span></div>
          <div>व्यवसाय :&nbsp;<span contentEditable={true} suppressContentEditableWarning={true} style={{ ...IB("160px"), outline: "none", minHeight: "22px" }}></span></div>
        </div>
        <div>संपर्कासाठी दूरध्वनी क्र. :&nbsp;<span contentEditable={true} suppressContentEditableWarning={true} style={{ ...IB("220px"), outline: "none", minHeight: "22px" }}></span></div>

        <div style={{ borderTop: "2px dashed #cbd5e1", width: "100%" }} />

        {/* Guardian */}
        <div style={{ fontWeight: "bold", fontSize: "14pt" }}>३) पालकांची माहिती :</div>
        <FieldRow label="नाव :" />
        <FieldRow label="पत्ता :" />
        <div style={{ display: "flex", gap: "30px" }}>
          <div>शिक्षण :&nbsp;<span contentEditable={true} suppressContentEditableWarning={true} style={{ ...IB("140px"), outline: "none", minHeight: "22px" }}></span></div>
          <div>संपर्कासाठी दूरध्वनी :&nbsp;<span contentEditable={true} suppressContentEditableWarning={true} style={{ ...IB("170px"), outline: "none", minHeight: "22px" }}></span></div>
        </div>

        <div style={{ borderTop: "2px dashed #cbd5e1", width: "100%" }} />

        {/* Acquaintances */}
        <div style={{ fontWeight: "bold", fontSize: "14pt" }}>४) परिचयाच्या दोन व्यक्तींचा पत्ता व दूरध्वनी क्र. :</div>
        <div style={{ display: "flex", gap: "30px" }}>
          <div>व्यवसाय :&nbsp;<span contentEditable={true} suppressContentEditableWarning={true} style={{ ...IB("160px"), outline: "none", minHeight: "22px" }}></span></div>
          <div>नाते :&nbsp;<span contentEditable={true} suppressContentEditableWarning={true} style={{ ...IB("130px"), outline: "none", minHeight: "22px" }}></span></div>
        </div>
        <div>
          १) नाव :&nbsp;<span contentEditable={true} suppressContentEditableWarning={true} style={{ ...IB("240px"), outline: "none", minHeight: "22px" }}></span>&nbsp;&nbsp;
          पत्ता :&nbsp;<span contentEditable={true} suppressContentEditableWarning={true} style={{ ...IB("160px"), outline: "none", minHeight: "22px" }}></span>&nbsp;&nbsp;
          दूरध्वनी :&nbsp;<span contentEditable={true} suppressContentEditableWarning={true} style={{ ...IB("120px"), outline: "none", minHeight: "22px" }}></span>
        </div>
        <div>
          २) नाव :&nbsp;<span contentEditable={true} suppressContentEditableWarning={true} style={{ ...IB("240px"), outline: "none", minHeight: "22px" }}></span>&nbsp;&nbsp;
          पत्ता :&nbsp;<span contentEditable={true} suppressContentEditableWarning={true} style={{ ...IB("160px"), outline: "none", minHeight: "22px" }}></span>&nbsp;&nbsp;
          दूरध्वनी :&nbsp;<span contentEditable={true} suppressContentEditableWarning={true} style={{ ...IB("120px"), outline: "none", minHeight: "22px" }}></span>
        </div>
      </div>
      <PageFooter pageNum={3} />
    </div>
  );
}

/* ════════════════════════════════════════════════════
   PAGE 4 – क) शाळाबाबतची माहिती
════════════════════════════════════════════════════ */
function Page4() {
  const classes = ["पूर्व प्राथमिक", "पहिली", "दुसरी", "तिसरी", "चौथी", "पाचवी", "सहावी", "सातवी", "आठवी"];
  return (
    <div className="a4-sheet-card" style={{ ...A4, padding: "24px 20px" }}>
      <PageHeader title="क) शाळाबाबतची माहिती" />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", width: "100%" }}>
        <table style={{ ...TBL, flex: 1 }}>
          <thead>
            <tr>
              <th rowSpan={2} style={TH({ width: "8%", fontSize: "10pt", verticalAlign: "middle" })}>इयत्ता</th>
              <th rowSpan={2} style={TH({ width: "18%", fontSize: "10pt", verticalAlign: "middle" })}>शाळेचे नाव व पत्ता</th>
              <th rowSpan={2} style={TH({ width: "7%", fontSize: "10pt", verticalAlign: "middle" })}>माध्यम</th>
              <th rowSpan={2} style={TH({ width: "8%", fontSize: "10pt", verticalAlign: "middle" })}>जन. रजि. क्रमांक</th>
              <th rowSpan={2} style={TH({ width: "8%", fontSize: "10pt", verticalAlign: "middle" })}>शाळा प्रविष्ट दिनांक</th>
              <th rowSpan={2} style={TH({ width: "12%", fontSize: "10pt", verticalAlign: "middle" })}>शाळा सोडल्याचा दिनांक व दाखला क्रमांक</th>
              <th colSpan={2} style={TH({ width: "12%", fontSize: "10pt", verticalAlign: "middle" })}>शारीरिक</th>
              <th rowSpan={2} style={TH({ width: "8%", fontSize: "10pt", verticalAlign: "middle" })}>वैद्यकीय तपासणी</th>
              <th rowSpan={2} style={TH({ width: "11%", fontSize: "10pt", verticalAlign: "middle" })}>वर्ग शिक्षकाचे नाव व स्वाक्षरी</th>
              <th rowSpan={2} style={TH({ width: "11%", fontSize: "10pt", verticalAlign: "middle" })}>मुख्याध्यापकाचे नाव व स्वाक्षरी दिनांक</th>
            </tr>
            <tr>
              <th style={TH({ fontSize: "9.5pt", fontWeight: "normal", padding: "4px 2px" })}><b>वजन:</b> Kg</th>
              <th style={TH({ fontSize: "9.5pt", fontWeight: "normal", padding: "4px 2px" })}><b>उंची:</b> cm</th>
            </tr>
          </thead>
          <tbody>
            {classes.map((cls) => (
              <tr key={cls} className="hover:bg-[#fdf3d0]/30 transition-colors">
                <td style={TD({ textAlign: "center", height: "80px", fontSize: "11pt", fontWeight: "bold" })}>{cls}</td>
                {Array(10).fill(0).map((_, i) => (
                  <td
                    key={i}
                    contentEditable={true}
                    suppressContentEditableWarning={true}
                    style={TD({ height: "80px", outline: "none", cursor: "text" })}
                  ></td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <PageFooter pageNum={4} />
    </div>
  );
}

/* ════════════════════════════════════════════════════
   PAGE 5 – ड) शैक्षणिक प्रगती नोंद तक्ता (इयत्ता १ ली ते ८ वी)
════════════════════════════════════════════════════ */
function Page5() {
  return (
    <div className="a4-sheet-card" style={{ ...A4, padding: "24px 16px" }}>
      <PageHeader title="ड) शैक्षणिक प्रगती नोंद तक्ता" />
      <div style={{ textAlign: "center", fontSize: "11pt", fontWeight: "bold", color: "#9b1c1c", marginBottom: "8px" }}>
        ( सत्र निहाय विषयात प्राप्त केलेल्या श्रेणींची नोंद )
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", width: "100%" }}>
        <table style={{ ...TBL, tableLayout: "fixed", flex: 1 }}>
          <colgroup>
            <col style={{ width: "12%" }} />
            <col style={{ width: "12%" }} />
            {Array(16).fill(0).map((_, idx) => (
              <col key={idx} style={{ width: "4.75%" }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th rowSpan={2} colSpan={2} style={TH({ fontSize: "9.5pt", padding: "4px 2px", verticalAlign: "middle" })}>इयत्ता</th>
              {CLASSES_MR.map((cls) => (
                <th key={cls} colSpan={2} style={TH({ fontSize: "9pt", padding: "4px 2px" })}>इयत्ता {cls}</th>
              ))}
            </tr>
            <tr>
              {CLASSES_MR.map((cls) => (
                <React.Fragment key={`${cls}-terms`}>
                  <th style={TH({ fontSize: "8pt", padding: "4px 1px" })}>सत्र १</th>
                  <th style={TH({ fontSize: "8pt", padding: "4px 1px" })}>सत्र २</th>
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Row 1: शै. वर्ष */}
            <tr className="hover:bg-[#fdf3d0]/30 transition-colors">
              <td colSpan={2} style={TD({ textAlign: "left", fontWeight: "bold", fontSize: "10pt", height: "48px" })}>शै. वर्ष</td>
              {CLASSES_MR.flatMap((cls) => [1, 2]).map((term, i) => (
                <td key={i} contentEditable={true} suppressContentEditableWarning={true} style={TD({ height: "48px", outline: "none", cursor: "text", padding: "4px 2px" })}></td>
              ))}
            </tr>
            {/* Row 2: मराठी */}
            <tr className="hover:bg-[#fdf3d0]/30 transition-colors">
              <td colSpan={2} style={TD({ textAlign: "left", fontWeight: "bold", fontSize: "10pt", height: "48px" })}>मराठी</td>
              {CLASSES_MR.flatMap((cls) => [1, 2]).map((term, i) => (
                <td key={i} contentEditable={true} suppressContentEditableWarning={true} style={TD({ height: "48px", outline: "none", cursor: "text", padding: "4px 2px" })}></td>
              ))}
            </tr>
            {/* Row 3: हिंदी */}
            <tr className="hover:bg-[#fdf3d0]/30 transition-colors">
              <td colSpan={2} style={TD({ textAlign: "left", fontWeight: "bold", fontSize: "10pt", height: "48px" })}>हिंदी</td>
              {CLASSES_MR.flatMap((cls) => [1, 2]).map((term, i) => (
                <td key={i} contentEditable={true} suppressContentEditableWarning={true} style={TD({ height: "48px", outline: "none", cursor: "text", padding: "4px 2px" })}></td>
              ))}
            </tr>
            {/* Row 4: इंग्रजी */}
            <tr className="hover:bg-[#fdf3d0]/30 transition-colors">
              <td colSpan={2} style={TD({ textAlign: "left", fontWeight: "bold", fontSize: "10pt", height: "48px" })}>इंग्रजी</td>
              {CLASSES_MR.flatMap((cls) => [1, 2]).map((term, i) => (
                <td key={i} contentEditable={true} suppressContentEditableWarning={true} style={TD({ height: "48px", outline: "none", cursor: "text", padding: "4px 2px" })}></td>
              ))}
            </tr>
            {/* Row 5: गणित */}
            <tr className="hover:bg-[#fdf3d0]/30 transition-colors">
              <td colSpan={2} style={TD({ textAlign: "left", fontWeight: "bold", fontSize: "10pt", height: "48px" })}>गणित</td>
              {CLASSES_MR.flatMap((cls) => [1, 2]).map((term, i) => (
                <td key={i} contentEditable={true} suppressContentEditableWarning={true} style={TD({ height: "48px", outline: "none", cursor: "text", padding: "4px 2px" })}></td>
              ))}
            </tr>
            {/* Row 6: परिसर अभ्यास -> सा. विज्ञान */}
            <tr className="hover:bg-[#fdf3d0]/30 transition-colors">
              <td rowSpan={2} style={TD({ textAlign: "left", fontWeight: "bold", fontSize: "10pt", verticalAlign: "middle", height: "96px", width: "10%" })}>परिसर अभ्यास</td>
              <td style={TD({ textAlign: "left", fontWeight: "bold", fontSize: "9.5pt", height: "48px", width: "10%" })}>सा. विज्ञान</td>
              {CLASSES_MR.flatMap((cls) => [1, 2]).map((term, i) => (
                <td key={i} contentEditable={true} suppressContentEditableWarning={true} style={TD({ height: "48px", outline: "none", cursor: "text", padding: "4px 2px" })}></td>
              ))}
            </tr>
            {/* Row 7: सा. शास्त्र */}
            <tr className="hover:bg-[#fdf3d0]/30 transition-colors">
              <td style={TD({ textAlign: "left", fontWeight: "bold", fontSize: "9.5pt", height: "48px" })}>सा. शास्त्र</td>
              {CLASSES_MR.flatMap((cls) => [1, 2]).map((term, i) => (
                <td key={i} contentEditable={true} suppressContentEditableWarning={true} style={TD({ height: "48px", outline: "none", cursor: "text", padding: "4px 2px" })}></td>
              ))}
            </tr>
            {/* Row 8: कला */}
            <tr className="hover:bg-[#fdf3d0]/30 transition-colors">
              <td colSpan={2} style={TD({ textAlign: "left", fontWeight: "bold", fontSize: "10pt", height: "48px" })}>कला</td>
              {CLASSES_MR.flatMap((cls) => [1, 2]).map((term, i) => (
                <td key={i} contentEditable={true} suppressContentEditableWarning={true} style={TD({ height: "48px", outline: "none", cursor: "text", padding: "4px 2px" })}></td>
              ))}
            </tr>
            {/* Row 9: कार्यानुभव */}
            <tr className="hover:bg-[#fdf3d0]/30 transition-colors">
              <td colSpan={2} style={TD({ textAlign: "left", fontWeight: "bold", fontSize: "10pt", height: "48px" })}>कार्यानुभव</td>
              {CLASSES_MR.flatMap((cls) => [1, 2]).map((term, i) => (
                <td key={i} contentEditable={true} suppressContentEditableWarning={true} style={TD({ height: "48px", outline: "none", cursor: "text", padding: "4px 2px" })}></td>
              ))}
            </tr>
            {/* Row 10: शा. शिक्षण */}
            <tr className="hover:bg-[#fdf3d0]/30 transition-colors">
              <td colSpan={2} style={TD({ textAlign: "left", fontWeight: "bold", fontSize: "10pt", height: "48px" })}>शा. शिक्षण</td>
              {CLASSES_MR.flatMap((cls) => [1, 2]).map((term, i) => (
                <td key={i} contentEditable={true} suppressContentEditableWarning={true} style={TD({ height: "48px", outline: "none", cursor: "text", padding: "4px 2px" })}></td>
              ))}
            </tr>
            {/* Row 11: विशेष प्रगती */}
            <tr className="hover:bg-[#fdf3d0]/30 transition-colors">
              <td colSpan={2} style={TD({ textAlign: "left", fontWeight: "bold", fontSize: "10pt", height: "48px" })}>विशेष प्रगती</td>
              {CLASSES_MR.flatMap((cls) => [1, 2]).map((term, i) => (
                <td key={i} contentEditable={true} suppressContentEditableWarning={true} style={TD({ height: "48px", outline: "none", cursor: "text", padding: "4px 2px" })}></td>
              ))}
            </tr>
            {/* Row 12: सुधारणा आवश्यक */}
            <tr className="hover:bg-[#fdf3d0]/30 transition-colors">
              <td colSpan={2} style={TD({ textAlign: "left", fontWeight: "bold", fontSize: "10pt", height: "48px" })}>सुधारणा आवश्यक</td>
              {CLASSES_MR.flatMap((cls) => [1, 2]).map((term, i) => (
                <td key={i} contentEditable={true} suppressContentEditableWarning={true} style={TD({ height: "48px", outline: "none", cursor: "text", padding: "4px 2px" })}></td>
              ))}
            </tr>
            {/* Row 13: आवड / छंद */}
            <tr className="hover:bg-[#fdf3d0]/30 transition-colors">
              <td colSpan={2} style={TD({ textAlign: "left", fontWeight: "bold", fontSize: "10pt", height: "48px" })}>आवड / छंद</td>
              {CLASSES_MR.flatMap((cls) => [1, 2]).map((term, i) => (
                <td key={i} contentEditable={true} suppressContentEditableWarning={true} style={TD({ height: "48px", outline: "none", cursor: "text", padding: "4px 2px" })}></td>
              ))}
            </tr>
            {/* Row 14: हजरदिवस / कार्यदिन */}
            <tr className="hover:bg-[#fdf3d0]/30 transition-colors">
              <td colSpan={2} style={TD({ textAlign: "left", fontWeight: "bold", fontSize: "10pt", height: "48px" })}>हजरदिवस / कार्यदिन</td>
              {CLASSES_MR.flatMap((cls) => [1, 2]).map((term, i) => (
                <td key={i} contentEditable={true} suppressContentEditableWarning={true} style={TD({ height: "48px", outline: "none", cursor: "text", padding: "4px 2px" })}></td>
              ))}
            </tr>
            {/* Row 15: वर्ग शिक्षकाचे नाव व सही */}
            <tr className="hover:bg-[#fdf3d0]/30 transition-colors">
              <td colSpan={2} style={TD({ textAlign: "left", fontWeight: "bold", fontSize: "10pt", height: "48px" })}>वर्ग शिक्षकाचे नाव व सही</td>
              {CLASSES_MR.flatMap((cls) => [1, 2]).map((term, i) => (
                <td key={i} contentEditable={true} suppressContentEditableWarning={true} style={TD({ height: "48px", outline: "none", cursor: "text", padding: "4px 2px" })}></td>
              ))}
            </tr>
            {/* Row 16: मुख्याध्यापकाचे नाव व सही */}
            <tr className="hover:bg-[#fdf3d0]/30 transition-colors">
              <td colSpan={2} style={TD({ textAlign: "left", fontWeight: "bold", fontSize: "10pt", height: "48px" })}>मुख्याध्यापकाचे नाव व सही</td>
              {CLASSES_MR.flatMap((cls) => [1, 2]).map((term, i) => (
                <td key={i} contentEditable={true} suppressContentEditableWarning={true} style={TD({ height: "48px", outline: "none", cursor: "text", padding: "4px 2px" })}></td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <PageFooter pageNum={5} />
    </div>
  );
}

/* ════════════════════════════════════════════════════
   PAGE 7A – फ) वर्तनविषयक मूल्यमापन (भाग १)
════════════════════════════════════════════════════ */
function Page7A() {
  const ROW_H = "44px";
  const FONT = "calc(var(--sanchika-font-size, 12pt) - 1.5pt)";

  const sections = [
    {
      heading: "व्यक्तिमत्व विकास",
      items: [
        "आपली मते मुद्देसूद थोडक्यात मांडतो",
        "आपली मते ठामपणे मांडतो",
        "अपयशाने खचून न जाता चिकाटीने प्रयत्न करतो",
        "काम करताना बिनचूकपणा-रेखीवपणावर भर देतो",
        "कोणतेही काम एकाग्रतेने करतो",
        "कोणतेही काम वेळच्यावेळी पूर्ण करतो",
        "आत्मविश्वासाने काम करतो",
        "इतरांपेक्षा वेगळ्या कल्पना / विचार मांडतो",
        "संधी मिळेल तेथे पुढाकार घेउन काम करतो",
        "वैयक्तिक स्वच्छतेकडे सातत्याने लक्ष देतो",
        "शिक्षकांच्या आज्ञेचे पालन करतो",
        "स्वतःच्या आवडी-निवडीबाबत स्पष्टता आहे",
        "धाडसीवृत्ती दिसून येते",
        "स्वतःची चूक मोकळेपणाने मान्य करतो",
      ],
    },
    {
      heading: "सामाजिक विकास",
      items: [
        "गटात काम करताना सोबत्याची मते जाणून घेतो",
        "भेदभाव न करता सर्वांमध्ये मिसळतो",
        "वर्ग / शाळा / परिसर स्वच्छ ठेवण्याचा प्रयत्न करतो",
        "मित्रांना गरजेनुसार सहकार्य करतो",
        "मित्रांच्या सुखदुःखामध्ये सहभागी होतो",
        "शाळेच्या नियमांचे पालन करतो",
        "इतरांशी नम्रपणे वागतो",
      ],
    },
  ];

  const shreniBadge: React.CSSProperties = {
    display: "inline-block",
    padding: "2px 8px",
    borderRadius: "4px",
    background: "#0d1b4b",
    color: "#f5d060",
    fontWeight: "bold",
    marginRight: "4px",
    fontSize: "9.5pt",
  };

  return (
    <div className="a4-sheet-card" style={{ ...A4, padding: "24px 16px" }}>
      <PageHeader title="फ) विद्यार्थ्याच्या वर्तनविषयक विकासाचे मूल्यमापन (भाग १)" />
      
      <div style={{ fontSize: "10pt", marginBottom: "8px", background: "#fdf3d0/40", padding: "6px 12px", borderRadius: "4px", border: "1.5px solid #c9a227", display: "flex", gap: "10px", alignItems: "center", color: "#0d1b4b" }}>
        <b>श्रेणी :</b>
        <span><span style={shreniBadge}>१</span> = खूप कमी / क्वचित</span>
        <span><span style={shreniBadge}>२</span> = कधी कधी</span>
        <span><span style={shreniBadge}>३</span> = नेहमी</span>
      </div>
      
      <div style={{ flex: 1, display: "flex", flexDirection: "column", width: "100%" }}>
        <table style={{ ...TBL, tableLayout: "fixed", fontSize: FONT }}>
          <colgroup>
            <col style={{ width: "36%" }} />
            {CLASSES_MR.map((c) => (
              <col key={c} style={{ width: "8%" }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th style={TH({ textAlign: "left", fontSize: "10pt", padding: "6px 8px" })}>मुद्दे</th>
              {CLASSES_MR.map((c) => (
                <th key={c} style={TH({ fontSize: "9.5pt", padding: "4px 3px" })}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sections.map((sec) => (
              <React.Fragment key={sec.heading}>
                <tr>
                  <td colSpan={9} style={TD({ textAlign: "left", background: "#e8f0fe", borderLeft: "4px solid #c9a227", color: "#0d1b4b", fontWeight: "bold", fontSize: "11pt", padding: "5px 8px", height: "48px", verticalAlign: "middle" })}>
                    {sec.heading}
                  </td>
                </tr>
                {sec.items.map((item) => (
                  <tr key={item} className="hover:bg-[#fdf3d0]/30 transition-colors">
                    <td style={TD({ textAlign: "left", height: ROW_H, fontSize: FONT, padding: "3px 6px" })}>{item}</td>
                    {CLASSES_MR.map((c) => (
                      <td
                        key={`${item}-${c}`}
                        contentEditable={true}
                        suppressContentEditableWarning={true}
                        style={TD({ height: ROW_H, padding: "0", outline: "none", cursor: "text" })}
                      ></td>
                    ))}
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
      <PageFooter pageNum={7} />
    </div>
  );
}

/* ════════════════════════════════════════════════════
   PAGE 7B – फ) वर्तनविषयक मूल्यमापन (भाग २)
════════════════════════════════════════════════════ */
function Page7B() {
  const ROW_H = "48px";
  const FONT = "calc(var(--sanchika-font-size, 12pt) - 1.5pt)";

  const sections = [
    {
      heading: "अभ्यासविषयक सवयी",
      items: [
        "नवीन गोष्ट समजून घेण्याची जिज्ञासा दाखवतो",
        "नवनवीन गोष्टी शिकायला आवडतात",
        "उपक्रमांमध्ये कृतिशील सहभाग घेतो",
        "शाळेत यायला आवडते",
        "गृहपाठ आवडीने करतो",
        "खूप प्रश्न विचारतो",
        "स्वतःचा अभ्यास स्वतः करतो",
      ],
    },
    {
      heading: "कला / आवड",
      items: [
        "छंदामध्ये रंगून जातो",
        "चित्रे काढतो",
        "गाणी-कविता म्हणतो",
        "गोष्ट सांगतो",
        "नृत्य / अभिनय / नाट्यीकरण करतो",
        "खेळात सहभाग घेतो",
        "अवांतर वाचन करतो",
        "गणिती आकडेमोड करतो",
        "कार्यानुभवातील वस्तू / कागदकाम / चिकटकाम",
        "स्पर्धा-परीक्षांमध्ये सहभागी होतो",
        "कथा / कविता / संवाद / स्फुट लेखन करतो",
      ],
    },
  ];

  const shreniBadge: React.CSSProperties = {
    display: "inline-block",
    padding: "2px 8px",
    borderRadius: "4px",
    background: "#0d1b4b",
    color: "#f5d060",
    fontWeight: "bold",
    marginRight: "4px",
    fontSize: "9.5pt",
  };

  return (
    <div className="a4-sheet-card" style={{ ...A4, padding: "24px 16px" }}>
      <PageHeader title="फ) विद्यार्थ्याच्या वर्तनविषयक विकासाचे मूल्यमापन (भाग २)" />
      
      <div style={{ fontSize: "10pt", marginBottom: "8px", background: "#fdf3d0/40", padding: "6px 12px", borderRadius: "4px", border: "1.5px solid #c9a227", display: "flex", gap: "10px", alignItems: "center", color: "#0d1b4b" }}>
        <b><b>श्रेणी :</b></b>
        <span><span style={shreniBadge}>१</span> = खूप कमी / क्वचित</span>
        <span><span style={shreniBadge}>२</span> = कधी कधी</span>
        <span><span style={shreniBadge}>३</span> = नेहमी</span>
      </div>
      
      <div style={{ flex: 1, display: "flex", flexDirection: "column", width: "100%" }}>
        <table style={{ ...TBL, tableLayout: "fixed", fontSize: FONT }}>
          <colgroup>
            <col style={{ width: "36%" }} />
            {CLASSES_MR.map((c) => (
              <col key={c} style={{ width: "8%" }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th style={TH({ textAlign: "left", fontSize: "10pt", padding: "6px 8px" })}>मुद्दे</th>
              {CLASSES_MR.map((c) => (
                <th key={c} style={TH({ fontSize: "9.5pt", padding: "4px 3px" })}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sections.map((sec) => (
              <React.Fragment key={sec.heading}>
                <tr>
                  <td colSpan={9} style={TD({ textAlign: "left", background: "#e8f0fe", borderLeft: "4px solid #c9a227", color: "#0d1b4b", fontWeight: "bold", fontSize: "11pt", padding: "5px 8px", height: "52px", verticalAlign: "middle" })}>
                    {sec.heading}
                  </td>
                </tr>
                {sec.items.map((item) => (
                  <tr key={item} className="hover:bg-[#fdf3d0]/30 transition-colors">
                    <td style={TD({ textAlign: "left", height: ROW_H, fontSize: FONT, padding: "3px 6px" })}>{item}</td>
                    {CLASSES_MR.map((c) => (
                      <td
                        key={`${item}-${c}`}
                        contentEditable={true}
                        suppressContentEditableWarning={true}
                        style={TD({ height: ROW_H, padding: "0", outline: "none", cursor: "text" })}
                      ></td>
                    ))}
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
      <PageFooter pageNum={8} />
    </div>
  );
}

/* ════════════════════════════════════════════════════
   PAGE 8 – प्राथमिक शिक्षण पूर्तता प्रमाणपत्र
════════════════════════════════════════════════════ */
function Page8() {
  return (
    <div className="a4-sheet-card" style={A4}>
      <PageHeader title="प्रमाणपत्र" />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div style={{ border: "4px double #c9a227", padding: "35px", borderRadius: "8px", background: "radial-gradient(circle, rgba(201, 162, 39, 0.05) 0%, transparent 100%)" }}>
          <div style={{ textAlign: "center", fontWeight: "bold", fontSize: "calc(var(--sanchika-font-size, 12pt) + 1pt)", color: "#0d1b4b", marginBottom: "14px" }}>
            (बालकांचा मोफत व सक्तीच्या शिक्षणाचा हक्क नियम २०११ – परिशिष्ट २)
          </div>
          <div style={{ textAlign: "center", fontWeight: "bold", fontSize: "calc(var(--sanchika-font-size, 12pt) + 4pt)", color: "#9b1c1c", marginBottom: "30px", textShadow: "1px 1px 0 rgba(155,28,28,0.1)" }}>
            नमुना - ३<br />प्राथमिक शिक्षण पूर्तता प्रमाणपत्र
          </div>
          <div style={{ textAlign: "justify", fontSize: "calc(var(--sanchika-font-size, 12pt) + 1.5pt)", lineHeight: "2.4", color: "#0d1b4b" }}>
            प्रमाणित करण्यात येते की कुमार / कुमारी&nbsp;
            <span
              contentEditable={true}
              suppressContentEditableWarning={true}
              style={{ ...IB("240px"), outline: "none", minHeight: "22px", cursor: "text" }}
            ></span>
            &nbsp; याने / हिने बालकांचा मोफत आणि सक्तीच्या शिक्षणाचा हक्क अधिनियम २००९ मधील
            कलम २९ मध्ये विहित केलेल्या निकषांनुसार आपले इयत्ता आठवीपर्यंतचे प्राथमिक शिक्षण
            पूर्ण केले आहे. त्याने / तिने इयत्ता आठवीपर्यंतची अर्हता व विद्या विषयक कौशल्ये
            प्राप्त केलेली आहेत.
          </div>
          <div style={{ marginTop: "50px", display: "flex", justifyContent: "space-between", fontSize: "calc(var(--sanchika-font-size, 12pt) + 1pt)", color: "#0d1b4b" }}>
            <div>
              शाळेचा शिक्का
              <div style={{ marginTop: "50px" }}>
                दिनांक -&nbsp;
                <span
                  contentEditable={true}
                  suppressContentEditableWarning={true}
                  style={{ ...IB("140px"), outline: "none", minHeight: "22px", cursor: "text" }}
                ></span>
              </div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ marginBottom: "60px" }}></div>
              मुख्याध्यापक सही
            </div>
          </div>
        </div>
      </div>
      <PageFooter pageNum={9} />
    </div>
  );
}

/* ════════════════════════════════════════════════════
   PAGE 9 – संचयीनोंद पत्रक भरण्याबाबत सूचना
════════════════════════════════════════════════════ */
function Page9() {
  const bullet = (text: string, key: string) => (
    <div key={key} style={{ display: "flex", gap: "10px", fontSize: "var(--sanchika-font-size, 12pt)", lineHeight: "1.7", color: "#0d1b4b" }}>
      <span style={{ flexShrink: 0, marginTop: "2px", color: "#c9a227" }}>•</span>
      <span>{text}</span>
    </div>
  );
  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div>
      <div style={{
        fontWeight: "bold",
        fontSize: "calc(var(--sanchika-font-size, 12pt) + 1pt)",
        marginBottom: "6px",
        color: "#0d1b4b",
        borderLeft: "4px solid #c9a227",
        paddingLeft: "10px"
      }}>{title}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: "4px", paddingLeft: "10px" }}>{children}</div>
    </div>
  );

  return (
    <div className="a4-sheet-card" style={A4}>
      <PageHeader title="संचयीनोंद पत्रक भरण्याबाबत सूचना" />
      <div style={{ textAlign: "center", fontWeight: "bold", fontSize: "15pt", color: "#9b1c1c", marginBottom: "8px" }}>
        विद्यार्थी माहिती
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-evenly" }}>
        <Section title="अ) वैयक्तिक माहिती :">
          {bullet("फोटो: विद्यार्थी शाळेत पहिल्यांदा प्रवेश घेईल त्या वेळेचा पासपोर्ट साईजचा असावा.", "a1")}
          {bullet("विद्यार्थ्याचे नाव: पहिले नाव (First Name) वडिलांचे नाव आडनाव या क्रमाने पूर्ण नाव लिहावे.", "a2")}
          {bullet("सध्याचा पत्ता: विद्यार्थी स्वतःच्या गावी न शिकता अन्य गावी शिकत असेल तर त्या गावातील राहण्याचा पत्ता लिहावा.", "a3")}
          {bullet("कायमचा पत्ता: विद्यार्थ्याच्या मूळगावातील पत्ता. विद्यार्थी मूळगावी शिकत असल्यास सध्याचा पत्ता आणि कायमचा पत्ता सारखाच राहील.", "a4")}
          {bullet("वैद्यकीय तपासणीच्या आधारे अपंगत्वाची माहिती भरावी.", "a5")}
          {bullet("जन्मदिनांक, जन्मठिकाण, धर्म, जात, प्रवर्ग ही माहिती जनरल रजिस्टर मधील नोंदी वरून भरावी.", "a6")}
        </Section>

        <Section title="ब) कौटुंबिक माहिती :">
          {bullet("ब) मधील माहिती पालकांना विचारून भरावी.", "b1")}
          {bullet("दारिद्र्यरेषेखालील माहिती प्रमाणपत्र पाहून भरावी.", "b2")}
        </Section>

        <Section title="क) शाळाबाबतची माहिती :">
          {bullet("एकाच शैक्षणिक वर्षात म्हणजे एकाच इयत्तेत विद्यार्थ्याने शाळा बदललेली असल्यास त्या शाळांचा उल्लेख त्या इयत्तेच्या रकान्यात करावा.", "c1")}
          {bullet("मध्यम: विद्यार्थी ज्या माध्यमात शिकत असेल तो मध्यम लिहावे.", "c2")}
          {bullet("रकाना क्र. ३ ते ६ ची माहिती जनरल रजिस्टरच्या आधारे लिहावी.", "c3")}
          {bullet("शारीरिक माहिती (वजन, उंची) वैद्यकीय तपासणीच्या आधारे भरावी. अथवा त्या शैक्षणिक वर्षातील सप्टेंबर महिन्यात वर्ग शिक्षकांनी भरावी.", "c4")}
          {bullet("वैद्यकीय तपासणीत आढळून आलेल्या दोषाचा प्रकार रकाना ८ मध्ये लिहावा.", "c5")}
        </Section>

        <Section title="ड) शैक्षणिक प्रगती नोंद तक्ता :">
          {bullet("प्रत्येक इयत्तेत प्रत्येक सत्राच्या शेवटी विद्यार्थ्याने प्राप्त केलेल्या विषयनिहाय श्रेणीची नोंद करावी.", "d1")}
        </Section>

        <Section title="इ) विविध शासकीय योजनांचा लाभ :">
          {bullet("शालेय अभिलेखांच्या आधारे नोंदी कराव्यात. लाभ मिळाल्यास ✓ अशी खूण करावी. नसल्यास ✗ खूण करावी.", "e1")}
        </Section>

        <Section title="फ) विद्यार्थ्याच्या वर्तनविषयक / सातत्यपूर्ण विकासाचे मूल्यमापन :">
          {bullet("दिलेल्या मुद्द्यांच्या संदर्भात प्रत्येक इयत्तेत वर्ग शिक्षकांचे व विषय शिक्षकांच्या निरीक्षणाधारे खात्री झाल्यानंतर नोंदी कराव्यात.", "f1")}
          {bullet("प्रत्येक मुद्द्याच्या संदर्भात प्रतिसाद नोंदवताना पुढीलपैकी योग्य तो अंक नोंदवावा:", "f2")}
          <div style={{ marginLeft: "28px", fontSize: "var(--sanchika-font-size, 12pt)", lineHeight: "1.8", color: "#0d1b4b" }}>
            <div>खूप कमी वेळा / क्वचित प्रतिसाद : <strong>१</strong></div>
            <div>कधी कधी प्रतिसाद : <strong>२</strong></div>
            <div>नेहमी प्रतिसाद : <strong>३</strong></div>
          </div>
          {bullet("नोंदीसाठी सहाध्यायी व पालक यांची मते विचारात घेता येतील.", "f3")}
        </Section>
      </div>
      <PageFooter pageNum={10} />
    </div>
  );
}

/* ════════════════════════════════════════════════════
   MAIN PAGE
════════════════════════════════════════════════════ */
function StudentPortfolioPage() {
  const [downloading, setDownloading] = useState(false);
  const [studentPhoto, setStudentPhoto] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState(0);
  const [isPrinting, setIsPrinting] = useState(false);
  const [baseFontSize, setBaseFontSize] = useState(12);

  // Save/Load/Clear local data logic
  const handleSaveData = () => {
    try {
      const all = document.querySelectorAll("[contenteditable='true']");
      const arr: string[] = [];
      all.forEach((el) => arr.push(el.innerHTML));
      localStorage.setItem("student_sanchika_data", JSON.stringify(arr));
      if (studentPhoto) {
        localStorage.setItem("student_sanchika_photo", studentPhoto);
      }
      alert("✅ माहिती यशस्वीरीत्या जतन केली!");
    } catch (err) {
      console.error(err);
      alert("❌ माहिती जतन करण्यात अडचण आली");
    }
  };

  const handleClearData = () => {
    if (confirm("सर्व माहिती clear करायची आहे का?")) {
      localStorage.removeItem("student_sanchika_data");
      localStorage.removeItem("student_sanchika_photo");
      setStudentPhoto(null);
      
      const all = document.querySelectorAll("[contenteditable='true']");
      all.forEach((el) => {
        el.innerHTML = "";
      });
      alert("🗑️ सर्व माहिती clear केली!");
    }
  };

  // Load saved data on mount
  React.useEffect(() => {
    const saved = localStorage.getItem("student_sanchika_data");
    if (saved) {
      try {
        const arr = JSON.parse(saved);
        const all = document.querySelectorAll("[contenteditable='true']");
        all.forEach((el, i) => {
          if (arr[i] !== undefined && arr[i] !== "") {
            el.innerHTML = arr[i];
          }
        });
      } catch (e) {
        console.error("Error loading sanchika data", e);
      }
    }
    const photo = localStorage.getItem("student_sanchika_photo");
    if (photo) {
      setStudentPhoto(photo);
    }
  }, []);

  const pageNames = [
    "मुखपृष्ठ (Cover Page)",
    "अ) वैयक्तिक माहिती",
    "ब) कौटुंबिक माहिती",
    "क) शाळाबाबतची माहिती",
    "ड) प्रगती नोंद (१ ते ८)",
    "फ) वर्तन मूल्यमापन (भाग १)",
    "फ) वर्तन मूल्यमापन (भाग २)",
    "प्रमाणपत्र (Certificate)",
    "सूचना (Instructions)"
  ];

  const handleDownloadPDF = async () => {
    setDownloading(true);
    setIsPrinting(true);
    
    // Give state updates time to flush to DOM
    await new Promise((resolve) => setTimeout(resolve, 500));
    
    const container = document.getElementById("student-portfolio-print");
    if (!container) {
      setDownloading(false);
      setIsPrinting(false);
      return;
    }
    
    const sheets = container.querySelectorAll(".a4-sheet-card");
    if (sheets.length === 0) {
      setDownloading(false);
      setIsPrinting(false);
      return;
    }
    
    try {
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
        compress: true
      });
      
      for (let i = 0; i < sheets.length; i++) {
        const sheet = sheets[i] as HTMLElement;
        
        // Hide margins and shadows to get a clean layout
        const originalShadow = sheet.style.boxShadow;
        const originalTransform = sheet.style.transform;
        const originalMargin = sheet.style.margin;
        
        sheet.style.boxShadow = "none";
        sheet.style.transform = "none";
        sheet.style.margin = "0";
        
        const canvas = await html2canvas(sheet, {
          scale: 2, // high quality
          useCORS: true,
          logging: false,
          backgroundColor: "#ffffff",
          scrollX: 0,
          scrollY: 0,
          windowWidth: 1000,
          windowHeight: 1414
        });
        
        // Restore styles
        sheet.style.boxShadow = originalShadow;
        sheet.style.transform = originalTransform;
        sheet.style.margin = originalMargin;
        
        const imgData = canvas.toDataURL("image/jpeg", 0.95);
        
        // A4 page dimensions in mm
        pdf.addImage(imgData, "JPEG", 0, 0, 210, 297);
        
        if (i < sheets.length - 1) {
          pdf.addPage();
        }
      }
      
      pdf.save("Vidyarthi_Sanchay_Nond_Patrak.pdf");
    } catch (err) {
      console.error("PDF generation error:", err);
    } finally {
      setIsPrinting(false);
      setDownloading(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(135deg, #0d1b4b 0%, #1a2e6e 40%, #0d1b4b 100%)", backgroundAttachment: "fixed", height: "fit-content" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@300;400;500;600;700;800;900&family=Playfair+Display:wght@700;900&display=swap');
        
        [contenteditable="true"] {
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: text;
          border-radius: 4px;
          padding: 0 4px;
        }
        [contenteditable="true"]:hover {
          background-color: rgba(201, 162, 39, 0.04) !important;
        }
        [contenteditable="true"]:focus {
          background-color: rgba(201, 162, 39, 0.08) !important;
          box-shadow: 0 0 0 3px rgba(201, 162, 39, 0.15) !important;
          border-bottom: 2px solid #0d1b4b !important;
          outline: none;
        }
        
        /* Screen styling for A4 sheet cards */
        .a4-sheet-card {
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 20px 40px -15px rgba(13,27,75,0.2), 0 1px 3px rgba(0, 0, 0, 0.05) !important;
          margin: 0 auto 8px auto !important;
          border-radius: 6px !important;
        }
        .a4-sheet-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 30px 60px -15px rgba(13,27,75,0.3) !important;
        }
        
        /* Active page transition animation (3D page flip effect) */
        @keyframes pageFlipIn {
          0% {
            opacity: 0;
            transform: scale(0.96) rotateY(-6deg);
          }
          100% {
            opacity: 1;
            transform: scale(1) rotateY(0deg);
          }
        }
        .active-slide-animate {
          animation: pageFlipIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          width: 100%;
          display: flex;
          justify-content: center;
          perspective: 1500px;
        }
        
        /* Overrides when exporting PDF to guarantee clean page rendering */
        .is-printing-pdf .a4-sheet-card {
          width: 1000px !important;
          min-width: 1000px !important;
          height: 1414px !important;
          box-shadow: none !important;
          margin: 0 !important;
          border-radius: 0 !important;
          transform: none !important;
          page-break-inside: avoid !important;
        }
        .is-printing-pdf > div:not(:last-child) {
          page-break-after: always !important;
        }
        
        /* Custom sidebar adjust styles for arrow buttons */
        .nav-arrow {
          user-select: none;
        }
      `}</style>
      {/* Custom Vidyarthi Sanchika Navbar styled exactly like the teacher portfolio */}
      {!isPrinting && (
        <header className="bg-gradient-to-r from-[#0d1b4b] via-[#1a2e6e] to-[#0d1b4b] border-b-2 border-[#c9a227] text-white h-16 fixed top-0 left-0 right-0 z-[60] px-4 md:px-6 flex items-center justify-between shadow-[0_4px_25px_rgba(0,0,0,0.3)] transition-all">
          <div className="flex items-center gap-4">
            <button
              onClick={() =>
                window.dispatchEvent(new CustomEvent("toggle-teacher-sidebar"))
              }
              className="lg:hidden size-10 rounded-xl bg-[#0d1b4b] hover:bg-[#1a2e6e] border border-[#c9a227]/40 flex items-center justify-center text-[#f5d060] transition-all active:scale-95 shadow-sm"
            >
              <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
              </svg>
            </button>
            <div className="flex items-center gap-3">
              <span className="text-xl">📚</span>
              <h2 className="font-bold tracking-tight text-[#f5d060] font-poppins drop-shadow-md text-sm md:text-base" style={{ fontFamily: "'Noto Sans Devanagari', sans-serif" }}>
                विद्यार्थी संचिका - Vidyarthi Sanchika
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            <button
              onClick={handleSaveData}
              className="flex items-center gap-1.5 px-3 py-2 text-xs md:text-sm font-semibold rounded-lg text-white border border-[#c9a227]/30 bg-gradient-to-r from-[#1b5e20] to-[#2e7d32] hover:from-[#2e7d32] hover:to-[#43a047] shadow-md transition-all active:scale-95"
              style={{ fontFamily: "'Noto Sans Devanagari', sans-serif" }}
            >
              💾 माहिती जतन करा
            </button>
            <button
              onClick={handleDownloadPDF}
              disabled={downloading}
              className="flex items-center gap-1.5 px-3 py-2 text-xs md:text-sm font-semibold rounded-lg text-white border border-[#c9a227]/30 bg-gradient-to-r from-[#9b1c1c] to-[#c62828] hover:from-[#c62828] hover:to-[#ef5350] shadow-md disabled:opacity-60 transition-all active:scale-95"
              style={{ fontFamily: "'Noto Sans Devanagari', sans-serif" }}
            >
              {downloading ? <Loader2 className="size-4 animate-spin" /> : <span>📥</span>}
              PDF डाउनलोड करा
            </button>
            <button
              onClick={handleClearData}
              className="flex items-center gap-1.5 px-3 py-2 text-xs md:text-sm font-semibold rounded-lg text-white border border-[#c9a227]/30 bg-gradient-to-r from-[#bf360c] to-[#e64a19] hover:from-[#e64a19] hover:to-[#f4511e] shadow-md transition-all active:scale-95"
              style={{ fontFamily: "'Noto Sans Devanagari', sans-serif" }}
            >
              🗑️ Clear
            </button>
          </div>
        </header>
      )}

      <TeacherSidebar />

      <main className="lg:pl-64 pt-20 px-6 pb-2" style={{ height: "fit-content" }}>


        {/* Sheets presentation workspace */}
        <div 
          className="bg-[#0d1b4b]/30 p-4 md:p-4 pb-2 rounded-3xl border border-[#c9a227]/20 shadow-inner flex flex-col items-center relative" 
          style={{ width: "100%", height: "fit-content" }}
        >
          {/* Floating Next/Prev Arrow Controllers on the sides */}
          {!isPrinting && (
            <>
              {currentTab > 0 && (
                <button
                  onClick={() => setCurrentTab((prev) => Math.max(0, prev - 1))}
                  className="nav-arrow prev-arrow flex"
                  style={{
                    position: "absolute",
                    top: "50%",
                    left: "20px",
                    transform: "translateY(-50%)",
                    width: "56px",
                    height: "56px",
                    background: "rgba(13, 27, 75, 0.8)",
                    border: "2px solid #c9a227",
                    color: "#f5d060",
                    fontSize: "20px",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "50%",
                    cursor: "pointer",
                    zIndex: 40,
                    boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
                    backdropFilter: "blur(8px)",
                    transition: "all 0.3s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(13, 27, 75, 0.95)";
                    e.currentTarget.style.borderColor = "#fff";
                    e.currentTarget.style.color = "#fff";
                    e.currentTarget.style.boxShadow = "0 0 15px rgba(255,255,255,0.4)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(13, 27, 75, 0.8)";
                    e.currentTarget.style.borderColor = "#c9a227";
                    e.currentTarget.style.color = "#f5d060";
                    e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.3)";
                  }}
                >
                  ◀
                </button>
              )}
              {currentTab < pageNames.length - 1 && (
                <button
                  onClick={() => setCurrentTab((prev) => Math.min(pageNames.length - 1, prev + 1))}
                  className="nav-arrow next-arrow flex"
                  style={{
                    position: "absolute",
                    top: "50%",
                    right: "20px",
                    transform: "translateY(-50%)",
                    width: "56px",
                    height: "56px",
                    background: "rgba(13, 27, 75, 0.8)",
                    border: "2px solid #c9a227",
                    color: "#f5d060",
                    fontSize: "20px",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "50%",
                    cursor: "pointer",
                    zIndex: 40,
                    boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
                    backdropFilter: "blur(8px)",
                    transition: "all 0.3s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(13, 27, 75, 0.95)";
                    e.currentTarget.style.borderColor = "#fff";
                    e.currentTarget.style.color = "#fff";
                    e.currentTarget.style.boxShadow = "0 0 15px rgba(255,255,255,0.4)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(13, 27, 75, 0.8)";
                    e.currentTarget.style.borderColor = "#c9a227";
                    e.currentTarget.style.color = "#f5d060";
                    e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.3)";
                  }}
                >
                  ▶
                </button>
              )}
            </>
          )}

          <div 
            id="student-portfolio-print" 
            className={isPrinting ? "is-printing-pdf w-full" : "w-full"} 
            style={{ 
              maxWidth: "1000px",
              ["--sanchika-font-size" as any]: `${baseFontSize}pt`,
              height: "fit-content"
            }}
          >
            <div 
              style={{ 
                display: isPrinting || currentTab === 0 ? "block" : "none",
                pageBreakAfter: isPrinting ? "always" : "auto"
              }}
              className={!isPrinting && currentTab === 0 ? "active-slide-animate" : "w-full"}
            >
              <Page1 />
            </div>
            <div 
              style={{ 
                display: isPrinting || currentTab === 1 ? "block" : "none",
                pageBreakAfter: isPrinting ? "always" : "auto"
              }}
              className={!isPrinting && currentTab === 1 ? "active-slide-animate" : "w-full"}
            >
              <Page2 studentPhoto={studentPhoto} onPhotoChange={setStudentPhoto} />
            </div>
            <div 
              style={{ 
                display: isPrinting || currentTab === 2 ? "block" : "none",
                pageBreakAfter: isPrinting ? "always" : "auto"
              }}
              className={!isPrinting && currentTab === 2 ? "active-slide-animate" : "w-full"}
            >
              <Page3 />
            </div>
            <div 
              style={{ 
                display: isPrinting || currentTab === 3 ? "block" : "none",
                pageBreakAfter: isPrinting ? "always" : "auto"
              }}
              className={!isPrinting && currentTab === 3 ? "active-slide-animate" : "w-full"}
            >
              <Page4 />
            </div>
            <div 
              style={{ 
                display: isPrinting || currentTab === 4 ? "block" : "none",
                pageBreakAfter: isPrinting ? "always" : "auto"
              }}
              className={!isPrinting && currentTab === 4 ? "active-slide-animate" : "w-full"}
            >
              <Page5 />
            </div>
            <div 
              style={{ 
                display: isPrinting || currentTab === 5 ? "block" : "none",
                pageBreakAfter: isPrinting ? "always" : "auto"
              }}
              className={!isPrinting && currentTab === 5 ? "active-slide-animate" : "w-full"}
            >
              <Page7A />
            </div>
            <div 
              style={{ 
                display: isPrinting || currentTab === 6 ? "block" : "none",
                pageBreakAfter: isPrinting ? "always" : "auto"
              }}
              className={!isPrinting && currentTab === 6 ? "active-slide-animate" : "w-full"}
            >
              <Page7B />
            </div>
            <div 
              style={{ 
                display: isPrinting || currentTab === 7 ? "block" : "none",
                pageBreakAfter: isPrinting ? "always" : "auto"
              }}
              className={!isPrinting && currentTab === 7 ? "active-slide-animate" : "w-full"}
            >
              <Page8 />
            </div>
            <div 
              style={{ 
                display: isPrinting || currentTab === 8 ? "block" : "none"
              }}
              className={!isPrinting && currentTab === 8 ? "active-slide-animate" : "w-full"}
            >
              <Page9 />
            </div>
          </div>
        </div>


      </main>
    </div>
  );
}
