import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { TeacherSidebar } from "@/components/teacher/TeacherSidebar";
import { TeacherHeader } from "@/components/teacher/TeacherHeader";
import { useState, useEffect, useRef } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, doc, getDoc, addDoc, deleteDoc, setDoc } from "firebase/firestore";
import {
  Calendar,
  Download,
  Eye,
  FileText,
  Loader2,
  AlertCircle,
  Pencil,
  Save,
  ChevronLeft,
} from "lucide-react";
import { showToast as toast } from "@/lib/custom-toast";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";
import { motion, AnimatePresence } from "framer-motion";
import html2pdf from "html2pdf.js";
import logoImg from "@/assets/logo.jpeg";


export const Route = createFileRoute("/teacher/timetable/class")({
  validateSearch: (search: Record<string, unknown>) => ({
    class: (search.class as string) || "1st",
  }),
  component: ClassTimetablePage,
});

const CLASSES = [
  "1st",
  "2nd",
  "3rd",
  "4th",
  "5th",
  "6th",
  "7th",
  "8th",
  "9th",
  "10th",
];

const CLASS_NAME_MAP: Record<string, { mr: string; en: string; hi: string }> = {
  "1st": { mr: "पहिली", en: "1st Standard", hi: "पहली" },
  "2nd": { mr: "दुसरी", en: "2nd Standard", hi: "दूसरी" },
  "3rd": { mr: "तिसरी", en: "3rd Standard", hi: "तीसरी" },
  "4th": { mr: "चौथी", en: "4th Standard", hi: "चौथी" },
  "5th": { mr: "पाचवी", en: "5th Standard", hi: "पांचवीं" },
  "6th": { mr: "सहावी", en: "6th Standard", hi: "छठी" },
  "7th": { mr: "सातवी", en: "7th Standard", hi: "सातवीं" },
  "8th": { mr: "आठवी", en: "8th Standard", hi: "आठवीं" },
  "9th": { mr: "नववी", en: "9th Standard", hi: "नौवीं" },
  "10th": { mr: "दहावी", en: "10th Standard", hi: "दसवीं" },
};

const CLASS_SUBJECTS_MAP: Record<string, { label: string; key: string }[]> = {
  "1st": [
    { label: "भाषा", key: "marathi" },
    { label: "गणित", key: "maths" },
    { label: "इंग्रजी", key: "english" },
    { label: "कला", key: "art" },
    { label: "कार्यानुभव", key: "work" },
    { label: "शा.शिक्षण", key: "pe" },
  ],
  "2nd": [
    { label: "भाषा", key: "marathi" },
    { label: "गणित", key: "maths" },
    { label: "इंग्रजी", key: "english" },
    { label: "कला", key: "art" },
    { label: "कार्यानुभव", key: "work" },
    { label: "शा.शिक्षण", key: "pe" },
  ],
  "3rd": [
    { label: "भाषा", key: "marathi" },
    { label: "गणित", key: "maths" },
    { label: "इंग्रजी", key: "english" },
    { label: "प.अभ्यास", key: "evs" },
    { label: "कला", key: "art" },
    { label: "कार्यानुभव", key: "work" },
    { label: "शा.शिक्षण", key: "pe" },
  ],
  "4th": [
    { label: "भाषा", key: "marathi" },
    { label: "गणित", key: "maths" },
    { label: "इंग्रजी", key: "english" },
    { label: "प.अभ्यास", key: "evs" },
    { label: "कला", key: "art" },
    { label: "कार्यानुभव", key: "work" },
    { label: "शा.शिक्षण", key: "pe" },
  ],
  "5th": [
    { label: "मराठी", key: "marathi" },
    { label: "गणित", key: "maths" },
    { label: "इंग्रजी", key: "english" },
    { label: "हिंदी", key: "hindi" },
    { label: "प.अभ्यास", key: "evs" },
    { label: "कला", key: "art" },
    { label: "कार्यानुभव", key: "work" },
    { label: "शा.शिक्षण", key: "pe" },
  ],
  "6th": [
    { label: "मराठी", key: "marathi" },
    { label: "गणित", key: "maths" },
    { label: "इंग्रजी", key: "english" },
    { label: "हिंदी", key: "hindi" },
    { label: "विज्ञान", key: "science" },
    { label: "सा.शास्त्रे", key: "socialScience" },
    { label: "कला", key: "art" },
    { label: "कार्यानुभव", key: "work" },
    { label: "शा.शिक्षण", key: "pe" },
  ],
  "7th": [
    { label: "मराठी", key: "marathi" },
    { label: "गणित", key: "maths" },
    { label: "इंग्रजी", key: "english" },
    { label: "हिंदी", key: "hindi" },
    { label: "विज्ञान", key: "science" },
    { label: "सा.शास्त्रे", key: "socialScience" },
    { label: "कला", key: "art" },
    { label: "कार्यानुभव", key: "work" },
    { label: "शा.शिक्षण", key: "pe" },
  ],
  "8th": [
    { label: "मराठी", key: "marathi" },
    { label: "गणित", key: "maths" },
    { label: "इंग्रजी", key: "english" },
    { label: "हिंदी", key: "hindi" },
    { label: "विज्ञान", key: "science" },
    { label: "सा.शास्त्रे", key: "socialScience" },
    { label: "कला", key: "art" },
    { label: "कार्यानुभव", key: "work" },
    { label: "शा.शिक्षण", key: "pe" },
  ],
};

const LOCAL_TRANS = {
  mr: {
    title: "वेळापत्रक",
    subtitle: "प्रशासकाद्वारे अपलोड केलेले वेळापत्रक पाहण्यासाठी खालील 'पहा' बटणावर क्लिक करा.",
    noTimetable: "या इयत्तेसाठी वेळापत्रक उपलब्ध नाही.",
    adminHint: "कृपया नवीन वेळापत्रकासाठी मुख्य प्रशासकांशी संपर्क साधा.",
    fileName: "संचिका नाव",
    fileSize: "आकार",
    uploadDate: "अपलोड तारीख",
    actions: "कृती",
    view: "पहा",
    closePreview: "बंद करा",
    download: "डाउनलोड",
    loading: "वेळापत्रक लोड होत आहे...",
    loadingPreview: "वेळापत्रक पूर्वावलोकन लोड होत आहे...",
    previewTitle: "वेळापत्रक पूर्वावलोकन:",
  },
  en: {
    title: "Class Timetable",
    subtitle: "Click the 'View' button below to display the timetable uploaded by the administrator.",
    noTimetable: "No timetable available for this grade.",
    adminHint: "Please contact the system administrator to upload the timetable.",
    fileName: "File Name",
    fileSize: "Size",
    uploadDate: "Upload Date",
    actions: "Actions",
    view: "View",
    closePreview: "Close Preview",
    download: "Download",
    loading: "Loading timetables...",
    loadingPreview: "Loading timetable preview...",
    previewTitle: "Timetable Preview:",
  },
  hi: {
    title: "समय सारणी",
    subtitle: "प्रशासक द्वारा अपलोड की गई समय सारणी देखने के लिए नीचे दिए गए 'देखें' बटन पर क्लिक करें।",
    noTimetable: "इस कक्षा के लिए समय सारणी उपलब्ध नहीं है।",
    adminHint: "कृपया नई समय सारणी के लिए मुख्य प्रशासक से संपर्क करें।",
    fileName: "फ़ाइल का नाम",
    fileSize: "आकार",
    uploadDate: "अपलोड तिथि",
    actions: "क्रियाएं",
    view: "देखें",
    closePreview: "बंद करें",
    download: "डाउनलोड",
    loading: "समय सारणी लोड हो रही है...",
    loadingPreview: "समय सारणी का पूर्वावलोकन लोड हो रहा है...",
    previewTitle: "समय सारणी पूर्वावलोकन:",
  }
};

interface TimetableFile {
  id: string;
  className: string;
  name: string;
  size: string;
  type: string;
  date: string;
  url?: string;
  chunks?: string[];
}

const generateDefaultGrid = (classId: string, classNameMr: string) => {
  const rows = [];
  let monThuData: any[] = [];
  let friData: any[] = [];
  let satData: any[] = [];
  let subjectDistribution: any = {};

  if (classId === "1st" || classId === "2nd") {
    // पहिली / दुसरी (Page 3 of PDF)
    monThuData = [
      { period: "सफाई", time: "10.30 ते 10.45", monday: "सफाई", tuesday: "सफाई", wednesday: "सफाई", thursday: "सफाई" },
      { period: "परिपाठ", time: "10.45 ते 10.55", monday: "परिपाठ", tuesday: "परिपाठ", wednesday: "परिपाठ", thursday: "परिपाठ" },
      { period: "१ ला तास", time: "10.55 ते 11.35", monday: "भाषा", tuesday: "भाषा", wednesday: "भाषा", thursday: "भाषा" },
      { period: "२ रा तास", time: "11.35 ते 12.10", monday: "गणित", tuesday: "गणित", wednesday: "गणित", thursday: "गणित" },
      { period: "लहान सुट्टी", time: "12.10 ते 12.20", monday: "लहान सुट्टी", tuesday: "लहान सुट्टी", wednesday: "लहान सुट्टी", thursday: "लहान सुट्टी" },
      { period: "३ रा तास", time: "12.20 ते 12.55", monday: "इंग्रजी", tuesday: "इंग्रजी", wednesday: "इंग्रजी", thursday: "इंग्रजी" },
      { period: "४ था तास", time: "12.55 ते 1.30", monday: "भाषा", tuesday: "भाषा", wednesday: "भाषा", thursday: "भाषा" },
      { period: "मोठी सुट्टी", time: "1.30 ते 2.30", monday: "मोठी सुट्टी", tuesday: "मोठी सुट्टी", wednesday: "मोठी सुट्टी", thursday: "मोठी सुट्टी" },
      { period: "५ वा तास", time: "2.30 ते 3.05", monday: "गणित", tuesday: "गणित", wednesday: "गणित", thursday: "गणित" },
      { period: "६ वा तास", time: "3.05 ते 3.40", monday: "भाषा", tuesday: "भाषा", wednesday: "भाषा", thursday: "भाषा" },
      { period: "लहान सुट्टी", time: "3.40 ते 3.50", monday: "लहान सुट्टी", tuesday: "लहान सुट्टी", wednesday: "लहान सुट्टी", thursday: "लहान सुट्टी" },
      { period: "७ वा तास", time: "3.50 ते 4.25", monday: "कला", tuesday: "कार्यानुभव", wednesday: "कला", thursday: "कार्यानुभव" },
      { period: "८ वा तास", time: "4.25 ते 5.00", monday: "कला", tuesday: "शा.शिक्षण", wednesday: "कार्यानुभव", thursday: "शा.शिक्षण" }
    ];

    friData = [
      { period: "सफाई", time: "10.30 ते 10.45", friday: "सफाई" },
      { period: "परिपाठ", time: "10.45 ते 10.55", friday: "परिपाठ" },
      { period: "१ ला तास", time: "10.55 ते 11.35", friday: "भाषा" },
      { period: "२ रा तास", time: "11.35 ते 12.05", friday: "गणित" },
      { period: "३ रा तास", time: "12.05 ते 12.35", friday: "इंग्रजी" },
      { period: "लहान सुट्टी", time: "12.35 ते 12.45", friday: "लहान सुट्टी" },
      { period: "४ था तास", time: "12.45 ते 1.15", friday: "भाषा" },
      { period: "५ वा तास", time: "1.15 ते 1.45", friday: "गणित" },
      { period: "मोठी सुट्टी", time: "1.45 ते 2.45", friday: "मोठी सुट्टी" },
      { period: "६ वा तास", time: "2.45 ते 3.15", friday: "कला" },
      { period: "७ वा तास", time: "3.15 ते 3.45", friday: "गणित" },
      { period: "लहान सुट्टी", time: "3.45 ते 3.55", friday: "लहान सुट्टी" },
      { period: "८ वा तास", time: "3.55 ते 4.25", friday: "कार्यानुभव" },
      { period: "९ वा तास", time: "4.25 ते 5.00", friday: "शा.शिक्षण" }
    ];

    satData = [
      { period: "सफाई", time: "8.00 ते 8.10", saturday: "परिपाठ" },
      { period: "१ ला तास", time: "8.10 ते 8.40", saturday: "शा.शिक्षण" },
      { period: "२ रा तास", time: "8.40 ते 9.05", saturday: "गणित" },
      { period: "३ रा तास", time: "9.05 ते 9.30", saturday: "इंग्रजी" },
      { period: "४ था तास", time: "9.30 ते 9.55", saturday: "भाषा" },
      { period: "मोठी सुट्टी", time: "9.55 ते 10.15", saturday: "मोठी सुट्टी" },
      { period: "५ वा तास", time: "10.15 ते 10.40", saturday: "गणित" },
      { period: "६ वा तास", time: "10.40 ते 11.05", saturday: "भाषा" },
      { period: "७ वा तास", time: "11.05 ते 11.30", saturday: "इंग्रजी" }
    ];

    subjectDistribution = {
      marathi: "16",
      maths: "13",
      english: "7",
      art: "4",
      work: "4",
      pe: "4",
      total: "48"
    };
  } else if (classId === "3rd" || classId === "4th") {
    // तिसरी / चौथी (Page 4 of PDF)
    monThuData = [
      { period: "सफाई", time: "10.30 ते 10.45", monday: "सफाई", tuesday: "सफाई", wednesday: "सफाई", thursday: "सफाई" },
      { period: "परिपाठ", time: "10.45 ते 10.55", monday: "परिपाठ", tuesday: "परिपाठ", wednesday: "परिपाठ", thursday: "परिपाठ" },
      { period: "१ ला तास", time: "10.55 ते 11.35", monday: "भाषा", tuesday: "भाषा", wednesday: "भाषा", thursday: "भाषा" },
      { period: "२ रा तास", time: "11.35 ते 12.10", monday: "गणित", tuesday: "गणित", wednesday: "गणित", thursday: "गणित" },
      { period: "लहान सुट्टी", time: "12.10 ते 12.20", monday: "लहान सुट्टी", tuesday: "लहान सुट्टी", wednesday: "लहान सुट्टी", thursday: "लहान सुट्टी" },
      { period: "३ रा तास", time: "12.20 ते 12.55", monday: "इंग्रजी", tuesday: "इंग्रजी", wednesday: "इंग्रजी", thursday: "इंग्रजी" },
      { period: "४ था तास", time: "12.55 ते 1.30", monday: "भाषा", tuesday: "भाषा", wednesday: "भाषा", thursday: "भाषा" },
      { period: "मोठी सुट्टी", time: "1.30 ते 2.30", monday: "मोठी सुट्टी", tuesday: "मोठी सुट्टी", wednesday: "मोठी सुट्टी", thursday: "मोठी सुट्टी" },
      { period: "५ वा तास", time: "2.30 ते 3.05", monday: "कार्यानुभव", tuesday: "प.अभ्यास", wednesday: "गणित", thursday: "गणित" },
      { period: "६ वा तास", time: "3.05 ते 3.40", monday: "भाषा", tuesday: "प.अभ्यास", wednesday: "प.अभ्यास", thursday: "प.अभ्यास" },
      { period: "लहान सुट्टी", time: "3.40 ते 3.50", monday: "लहान सुट्टी", tuesday: "लहान सुट्टी", wednesday: "लहान सुट्टी", thursday: "लहान सुट्टी" },
      { period: "७ वा तास", time: "3.50 ते 4.25", monday: "प.अभ्यास", tuesday: "कार्यानुभव", wednesday: "प.अभ्यास", thursday: "कार्यानुभव" },
      { period: "८ वा तास", time: "4.25 ते 5.00", monday: "कला", tuesday: "शा.शिक्षण", wednesday: "कला", thursday: "शा.शिक्षण" }
    ];

    friData = [
      { period: "सफाई", time: "10.30 ते 10.45", friday: "सफाई" },
      { period: "परिपाठ", time: "10.45 ते 10.55", friday: "परिपाठ" },
      { period: "१ ला तास", time: "10.55 ते 11.35", friday: "भाषा" },
      { period: "२ रा तास", time: "11.35 ते 12.05", friday: "गणित" },
      { period: "३ रा तास", time: "12.05 ते 12.35", friday: "इंग्रजी" },
      { period: "लहान सुट्टी", time: "12.35 ते 12.45", friday: "लहान सुट्टी" },
      { period: "४ था तास", time: "12.45 ते 1.15", friday: "भाषा" },
      { period: "५ वा तास", time: "1.15 ते 1.45", friday: "प.अभ्यास" },
      { period: "मोठी सुट्टी", time: "1.45 ते 2.45", friday: "मोठी सुट्टी" },
      { period: "६ वा तास", time: "2.45 ते 3.15", friday: "प.अभ्यास" },
      { period: "७ वा तास", time: "3.15 ते 3.45", friday: "गणित" },
      { period: "लहान सुट्टी", time: "3.45 ते 3.55", friday: "लहान सुट्टी" },
      { period: "८ वा तास", time: "3.55 ते 4.25", friday: "कार्यानुभव" },
      { period: "९ वा तास", time: "4.25 ते 5.00", friday: "कला" }
    ];

    satData = [
      { period: "सफाई", time: "8.00 ते 8.10", saturday: "परिपाठ" },
      { period: "१ ला तास", time: "8.10 ते 8.40", saturday: "शा.शिक्षण" },
      { period: "२ रा तास", time: "8.40 ते 9.05", saturday: "गणित" },
      { period: "३ रा तास", time: "9.05 ते 9.30", saturday: "इंग्रजी" },
      { period: "४ था तास", time: "9.30 ते 9.55", saturday: "भाषा" },
      { period: "मोठी सुट्टी", time: "9.55 ते 10.15", saturday: "मोठी सुट्टी" },
      { period: "५ वा तास", time: "10.15 ते 10.40", saturday: "प.अभ्यास" },
      { period: "६ वा तास", time: "10.40 ते 11.05", saturday: "प.अभ्यास" },
      { period: "७ वा तास", time: "11.05 ते 11.30", saturday: "इंग्रजी" }
    ];

    subjectDistribution = {
      marathi: "12",
      maths: "9",
      english: "7",
      evs: "10",
      art: "3",
      work: "3",
      pe: "4",
      total: "48"
    };
  } else if (classId === "5th") {
    // पाचवी (Page 2 of PDF)
    monThuData = [
      { period: "सफाई", time: "10.30 ते 10.45", monday: "सफाई", tuesday: "सफाई", wednesday: "सफाई", thursday: "सफाई" },
      { period: "परिपाठ", time: "10.45 ते 10.55", monday: "परिपाठ", tuesday: "परिपाठ", wednesday: "परिपाठ", thursday: "परिपाठ" },
      { period: "१ ला तास", time: "10.55 ते 11.35", monday: "मराठी", tuesday: "इंग्रजी", wednesday: "मराठी", thursday: "इंग्रजी" },
      { period: "२ रा तास", time: "11.35 ते 12.10", monday: "मराठी", tuesday: "इंग्रजी", wednesday: "मराठी", thursday: "इंग्रजी" },
      { period: "लहान सुट्टी", time: "12.10 ते 12.20", monday: "लहान सुट्टी", tuesday: "लहान सुट्टी", wednesday: "लहान सुट्टी", thursday: "लहान सुट्टी" },
      { period: "३ रा तास", time: "12.20 ते 12.55", monday: "गणित", tuesday: "हिंदी", wednesday: "गणित", thursday: "हिंदी" },
      { period: "४ था तास", time: "12.55 ते 1.30", monday: "गणित", tuesday: "हिंदी", wednesday: "गणित", thursday: "हिंदी" },
      { period: "मोठी सुट्टी", time: "1.30 ते 2.30", monday: "मोठी सुट्टी", tuesday: "मोठी सुट्टी", wednesday: "मोठी सुट्टी", thursday: "मोठी सुट्टी" },
      { period: "५ वा तास", time: "2.30 ते 3.05", monday: "प.अभ्यास", tuesday: "प.अभ्यास", wednesday: "प.अभ्यास", thursday: "प.अभ्यास" },
      { period: "६ वा तास", time: "3.05 ते 3.40", monday: "प.अभ्यास", tuesday: "प.अभ्यास", wednesday: "प.अभ्यास", thursday: "प.अभ्यास" },
      { period: "लहान सुट्टी", time: "3.40 ते 3.50", monday: "लहान सुट्टी", tuesday: "लहान सुट्टी", wednesday: "लहान सुट्टी", thursday: "लहान सुट्टी" },
      { period: "७ वा तास", time: "3.50 ते 4.25", monday: "इंग्रजी", tuesday: "गणित", wednesday: "कार्यानुभव", thursday: "कार्यानुभव" },
      { period: "८ वा तास", time: "4.25 ते 5.00", monday: "कला", tuesday: "शा.शिक्षण", wednesday: "शा.शिक्षण", thursday: "कार्यानुभव" }
    ];

    friData = [
      { period: "सफाई", time: "10.30 ते 10.45", friday: "सफाई" },
      { period: "परिपाठ", time: "10.45 ते 10.55", friday: "परिपाठ" },
      { period: "१ ला तास", time: "10.55 ते 11.35", friday: "मराठी" },
      { period: "२ रा तास", time: "11.35 ते 12.05", friday: "मराठी" },
      { period: "३ रा तास", time: "12.05 ते 12.35", friday: "इंग्रजी" },
      { period: "लहान सुट्टी", time: "12.35 ते 12.45", friday: "लहान सुट्टी" },
      { period: "४ था तास", time: "12.45 ते 1.15", friday: "गणित" },
      { period: "५ वा तास", time: "1.15 ते 1.45", friday: "गणित" },
      { period: "मोठी सुट्टी", time: "1.45 ते 2.45", friday: "मोठी सुट्टी" },
      { period: "६ वा तास", time: "2.45 ते 3.15", friday: "प.अभ्यास" },
      { period: "७ वा तास", time: "3.15 ते 3.45", friday: "प.अभ्यास" },
      { period: "लहान सुट्टी", time: "3.45 ते 3.55", friday: "लहान सुट्टी" },
      { period: "८ वा तास", time: "3.55 ते 4.25", friday: "इंग्रजी" },
      { period: "९ वा तास", time: "4.25 ते 5.00", friday: "कला" }
    ];

    satData = [
      { period: "सफाई", time: "8.00 ते 8.10", saturday: "परिपाठ" },
      { period: "१ ला तास", time: "8.10 ते 8.40", saturday: "शा.शिक्षण" },
      { period: "२ रा तास", time: "8.40 ते 9.05", saturday: "गणित" },
      { period: "३ रा तास", time: "9.05 ते 9.30", saturday: "कला" },
      { period: "४ था तास", time: "9.30 ते 9.55", saturday: "हिंदी" },
      { period: "मोठी सुट्टी", time: "9.55 ते 10.15", saturday: "मोठी सुट्टी" },
      { period: "५ वा तास", time: "10.15 ते 10.40", saturday: "हिंदी" },
      { period: "६ वा तास", time: "10.40 ते 11.05", saturday: "प.अभ्यास" },
      { period: "७ वा तास", time: "11.05 ते 11.30", saturday: "प.अभ्यास" }
    ];

    subjectDistribution = {
      marathi: "6",
      maths: "8",
      english: "7",
      hindi: "6",
      evs: "12",
      art: "3",
      work: "3",
      pe: "3",
      total: "48"
    };
  } else {
    // सहावी / सातवी / आठवी (Page 1 of PDF)
    monThuData = [
      { period: "सफाई", time: "10.30 ते 10.45", monday: "सफाई", tuesday: "सफाई", wednesday: "सफाई", thursday: "सफाई" },
      { period: "परिपाठ", time: "10.45 ते 10.55", monday: "परिपाठ", tuesday: "परिपाठ", wednesday: "परिपाठ", thursday: "परिपाठ" },
      { period: "१ ला तास", time: "10.55 ते 11.35", monday: "विज्ञान", tuesday: "सा.शास्त्रे", wednesday: "सा.शास्त्रे", thursday: "विज्ञान" },
      { period: "२ रा तास", time: "11.35 ते 12.10", monday: "विज्ञान", tuesday: "सा.शास्त्रे", wednesday: "सा.शास्त्रे", thursday: "विज्ञान" },
      { period: "लहान सुट्टी", time: "12.10 ते 12.20", monday: "लहान सुट्टी", tuesday: "लहान सुट्टी", wednesday: "लहान सुट्टी", thursday: "लहान सुट्टी" },
      { period: "३ रा तास", time: "12.20 ते 12.55", monday: "मराठी", tuesday: "इंग्रजी", wednesday: "मराठी", thursday: "इंग्रजी" },
      { period: "४ था तास", time: "12.55 ते 1.30", monday: "मराठी", tuesday: "इंग्रजी", wednesday: "मराठी", thursday: "इंग्रजी" },
      { period: "मोठी सुट्टी", time: "1.30 ते 2.30", monday: "मोठी सुट्टी", tuesday: "मोठी सुट्टी", wednesday: "मोठी सुट्टी", thursday: "मोठी सुट्टी" },
      { period: "५ वा तास", time: "2.30 ते 3.05", monday: "गणित", tuesday: "गणित", wednesday: "गणित", thursday: "सा.शास्त्रे" },
      { period: "६ वा तास", time: "3.05 ते 3.40", monday: "गणित", tuesday: "गणित", wednesday: "गणित", thursday: "सा.शास्त्रे" },
      { period: "लहान सुट्टी", time: "3.40 ते 3.50", monday: "लहान सुट्टी", tuesday: "लहान सुट्टी", wednesday: "लहान सुट्टी", thursday: "लहान सुट्टी" },
      { period: "७ वा तास", time: "3.50 ते 4.25", monday: "हिंदी", tuesday: "हिंदी", wednesday: "कला", thursday: "कला" },
      { period: "८ वा तास", time: "4.25 ते 5.00", monday: "हिंदी", tuesday: "शा.शिक्षण", wednesday: "शा.शिक्षण", thursday: "शा.शिक्षण" }
    ];

    friData = [
      { period: "सफाई", time: "10.30 ते 10.45", friday: "सफाई" },
      { period: "परिपाठ", time: "10.45 ते 10.55", friday: "परिपाठ" },
      { period: "१ ला तास", time: "10.55 ते 11.35", friday: "विज्ञान" },
      { period: "२ रा तास", time: "11.35 ते 12.05", friday: "विज्ञान" },
      { period: "३ रा तास", time: "12.05 ते 12.35", friday: "हिंदी" },
      { period: "लहान सुट्टी", time: "12.35 ते 12.45", friday: "लहान सुट्टी" },
      { period: "४ था तास", time: "12.45 ते 1.15", friday: "मराठी" },
      { period: "५ वा तास", time: "1.15 ते 1.45", friday: "मराठी" },
      { period: "मोठी सुट्टी", time: "1.45 ते 2.45", friday: "मोठी सुट्टी" },
      { period: "६ वा तास", time: "2.45 ते 3.15", friday: "गणित" },
      { period: "७ वा तास", time: "3.15 ते 3.45", friday: "विज्ञान" },
      { period: "लहान सुट्टी", time: "3.45 ते 3.55", friday: "लहान सुट्टी" },
      { period: "८ वा तास", time: "3.55 ते 4.25", friday: "कार्यानुभव" },
      { period: "९ वा तास", time: "4.25 ते 5.00", friday: "कार्यानुभव" }
    ];

    satData = [
      { period: "सफाई", time: "8.00 ते 8.10", saturday: "परिपाठ" },
      { period: "१ ला तास", time: "8.10 ते 8.40", saturday: "शा.शिक्षण" },
      { period: "२ रा तास", time: "8.40 ते 9.05", saturday: "हिंदी" },
      { period: "३ रा तास", time: "9.05 ते 9.30", saturday: "हिंदी" },
      { period: "४ था तास", time: "9.30 ते 9.55", saturday: "इंग्रजी" },
      { period: "मोठी सुट्टी", time: "9.55 ते 10.15", saturday: "मोठी सुट्टी" },
      { period: "५ वा तास", time: "10.15 ते 10.40", saturday: "इंग्रजी" },
      { period: "६ वा तास", time: "10.40 ते 11.05", saturday: "कला" },
      { period: "७ वा तास", time: "11.05 ते 11.30", saturday: "कला" }
    ];

    subjectDistribution = {
      marathi: "6",
      maths: "7",
      english: "6",
      hindi: "6",
      science: "7",
      socialScience: "6",
      art: "4",
      work: "2",
      pe: "4",
      total: "48"
    };
  }

  const maxRows = Math.max(monThuData.length, friData.length, satData.length);
  for (let i = 0; i < maxRows; i++) {
    const monThu = monThuData[i] || { period: "", time: "", monday: "", tuesday: "", wednesday: "", thursday: "" };
    const fri = friData[i] || { period: "", time: "", friday: "" };
    const sat = satData[i] || { period: "", time: "", saturday: "" };

    rows.push({
      monThuPeriod: monThu.period || "",
      monThuTime: monThu.time || "",
      monday: monThu.monday || "",
      tuesday: monThu.tuesday || "",
      wednesday: monThu.wednesday || "",
      thursday: monThu.thursday || "",
      
      friPeriod: fri.period || "",
      friTime: fri.time || "",
      friday: fri.friday || "",
      
      satPeriod: sat.period || "",
      satTime: sat.time || "",
      saturday: sat.saturday || ""
    });
  }

  let displayClassNameMr = classNameMr;


  return {
    schoolName: "जिल्हा परिषद प्राथमिक शाळा",
    center: "",
    taluka: "",
    district: "सोलापूर",
    academicYear: "2026-27",
    headmasterName: "ZP Headmaster",
    teacherName: "वर्गशिक्षक",
    classNameMr: displayClassNameMr,
    subjectDistribution,
    rows
  };
};

function ClassTimetablePage() {
  const { class: selectedClass } = Route.useSearch();
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const t = LOCAL_TRANS[lang as keyof typeof LOCAL_TRANS] || LOCAL_TRANS.en;

  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const [gridData, setGridData] = useState<any>(null);
  const [savingGrid, setSavingGrid] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current) return;
      const parentWidth = containerRef.current.parentElement?.clientWidth || window.innerWidth;
      const targetWidth = 1000;
      if (parentWidth < targetWidth) {
        setScale(parentWidth / targetWidth);
      } else {
        setScale(1);
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    const timer = setTimeout(handleResize, 100);
    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(timer);
    };
  }, [gridData]);

  const cellInputStyle = {
    border: 'none',
    background: 'transparent',
    outline: 'none',
    boxShadow: 'none',
    padding: 0,
    margin: 0,
    width: '100%',
    height: '100%',
    textAlign: 'center' as const,
    fontSize: 'inherit',
    fontWeight: 'inherit',
    fontFamily: 'inherit',
    color: 'inherit'
  };

  const getDynamicWidth = (val: string, defaultChars: number = 5) => {
    const charCount = Math.max(defaultChars, (val || "").length);
    return `${charCount * 9 + 10}px`;
  };

  const monThuRows = gridData?.rows?.filter((r: any) => r.monThuPeriod && r.monThuPeriod !== "") || [];
  const friRows = gridData?.rows?.filter((r: any) => r.friPeriod && r.friPeriod !== "") || [];
  const satRows = gridData?.rows?.filter((r: any) => r.satPeriod && r.satPeriod !== "") || [];

  const handleHeaderChange = (field: string, value: string) => {
    setGridData((prev: any) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCellChange = (index: number, field: string, value: string) => {
    setGridData((prev: any) => {
      const updated = [...prev.rows];
      const targetRow = updated[index];
      
      const isRecessValue = (val: string) => {
        if (!val) return false;
        const clean = val.trim();
        return clean === "लहान सुट्टी" || clean === "मोठी सुट्टी" || clean === "सफाई" || clean === "परिपाठ";
      };

      const isCurrentRecess = isRecessValue(targetRow.monday) || 
                              isRecessValue(targetRow.tuesday) || 
                              isRecessValue(targetRow.wednesday) || 
                              isRecessValue(targetRow.thursday) ||
                              isRecessValue(value);

      if (
        (field === "monday" || field === "tuesday" || field === "wednesday" || field === "thursday") &&
        isCurrentRecess
      ) {
        updated[index] = { 
          ...targetRow, 
          monday: value,
          tuesday: value,
          wednesday: value,
          thursday: value
        };
      } else {
        updated[index] = { ...targetRow, [field]: value };
      }
      
      return { ...prev, rows: updated };
    });
  };

  const handleSubjectDistChange = (field: string, value: string) => {
    setGridData((prev: any) => ({
      ...prev,
      subjectDistribution: {
        ...(prev.subjectDistribution || {
          marathi: "6",
          maths: "8",
          english: "7",
          hindi: "6",
          evs: "12",
          art: "3",
          work: "3",
          pe: "3",
          total: "48"
        }),
        [field]: value
      }
    }));
  };  useEffect(() => {
    setLoading(true);
    setGridData(null);

    // Subscribe/read from shared class_timetables/${selectedClass}
    const docRef = doc(db, "class_timetables", selectedClass);
    const unsubscribe = onSnapshot(docRef, async (snapshot) => {
      if (snapshot.exists()) {
        const docData = snapshot.data();
        const selectedClassNameMr = CLASS_NAME_MAP[selectedClass]?.mr || selectedClass;
        const defaultGrid = generateDefaultGrid(selectedClass, selectedClassNameMr);
        
        const hasOldITDefault = docData.rows && docData.rows.some((r: any) => r.friday === "माहिती तंत्रज्ञान");
        const hasWrongRowCount = docData.rows && docData.rows.length !== 14;
        const isOldAcademicYear = docData.academicYear !== "2026-27";
        const hasOldClassName = docData.classNameMr !== selectedClassNameMr;
        
        if (isOldAcademicYear || ((selectedClass === "1st" || selectedClass === "2nd") && (hasOldITDefault || hasWrongRowCount))) {
          setGridData(defaultGrid);
          try {
            await setDoc(docRef, defaultGrid);
          } catch (e) {
            console.error("Auto reset save error:", e);
          }
        } else if (hasOldClassName) {
          const updatedDoc = { ...docData, classNameMr: selectedClassNameMr };
          setGridData(updatedDoc);
          try {
            await setDoc(docRef, updatedDoc);
          } catch (e) {
            console.error("Auto update className error:", e);
          }
        } else {
          setGridData(docData);
        }
        setLoading(false);
      } else {
        // Fallback: Check if there is old teacher-specific data in teacher_edited_timetables
        try {
          if (user) {
            const oldRef = doc(db, "teacher_edited_timetables", `${user.uid}_${selectedClass}`);
            const oldSnap = await getDoc(oldRef);
            if (oldSnap.exists()) {
              setGridData(oldSnap.data());
              setLoading(false);
              return;
            }
          }
        } catch (e) {
          console.error("Fallback load error:", e);
        }
        
        // If neither exists, generate a default ZP timetable template
        const selectedClassNameMr = CLASS_NAME_MAP[selectedClass]?.mr || selectedClass;
        const defaultGrid = generateDefaultGrid(selectedClass, selectedClassNameMr);
        
        // Pre-populate ZP school info from teacher profile lock cached details if available
        const cachedSetup = localStorage.getItem("teacher_module_setup_data");
        if (cachedSetup) {
          try {
            const parsed = JSON.parse(cachedSetup);
            if (parsed.schoolName) defaultGrid.schoolName = parsed.schoolName;
            if (parsed.center) defaultGrid.center = parsed.center;
            if (parsed.taluka) defaultGrid.taluka = parsed.taluka;
            if (parsed.district) defaultGrid.district = parsed.district;
            if (parsed.teacherName) defaultGrid.teacherName = parsed.teacherName;
            if (parsed.headmasterName) defaultGrid.headmasterName = parsed.headmasterName;
          } catch (e) {
            // ignore
          }
        }
        setGridData(defaultGrid);
        setLoading(false);
      }
    }, (error) => {
      console.error("Firestore loading error:", error);
      toast.error("Failed to load timetable");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [selectedClass, user]);

  const handleClassChange = (cls: string) => {
    navigate({
      to: "/teacher/timetable/class",
      search: { class: cls } as any,
    });
  };

  const handleSaveGridOnly = async () => {
    if (!gridData) return;
    setSavingGrid(true);
    try {
      await setDoc(doc(db, "class_timetables", selectedClass), gridData);
      toast.success(lang === "mr" ? "बदल यशस्वीरित्या जतन झाले!" : "Changes saved successfully!");
    } catch (err) {
      console.error("Save error:", err);
      toast.error(lang === "mr" ? "जतन करताना त्रुटी आली." : "Failed to save changes.");
    } finally {
      setSavingGrid(false);
    }
  };

  const handleDownloadPDFDirectly = async () => {
    const element = document.getElementById("editable-timetable-container");
    if (!element) return;
    
    const inputs = element.querySelectorAll('input');
    const tempSpans: { input: HTMLInputElement; span: HTMLSpanElement }[] = [];

    inputs.forEach((input: HTMLInputElement) => {
      const textNode = document.createElement('span');
      textNode.innerText = input.value;
      textNode.className = input.className;
      textNode.style.cssText = input.style.cssText;
      textNode.style.display = 'inline-block';
      textNode.style.textAlign = input.style.textAlign || 'center';
      textNode.style.border = 'none';
      textNode.style.outline = 'none';
      
      const isTableInput = input.closest('table') !== null;
      if (isTableInput) {
        textNode.style.whiteSpace = 'nowrap';
        textNode.style.overflow = 'hidden';
        textNode.style.textOverflow = 'ellipsis';
      } else {
        textNode.style.verticalAlign = 'middle';
        textNode.style.height = 'auto';
      }
      
      input.style.setProperty('display', 'none', 'important');
      input.parentNode?.insertBefore(textNode, input.nextSibling);
      tempSpans.push({ input, span: textNode });
    });

    const opt = {
      margin: 0,
      filename: `${selectedClass}_Timetable.pdf`,
      image: { type: "jpeg", quality: 1.0 },
      html2canvas: {
        scale: 3,
        useCORS: true,
        logging: false,
        letterRendering: true,
        windowWidth: 1050,
        scrollX: 0,
        scrollY: 0
      },
      jsPDF: { unit: "in", format: "a4", orientation: "landscape" },
      pagebreak: { mode: ['css'] }
    };

    toast.success(lang === "mr" ? "PDF तयार होत आहे..." : "Generating PDF...");
    
    const prevZoom = element.style.zoom;
    const prevWebkitZoom = (element.style as any).WebkitZoom;

    try {
      element.style.zoom = '1';
      (element.style as any).WebkitZoom = '1';
      element.style.transform = 'scale(0.90)';
      element.style.transformOrigin = 'top center';
      
      await html2pdf().set(opt).from(element).save();
    } catch (err) {
      console.error("PDF generation error:", err);
      toast.error("Failed to generate PDF");
    } finally {
      element.style.zoom = prevZoom;
      (element.style as any).WebkitZoom = prevWebkitZoom;
      element.style.transform = '';
      element.style.transformOrigin = '';
      tempSpans.forEach(({ input, span }) => {
        input.style.display = '';
        span.parentNode?.removeChild(span);
      });
    }
  };

  const selectedClassNameEn = CLASS_NAME_MAP[selectedClass]?.en || selectedClass;

  return (
    <div className="min-h-screen bg-slate-50/50 font-sans flex flex-col">
      <TeacherHeader />
      <div className="flex flex-1 mt-16">
        <TeacherSidebar />
        <main className="flex-1 lg:pl-64 p-4 md:p-6 space-y-6">

          <div className="bg-white border border-slate-200 rounded-2xl sm:rounded-[2.5rem] p-4 sm:p-6 md:p-8 shadow-sm space-y-6 w-full max-w-full overflow-hidden">
            <div className="flex items-center">
              <Link
                to="/teacher/timetable"
                className="inline-flex items-center gap-1.5 text-xs font-black text-slate-500 hover:text-[#8b5cf6] uppercase tracking-widest transition-colors"
              >
                <ChevronLeft className="size-4" /> Back to Classes / इयत्ता निवडा
              </Link>
            </div>
            <div className="bg-gradient-to-r from-violet-50 to-indigo-50/50 p-4 sm:p-6 rounded-xl sm:rounded-[2rem] border border-indigo-100/50 flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-4 sm:gap-5">
              <div className="size-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md flex-shrink-0">
                <Calendar className="size-7 animate-pulse" />
              </div>
              <div className="space-y-1">
                <h2 className="text-xl font-black text-slate-800">
                  {t.title} (Class {selectedClassNameEn})
                </h2>
                <p className="text-xs font-bold text-slate-500">
                  {lang === "mr" ? "खालील तक्त्यामध्ये बदल करा आणि बदल जतन करा." : "Edit the schedule grid below and save changes."}
                </p>
              </div>
            </div>

            {loading ? (
              <div className="h-96 flex flex-col items-center justify-center text-slate-400 gap-4">
                <Loader2 className="size-12 text-indigo-600 animate-spin" />
                <p className="text-xs font-black uppercase tracking-wider animate-pulse">
                  {lang === "mr" ? "वेळापत्रक लोड होत आहे..." : "Loading timetable..."}
                </p>
              </div>
            ) : gridData ? (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200/60 shadow-sm">
                  <span className="text-xs font-bold text-slate-500 text-center sm:text-left">
                    {lang === "mr" ? "येथे तुम्ही बदल करू शकता आणि बदल जतन करू शकता." : "You can edit cells below and click save."}
                  </span>
                  <div className="flex flex-col min-[480px]:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                    <button
                      onClick={handleSaveGridOnly}
                      disabled={savingGrid}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md active:scale-95 disabled:opacity-50"
                    >
                      {savingGrid ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Save className="size-4" />
                      )}
                      <span>{lang === "mr" ? "बदल जतन करा" : "Save Changes"}</span>
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(lang === "mr" ? "तुम्हाला खात्री आहे की तुम्हाला हे वेळापत्रक मूळ स्वरूपात पुनर्संचयित करायचे आहे? (यामुळे आधीचे सर्व बदल नष्ट होतील)" : "Are you sure you want to reset this timetable to default template? (This will overwrite all existing edits)")) {
                          const selectedClassNameMr = CLASS_NAME_MAP[selectedClass]?.mr || selectedClass;
                          setGridData(generateDefaultGrid(selectedClass, selectedClassNameMr));
                          toast.success(lang === "mr" ? "वेळापत्रक मूळ स्वरूपात आणले गेले आहे. ते जतन करण्यासाठी 'बदल जतन करा' वर क्लिक करा." : "Timetable reset to default. Click 'Save Changes' to commit.");
                        }
                      }}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md active:scale-95"
                    >
                      <span>{lang === "mr" ? "मूळ स्वरूपात आणा" : "Reset to Default"}</span>
                    </button>
                    <button
                      onClick={handleDownloadPDFDirectly}
                      disabled={savingGrid}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md active:scale-95 disabled:opacity-50"
                    >
                      <Download className="size-4" />
                      <span>{lang === "mr" ? "PDF डाउनलोड" : "Download PDF"}</span>
                    </button>
                  </div>
                </div>

                <div className="block lg:hidden text-center text-[11px] font-bold text-indigo-500 animate-pulse pb-1">
                  {lang === "mr" ? "← पूर्ण वेळापत्रक पाहण्यासाठी डावीकडे/उजवीकडे स्क्रोल करा →" : "← Scroll horizontally to view full timetable →"}
                </div>

                <div className="w-full overflow-x-auto pb-4" ref={containerRef}>
                  <div 
                    id="editable-timetable-container" 
                    className="p-4 bg-white text-slate-900 border border-black shadow-sm font-sans space-y-2 w-[1000px] mx-auto overflow-hidden origin-top"
                    style={{
                      ["zoom" as any]: scale,
                      ["WebkitZoom" as any]: scale,
                      transformOrigin: "top center",
                    }}
                  >
                    <div 
                      className="flex items-center justify-between p-2 border border-black rounded-lg"
                      style={{
                        background: "linear-gradient(to right, #00d2ff, #0072ff)"
                      }}
                    >

                      <div className="flex-1 flex justify-center whitespace-nowrap overflow-visible mx-4">
                        <div className="px-6 py-1.5 text-center rounded-lg shadow-sm whitespace-nowrap flex items-center justify-center gap-1" style={{ background: 'linear-gradient(to bottom, #ffffff, #e6f7ff)', border: '1px solid black' }}>
                          <span className="text-sm md:text-base font-black text-slate-800 tracking-wider whitespace-nowrap">
                            वेळापत्रक ( इयत्ता :- <input type="text" value={gridData.classNameMr || selectedClass} onChange={(e) => handleHeaderChange("classNameMr", e.target.value)} style={{ ...cellInputStyle, width: getDynamicWidth(gridData.classNameMr || selectedClass, 5) }} className="font-black text-center text-slate-800 text-sm md:text-base bg-transparent inline-block outline-none" /> )
                          </span>
                        </div>
                      </div>
                      <div className="px-4 py-1.5 text-center rounded-lg whitespace-nowrap flex-shrink-0" style={{ background: 'linear-gradient(to bottom, #ffffff, #e6f7ff)', border: '1px solid black' }}>
                        <span className="text-xs font-black text-slate-800 whitespace-nowrap">
                          सन <input type="text" value={gridData.academicYear} onChange={(e) => handleHeaderChange("academicYear", e.target.value)} style={{ ...cellInputStyle, width: getDynamicWidth(gridData.academicYear, 7) }} className="font-black text-center text-slate-800 text-xs bg-transparent inline-block outline-none" />
                        </span>
                      </div>
                    </div>

                    <div className="border border-black text-[10px] font-bold grid grid-cols-12 bg-white">
                      <div className="col-span-5 flex items-center gap-1 p-1.5 bg-white" style={{ borderRight: '1px solid black' }}>
                        <span>जिल्हा परिषद प्राथमिक शाळा :</span>
                        <input
                          type="text"
                          value={gridData.schoolName}
                          onChange={(e) => handleHeaderChange("schoolName", e.target.value)}
                          style={{ ...cellInputStyle, textAlign: 'left' }}
                          className="flex-1 font-bold text-slate-800 px-1 py-0.5 bg-transparent outline-none"
                        />
                      </div>
                      <div className="col-span-2 flex items-center gap-1 p-1.5" style={{ backgroundColor: '#C6E0B4', borderRight: '1px solid black' }}>
                        <span>केंद्र :-</span>
                        <input
                          type="text"
                          value={gridData.center}
                          onChange={(e) => handleHeaderChange("center", e.target.value)}
                          style={{ ...cellInputStyle, textAlign: 'left' }}
                          className="w-full font-bold text-slate-800 px-1 py-0.5 bg-transparent outline-none"
                        />
                      </div>
                      <div className="col-span-2 flex items-center gap-1 p-1.5" style={{ backgroundColor: '#C6E0B4', borderRight: '1px solid black' }}>
                        <span>तालुका :-</span>
                        <input
                          type="text"
                          value={gridData.taluka}
                          onChange={(e) => handleHeaderChange("taluka", e.target.value)}
                          style={{ ...cellInputStyle, textAlign: 'left' }}
                          className="w-full font-bold text-slate-800 px-1 py-0.5 bg-transparent outline-none"
                        />
                      </div>
                      <div className="col-span-3 flex items-center gap-1 p-1.5" style={{ backgroundColor: '#F2DCDB' }}>
                        <span>जिल्हा :-</span>
                        <input
                          type="text"
                          value={gridData.district}
                          onChange={(e) => handleHeaderChange("district", e.target.value)}
                          style={{ ...cellInputStyle, textAlign: 'left' }}
                          className="w-full font-bold text-slate-800 px-1 py-0.5 bg-transparent outline-none"
                        />
                      </div>
                    </div>

                    <div className="w-full">
                      <table className="w-full text-center" style={{ borderCollapse: 'collapse', border: '1px solid black' }}>
                        <thead>
                          <tr className="text-slate-800 font-bold text-[9px] h-8">
                            <th style={{ backgroundColor: '#C6E0B4', border: '1px solid black', width: '4%' }}>तासिका</th>
                            <th style={{ backgroundColor: '#FFF2CC', border: '1px solid black', width: '8%' }}>वेळ</th>
                            <th style={{ backgroundColor: '#FFF2CC', border: '1px solid black', width: '9%' }}>सोमवार</th>
                            <th style={{ backgroundColor: '#FFF2CC', border: '1px solid black', width: '9%' }}>मंगळवार</th>
                            <th style={{ backgroundColor: '#FFF2CC', border: '1px solid black', width: '9%' }}>बुधवार</th>
                            <th style={{ backgroundColor: '#FFF2CC', border: '1px solid black', width: '9%' }}>गुरुवार</th>
                            
                            <th style={{ backgroundColor: '#C6E0B4', border: '1px solid black', width: '4%' }}>तासिका</th>
                            <th style={{ backgroundColor: '#FFF2CC', border: '1px solid black', width: '8%' }}>वेळ</th>
                            <th style={{ backgroundColor: '#FFF2CC', border: '1px solid black', width: '10%' }}>शुक्रवार</th>
                            
                            <th style={{ backgroundColor: '#C6E0B4', border: '1px solid black', width: '4%' }}>तासिका</th>
                            <th style={{ backgroundColor: '#FFF2CC', border: '1px solid black', width: '8%' }}>वेळ</th>
                            <th style={{ backgroundColor: '#FFF2CC', border: '1px solid black', width: '10%' }}>शनिवार</th>
                          </tr>
                        </thead>
                        <tbody>
                          {gridData.rows && gridData.rows.map((row: any, idx: number) => {
                            const isRecessValue = (val: string) => {
                              if (!val) return false;
                              const clean = val.trim();
                              return clean === "लहान सुट्टी" || clean === "मोठी सुट्टी" || clean === "सफाई" || clean === "परिपाठ";
                            };
                            
                            const getRecessStyle = (val: string) => {
                              if (val.includes("परिपाठ")) return { backgroundColor: '#F2DCDB' };
                              return { backgroundColor: '#C6E0B4' };
                            };

                            const hasMonThu = row.monThuPeriod && row.monThuPeriod.trim() !== "";
                            const monThuPeriodBg = hasMonThu ? "#C6E0B4" : "white";
                            const monThuTimeBg = row.monThuTime && row.monThuTime.trim() !== "" ? "#F2DCDB" : "white";
                            
                            const getMonThuRecessValue = (r: any) => {
                              if (isRecessValue(r.monday)) return r.monday;
                              if (isRecessValue(r.tuesday)) return r.tuesday;
                              if (isRecessValue(r.wednesday)) return r.wednesday;
                              if (isRecessValue(r.thursday)) return r.thursday;
                              return null;
                            };
                            const monThuRecessVal = getMonThuRecessValue(row);
                            const isMonThuRecess = monThuRecessVal !== null;

                            const hasFri = row.friPeriod && row.friPeriod.trim() !== "";
                            const friPeriodBg = hasFri ? "#C6E0B4" : "white";
                            const friTimeBg = row.friTime && row.friTime.trim() !== "" ? "#F2DCDB" : "white";
                            const isFriRecess = isRecessValue(row.friday);

                            const hasSat = row.satPeriod && row.satPeriod.trim() !== "";
                            const satPeriodBg = hasSat ? "#C6E0B4" : "white";
                            const satTimeBg = row.satTime && row.satTime.trim() !== "" ? "#F2DCDB" : "white";
                            const isSatRecess = isRecessValue(row.saturday);

                            return (
                              <tr key={idx} className="text-[9px] h-7">
                                <td className="font-black py-0.5" style={{ backgroundColor: monThuPeriodBg, border: '1px solid black', width: '4%' }}>
                                  <input type="text" value={row.monThuPeriod} onChange={(e) => handleCellChange(idx, "monThuPeriod", e.target.value)} style={cellInputStyle} className="font-black text-[9px] text-center outline-none bg-transparent" />
                                </td>
                                <td className="py-0.5" style={{ backgroundColor: monThuTimeBg, border: '1px solid black', width: '8%' }}>
                                  <input type="text" value={row.monThuTime} onChange={(e) => handleCellChange(idx, "monThuTime", e.target.value)} style={cellInputStyle} className="font-semibold text-[9px] text-[#C00000] text-center outline-none bg-transparent" />
                                </td>
                                {isMonThuRecess ? (
                                  <td className="font-bold text-center py-0.5" style={{ ...getRecessStyle(monThuRecessVal || ""), border: '1px solid black' }} colSpan={4}>
                                    <input type="text" value={monThuRecessVal || ""} onChange={(e) => handleCellChange(idx, "monday", e.target.value)} style={cellInputStyle} className="font-bold text-[9px] text-center outline-none bg-transparent" />
                                  </td>
                                ) : (
                                  <>
                                    <td className="py-0.5 bg-white" style={{ border: '1px solid black', width: '9%' }}><input type="text" value={row.monday} onChange={(e) => handleCellChange(idx, "monday", e.target.value)} style={cellInputStyle} className="font-bold text-[9px] outline-none bg-transparent" /></td>
                                    <td className="py-0.5 bg-white" style={{ border: '1px solid black', width: '9%' }}><input type="text" value={row.tuesday} onChange={(e) => handleCellChange(idx, "tuesday", e.target.value)} style={cellInputStyle} className="font-bold text-[9px] outline-none bg-transparent" /></td>
                                    <td className="py-0.5 bg-white" style={{ border: '1px solid black', width: '9%' }}><input type="text" value={row.wednesday} onChange={(e) => handleCellChange(idx, "wednesday", e.target.value)} style={cellInputStyle} className="font-bold text-[9px] outline-none bg-transparent" /></td>
                                    <td className="py-0.5 bg-white" style={{ border: '1px solid black', width: '9%' }}><input type="text" value={row.thursday} onChange={(e) => handleCellChange(idx, "thursday", e.target.value)} style={cellInputStyle} className="font-bold text-[9px] outline-none bg-transparent" /></td>
                                  </>
                                )}
                                <td className="font-black py-0.5" style={{ backgroundColor: friPeriodBg, border: '1px solid black', width: '4%' }}><input type="text" value={row.friPeriod} onChange={(e) => handleCellChange(idx, "friPeriod", e.target.value)} style={cellInputStyle} className="font-black text-[9px] text-center outline-none bg-transparent" /></td>
                                <td className="py-0.5" style={{ backgroundColor: friTimeBg, border: '1px solid black', width: '8%' }}><input type="text" value={row.friTime} onChange={(e) => handleCellChange(idx, "friTime", e.target.value)} style={cellInputStyle} className="font-semibold text-[9px] text-[#C00000] text-center outline-none bg-transparent" /></td>
                                <td className="py-0.5" style={{ ...(isFriRecess ? getRecessStyle(row.friday) : { backgroundColor: 'white' }), border: '1px solid black', width: '10%' }}><input type="text" value={row.friday} onChange={(e) => handleCellChange(idx, "friday", e.target.value)} style={cellInputStyle} className="font-bold text-[9px] outline-none bg-transparent" /></td>
                                <td className="font-black py-0.5" style={{ backgroundColor: satPeriodBg, border: '1px solid black', width: '4%' }}><input type="text" value={row.satPeriod} onChange={(e) => handleCellChange(idx, "satPeriod", e.target.value)} style={cellInputStyle} className="font-black text-[9px] text-center outline-none bg-transparent" /></td>
                                <td className="py-0.5" style={{ backgroundColor: satTimeBg, border: '1px solid black', width: '8%' }}><input type="text" value={row.satTime} onChange={(e) => handleCellChange(idx, "satTime", e.target.value)} style={cellInputStyle} className="font-semibold text-[9px] text-[#C00000] text-center outline-none bg-transparent" /></td>
                                {idx === 14 ? (
                                  <td className="py-0.5" style={{ backgroundColor: '#FF0000', border: '1px solid black', width: '10%' }}></td>
                                ) : (
                                  <td className="py-0.5" style={{ ...(isSatRecess ? getRecessStyle(row.saturday) : { backgroundColor: 'white' }), border: '1px solid black', width: '10%' }}><input type="text" value={row.saturday} onChange={(e) => handleCellChange(idx, "saturday", e.target.value)} style={cellInputStyle} className="font-bold text-[9px] outline-none bg-transparent" /></td>
                                )}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <div className="grid grid-cols-12 gap-4 items-end pt-2 border-t border-black">
                      <div className="col-span-7 space-y-1.5 text-left">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black text-slate-800 tracking-widest">तासिका विभागणी :</span>
                          <svg viewBox="0 0 100 40" className="w-12 h-5 select-none inline-block align-middle">
                            <path d="M 5,12 L 60,12 L 60,4 L 95,20 L 60,36 L 60,28 L 5,28 Z" fill="#2E75B6" stroke="black" strokeWidth="1.5" />
                          </svg>
                        </div>
                        <table className="text-[9px] text-center w-full" style={{ borderCollapse: 'collapse', border: '1px solid black' }}>
                          <thead>
                            <tr className="font-bold">
                              {(CLASS_SUBJECTS_MAP[selectedClass] || CLASS_SUBJECTS_MAP["8th"]).map((subj) => (
                                <th key={subj.key} style={{ backgroundColor: 'white', border: '1px solid black', padding: '2px 6px' }}>{subj.label}</th>
                              ))}
                              <th style={{ backgroundColor: 'white', border: '1px solid black', padding: '2px 6px' }} className="font-black">एकूण</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr style={{ backgroundColor: '#FFFF00' }}>
                              {(CLASS_SUBJECTS_MAP[selectedClass] || CLASS_SUBJECTS_MAP["8th"]).map((subj) => (
                                <td key={subj.key} style={{ backgroundColor: '#FFFF00', border: '1px solid black', padding: '2px' }}>
                                  <input 
                                    type="text" 
                                    value={gridData.subjectDistribution?.[subj.key] || "0"} 
                                    onChange={(e) => handleSubjectDistChange(subj.key, e.target.value)} 
                                    style={cellInputStyle} 
                                    className="font-bold text-[9px] bg-transparent outline-none" 
                                  />
                                </td>
                              ))}
                              <td style={{ backgroundColor: '#FFFF00', border: '1px solid black', padding: '2px' }} className="font-black">
                                <input type="text" value={gridData.subjectDistribution?.total || "48"} onChange={(e) => handleSubjectDistChange("total", e.target.value)} style={cellInputStyle} className="font-black text-[9px] bg-transparent outline-none" />
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                      <div className="col-span-5 p-3 flex justify-between items-center h-16 rounded-lg" style={{ backgroundColor: '#FCE4D6', border: '1px solid black' }}>
                        <div className="text-center flex-1 flex flex-col justify-between h-full">
                          <input type="text" value={gridData.teacherName} onChange={(e) => handleHeaderChange("teacherName", e.target.value)} style={cellInputStyle} className="font-black text-slate-800 text-[10px] bg-transparent outline-none" />
                          <div className="border-t border-dashed border-black mt-1 pt-1 text-[8px] font-black text-slate-700 text-center uppercase tracking-wider">वर्गशिक्षक</div>
                        </div>
                        <div className="h-full w-px bg-black/20 mx-4" />
                        <div className="text-center flex-1 flex flex-col justify-between h-full">
                          <input type="text" value={gridData.headmasterName} onChange={(e) => handleHeaderChange("headmasterName", e.target.value)} style={cellInputStyle} className="font-black text-slate-800 text-[10px] bg-transparent outline-none" />
                          <div className="border-t border-dashed border-black mt-1 pt-1 text-[8px] font-black text-slate-700 text-center uppercase tracking-wider">मुख्याध्यापक</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-24 text-center border-2 border-dashed border-slate-200 rounded-[2rem] space-y-4 max-w-xl mx-auto my-6 bg-slate-50/50">
                <div className="size-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto">
                  <AlertCircle className="size-8" />
                </div>
                <div className="space-y-2 px-4">
                  <h4 className="text-slate-800 font-extrabold text-lg">
                    {lang === "mr" ? "वेळापत्रक उपलब्ध नाही" : "No timetable available."}
                  </h4>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
