import React, { useState } from "react";
import {
  BookOpen,
  Download,
  Camera,
  Loader2,
} from "lucide-react";
import { showToast as toast } from "@/lib/custom-toast";
import html2pdf from "html2pdf.js";

interface TeacherStatisticsEditorProps {
  data: any;
  onChange: (val: any) => void;
}

export function TeacherStatisticsEditor({
  data,
  onChange,
}: TeacherStatisticsEditorProps) {
  const [isExporting, setIsExporting] = useState(false);

  // Initialize data with safe defaults mirroring the 18 pages of the PDF
  const safeData = typeof data === "object" && data !== null ? data : {};
  const mergedData = {
    watermarkText: safeData.watermarkText || "",
    teacherName: safeData.teacherName || "",
    mobile: safeData.mobile || "",
    photoUrl: safeData.photoUrl || "",
    udiseCode: safeData.udiseCode || "",
    classTeacherName: safeData.classTeacherName || "",
    schoolName: safeData.schoolName || "",
    post: safeData.post || "",
    center: safeData.center || "",
    taluka: safeData.taluka || "",
    district: safeData.district || "",
    pin: safeData.pin || "",
    className: safeData.className || "",
    division: safeData.division || "",
    schoolMobile: safeData.schoolMobile || "",
    teacherNamePersonal: safeData.teacherNamePersonal || "",
    birthDate: safeData.birthDate || "",
    birthPlace: safeData.birthPlace || "",
    designation: safeData.designation || "",
    caste: safeData.caste || "",
    category: safeData.category || "",
    aadhaar: safeData.aadhaar || "",
    saralId: safeData.saralId || "",
    shalarthId: safeData.shalarthId || "",
    personalMobile: safeData.personalMobile || "",
    pfNo: safeData.pfNo || "",
    panNo: safeData.panNo || "",
    voterId: safeData.voterId || "",
    rationCard: safeData.rationCard || "",
    email: safeData.email || "",
    bloodGroup: safeData.bloodGroup || "",
    weight: safeData.weight || "",
    height: safeData.height || "",
    retirementDate: safeData.retirementDate || "",
    continuousServiceDate: safeData.continuousServiceDate || "",
    schoolJoinDate: safeData.schoolJoinDate || "",
    talukaJoinDate: safeData.talukaJoinDate || "",
    districtJoinDate: safeData.districtJoinDate || "",
    disabilityCertNo: safeData.disabilityCertNo || "",
    licenseNo: safeData.licenseNo || "",
    vehicleNo: safeData.vehicleNo || "",
    incomeTaxNo: safeData.incomeTaxNo || "",
    npsDcpsNo: safeData.npsDcpsNo || "",
    academicQualSummary: safeData.academicQualSummary || "",
    professionalQualSummary: safeData.professionalQualSummary || "",
    hobbies: safeData.hobbies || "",
    schoolDuties: safeData.schoolDuties || "",
    languages: safeData.languages || "",
    currentAddress: safeData.currentAddress || "",
    permanentAddress: safeData.permanentAddress || "",
    correspondenceAddress: safeData.correspondenceAddress || "",
    altMobile1: safeData.altMobile1 || "",
    altMobile2: safeData.altMobile2 || "",
    academicQualifications: safeData.academicQualifications || [
      { degree: "", university: "", grade: "", year: "" },
      { degree: "", university: "", grade: "", year: "" },
      { degree: "", university: "", grade: "", year: "" },
      { degree: "", university: "", grade: "", year: "" },
      { degree: "", university: "", grade: "", year: "" },
    ],
    professionalQualifications: safeData.professionalQualifications || [
      { qualification: "", university: "", grade: "", year: "" },
      { qualification: "", university: "", grade: "", year: "" },
      { qualification: "", university: "", grade: "", year: "" },
      { qualification: "", university: "", grade: "", year: "" },
    ],
    otherQualifications: safeData.otherQualifications || [
      { qualification: "", university: "", grade: "", year: "" },
      { qualification: "", university: "", grade: "", year: "" },
      { qualification: "", university: "", grade: "", year: "" },
      { qualification: "", university: "", grade: "", year: "" },
      { qualification: "", university: "", grade: "", year: "" },
    ],
    bankDetails: safeData.bankDetails || [
      { bankName: "", branch: "", accountNo: "", ifsc: "" },
      { bankName: "", branch: "", accountNo: "", ifsc: "" },
      { bankName: "", branch: "", accountNo: "", ifsc: "" },
      { bankName: "", branch: "", accountNo: "", ifsc: "" },
    ],
    serviceDetails: safeData.serviceDetails || Array(13).fill(null).map(() => ({
      transferType: "",
      joinedSchool: "",
      duration: "",
      totalService: "",
      orderNo: "",
    })),
    familyDetails: safeData.familyDetails || Array(9).fill(null).map(() => ({
      name: "",
      relation: "",
      dob: "",
      aadhaar: "",
    })),
    favoriteBooks: safeData.favoriteBooks || Array(14).fill(null).map(() => ({
      bookTitle: "",
      author: "",
      summary: "",
    })),
    publications: safeData.publications || Array(12).fill(null).map(() => ({
      subject: "",
      details: "",
      year: "",
    })),
    trainings: safeData.trainings || Array(50).fill(null).map(() => ({
      trainingName: "",
      location: "",
      level: "",
      duration: "",
      days: "",
    })),
    otherNotes1: safeData.otherNotes1 || "",
    otherNotes2: safeData.otherNotes2 || "",
  };

  const handleFieldChange = (field: string, value: any) => {
    onChange({
      ...mergedData,
      [field]: value,
    });
  };

  const handleArrayFieldChange = (
    arrayField: string,
    index: number,
    key: string,
    value: any
  ) => {
    const updatedArray = [...mergedData[arrayField as keyof typeof mergedData] as any];
    updatedArray[index] = { ...updatedArray[index], [key]: value };
    handleFieldChange(arrayField, updatedArray);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        handleFieldChange("photoUrl", reader.result as string);
        toast.success("फोटो यशस्वीरित्या अपलोड केला!");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDownloadPDF = async () => {
    const element = document.getElementById("teacher-portfolio-pdf-content");
    if (!element) return;
    setIsExporting(true);
    try {
      let html2pdfFn = html2pdf;
      // @ts-ignore
      if (html2pdfFn && html2pdfFn.default) { html2pdfFn = html2pdfFn.default; }
      if (typeof html2pdfFn !== "function") {
        if (typeof window !== "undefined" && typeof (window as any).html2pdf === "function") {
          html2pdfFn = (window as any).html2pdf;
        }
      }
      if (typeof html2pdfFn !== "function") {
        throw new Error("html2pdf library is not loaded properly.");
      }

      const opt = {
        margin: 0,
        filename: `Teacher_Portfolio_${mergedData.teacherName.replace(/\s+/g, "_") || "Workbook"}.pdf`,
        image: { type: "jpeg" as const, quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          onclone: (clonedDoc: any) => {
            const el = clonedDoc.getElementById("teacher-portfolio-pdf-content");
            if (el) {
              el.style.gap = "0px";
              el.style.padding = "0px";
              el.style.backgroundColor = "#ffffff";
              el.classList.add("is-printing-pdf");
            }
          }
        },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" as const },
        pagebreak: { mode: ['avoid-all', 'css'], before: '.pdf-a4-page' }
      };

      await html2pdfFn().set(opt).from(element).save();
      toast.success("PDF यशस्वीरित्या डाउनलोड झाली!");
    } catch (err: any) {
      toast.error(`PDF डाउनलोड करण्यात अडथळा आला: ${err?.message || String(err)}`);
    } finally {
      setIsExporting(false);
    }
  };

  React.useEffect(() => {
    const handleDownloadEvent = () => {
      handleDownloadPDF();
    };
    window.addEventListener("download-teacher-portfolio-pdf", handleDownloadEvent);
    return () => window.removeEventListener("download-teacher-portfolio-pdf", handleDownloadEvent);
  }, [mergedData]);

  const renderTrainingPageTable = (startIndex: number) => {
    return (
      <div className="flex-1 overflow-hidden mt-4">
        <div className="w-2/3 mx-auto text-center font-bold bg-yellow-200 border border-black py-1.5 text-sm text-red-600 mb-3">
          प्रशिक्षण
        </div>
        <table className="table-red-headers">
          <thead>
            <tr>
              <th style={{ width: "40px", textAlign: "center" }}>अ.न.</th>
              <th>प्रशिक्षणाचे नाव</th>
              <th>ठिकाण</th>
              <th>स्तर</th>
              <th>कालावधी</th>
              <th style={{ width: "60px" }}>दिवस</th>
            </tr>
          </thead>
          <tbody>
            {mergedData.trainings.slice(startIndex, startIndex + 10).map((item: any, idx: number) => {
              const globalIdx = startIndex + idx;
              return (
                <tr key={globalIdx} style={{ height: "36px" }}>
                  <td style={{ textAlign: "center" }} className="font-bold">{globalIdx + 1}</td>
                  <td>
                    <input
                      type="text"
                      value={item.trainingName}
                      onChange={(e) => handleArrayFieldChange("trainings", globalIdx, "trainingName", e.target.value)}
                      className="w-full h-full border-none bg-transparent outline-none focus:bg-red-50 text-xs px-1"
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={item.location}
                      onChange={(e) => handleArrayFieldChange("trainings", globalIdx, "location", e.target.value)}
                      className="w-full h-full border-none bg-transparent outline-none focus:bg-red-50 text-xs px-1"
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={item.level}
                      onChange={(e) => handleArrayFieldChange("trainings", globalIdx, "level", e.target.value)}
                      className="w-full h-full border-none bg-transparent outline-none focus:bg-red-50 text-xs px-1"
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={item.duration}
                      onChange={(e) => handleArrayFieldChange("trainings", globalIdx, "duration", e.target.value)}
                      className="w-full h-full border-none bg-transparent outline-none focus:bg-red-50 text-xs px-1"
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={item.days}
                      onChange={(e) => handleArrayFieldChange("trainings", globalIdx, "days", e.target.value)}
                      className="w-full h-full border-none bg-transparent outline-none focus:bg-red-50 text-xs px-1 text-center"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const renderSingleA4Page = (pageNum: number) => {
    return (
      <div className="pdf-a4-page relative p-12 flex flex-col justify-between">

        {/* Page Inner Content */}
        {pageNum === 1 && (
          <div className="flex-1 flex flex-col justify-between items-center text-center relative">
            <span className="absolute top-0 left-0 text-[8px] text-black/30 font-semibold">4to40</span>
            <div className="flex flex-col items-center gap-4 mt-8">
              <img
                src="/saraswati_lineart.png"
                alt="Saraswati Line Art"
                className="w-48 h-48 object-contain mix-blend-multiply"
              />
              <h1 className="text-5xl font-black tracking-wider text-red-600 font-serif mt-4">
                शिक्षक संचिका
              </h1>
            </div>

            <div className="w-full max-w-sm space-y-6 text-left pt-6 mb-16">
              <div className="text-md font-black text-red-600 flex items-center gap-2">
                <span className="font-black text-red-600 text-base">• शिक्षकाचे नाव:-</span>
                <input
                  type="text"
                  value={mergedData.teacherName}
                  onChange={(e) => handleFieldChange("teacherName", e.target.value)}
                  className="flex-1 bg-transparent border-b border-dotted border-black outline-none focus:border-red-600 font-bold px-1 py-0.5 text-black text-base"
                  placeholder="नाव लिहा..."
                />
              </div>
              <div className="text-md font-black text-red-600 flex items-center gap-2">
                <span className="font-black text-red-600 text-base">• मोबाईल न:-</span>
                <input
                  type="text"
                  value={mergedData.mobile}
                  onChange={(e) => handleFieldChange("mobile", e.target.value)}
                  className="flex-1 bg-transparent border-b border-dotted border-black outline-none focus:border-red-600 font-bold px-1 py-0.5 text-black text-base"
                  placeholder="मोबाईल लिहा..."
                />
              </div>
            </div>
          </div>
        )}

        {pageNum === 2 && (
          <>
            <div className="flex justify-between items-start w-full border-b border-black pb-3 mb-4">
              <h3 className="text-xl font-bold text-purple-700">शाळा व वर्ग शिक्षक माहिती</h3>
              <span className="text-[9px] text-slate-400 font-mono">Page 2</span>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "8px" }}>
              <div className="relative group" style={{ width: "96px", height: "120px", border: "1px solid black", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", cursor: "pointer", background: "#f9fafb" }}>
                {mergedData.photoUrl ? (
                  <>
                    <img src={mergedData.photoUrl} alt="Teacher" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                      <Camera className="size-5" />
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-1" style={{ color: "#94a3b8" }}>
                    <Camera style={{ width: 24, height: 24 }} />
                    <span style={{ fontSize: "8px" }}>फोटो निवडा</span>
                  </div>
                )}
                <input type="file" accept="image/*" onChange={handlePhotoUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
              </div>
            </div>

            <div className="flex-1 overflow-hidden">
              <table style={{ fontSize: "11px" }}>
                <tbody>
                  {[
                    { label: "शाळा संकेताक", key: "udiseCode" },
                    { label: "वर्गशिक्षकाचे नाव", key: "classTeacherName" },
                    { label: "शाळेचे नाव", key: "schoolName" },
                    { label: "पोस्ट", key: "post" },
                    { label: "केंद्र", key: "center" },
                    { label: "तालुका", key: "taluka" },
                    { label: "जिल्हा", key: "district" },
                    { label: "पिन", key: "pin" },
                    { label: "इयत्ता", key: "className" },
                    { label: "तुकडी", key: "division" },
                    { label: "मोबाईल", key: "schoolMobile" },
                  ].map((field) => (
                    <tr key={field.key} style={{ height: "32px" }}>
                      <td className="font-bold text-purple-700" style={{ width: "180px" }}>
                        {field.label}
                      </td>
                      <td className="p-0">
                        <input
                          type="text"
                          value={mergedData[field.key as keyof typeof mergedData] as string}
                          onChange={(e) => handleFieldChange(field.key, e.target.value)}
                          className="w-full h-full border-none bg-transparent outline-none focus:bg-red-50 text-xs px-2"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {pageNum === 3 && (
          <>
            <div className="flex justify-between items-start w-full border-b border-black pb-3 mb-4">
              <h3 className="text-xl font-bold text-red-600">शिक्षकाची वैयक्तिक माहिती</h3>
              <span className="text-[9px] text-slate-400 font-mono">Page 3</span>
            </div>

            <div className="flex-1 overflow-hidden">
              <table style={{ fontSize: "11px" }}>
                <tbody>
                  {[
                    { label: "शिक्षकाचे नाव", key: "teacherNamePersonal" },
                    { label: "जन्मतारीख", key: "birthDate" },
                    { label: "जन्मस्थळ", key: "birthPlace" },
                    { label: "पद", key: "designation" },
                    { label: "जात", key: "caste" },
                    { label: "प्रवर्ग", key: "category" },
                    { label: "आधार क्र.", key: "aadhaar" },
                    { label: "सरल ID क्र.", key: "saralId" },
                    { label: "शालार्थ ID", key: "shalarthId" },
                    { label: "मोबाईल", key: "personalMobile" },
                    { label: "प्रा.फंड क्र", key: "pfNo" },
                    { label: "PAN न.", key: "panNo" },
                    { label: "निवडणूक कार्ड न", key: "voterId" },
                    { label: "रेशनकार्ड न.", key: "rationCard" },
                    { label: "ई-मेल ID", key: "email" },
                  ].map((item) => (
                    <tr key={item.key} style={{ height: "34px" }}>
                      <td className="font-bold text-red-600" style={{ width: "180px" }}>
                        {item.label}
                      </td>
                      <td className="p-0">
                        <input
                          type="text"
                          value={mergedData[item.key as keyof typeof mergedData] as string}
                          onChange={(e) => handleFieldChange(item.key, e.target.value)}
                          className="w-full h-full border-none bg-transparent outline-none focus:bg-red-50 text-xs px-2 font-bold"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {pageNum === 4 && (
          <>
            <div className="flex justify-between items-start w-full border-b border-black pb-3 mb-4">
              <h3 className="text-xl font-bold text-red-600">वैयक्तिक माहिती (चालू...)</h3>
              <span className="text-[9px] text-slate-400 font-mono">Page 4</span>
            </div>

            <div className="flex-1 overflow-hidden">
              <table style={{ fontSize: "11px" }}>
                <tbody>
                  {[
                    { label: "रक्तगट", key: "bloodGroup" },
                    { label: "वजन", key: "weight" },
                    { label: "उंची", key: "height" },
                    { label: "सेवानिवृत्ती ता.", key: "retirementDate" },
                    { label: "सलगसेवा", key: "continuousServiceDate" },
                    { label: "या शाळेवर हजर दि.", key: "schoolJoinDate" },
                    { label: "या तालुक्यात हजर दि.", key: "talukaJoinDate" },
                    { label: "या जिल्ह्यात हजर दि.", key: "districtJoinDate" },
                    { label: "अपंगत्व प्रमाणपत्र क्र.", key: "disabilityCertNo" },
                    { label: "वाहन लायसन्स क्र.", key: "licenseNo" },
                    { label: "वाहन क्र.", key: "vehicleNo" },
                    { label: "इन्कमटॅक्स न.", key: "incomeTaxNo" },
                    { label: "NPS/DCPS क्र.", key: "npsDcpsNo" },
                  ].map((item) => (
                    <tr key={item.key} style={{ height: "34px" }}>
                      <td className="font-bold text-red-600" style={{ width: "200px" }}>
                        {item.label}
                      </td>
                      <td className="p-0">
                        <input
                          type="text"
                          value={mergedData[item.key as keyof typeof mergedData] as string}
                          onChange={(e) => handleFieldChange(item.key, e.target.value)}
                          className="w-full h-full border-none bg-transparent outline-none focus:bg-red-50 text-xs px-2 font-bold"
                        />
                      </td>
                    </tr>
                  ))}
                  <tr style={{ height: "34px" }}>
                    <td className="font-bold text-red-600">शैक्षणिक पात्रता</td>
                    <td className="p-0">
                      <input
                        type="text"
                        value={mergedData.academicQualSummary}
                        onChange={(e) => handleFieldChange("academicQualSummary", e.target.value)}
                        className="w-full h-full border-none bg-transparent outline-none focus:bg-red-50 text-xs px-2 font-bold"
                        placeholder="शैक्षणिक पात्रता लिहा..."
                      />
                    </td>
                  </tr>
                  <tr style={{ height: "34px" }}>
                    <td className="font-bold text-red-600">व्यावसायिक पात्रता</td>
                    <td className="p-0">
                      <input
                        type="text"
                        value={mergedData.professionalQualSummary}
                        onChange={(e) => handleFieldChange("professionalQualSummary", e.target.value)}
                        className="w-full h-full border-none bg-transparent outline-none focus:bg-red-50 text-xs px-2 font-bold"
                        placeholder="व्यावसायिक पात्रता लिहा..."
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </>
        )}

        {pageNum === 5 && (
          <>
            <div className="flex justify-between items-start w-full border-b border-black pb-3 mb-4">
              <h3 className="text-xl font-bold text-red-600">इतर माहिती आणि पत्ते</h3>
              <span className="text-[9px] text-slate-400 font-mono">Page 5</span>
            </div>

            <div className="flex-1 overflow-hidden">
              <table style={{ fontSize: "11px" }}>
                <tbody>
                  <tr style={{ height: "32px" }}>
                    <td className="font-bold text-red-600" style={{ width: "180px" }}>आवड</td>
                    <td className="p-0">
                      <input
                        type="text"
                        value={mergedData.hobbies}
                        onChange={(e) => handleFieldChange("hobbies", e.target.value)}
                        className="w-full h-full border-none bg-transparent outline-none focus:bg-red-50 text-xs px-2"
                      />
                    </td>
                  </tr>
                  <tr style={{ height: "32px" }}>
                    <td className="font-bold text-red-600">शालेय काम</td>
                    <td className="p-0">
                      <input
                        type="text"
                        value={mergedData.schoolDuties}
                        onChange={(e) => handleFieldChange("schoolDuties", e.target.value)}
                        className="w-full h-full border-none bg-transparent outline-none focus:bg-red-50 text-xs px-2"
                      />
                    </td>
                  </tr>
                  <tr style={{ height: "32px" }}>
                    <td className="font-bold text-red-600">अवगत असलेल्या भाषा</td>
                    <td className="p-0">
                      <input
                        type="text"
                        value={mergedData.languages}
                        onChange={(e) => handleFieldChange("languages", e.target.value)}
                        className="w-full h-full border-none bg-transparent outline-none focus:bg-red-50 text-xs px-2"
                      />
                    </td>
                  </tr>
                  <tr style={{ height: "70px" }}>
                    <td className="font-bold text-red-600">सध्याचा पत्ता</td>
                    <td className="p-1">
                      <textarea
                        value={mergedData.currentAddress}
                        onChange={(e) => handleFieldChange("currentAddress", e.target.value)}
                        className="w-full h-full border-none bg-transparent outline-none focus:bg-red-50 text-xs p-1 resize-none"
                      />
                    </td>
                  </tr>
                  <tr style={{ height: "70px" }}>
                    <td className="font-bold text-red-600">कायमचा पत्ता</td>
                    <td className="p-1">
                      <textarea
                        value={mergedData.permanentAddress}
                        onChange={(e) => handleFieldChange("permanentAddress", e.target.value)}
                        className="w-full h-full border-none bg-transparent outline-none focus:bg-red-50 text-xs p-1 resize-none"
                      />
                    </td>
                  </tr>
                  <tr style={{ height: "70px" }}>
                    <td className="font-bold text-red-600">पत्रव्यवहाराचा पत्ता</td>
                    <td className="p-1">
                      <textarea
                        value={mergedData.correspondenceAddress}
                        onChange={(e) => handleFieldChange("correspondenceAddress", e.target.value)}
                        className="w-full h-full border-none bg-transparent outline-none focus:bg-red-50 text-xs p-1 resize-none"
                      />
                    </td>
                  </tr>
                  <tr style={{ height: "32px" }}>
                    <td className="font-bold text-red-600">मोबाईल क्र. (१)</td>
                    <td className="p-0">
                      <input
                        type="text"
                        value={mergedData.altMobile1}
                        onChange={(e) => handleFieldChange("altMobile1", e.target.value)}
                        className="w-full h-full border-none bg-transparent outline-none focus:bg-red-50 text-xs px-2"
                      />
                    </td>
                  </tr>
                  <tr style={{ height: "32px" }}>
                    <td className="font-bold text-red-600">मोबाईल क्र. (२)</td>
                    <td className="p-0">
                      <input
                        type="text"
                        value={mergedData.altMobile2}
                        onChange={(e) => handleFieldChange("altMobile2", e.target.value)}
                        className="w-full h-full border-none bg-transparent outline-none focus:bg-red-50 text-xs px-2"
                      />
                    </td>
                  </tr>
                  {/* Blank placeholder rows to match physical workbook format */}
                  {Array(6).fill(null).map((_, i) => (
                    <tr key={i} style={{ height: "24px" }}>
                      <td className="border-t border-black bg-slate-50/20"></td>
                      <td className="border-t border-black bg-slate-50/20"></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {pageNum === 6 && (
          <>
            <div className="flex justify-between items-start w-full border-b border-black pb-3 mb-4">
              <h3 className="text-xl font-bold text-red-600">शैक्षणिक व व्यावसायिक पात्रता</h3>
              <span className="text-[9px] text-slate-400 font-mono">Page 6</span>
            </div>

            <div className="flex-1 flex flex-col justify-around gap-6">
              {/* Academic Table */}
              <div>
                <div style={{ backgroundColor: "#fff9c4", border: "1px solid black", textAlign: "center", padding: "5px 0", fontWeight: 700, fontSize: "13px", color: "#c62828", marginBottom: "6px" }}>
                  शैक्षणिक पात्रता
                </div>
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: "40px", textAlign: "center" }}>अ.न.</th>
                      <th>शैक्षणिक पात्रता</th>
                      <th>विद्यापीठ</th>
                      <th>श्रेणी</th>
                      <th style={{ width: "80px" }}>वर्ष</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mergedData.academicQualifications.map((item: any, idx: number) => (
                      <tr key={idx} style={{ height: "36px" }}>
                        <td style={{ textAlign: "center" }} className="font-bold">{idx + 1}</td>
                        <td>
                          <input
                            type="text"
                            value={item.degree}
                            onChange={(e) => handleArrayFieldChange("academicQualifications", idx, "degree", e.target.value)}
                            className="w-full h-full border-none bg-transparent outline-none focus:bg-red-50 text-xs px-1"
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            value={item.university}
                            onChange={(e) => handleArrayFieldChange("academicQualifications", idx, "university", e.target.value)}
                            className="w-full h-full border-none bg-transparent outline-none focus:bg-red-50 text-xs px-1"
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            value={item.grade}
                            onChange={(e) => handleArrayFieldChange("academicQualifications", idx, "grade", e.target.value)}
                            className="w-full h-full border-none bg-transparent outline-none focus:bg-red-50 text-xs px-1"
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            value={item.year}
                            onChange={(e) => handleArrayFieldChange("academicQualifications", idx, "year", e.target.value)}
                            className="w-full h-full border-none bg-transparent outline-none focus:bg-red-50 text-xs px-1 text-center"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Professional Table */}
              <div>
                <div style={{ backgroundColor: "#fff9c4", border: "1px solid black", textAlign: "center", padding: "5px 0", fontWeight: 700, fontSize: "13px", color: "#c62828", marginBottom: "6px" }}>
                  व्यावसायिक पात्रता
                </div>
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: "40px", textAlign: "center" }}>अ.न.</th>
                      <th>व्यावसायिक पात्रता</th>
                      <th>विद्यापीठ</th>
                      <th>श्रेणी</th>
                      <th style={{ width: "80px" }}>वर्ष</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mergedData.professionalQualifications.map((item: any, idx: number) => (
                      <tr key={idx} style={{ height: "36px" }}>
                        <td style={{ textAlign: "center" }} className="font-bold">{idx + 1}</td>
                        <td>
                          <input
                            type="text"
                            value={item.qualification}
                            onChange={(e) => handleArrayFieldChange("professionalQualifications", idx, "qualification", e.target.value)}
                            className="w-full h-full border-none bg-transparent outline-none focus:bg-red-50 text-xs px-1"
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            value={item.university}
                            onChange={(e) => handleArrayFieldChange("professionalQualifications", idx, "university", e.target.value)}
                            className="w-full h-full border-none bg-transparent outline-none focus:bg-red-50 text-xs px-1"
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            value={item.grade}
                            onChange={(e) => handleArrayFieldChange("professionalQualifications", idx, "grade", e.target.value)}
                            className="w-full h-full border-none bg-transparent outline-none focus:bg-red-50 text-xs px-1"
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            value={item.year}
                            onChange={(e) => handleArrayFieldChange("professionalQualifications", idx, "year", e.target.value)}
                            className="w-full h-full border-none bg-transparent outline-none focus:bg-red-50 text-xs px-1 text-center"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {pageNum === 7 && (
          <>
            <div className="flex justify-between items-start w-full border-b border-black pb-3 mb-4">
              <h3 className="text-xl font-bold text-red-600">इतर पात्रता &amp; बँक माहिती</h3>
              <span className="text-[9px] text-slate-400 font-mono">Page 7</span>
            </div>

            <div className="flex-1 flex flex-col justify-around gap-6">
              {/* Other qualifications */}
              <div>
                <div style={{ backgroundColor: "#fff9c4", border: "1px solid black", textAlign: "center", padding: "5px 0", fontWeight: 700, fontSize: "13px", color: "#c62828", marginBottom: "6px" }}>
                  इतर पात्रता
                </div>
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: "40px", textAlign: "center" }}>अ.न.</th>
                      <th>शैक्षणिक पात्रता</th>
                      <th>विद्यापीठ</th>
                      <th>श्रेणी</th>
                      <th style={{ width: "80px" }}>वर्ष</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mergedData.otherQualifications.map((item: any, idx: number) => (
                      <tr key={idx} style={{ height: "36px" }}>
                        <td style={{ textAlign: "center" }} className="font-bold">{idx + 1}</td>
                        <td>
                          <input
                            type="text"
                            value={item.qualification}
                            onChange={(e) => handleArrayFieldChange("otherQualifications", idx, "qualification", e.target.value)}
                            className="w-full h-full border-none bg-transparent outline-none focus:bg-red-50 text-xs px-1"
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            value={item.university}
                            onChange={(e) => handleArrayFieldChange("otherQualifications", idx, "university", e.target.value)}
                            className="w-full h-full border-none bg-transparent outline-none focus:bg-red-50 text-xs px-1"
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            value={item.grade}
                            onChange={(e) => handleArrayFieldChange("otherQualifications", idx, "grade", e.target.value)}
                            className="w-full h-full border-none bg-transparent outline-none focus:bg-red-50 text-xs px-1"
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            value={item.year}
                            onChange={(e) => handleArrayFieldChange("otherQualifications", idx, "year", e.target.value)}
                            className="w-full h-full border-none bg-transparent outline-none focus:bg-red-50 text-xs px-1 text-center"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Bank account details */}
              <div>
                <div style={{ backgroundColor: "#fff9c4", border: "1px solid black", textAlign: "center", padding: "5px 0", fontWeight: 700, fontSize: "13px", color: "#c62828", marginBottom: "6px" }}>
                  बँक खात्याविषयी माहिती
                </div>
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: "40px", textAlign: "center" }}>अ.न.</th>
                      <th>बँकेचे नाव</th>
                      <th>शाखा</th>
                      <th>खाते क्र.</th>
                      <th style={{ width: "100px" }}>IFSC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mergedData.bankDetails.map((item: any, idx: number) => (
                      <tr key={idx} style={{ height: "36px" }}>
                        <td style={{ textAlign: "center" }} className="font-bold">{idx + 1}</td>
                        <td>
                          <input
                            type="text"
                            value={item.bankName}
                            onChange={(e) => handleArrayFieldChange("bankDetails", idx, "bankName", e.target.value)}
                            className="w-full h-full border-none bg-transparent outline-none focus:bg-red-50 text-xs px-1"
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            value={item.branch}
                            onChange={(e) => handleArrayFieldChange("bankDetails", idx, "branch", e.target.value)}
                            className="w-full h-full border-none bg-transparent outline-none focus:bg-red-50 text-xs px-1"
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            value={item.accountNo}
                            onChange={(e) => handleArrayFieldChange("bankDetails", idx, "accountNo", e.target.value)}
                            className="w-full h-full border-none bg-transparent outline-none focus:bg-red-50 text-xs px-1"
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            value={item.ifsc}
                            onChange={(e) => handleArrayFieldChange("bankDetails", idx, "ifsc", e.target.value)}
                            className="w-full h-full border-none bg-transparent outline-none focus:bg-red-50 text-xs px-1"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {pageNum === 8 && (
          <>
            <div className="flex justify-between items-start w-full border-b border-black pb-3 mb-3">
              <h3 className="text-xl font-bold text-red-600">शैक्षणिक सेवा तपशील</h3>
              <span className="text-[9px] text-slate-400 font-mono">Page 8</span>
            </div>

            <div className="flex-1 overflow-hidden mt-2">
              <div style={{ backgroundColor: "#fff9c4", border: "1px solid black", textAlign: "center", padding: "5px 0", fontWeight: 700, fontSize: "12px", color: "#c62828", marginBottom: "6px" }}>
                शैक्षणिक सेवा तपशील (Service History)
              </div>
              <table style={{ fontSize: "9px" }}>
                <thead>
                  <tr>
                    <th style={{ width: "30px", textAlign: "center" }}>अ.न.</th>
                    <th>बदली / नेमणूक</th>
                    <th>हजर झालेली शाळा</th>
                    <th>कालावधी</th>
                    <th>एकूण सेवा</th>
                    <th>बदली आदेश क्र.</th>
                  </tr>
                </thead>
                <tbody>
                  {mergedData.serviceDetails.map((item: any, idx: number) => (
                    <tr key={idx} style={{ height: "28px" }}>
                      <td style={{ textAlign: "center" }} className="font-bold">{idx + 1}</td>
                      <td>
                        <input
                          type="text"
                          value={item.transferType}
                          onChange={(e) => handleArrayFieldChange("serviceDetails", idx, "transferType", e.target.value)}
                          className="w-full h-full border-none bg-transparent outline-none focus:bg-red-50 text-[10px] px-1"
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={item.joinedSchool}
                          onChange={(e) => handleArrayFieldChange("serviceDetails", idx, "joinedSchool", e.target.value)}
                          className="w-full h-full border-none bg-transparent outline-none focus:bg-red-50 text-[10px] px-1"
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={item.duration}
                          onChange={(e) => handleArrayFieldChange("serviceDetails", idx, "duration", e.target.value)}
                          className="w-full h-full border-none bg-transparent outline-none focus:bg-red-50 text-[10px] px-1"
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={item.totalService}
                          onChange={(e) => handleArrayFieldChange("serviceDetails", idx, "totalService", e.target.value)}
                          className="w-full h-full border-none bg-transparent outline-none focus:bg-red-50 text-[10px] px-1"
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={item.orderNo}
                          onChange={(e) => handleArrayFieldChange("serviceDetails", idx, "orderNo", e.target.value)}
                          className="w-full h-full border-none bg-transparent outline-none focus:bg-red-50 text-[10px] px-1"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {pageNum === 9 && (
          <>
            <div className="flex justify-between items-start w-full border-b border-black pb-3 mb-4">
              <h3 className="text-xl font-bold text-red-600">कौटुंबिक माहिती</h3>
              <span className="text-[9px] text-slate-400 font-mono">Page 9</span>
            </div>

            <div className="flex-1 overflow-hidden">
              <div style={{ backgroundColor: "#fff9c4", border: "1px solid black", textAlign: "center", padding: "5px 0", fontWeight: 700, fontSize: "13px", color: "#c62828", marginBottom: "6px" }}>
                कौटुंबिक माहिती
              </div>
              <table>
                <thead>
                  <tr>
                    <th style={{ width: "40px", textAlign: "center" }}>अ.न.</th>
                    <th>कुटुंबातील व्यक्तीचे नाव</th>
                    <th>नाते</th>
                    <th>जन्मतारीख</th>
                    <th>आधार क्र.</th>
                  </tr>
                </thead>
                <tbody>
                  {mergedData.familyDetails.map((item: any, idx: number) => (
                    <tr key={idx} style={{ height: "40px" }}>
                      <td style={{ textAlign: "center" }} className="font-bold">{idx + 1}</td>
                      <td>
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => handleArrayFieldChange("familyDetails", idx, "name", e.target.value)}
                          className="w-full h-full border-none bg-transparent outline-none focus:bg-red-50 text-xs px-1"
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={item.relation}
                          onChange={(e) => handleArrayFieldChange("familyDetails", idx, "relation", e.target.value)}
                          className="w-full h-full border-none bg-transparent outline-none focus:bg-red-50 text-xs px-1"
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={item.dob}
                          onChange={(e) => handleArrayFieldChange("familyDetails", idx, "dob", e.target.value)}
                          className="w-full h-full border-none bg-transparent outline-none focus:bg-red-50 text-xs px-1"
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={item.aadhaar}
                          onChange={(e) => handleArrayFieldChange("familyDetails", idx, "aadhaar", e.target.value)}
                          className="w-full h-full border-none bg-transparent outline-none focus:bg-red-50 text-xs px-1"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {pageNum === 10 && (
          <>
            <div className="flex justify-between items-start w-full border-b border-black pb-3 mb-3">
              <h3 className="text-xl font-bold text-red-600">आवडलेली पुस्तके</h3>
              <span className="text-[9px] text-slate-400 font-mono">Page 10</span>
            </div>

            <div className="flex-1 overflow-hidden">
              <div style={{ backgroundColor: "#fff9c4", border: "1px solid black", textAlign: "center", padding: "5px 0", fontWeight: 700, fontSize: "12px", color: "#c62828", marginBottom: "6px" }}>
                आवडलेली पुस्तके
              </div>
              <table style={{ fontSize: "9px" }}>
                <thead>
                  <tr>
                    <th style={{ width: "30px", textAlign: "center" }}>अ.न.</th>
                    <th>पुस्तकाचे नाव</th>
                    <th>लेखक</th>
                    <th>आशय</th>
                  </tr>
                </thead>
                <tbody>
                  {mergedData.favoriteBooks.map((item: any, idx: number) => (
                    <tr key={idx} style={{ height: "28px" }}>
                      <td style={{ textAlign: "center" }} className="font-bold">{idx + 1}</td>
                      <td>
                        <input
                          type="text"
                          value={item.bookTitle}
                          onChange={(e) => handleArrayFieldChange("favoriteBooks", idx, "bookTitle", e.target.value)}
                          className="w-full h-full border-none bg-transparent outline-none focus:bg-red-50 text-[10px] px-1"
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={item.author}
                          onChange={(e) => handleArrayFieldChange("favoriteBooks", idx, "author", e.target.value)}
                          className="w-full h-full border-none bg-transparent outline-none focus:bg-red-50 text-[10px] px-1"
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={item.summary}
                          onChange={(e) => handleArrayFieldChange("favoriteBooks", idx, "summary", e.target.value)}
                          className="w-full h-full border-none bg-transparent outline-none focus:bg-red-50 text-[10px] px-1"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {pageNum === 11 && (
          <>
            <div className="flex justify-between items-start w-full border-b border-black pb-3 mb-3">
              <h3 className="text-xl font-bold text-red-600">प्रकाशित साहित्य / कवितासंग्रह</h3>
              <span className="text-[9px] text-slate-400 font-mono">Page 11</span>
            </div>

            <div className="flex-1 overflow-hidden">
              <table style={{ fontSize: "9px" }}>
                <thead>
                  <tr>
                    <th style={{ width: "30px", textAlign: "center" }}>अ.न.</th>
                    <th>विषय</th>
                    <th>तपशील</th>
                    <th style={{ width: "80px" }}>वर्ष</th>
                  </tr>
                </thead>
                <tbody>
                  {mergedData.publications.map((item: any, idx: number) => (
                    <tr key={idx} style={{ height: "30px" }}>
                      <td style={{ textAlign: "center" }} className="font-bold">{idx + 1}</td>
                      <td>
                        <input
                          type="text"
                          value={item.subject}
                          onChange={(e) => handleArrayFieldChange("publications", idx, "subject", e.target.value)}
                          className="w-full h-full border-none bg-transparent outline-none focus:bg-red-50 text-[10px] px-1"
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={item.details}
                          onChange={(e) => handleArrayFieldChange("publications", idx, "details", e.target.value)}
                          className="w-full h-full border-none bg-transparent outline-none focus:bg-red-50 text-[10px] px-1"
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={item.year}
                          onChange={(e) => handleArrayFieldChange("publications", idx, "year", e.target.value)}
                          className="w-full h-full border-none bg-transparent outline-none focus:bg-red-50 text-[10px] px-1 text-center"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {pageNum === 12 && (
          <>
            <div className="flex justify-between items-start w-full border-b border-black pb-3 mb-3">
              <h3 className="text-xl font-bold text-red-600">प्रशिक्षण नोंदी</h3>
              <span className="text-[9px] text-slate-400 font-mono">Page 12</span>
            </div>
            {renderTrainingPageTable(0)}
          </>
        )}

        {pageNum === 13 && (
          <>
            <div className="flex justify-between items-start w-full border-b border-black pb-3 mb-3">
              <h3 className="text-xl font-bold text-red-600">प्रशिक्षण नोंदी (चालू...)</h3>
              <span className="text-[9px] text-slate-400 font-mono">Page 13</span>
            </div>
            {renderTrainingPageTable(10)}
          </>
        )}

        {pageNum === 14 && (
          <>
            <div className="flex justify-between items-start w-full border-b border-black pb-3 mb-3">
              <h3 className="text-xl font-bold text-red-600">प्रशिक्षण नोंदी (चालू...)</h3>
              <span className="text-[9px] text-slate-400 font-mono">Page 14</span>
            </div>
            {renderTrainingPageTable(20)}
          </>
        )}

        {pageNum === 15 && (
          <>
            <div className="flex justify-between items-start w-full border-b border-black pb-3 mb-3">
              <h3 className="text-xl font-bold text-red-600">प्रशिक्षण नोंदी (चालू...)</h3>
              <span className="text-[9px] text-slate-400 font-mono">Page 15</span>
            </div>
            {renderTrainingPageTable(30)}
          </>
        )}

        {pageNum === 16 && (
          <>
            <div className="flex justify-between items-start w-full border-b border-black pb-3 mb-3">
              <h3 className="text-xl font-bold text-red-600">प्रशिक्षण नोंदी (चालू...)</h3>
              <span className="text-[9px] text-slate-400 font-mono">Page 16</span>
            </div>
            {renderTrainingPageTable(40)}
          </>
        )}

        {pageNum === 17 && (
          <>
            <div className="flex justify-between items-start w-full border-b border-black pb-3 mb-4">
              <h3 className="text-xl font-bold text-red-600">इतर माहिती / नोंदी</h3>
              <span className="text-[9px] text-slate-400 font-mono">Page 17</span>
            </div>

            <div className="flex-1 flex flex-col mt-4">
              <div className="font-bold text-red-600 text-sm mb-2">अतिरिक्त नोंदी (Notes):</div>
              <textarea
                value={mergedData.otherNotes1}
                onChange={(e) => handleFieldChange("otherNotes1", e.target.value)}
                className="border border-black p-6 flex-1 rounded-xl bg-transparent outline-none focus:border-red-600 text-sm leading-relaxed resize-none text-left"
                placeholder="पहिले पान नोंदी लिहा..."
              />
            </div>
          </>
        )}

        {pageNum === 18 && (
          <>
            <div className="flex justify-between items-start w-full border-b border-black pb-3 mb-4">
              <h3 className="text-xl font-bold text-red-600">इतर माहिती / नोंदी (चालू...)</h3>
              <span className="text-[9px] text-slate-400 font-mono">Page 18</span>
            </div>

            <div className="flex-1 flex flex-col mt-4">
              <div className="font-bold text-red-600 text-sm mb-2">अतिरिक्त नोंदी (Notes Continued):</div>
              <textarea
                value={mergedData.otherNotes2}
                onChange={(e) => handleFieldChange("otherNotes2", e.target.value)}
                className="border border-black p-6 flex-1 rounded-xl bg-transparent outline-none focus:border-red-600 text-sm leading-relaxed resize-none text-left"
                placeholder="दुसरे पान नोंदी लिहा..."
              />
            </div>
          </>
        )}


      </div>
    );
  };

  return (
    <div className="space-y-8 font-sans text-slate-800">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;600;700;900&display=swap');

        .pdf-a4-page {
          width: 210mm;
          height: 297mm;
          background: white;
          margin: 0 auto;
          box-sizing: border-box;
          position: relative;
          overflow: hidden;
          color: black;
          font-family: 'Noto Sans Devanagari', 'Outfit', sans-serif;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
        }

        .pdf-a4-page table {
          width: 100%;
          border-collapse: collapse;
        }

        .pdf-a4-page th, .pdf-a4-page td {
          border: 1px solid black !important;
          padding: 4px 6px;
          font-size: 11px;
          text-align: left;
          color: black !important;
        }

        .pdf-a4-page th {
          background-color: #fffde7 !important;
          font-weight: bold;
          color: #c62828 !important;
        }

        /* Red header table variant */
        .table-red-headers th {
          background-color: #fffde7 !important;
          color: #c62828 !important;
          font-weight: 700;
        }

        /* Purple label in page 2 */
        .page-label-purple {
          color: #6a1b9a !important;
          font-weight: 700;
        }

        /* Red label for pages 3-11 */
        .page-label-red {
          color: #c62828 !important;
          font-weight: 700;
        }

        .pdf-a4-page input,
        .pdf-a4-page textarea {
          color: black !important;
        }

        .input-underline {
          border-bottom: 1px dotted black;
          display: inline-block;
          min-width: 150px;
          padding-left: 5px;
          font-weight: bold;
        }

        .is-exporting-pdf input {
          background: transparent !important;
        }
        
        .is-exporting-pdf textarea {
          background: transparent !important;
        }

        @media print {
          .pdf-a4-page {
            box-shadow: none !important;
            page-break-after: always;
            break-after: page;
          }
        }
      `}</style>

      {/* Stack of all 18 A4 sheets scrollable vertically */}
      <div className="flex flex-col items-center gap-8 w-full py-6 bg-slate-800 rounded-[2.5rem] p-6 shadow-inner overflow-x-auto">
        <div id="teacher-portfolio-pdf-content" className="is-exporting-pdf flex flex-col gap-8">
          {Array(18)
            .fill(null)
            .map((_, i) => (
              <React.Fragment key={i}>
                {renderSingleA4Page(i + 1)}
              </React.Fragment>
            ))}
        </div>
      </div>
    </div>
  );
}
