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
  School,
  Check,
  RotateCcw,
  X,
} from "lucide-react";
import { showToast as toast } from "@/lib/custom-toast";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";
import { motion, AnimatePresence } from "framer-motion";
import { uploadBlobToBunny } from "@/lib/bunnyStorage";
import { getUnifiedSchoolProfile } from "@/utils/schoolProfileHelper";
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
    district: "",
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

  // Timetable Edit Mode and School Details Modal states
  const [isEditing, setIsEditing] = useState(false);
  const [isSchoolModalOpen, setIsSchoolModalOpen] = useState(false);
  const [schoolForm, setSchoolForm] = useState({
    schoolName: "",
    center: "",
    taluka: "",
    district: "",
    academicYear: "2026-27",
    teacherName: "",
    headmasterName: "",
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [containerHeight, setContainerHeight] = useState(0);

  // Sync schoolForm whenever gridData changes
  useEffect(() => {
    if (gridData) {
      setSchoolForm({
        schoolName: gridData.schoolName || "",
        center: gridData.center || "",
        taluka: gridData.taluka || "",
        district: gridData.district || "",
        academicYear: gridData.academicYear || "2026-27",
        teacherName: gridData.teacherName || "",
        headmasterName: gridData.headmasterName || "",
      });
    }
  }, [gridData]);

  const handleSaveSchoolDetails = async () => {
    if (!gridData) return;
    const updated = {
      ...gridData,
      schoolName: schoolForm.schoolName,
      center: schoolForm.center,
      taluka: schoolForm.taluka,
      district: schoolForm.district,
      academicYear: schoolForm.academicYear,
      teacherName: schoolForm.teacherName,
      headmasterName: schoolForm.headmasterName,
    };
    setGridData(updated);

    try {
      const cachedSetup = localStorage.getItem("teacher_module_setup_data");
      const parsed = cachedSetup ? JSON.parse(cachedSetup) : {};
      const merged = {
        ...parsed,
        schoolName: schoolForm.schoolName,
        center: schoolForm.center,
        taluka: schoolForm.taluka,
        district: schoolForm.district,
        teacherName: schoolForm.teacherName,
        headmasterName: schoolForm.headmasterName,
        academicYear: schoolForm.academicYear,
      };
      localStorage.setItem("teacher_module_setup_data", JSON.stringify(merged));
    } catch (e) {
      console.warn("Could not save to localStorage:", e);
    }

    if (user) {
      try {
        const targetDocRef = doc(db, "teacher_edited_timetables", `${user.uid}_${selectedClass}`);
        await setDoc(targetDocRef, updated);
      } catch (e) {
        console.warn("Auto-save to firestore error:", e);
      }
    }

    setIsSchoolModalOpen(false);
    toast.success(lang === "mr" ? "शाळेची माहिती यशस्वीरित्या जतन झाली आणि वेळापत्रकात सेट झाली!" : "School details saved and applied to timetable!");
  };

  useEffect(() => {
    const updateDimensions = () => {
      if (!containerRef.current) return;
      const parentWidth = containerRef.current.clientWidth || window.innerWidth;
      const targetWidth = 1000;
      const calculatedScale = parentWidth / targetWidth;
      setScale(calculatedScale < 1 ? calculatedScale : 1);

      const tableEl = document.getElementById("editable-timetable-container");
      if (tableEl) {
        const h = Math.max(tableEl.scrollHeight, tableEl.offsetHeight);
        setContainerHeight(h);
      }
    };

    updateDimensions();

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined" && containerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        updateDimensions();
      });
      resizeObserver.observe(containerRef.current);
      const tableEl = document.getElementById("editable-timetable-container");
      if (tableEl) {
        resizeObserver.observe(tableEl);
      }
    }

    window.addEventListener("resize", updateDimensions);
    window.addEventListener("orientationchange", updateDimensions);
    if ((document as any).fonts && (document as any).fonts.ready) {
      (document as any).fonts.ready.then(updateDimensions);
    }

    const timer1 = setTimeout(updateDimensions, 150);
    const timer2 = setTimeout(updateDimensions, 600);

    return () => {
      if (resizeObserver) resizeObserver.disconnect();
      window.removeEventListener("resize", updateDimensions);
      window.removeEventListener("orientationchange", updateDimensions);
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [gridData, isEditing]);

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
  };

  useEffect(() => {
    setLoading(true);
    setGridData(null);

    const selectedClassNameMr = CLASS_NAME_MAP[selectedClass]?.mr || selectedClass;

    // Load from user-specific document if user is logged in, otherwise fallback to class_timetables
    const targetDocRef = user
      ? doc(db, "teacher_edited_timetables", `${user.uid}_${selectedClass}`)
      : doc(db, "class_timetables", selectedClass);

    const unsubscribe = onSnapshot(targetDocRef, (snapshot) => {
      if (snapshot.exists()) {
        const docData = snapshot.data();
        if (docData && docData.district === "सोलापूर") {
          docData.district = "";
        }

        const defaultGrid = generateDefaultGrid(selectedClass, selectedClassNameMr);
        const hasOldITDefault = docData.rows && docData.rows.some((r: any) => r.friday === "माहिती तंत्रज्ञान");
        const hasWrongRowCount = docData.rows && docData.rows.length !== 14;
        const isOldAcademicYear = docData.academicYear !== "2026-27";
        const hasOldClassName = docData.classNameMr !== selectedClassNameMr;

        if (isOldAcademicYear || ((selectedClass === "1st" || selectedClass === "2nd") && (hasOldITDefault || hasWrongRowCount))) {
          setGridData(defaultGrid);
        } else if (hasOldClassName) {
          const updatedDoc = { ...docData, classNameMr: selectedClassNameMr };
          setGridData(updatedDoc);
        } else {
          setGridData(docData);
        }
        setLoading(false);
      } else {
        // No saved doc exists for this user -> generate a clean default grid with user's own profile info
        const defaultGrid = generateDefaultGrid(selectedClass, selectedClassNameMr);

        // Pre-populate ZP school info from unified profile or cached setup
        const unifiedProfile = getUnifiedSchoolProfile();
        if (unifiedProfile.schoolName) defaultGrid.schoolName = unifiedProfile.schoolName;
        if (unifiedProfile.centerName) defaultGrid.center = unifiedProfile.centerName;
        if (unifiedProfile.taluka) defaultGrid.taluka = unifiedProfile.taluka;
        if (unifiedProfile.district) defaultGrid.district = unifiedProfile.district;
        if (unifiedProfile.teacherName) defaultGrid.teacherName = unifiedProfile.teacherName;
        if (unifiedProfile.headmaster) defaultGrid.headmasterName = unifiedProfile.headmaster;

        const cachedSetup = localStorage.getItem("teacher_module_setup_data");
        if (cachedSetup) {
          try {
            const parsed = JSON.parse(cachedSetup);
            if (!defaultGrid.schoolName && parsed.schoolName) defaultGrid.schoolName = parsed.schoolName;
            if (!defaultGrid.center && parsed.center) defaultGrid.center = parsed.center;
            if (!defaultGrid.taluka && parsed.taluka) defaultGrid.taluka = parsed.taluka;
            if (!defaultGrid.district && parsed.district) defaultGrid.district = parsed.district;
            if (!defaultGrid.teacherName && parsed.teacherName) defaultGrid.teacherName = parsed.teacherName;
            if (!defaultGrid.headmasterName && parsed.headmasterName) defaultGrid.headmasterName = parsed.headmasterName;
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
    if (!user) {
      toast.error(lang === "mr" ? "कृपया बदल जतन करण्यासाठी लॉगिन करा." : "Please login to save changes.");
      return;
    }
    setSavingGrid(true);
    try {
      const targetDocRef = doc(db, "teacher_edited_timetables", `${user.uid}_${selectedClass}`);
      await setDoc(targetDocRef, gridData);
      toast.success(lang === "mr" ? "बदल यशस्वीरित्या तुमच्या अकाऊंटवर जतन झाले!" : "Changes saved successfully to your account!");
    } catch (err) {
      console.error("Save error:", err);
      toast.error(lang === "mr" ? "जतन करताना त्रुटी आली." : "Failed to save changes.");
    } finally {
      setSavingGrid(false);
    }
  };

  // Native Android & Mobile WebView download trigger
  const triggerDeviceDownload = (cdnUrl: string, filename: string, pdfBlob?: Blob) => {
    try {
      const win = window as any;
      if (typeof win.Android?.downloadFile === "function") {
        win.Android.downloadFile(cdnUrl, filename);
        return;
      }
      if (typeof win.AndroidBridge?.downloadFile === "function") {
        win.AndroidBridge.downloadFile(cdnUrl, filename);
        return;
      }
      if (typeof win.flutter_inappwebview?.callHandler === "function") {
        win.flutter_inappwebview.callHandler("downloadFile", cdnUrl, filename);
        return;
      }
      if (typeof win.webkit?.messageHandlers?.downloadFile?.postMessage === "function") {
        win.webkit.messageHandlers.downloadFile.postMessage({ url: cdnUrl, filename });
        return;
      }

      if (pdfBlob) {
        const blobUrl = URL.createObjectURL(pdfBlob);
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = filename;
        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
          if (document.body.contains(link)) document.body.removeChild(link);
          URL.revokeObjectURL(blobUrl);
        }, 3000);
        return;
      }

      if (cdnUrl) {
        const link = document.createElement("a");
        link.href = cdnUrl;
        link.download = filename;
        link.target = "_blank";
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
          if (document.body.contains(link)) document.body.removeChild(link);
        }, 3000);
      }
    } catch (e) {
      console.error("Device download error:", e);
    }
  };

  const handleDownloadPDFDirectly = async () => {
    const element = document.getElementById("editable-timetable-container");
    if (!element) return;

    toast.success(lang === "mr" ? "PDF तयार होत आहे..." : "Generating PDF...");

    let tempWrapper: HTMLDivElement | null = null;
    try {
      // Create an off-screen clone so that the live on-screen view is completely untouched
      const clone = element.cloneNode(true) as HTMLElement;
      clone.id = "timetable-pdf-clone";

      // Match all live input values from original element to clone
      const origInputs = element.querySelectorAll('input');
      const cloneInputs = clone.querySelectorAll('input');
      origInputs.forEach((origInput, idx) => {
        if (cloneInputs[idx]) {
          cloneInputs[idx].value = origInput.value;
        }
      });

      // Replace inputs with spans inside the clone only
      cloneInputs.forEach((input: HTMLInputElement) => {
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

        input.parentNode?.replaceChild(textNode, input);
      });

      // 1. Create a clean off-screen staging container placed at (0, 0)
      // with fixed 1200px desktop width so mobile screens and WebViews render the exact full desktop layout
      const targetWidth = 1200;
      tempWrapper = document.createElement('div');
      tempWrapper.setAttribute('data-pdf-temp', 'true');
      tempWrapper.style.position = 'fixed';
      tempWrapper.style.top = '0px';
      tempWrapper.style.left = '0px';
      tempWrapper.style.width = `${targetWidth}px`;
      tempWrapper.style.minWidth = `${targetWidth}px`;
      tempWrapper.style.maxWidth = `${targetWidth}px`;
      tempWrapper.style.background = '#ffffff';
      tempWrapper.style.zIndex = '99999';
      tempWrapper.style.overflow = 'visible';
      tempWrapper.style.pointerEvents = 'none';
      tempWrapper.style.transform = 'none';
      tempWrapper.style.fontFamily = "'Noto Sans Devanagari', 'Inter', sans-serif";

      // 2. Format clone: clean, compact padding with zero top whitespace, expanded horizontally to fill A4 landscape width
      clone.classList.remove('w-[1000px]', 'min-w-[1000px]', 'mx-auto');
      clone.style.zoom = '1';
      (clone.style as any).WebkitZoom = '1';
      clone.style.width = `${targetWidth}px`;
      clone.style.minWidth = `${targetWidth}px`;
      clone.style.maxWidth = `${targetWidth}px`;
      clone.style.margin = '0';
      clone.style.padding = '8px 12px 12px 12px';
      clone.style.boxSizing = 'border-box';
      clone.style.transform = 'none';
      clone.style.backgroundColor = '#ffffff';

      // Ensure school header and other non-table elements never truncate text in PDF
      clone.querySelectorAll('.truncate, [class*="overflow-hidden"], [class*="text-ellipsis"]').forEach((el: any) => {
        if (!el.closest('table')) {
          el.classList.remove('truncate', 'overflow-hidden', 'text-ellipsis');
          el.style.overflow = 'visible';
          el.style.textOverflow = 'clip';
          el.style.whiteSpace = 'nowrap';
        }
      });

      // Force explicit Flex layouts on clone sections so mobile viewports / CSS Grid never collapse:
      // Section 1: Header Banner (वेळापत्रक & सन)
      const headerBanner = clone.children[0] as HTMLElement;
      if (headerBanner) {
        headerBanner.style.display = 'flex';
        headerBanner.style.flexDirection = 'row';
        headerBanner.style.alignItems = 'center';
        headerBanner.style.justifyContent = 'space-between';
        headerBanner.style.width = '100%';
        headerBanner.style.boxSizing = 'border-box';
        headerBanner.style.background = 'linear-gradient(to right, #00d2ff, #0072ff)';
        headerBanner.style.borderRadius = '8px';
        headerBanner.style.border = '1px solid black';
        headerBanner.style.padding = '8px';

        const bChildren = Array.from(headerBanner.children) as HTMLElement[];
        if (bChildren.length >= 2) {
          bChildren[0].style.flex = '1';
          bChildren[0].style.display = 'flex';
          bChildren[0].style.justifyContent = 'center';
          bChildren[0].style.alignItems = 'center';
          bChildren[0].style.whiteSpace = 'nowrap';
          bChildren[0].style.margin = '0 16px';
          bChildren[1].style.flexShrink = '0';
          bChildren[1].style.whiteSpace = 'nowrap';
        }
      }

      // Section 2: School Details Bar (शाळेचे नाव, केंद्र, तालुका, जिल्हा)
      const schoolBar = clone.children[1] as HTMLElement;
      if (schoolBar) {
        schoolBar.classList.remove('grid', 'grid-cols-12');
        schoolBar.style.display = 'flex';
        schoolBar.style.flexDirection = 'row';
        schoolBar.style.width = '100%';
        schoolBar.style.boxSizing = 'border-box';
        schoolBar.style.border = '1px solid black';
        schoolBar.style.fontWeight = '900';

        const sChildren = Array.from(schoolBar.children) as HTMLElement[];
        if (sChildren.length >= 4) {
          // शाळेचे नाव: 50%
          sChildren[0].style.width = '50%';
          sChildren[0].style.flex = '0 0 50%';
          sChildren[0].style.boxSizing = 'border-box';
          sChildren[0].style.borderRight = '1px solid black';
          sChildren[0].style.display = 'flex';
          sChildren[0].style.alignItems = 'center';
          sChildren[0].style.whiteSpace = 'nowrap';

          // केंद्र: 16.666%
          sChildren[1].style.width = '16.666%';
          sChildren[1].style.flex = '0 0 16.666%';
          sChildren[1].style.boxSizing = 'border-box';
          sChildren[1].style.borderRight = '1px solid black';
          sChildren[1].style.display = 'flex';
          sChildren[1].style.alignItems = 'center';
          sChildren[1].style.backgroundColor = '#C6E0B4';
          sChildren[1].style.whiteSpace = 'nowrap';

          // तालुका: 16.666%
          sChildren[2].style.width = '16.666%';
          sChildren[2].style.flex = '0 0 16.666%';
          sChildren[2].style.boxSizing = 'border-box';
          sChildren[2].style.borderRight = '1px solid black';
          sChildren[2].style.display = 'flex';
          sChildren[2].style.alignItems = 'center';
          sChildren[2].style.backgroundColor = '#C6E0B4';
          sChildren[2].style.whiteSpace = 'nowrap';

          // जिल्हा: 16.668%
          sChildren[3].style.width = '16.668%';
          sChildren[3].style.flex = '0 0 16.668%';
          sChildren[3].style.boxSizing = 'border-box';
          sChildren[3].style.display = 'flex';
          sChildren[3].style.alignItems = 'center';
          sChildren[3].style.backgroundColor = '#F2DCDB';
          sChildren[3].style.whiteSpace = 'nowrap';
        }
      }

      // Section 3: Timetable Table
      const tableWrapper = clone.children[2] as HTMLElement;
      if (tableWrapper) {
        tableWrapper.style.width = '100%';
        const tbl = tableWrapper.querySelector('table');
        if (tbl) {
          tbl.style.width = '100%';
          tbl.style.borderCollapse = 'collapse';
          tbl.style.tableLayout = 'fixed';
        }
      }

      // Section 4: Bottom Bar (तासिका विभागणी & स्वाक्षरी बॉक्स)
      const bottomBar = clone.children[3] as HTMLElement;
      if (bottomBar) {
        bottomBar.classList.remove('grid', 'grid-cols-12');
        bottomBar.style.display = 'flex';
        bottomBar.style.flexDirection = 'row';
        bottomBar.style.alignItems = 'flex-end';
        bottomBar.style.justifyContent = 'space-between';
        bottomBar.style.width = '100%';
        bottomBar.style.boxSizing = 'border-box';
        bottomBar.style.borderTop = '1px solid black';
        bottomBar.style.paddingTop = '8px';

        const bChildren = Array.from(bottomBar.children) as HTMLElement[];
        if (bChildren.length >= 2) {
          // Left: तासिका विभागणी
          bChildren[0].style.width = '58%';
          bChildren[0].style.flex = '0 0 58%';
          bChildren[0].style.boxSizing = 'border-box';
          const subTbl = bChildren[0].querySelector('table');
          if (subTbl) {
            subTbl.style.width = '100%';
            subTbl.style.borderCollapse = 'collapse';
          }

          // Right: स्वाक्षरी Rounded Box
          bChildren[1].style.width = '40%';
          bChildren[1].style.flex = '0 0 40%';
          bChildren[1].style.boxSizing = 'border-box';
          bChildren[1].style.display = 'flex';
          bChildren[1].style.flexDirection = 'row';
          bChildren[1].style.justifyContent = 'space-between';
          bChildren[1].style.alignItems = 'center';
          bChildren[1].style.backgroundColor = '#FCE4D6';
          bChildren[1].style.border = '1px solid black';
          bChildren[1].style.borderRadius = '1.8rem';
          bChildren[1].style.padding = '8px 12px';
        }
      }

      tempWrapper.appendChild(clone);
      document.body.appendChild(tempWrapper);

      // Allow browser / WebView layout and fonts to settle
      if (document.fonts && document.fonts.ready) {
        try {
          await document.fonts.ready;
        } catch (e) {}
      }
      await new Promise((resolve) => setTimeout(resolve, 300));

      // 3. Capture with html2canvas-pro with explicit desktop windowWidth
      let html2canvas: any;
      try {
        const hModule = await import("html2canvas-pro");
        html2canvas = hModule.default || hModule;
      } catch (e) {
        const hModule = await import("html2canvas");
        html2canvas = hModule.default || hModule;
      }

      const cloneHeight = clone.offsetHeight || 800;
      const canvas = await html2canvas(clone, {
        scale: 2.5,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: targetWidth,
        windowWidth: targetWidth,
        windowHeight: cloneHeight,
        scrollX: 0,
        scrollY: 0,
        onclone: (clonedDoc: Document) => {
          try {
            const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'));
            styles.forEach((st) => {
              clonedDoc.head.appendChild(st.cloneNode(true));
            });
          } catch (e) {}
        }
      });

      // 4. Generate 1-page A4 Landscape PDF using jsPDF
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
        compress: true,
      });

      const pageWidth = 297;  // A4 landscape width in mm
      const pageHeight = 210; // A4 landscape height in mm

      // 5mm margins on all sides so timetable has maximum printable area
      const maxContentWidth = pageWidth - 10;   // 287mm
      const maxContentHeight = pageHeight - 10; // 200mm

      const canvasAspect = canvas.width / canvas.height;
      let imgWidth = maxContentWidth;
      let imgHeight = imgWidth / canvasAspect;

      // If the rendered timetable is taller, scale proportionally to fit page height
      if (imgHeight > maxContentHeight) {
        imgHeight = maxContentHeight;
        imgWidth = imgHeight * canvasAspect;
      }

      // Center perfectly on the single A4 Landscape page
      const xOffset = (pageWidth - imgWidth) / 2;
      const yOffset = (pageHeight - imgHeight) / 2;

      const imgData = canvas.toDataURL("image/jpeg", 0.98);
      pdf.addImage(imgData, "JPEG", xOffset, yOffset, imgWidth, imgHeight, undefined, "FAST");

      const downloadFilename = `${selectedClass}_Timetable.pdf`;
      const pdfBlob = pdf.output("blob");

      // Upload to Bunny Storage for persistent CDN URL
      let cdnUrl = "";
      const fileName = `Class_${selectedClass || "Timetable"}_${Date.now()}.pdf`;
      if (pdfBlob) {
        try {
          cdnUrl = await uploadBlobToBunny(`timetables/${fileName}`, pdfBlob);
          console.log("Uploaded Timetable PDF to Bunny Storage:", cdnUrl);
        } catch (uploadErr: any) {
          console.warn("Could not upload Timetable PDF to Bunny Storage:", uploadErr);
        }
      }

      // Check for WebView application bridge or save in browser
      const win = window as any;
      const isWebViewBridge = typeof win.Android?.downloadFile === "function" ||
                              typeof win.AndroidBridge?.downloadFile === "function" ||
                              typeof win.flutter_inappwebview?.callHandler === "function" ||
                              typeof win.webkit?.messageHandlers?.downloadFile?.postMessage === "function";

      if (isWebViewBridge) {
        triggerDeviceDownload(cdnUrl, downloadFilename, pdfBlob);
        toast.success(lang === "mr" ? "PDF यशस्वीरीत्या डाऊनलोड झाली!" : "PDF downloaded successfully!");
      } else {
        pdf.save(downloadFilename);
      }
    } catch (err) {
      console.error("PDF generation error:", err);
      toast.error(lang === "mr" ? "PDF तयार करण्यात त्रुटी आली" : "Failed to generate PDF");
    } finally {
      if (tempWrapper && tempWrapper.parentNode) {
        tempWrapper.parentNode.removeChild(tempWrapper);
      }
    }
  };

      const selectedClassNameEn = CLASS_NAME_MAP[selectedClass]?.en || selectedClass;

  return (
    <div className="min-h-screen bg-slate-50/50 font-sans flex flex-col">
      <TeacherHeader />
      <div className="flex flex-1 mt-16 w-full max-w-full min-w-0 overflow-x-hidden">
        <TeacherSidebar />
        <main className="flex-1 min-w-0 lg:pl-0 p-3 sm:p-4 md:p-6 space-y-6 w-full max-w-full">

          <div className="bg-white border border-slate-200 rounded-2xl p-2.5 sm:p-4 shadow-sm space-y-2.5 w-full max-w-full min-w-0">
            {/* Top Row: Back to classes & Mode status in one compact line */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
              <Link
                to="/teacher/timetable"
                className="inline-flex items-center gap-1 text-[11px] font-black text-slate-500 hover:text-indigo-600 uppercase tracking-wider transition-colors"
              >
                <ChevronLeft className="size-3.5" /> Back to Classes / इयत्ता निवडा
              </Link>

              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-600">
                <div className={`size-2 rounded-full ${isEditing ? "bg-amber-500 animate-ping" : "bg-emerald-500"}`} />
                <span>
                  {isEditing
                    ? (lang === "mr" ? "संपादन मोड चालू" : "Edit Mode Active")
                    : (lang === "mr" ? "पूर्वावलोकन मोड" : "Preview Mode")}
                </span>
              </div>
            </div>

            {loading ? (
              <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-3">
                <Loader2 className="size-8 text-indigo-600 animate-spin" />
                <p className="text-xs font-black uppercase tracking-wider animate-pulse">
                  {lang === "mr" ? "वेळापत्रक लोड होत आहे..." : "Loading timetable..."}
                </p>
              </div>
            ) : gridData ? (
              <div className="space-y-3">
                {/* Short Compact Header & Controls Bar */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 bg-slate-50 p-2 sm:p-2.5 rounded-xl border border-slate-200/80">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="size-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs shrink-0">
                      <Calendar className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-xs sm:text-sm font-black text-slate-800 tracking-tight leading-tight truncate">
                        {t.title} ({selectedClassNameEn})
                      </h2>
                      <p className="text-[10px] text-slate-500 font-medium truncate">
                        {isEditing
                          ? (lang === "mr" ? "तक्त्यातील मजकूर संपादित करा आणि सेव्ह करा." : "Edit cells below and save changes.")
                          : (lang === "mr" ? "बदल करण्यासाठी 'संपादित करा' बटण दाबा." : "Click 'Edit' to change schedule.")}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto justify-start sm:justify-end shrink-0">
                    {/* 1. School Details Button */}
                    <button
                      onClick={() => setIsSchoolModalOpen(true)}
                      className="flex items-center justify-center gap-1 px-2.5 py-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-lg text-[11px] font-black transition-all cursor-pointer shadow-xs active:scale-95"
                      title={lang === "mr" ? "शाळेचे नाव, केंद्र, तालुका, जिल्हा भरा" : "Fill School Details"}
                    >
                      <School className="size-3.5" />
                      <span>{lang === "mr" ? "शाळा माहिती" : "School Details"}</span>
                    </button>

                    {/* 2. Edit Mode Toggle */}
                    {isEditing ? (
                      <>
                        <button
                          onClick={handleSaveGridOnly}
                          disabled={savingGrid}
                          className="flex items-center justify-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-black transition-all cursor-pointer shadow-xs active:scale-95 disabled:opacity-50 ring-1 ring-emerald-400"
                        >
                          {savingGrid ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Save className="size-3.5" />
                          )}
                          <span>{lang === "mr" ? "जतन करा" : "Save"}</span>
                        </button>
                        <button
                          onClick={() => setIsEditing(false)}
                          className="flex items-center justify-center gap-1 px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-[11px] font-bold transition-all cursor-pointer active:scale-95"
                        >
                          <Check className="size-3.5" />
                          <span>{lang === "mr" ? "पूर्ण" : "Done"}</span>
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="flex items-center justify-center gap-1 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[11px] font-black transition-all cursor-pointer shadow-xs active:scale-95"
                      >
                        <Pencil className="size-3.5" />
                        <span>{lang === "mr" ? "संपादित करा" : "Edit Timetable"}</span>
                      </button>
                    )}

                    {/* 3. Reset Button */}
                    <button
                      onClick={() => {
                        if (window.confirm(lang === "mr" ? "तुम्हाला खात्री आहे की तुम्हाला हे वेळापत्रक मूळ स्वरूपात पुनर्संचयित करायचे आहे? (यामुळे आधीचे सर्व बदल नष्ट होतील)" : "Are you sure you want to reset this timetable to default template? (This will overwrite all existing edits)")) {
                          const selectedClassNameMr = CLASS_NAME_MAP[selectedClass]?.mr || selectedClass;
                          const defaultGrid = generateDefaultGrid(selectedClass, selectedClassNameMr);
                          const unifiedProfile = getUnifiedSchoolProfile();
                          if (unifiedProfile.schoolName) defaultGrid.schoolName = unifiedProfile.schoolName;
                          if (unifiedProfile.centerName) defaultGrid.center = unifiedProfile.centerName;
                          if (unifiedProfile.taluka) defaultGrid.taluka = unifiedProfile.taluka;
                          if (unifiedProfile.district) defaultGrid.district = unifiedProfile.district;
                          if (unifiedProfile.teacherName) defaultGrid.teacherName = unifiedProfile.teacherName;
                          if (unifiedProfile.headmaster) defaultGrid.headmasterName = unifiedProfile.headmaster;
                          setGridData(defaultGrid);
                          toast.success(lang === "mr" ? "वेळापत्रक मूळ स्वरूपात आणले गेले आहे. ते जतन करण्यासाठी 'बदल जतन करा' वर क्लिक करा." : "Timetable reset to default. Click 'Save Changes' to commit.");
                        }
                      }}
                      className="flex items-center justify-center size-8 bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-300 rounded-lg transition-all cursor-pointer active:scale-95"
                      title={lang === "mr" ? "मूळ स्वरूपात आणा" : "Reset to Default"}
                    >
                      <RotateCcw className="size-3.5" />
                    </button>

                    {/* 4. PDF Download */}
                    <button
                      onClick={handleDownloadPDFDirectly}
                      disabled={savingGrid}
                      className="flex items-center justify-center gap-1 px-3 py-1.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-lg text-[11px] font-black transition-all cursor-pointer shadow-xs active:scale-95 disabled:opacity-50"
                    >
                      <Download className="size-3.5" />
                      <span>PDF</span>
                    </button>
                  </div>
                </div>

                {/* Main Timetable Table Container - Auto-fit on mobile with zero horizontal scrollbar */}
                <div
                  className="w-full max-w-full min-w-0 overflow-hidden pb-4"
                  ref={containerRef}
                  style={{
                    WebkitOverflowScrolling: 'touch',
                    ...(scale < 1
                      ? {
                          height: containerHeight ? `${containerHeight * scale + 16}px` : 'auto',
                          overflow: 'hidden'
                        }
                      : {})
                  }}
                >
                  <div
                    id="editable-timetable-container"
                    className="p-3 sm:p-4 pt-4 sm:pt-6 bg-white text-slate-900 border border-black shadow-sm font-sans space-y-2.5 sm:space-y-3 w-[1000px] min-w-[1000px] mx-auto overflow-hidden"
                    style={
                      scale < 1
                        ? {
                            transform: `scale(${scale})`,
                            transformOrigin: 'top left',
                            width: '1000px',
                            minWidth: '1000px',
                            fontFamily: "'Noto Sans Devanagari', 'Inter', sans-serif"
                          }
                        : {
                            width: '1000px',
                            minWidth: '1000px',
                            fontFamily: "'Noto Sans Devanagari', 'Inter', sans-serif"
                          }
                    }
                  >
                    <div
                      className="flex items-center justify-between p-2 border border-black rounded-lg"
                      style={{
                        background: "linear-gradient(to right, #00d2ff, #0072ff)"
                      }}
                    >

                      <div className="flex-1 flex justify-center whitespace-nowrap overflow-visible mx-4">
                        <div className="px-6 py-1.5 text-center rounded-lg shadow-sm whitespace-nowrap flex items-center justify-center gap-1" style={{ background: 'linear-gradient(to bottom, #ffffff, #e6f7ff)', border: '1px solid black' }}>
                          <span className="text-[16px] font-black text-black tracking-wider whitespace-nowrap" style={{ fontWeight: 900 }}>
                            वेळापत्रक ( इयत्ता :- {isEditing ? (
                              <input
                                type="text"
                                value={gridData.classNameMr || selectedClass}
                                onChange={(e) => handleHeaderChange("classNameMr", e.target.value)}
                                style={{ ...cellInputStyle, width: getDynamicWidth(gridData.classNameMr || selectedClass, 5), fontSize: '16px' }}
                                className="font-black text-center text-slate-800 text-[16px] bg-amber-50/70 border-b border-amber-400 inline-block outline-none"
                              />
                            ) : (
                              <span className="font-black text-slate-800 underline decoration-indigo-400 decoration-2 text-[16px]">
                                {gridData.classNameMr || selectedClass}
                              </span>
                            )} )
                          </span>
                        </div>
                      </div>
                      <div className="px-4 py-1.5 text-center rounded-lg whitespace-nowrap flex-shrink-0" style={{ background: 'linear-gradient(to bottom, #ffffff, #e6f7ff)', border: '1px solid black' }}>
                        <span className="text-[13.5px] font-black text-black whitespace-nowrap" style={{ fontWeight: 900 }}>
                          सन {isEditing ? (
                            <input
                              type="text"
                              value={gridData.academicYear}
                              onChange={(e) => handleHeaderChange("academicYear", e.target.value)}
                              style={{ ...cellInputStyle, width: getDynamicWidth(gridData.academicYear, 7), fontSize: '13.5px' }}
                              className="font-black text-center text-slate-800 text-[13.5px] bg-amber-50/70 border-b border-amber-400 inline-block outline-none"
                            />
                          ) : (
                            <span className="font-black text-slate-800 text-[13.5px]">
                              {gridData.academicYear}
                            </span>
                          )}
                        </span>
                      </div>
                    </div>

                    {/* School Details Header Bar */}
                    <div className="border border-black text-[12.5px] font-black grid grid-cols-12 bg-white" style={{ fontWeight: 900 }}>
                      <div className="col-span-6 flex items-center gap-1.5 p-1.5 bg-white whitespace-nowrap overflow-visible" style={{ borderRight: '1px solid black' }}>
                        <span className="whitespace-nowrap flex-shrink-0 font-black text-black text-[12.5px]" style={{ fontWeight: 900 }}>शाळेचे नाव :</span>
                        {isEditing ? (
                          <input
                            type="text"
                            value={gridData.schoolName}
                            onChange={(e) => handleHeaderChange("schoolName", e.target.value)}
                            style={{ ...cellInputStyle, textAlign: 'left', fontWeight: 900, fontSize: '13px' }}
                            className="flex-1 font-black text-black px-1 py-0.5 bg-amber-50/80 border border-amber-300 rounded-xs outline-none min-w-0 text-[13px]"
                            placeholder="शाळेचे नाव टाका"
                          />
                        ) : (
                          <span
                            onClick={() => setIsSchoolModalOpen(true)}
                            className="font-black text-black px-1 py-0.5 whitespace-nowrap text-[13px] cursor-pointer hover:text-indigo-600 transition-colors"
                            style={{ fontWeight: 900 }}
                            title="शाळेची माहिती बदलण्यासाठी येथे क्लिक करा"
                          >
                            {gridData.schoolName || "जिल्हा परिषद प्राथमिक शाळा"}
                          </span>
                        )}
                      </div>
                      <div className="col-span-2 flex items-center gap-1.5 p-1.5 whitespace-nowrap overflow-hidden" style={{ backgroundColor: '#C6E0B4', borderRight: '1px solid black' }}>
                        <span className="whitespace-nowrap flex-shrink-0 font-black text-black text-[12px]" style={{ fontWeight: 900 }}>केंद्र :-</span>
                        {isEditing ? (
                          <input
                            type="text"
                            value={gridData.center}
                            onChange={(e) => handleHeaderChange("center", e.target.value)}
                            style={{ ...cellInputStyle, textAlign: 'left', fontWeight: 900, fontSize: '12.5px' }}
                            className="flex-1 font-black text-black px-1 py-0.5 bg-amber-50/80 border border-amber-300 rounded-xs outline-none min-w-0 text-[12.5px]"
                            placeholder="केंद्र"
                          />
                        ) : (
                          <span
                            onClick={() => setIsSchoolModalOpen(true)}
                            className="font-black text-black px-1 py-0.5 truncate text-[12.5px] cursor-pointer hover:text-indigo-600 transition-colors"
                            style={{ fontWeight: 900 }}
                            title="शाळेची माहिती बदलण्यासाठी येथे क्लिक करा"
                          >
                            {gridData.center || "-"}
                          </span>
                        )}
                      </div>
                      <div className="col-span-2 flex items-center gap-1.5 p-1.5 whitespace-nowrap overflow-hidden" style={{ backgroundColor: '#C6E0B4', borderRight: '1px solid black' }}>
                        <span className="whitespace-nowrap flex-shrink-0 font-black text-black text-[12px]" style={{ fontWeight: 900 }}>तालुका :-</span>
                        {isEditing ? (
                          <input
                            type="text"
                            value={gridData.taluka}
                            onChange={(e) => handleHeaderChange("taluka", e.target.value)}
                            style={{ ...cellInputStyle, textAlign: 'left', fontWeight: 900, fontSize: '12.5px' }}
                            className="flex-1 font-black text-black px-1 py-0.5 bg-amber-50/80 border border-amber-300 rounded-xs outline-none min-w-0 text-[12.5px]"
                            placeholder="तालुका"
                          />
                        ) : (
                          <span
                            onClick={() => setIsSchoolModalOpen(true)}
                            className="font-black text-black px-1 py-0.5 truncate text-[12.5px] cursor-pointer hover:text-indigo-600 transition-colors"
                            style={{ fontWeight: 900 }}
                            title="शाळेची माहिती बदलण्यासाठी येथे क्लिक करा"
                          >
                            {gridData.taluka || "-"}
                          </span>
                        )}
                      </div>
                      <div className="col-span-2 flex items-center gap-1.5 p-1.5 whitespace-nowrap overflow-hidden" style={{ backgroundColor: '#F2DCDB' }}>
                        <span className="whitespace-nowrap flex-shrink-0 font-black text-black text-[12px]" style={{ fontWeight: 900 }}>जिल्हा :-</span>
                        {isEditing ? (
                          <input
                            type="text"
                            value={gridData.district}
                            onChange={(e) => handleHeaderChange("district", e.target.value)}
                            style={{ ...cellInputStyle, textAlign: 'left', fontWeight: 900, fontSize: '12.5px' }}
                            className="flex-1 font-black text-black px-1 py-0.5 bg-amber-50/80 border border-amber-300 rounded-xs outline-none min-w-0 text-[12.5px]"
                            placeholder="जिल्हा"
                          />
                        ) : (
                          <span
                            onClick={() => setIsSchoolModalOpen(true)}
                            className="font-black text-black px-1 py-0.5 truncate text-[12.5px] cursor-pointer hover:text-indigo-600 transition-colors"
                            style={{ fontWeight: 900 }}
                            title="शाळेची माहिती बदलण्यासाठी येथे क्लिक करा"
                          >
                            {gridData.district || "-"}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="w-full">
                      <table className="w-full text-center" style={{ borderCollapse: 'collapse', border: '1px solid black' }}>
                        <thead>
                          <tr className="text-black font-black text-[12px] h-8">
                            <th style={{ backgroundColor: '#C6E0B4', border: '1px solid black', width: '4%', textAlign: 'center', fontWeight: 900 }} className="font-black text-black text-[12px]">तासिका</th>
                            <th style={{ backgroundColor: '#FFF2CC', border: '1px solid black', width: '8%', textAlign: 'center', fontWeight: 900 }} className="font-black text-black text-[12px]">वेळ</th>
                            <th style={{ backgroundColor: '#FFF2CC', border: '1px solid black', width: '9%', textAlign: 'center', fontWeight: 900 }} className="font-black text-black text-[12px]">सोमवार</th>
                            <th style={{ backgroundColor: '#FFF2CC', border: '1px solid black', width: '9%', textAlign: 'center', fontWeight: 900 }} className="font-black text-black text-[12px]">मंगळवार</th>
                            <th style={{ backgroundColor: '#FFF2CC', border: '1px solid black', width: '9%', textAlign: 'center', fontWeight: 900 }} className="font-black text-black text-[12px]">बुधवार</th>
                            <th style={{ backgroundColor: '#FFF2CC', border: '1px solid black', width: '9%', textAlign: 'center', fontWeight: 900 }} className="font-black text-black text-[12px]">गुरुवार</th>

                            <th style={{ backgroundColor: '#C6E0B4', border: '1px solid black', width: '4%', textAlign: 'center', fontWeight: 900 }} className="font-black text-black text-[12px]">तासिका</th>
                            <th style={{ backgroundColor: '#FFF2CC', border: '1px solid black', width: '8%', textAlign: 'center', fontWeight: 900 }} className="font-black text-black text-[12px]">वेळ</th>
                            <th style={{ backgroundColor: '#FFF2CC', border: '1px solid black', width: '10%', textAlign: 'center', fontWeight: 900 }} className="font-black text-black text-[12px]">शुक्रवार</th>

                            <th style={{ backgroundColor: '#C6E0B4', border: '1px solid black', width: '4%', textAlign: 'center', fontWeight: 900 }} className="font-black text-black text-[12px]">तासिका</th>
                            <th style={{ backgroundColor: '#FFF2CC', border: '1px solid black', width: '8%', textAlign: 'center', fontWeight: 900 }} className="font-black text-black text-[12px]">वेळ</th>
                            <th style={{ backgroundColor: '#FFF2CC', border: '1px solid black', width: '10%', textAlign: 'center', fontWeight: 900 }} className="font-black text-black text-[12px]">शनिवार</th>
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
                              <tr key={idx} className="text-[12px] h-7 font-black text-black" style={{ fontWeight: 900 }}>
                                <td className="font-black py-0.5 text-black" style={{ backgroundColor: monThuPeriodBg, border: '1px solid black', width: '4%', fontWeight: 900 }}>
                                  {isEditing ? (
                                    <input type="text" value={row.monThuPeriod} onChange={(e) => handleCellChange(idx, "monThuPeriod", e.target.value)} style={{ ...cellInputStyle, fontWeight: 900, fontSize: '11px' }} className="font-black text-[11px] text-black text-center outline-none bg-amber-50/50 hover:bg-amber-100/70 focus:bg-white rounded-xs" />
                                  ) : (
                                    <span style={{ fontWeight: 900 }} className="font-black text-[11px] text-black text-center block w-full">{row.monThuPeriod}</span>
                                  )}
                                </td>
                                <td className="py-0.5" style={{ backgroundColor: monThuTimeBg, border: '1px solid black', width: '8%', fontWeight: 900 }}>
                                  {isEditing ? (
                                    <input type="text" value={row.monThuTime} onChange={(e) => handleCellChange(idx, "monThuTime", e.target.value)} style={{ ...cellInputStyle, fontWeight: 900, fontSize: '11.5px' }} className="font-black text-[11.5px] text-[#C00000] text-center outline-none bg-amber-50/50 hover:bg-amber-100/70 focus:bg-white rounded-xs" />
                                  ) : (
                                    <span style={{ fontWeight: 900 }} className="font-black text-[11.5px] text-[#C00000] text-center block w-full whitespace-nowrap">{row.monThuTime}</span>
                                  )}
                                </td>
                                {isMonThuRecess ? (
                                  <td className="font-black text-center py-0.5 text-black text-[12.5px]" style={{ ...getRecessStyle(monThuRecessVal || ""), border: '1px solid black', fontWeight: 900 }} colSpan={4}>
                                    {isEditing ? (
                                      <input type="text" value={monThuRecessVal || ""} onChange={(e) => handleCellChange(idx, "monday", e.target.value)} style={{ ...cellInputStyle, fontWeight: 900, fontSize: '12.5px' }} className="font-black text-[12.5px] text-black text-center outline-none bg-amber-50/50 hover:bg-amber-100/70 focus:bg-white rounded-xs" />
                                    ) : (
                                      <span style={{ fontWeight: 900 }} className="font-black text-[12.5px] text-black text-center block w-full">{monThuRecessVal || ""}</span>
                                    )}
                                  </td>
                                ) : (
                                  <>
                                    <td className="py-0.5 bg-white font-black text-black" style={{ border: '1px solid black', width: '9%', fontWeight: 900 }}>
                                      {isEditing ? (
                                        <input type="text" value={row.monday} onChange={(e) => handleCellChange(idx, "monday", e.target.value)} style={{ ...cellInputStyle, fontWeight: 900, fontSize: '12.5px' }} className="font-black text-[12.5px] text-black text-center outline-none bg-amber-50/50 hover:bg-amber-100/70 focus:bg-white rounded-xs" />
                                      ) : (
                                        <span style={{ fontWeight: 900 }} className="font-black text-[12.5px] text-black text-center block w-full truncate">{row.monday}</span>
                                      )}
                                    </td>
                                    <td className="py-0.5 bg-white font-black text-black" style={{ border: '1px solid black', width: '9%', fontWeight: 900 }}>
                                      {isEditing ? (
                                        <input type="text" value={row.tuesday} onChange={(e) => handleCellChange(idx, "tuesday", e.target.value)} style={{ ...cellInputStyle, fontWeight: 900, fontSize: '12.5px' }} className="font-black text-[12.5px] text-black text-center outline-none bg-amber-50/50 hover:bg-amber-100/70 focus:bg-white rounded-xs" />
                                      ) : (
                                        <span style={{ fontWeight: 900 }} className="font-black text-[12.5px] text-black text-center block w-full truncate">{row.tuesday}</span>
                                      )}
                                    </td>
                                    <td className="py-0.5 bg-white font-black text-black" style={{ border: '1px solid black', width: '9%', fontWeight: 900 }}>
                                      {isEditing ? (
                                        <input type="text" value={row.wednesday} onChange={(e) => handleCellChange(idx, "wednesday", e.target.value)} style={{ ...cellInputStyle, fontWeight: 900, fontSize: '12.5px' }} className="font-black text-[12.5px] text-black text-center outline-none bg-amber-50/50 hover:bg-amber-100/70 focus:bg-white rounded-xs" />
                                      ) : (
                                        <span style={{ fontWeight: 900 }} className="font-black text-[12.5px] text-black text-center block w-full truncate">{row.wednesday}</span>
                                      )}
                                    </td>
                                    <td className="py-0.5 bg-white font-black text-black" style={{ border: '1px solid black', width: '9%', fontWeight: 900 }}>
                                      {isEditing ? (
                                        <input type="text" value={row.thursday} onChange={(e) => handleCellChange(idx, "thursday", e.target.value)} style={{ ...cellInputStyle, fontWeight: 900, fontSize: '12.5px' }} className="font-black text-[12.5px] text-black text-center outline-none bg-amber-50/50 hover:bg-amber-100/70 focus:bg-white rounded-xs" />
                                      ) : (
                                        <span style={{ fontWeight: 900 }} className="font-black text-[12.5px] text-black text-center block w-full truncate">{row.thursday}</span>
                                      )}
                                    </td>
                                  </>
                                )}
                                <td className="font-black py-0.5 text-black" style={{ backgroundColor: friPeriodBg, border: '1px solid black', width: '4%', fontWeight: 900 }}>
                                  {isEditing ? (
                                    <input type="text" value={row.friPeriod} onChange={(e) => handleCellChange(idx, "friPeriod", e.target.value)} style={{ ...cellInputStyle, fontWeight: 900, fontSize: '11px' }} className="font-black text-[11px] text-black text-center outline-none bg-amber-50/50 hover:bg-amber-100/70 focus:bg-white rounded-xs" />
                                  ) : (
                                    <span style={{ fontWeight: 900 }} className="font-black text-[11px] text-black text-center block w-full">{row.friPeriod}</span>
                                  )}
                                </td>
                                <td className="py-0.5" style={{ backgroundColor: friTimeBg, border: '1px solid black', width: '8%', fontWeight: 900 }}>
                                  {isEditing ? (
                                    <input type="text" value={row.friTime} onChange={(e) => handleCellChange(idx, "friTime", e.target.value)} style={{ ...cellInputStyle, fontWeight: 900, fontSize: '11.5px' }} className="font-black text-[11.5px] text-[#C00000] text-center outline-none bg-amber-50/50 hover:bg-amber-100/70 focus:bg-white rounded-xs" />
                                  ) : (
                                    <span style={{ fontWeight: 900 }} className="font-black text-[11.5px] text-[#C00000] text-center block w-full whitespace-nowrap">{row.friTime}</span>
                                  )}
                                </td>
                                <td className="py-0.5 font-black text-black" style={{ ...(isFriRecess ? getRecessStyle(row.friday) : { backgroundColor: 'white' }), border: '1px solid black', width: '10%', fontWeight: 900 }}>
                                  {isEditing ? (
                                    <input type="text" value={row.friday} onChange={(e) => handleCellChange(idx, "friday", e.target.value)} style={{ ...cellInputStyle, fontWeight: 900, fontSize: '12.5px' }} className="font-black text-[12.5px] text-black text-center outline-none bg-amber-50/50 hover:bg-amber-100/70 focus:bg-white rounded-xs" />
                                  ) : (
                                    <span style={{ fontWeight: 900 }} className="font-black text-[12.5px] text-black text-center block w-full truncate">{row.friday}</span>
                                  )}
                                </td>
                                <td className="font-black py-0.5 text-black" style={{ backgroundColor: satPeriodBg, border: '1px solid black', width: '4%', fontWeight: 900 }}>
                                  {isEditing ? (
                                    <input type="text" value={row.satPeriod} onChange={(e) => handleCellChange(idx, "satPeriod", e.target.value)} style={{ ...cellInputStyle, fontWeight: 900, fontSize: '11px' }} className="font-black text-[11px] text-black text-center outline-none bg-amber-50/50 hover:bg-amber-100/70 focus:bg-white rounded-xs" />
                                  ) : (
                                    <span style={{ fontWeight: 900 }} className="font-black text-[11px] text-black text-center block w-full">{row.satPeriod}</span>
                                  )}
                                </td>
                                <td className="py-0.5" style={{ backgroundColor: satTimeBg, border: '1px solid black', width: '8%', fontWeight: 900 }}>
                                  {isEditing ? (
                                    <input type="text" value={row.satTime} onChange={(e) => handleCellChange(idx, "satTime", e.target.value)} style={{ ...cellInputStyle, fontWeight: 900, fontSize: '11.5px' }} className="font-black text-[11.5px] text-[#C00000] text-center outline-none bg-amber-50/50 hover:bg-amber-100/70 focus:bg-white rounded-xs" />
                                  ) : (
                                    <span style={{ fontWeight: 900 }} className="font-black text-[11.5px] text-[#C00000] text-center block w-full whitespace-nowrap">{row.satTime}</span>
                                  )}
                                </td>
                                {idx === 14 ? (
                                  <td className="py-0.5" style={{ backgroundColor: '#FF0000', border: '1px solid black', width: '10%' }}></td>
                                ) : (
                                  <td className="py-0.5 font-black text-black" style={{ ...(isSatRecess ? getRecessStyle(row.saturday) : { backgroundColor: 'white' }), border: '1px solid black', width: '10%', fontWeight: 900 }}>
                                    {isEditing ? (
                                      <input type="text" value={row.saturday} onChange={(e) => handleCellChange(idx, "saturday", e.target.value)} style={{ ...cellInputStyle, fontWeight: 900, fontSize: '12.5px' }} className="font-black text-[12.5px] text-black text-center outline-none bg-amber-50/50 hover:bg-amber-100/70 focus:bg-white rounded-xs" />
                                    ) : (
                                      <span style={{ fontWeight: 900 }} className="font-black text-[12.5px] text-black text-center block w-full truncate">{row.saturday}</span>
                                    )}
                                  </td>
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
                          <span className="text-[12px] font-black text-black tracking-widest" style={{ fontWeight: 900 }}>तासिका विभागणी :</span>
                          <svg viewBox="0 0 100 40" className="w-12 h-5 select-none inline-block align-middle">
                            <path d="M 5,12 L 60,12 L 60,4 L 95,20 L 60,36 L 60,28 L 5,28 Z" fill="#2E75B6" stroke="black" strokeWidth="1.5" />
                          </svg>
                        </div>
                        <table className="text-[11.5px] text-center w-full" style={{ borderCollapse: 'collapse', border: '1px solid black' }}>
                          <thead>
                            <tr className="font-black text-black" style={{ fontWeight: 900 }}>
                              {(CLASS_SUBJECTS_MAP[selectedClass] || CLASS_SUBJECTS_MAP["8th"]).map((subj) => (
                                <th key={subj.key} style={{ backgroundColor: 'white', border: '1px solid black', padding: '2px 6px', textAlign: 'center', fontWeight: 900 }} className="font-black text-black text-[11.5px]">{subj.label}</th>
                              ))}
                              <th style={{ backgroundColor: 'white', border: '1px solid black', padding: '2px 6px', textAlign: 'center', fontWeight: 900 }} className="font-black text-black text-[11.5px]">एकूण</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr style={{ backgroundColor: '#FFFF00', fontWeight: 900 }} className="font-black text-black">
                              {(CLASS_SUBJECTS_MAP[selectedClass] || CLASS_SUBJECTS_MAP["8th"]).map((subj) => (
                                <td key={subj.key} style={{ backgroundColor: '#FFFF00', border: '1px solid black', padding: '2px', fontWeight: 900 }} className="font-black text-black">
                                  {isEditing ? (
                                    <input
                                      type="text"
                                      value={gridData.subjectDistribution?.[subj.key] || "0"}
                                      onChange={(e) => handleSubjectDistChange(subj.key, e.target.value)}
                                      style={{ ...cellInputStyle, fontWeight: 900, fontSize: '12px' }}
                                      className="font-black text-[12px] text-black text-center bg-amber-50/70 border border-amber-300 rounded-xs outline-none"
                                    />
                                  ) : (
                                    <span style={{ fontWeight: 900 }} className="font-black text-[12px] text-black text-center block w-full">{gridData.subjectDistribution?.[subj.key] || "0"}</span>
                                  )}
                                </td>
                              ))}
                              <td style={{ backgroundColor: '#FFFF00', border: '1px solid black', padding: '2px', fontWeight: 900 }} className="font-black text-black">
                                {isEditing ? (
                                  <input type="text" value={gridData.subjectDistribution?.total || "48"} onChange={(e) => handleSubjectDistChange("total", e.target.value)} style={{ ...cellInputStyle, fontWeight: 900, fontSize: '12px' }} className="font-black text-[12px] text-black text-center bg-amber-50/70 border border-amber-300 rounded-xs outline-none" />
                                ) : (
                                  <span style={{ fontWeight: 900 }} className="font-black text-[12px] text-black text-center block w-full">{gridData.subjectDistribution?.total || "48"}</span>
                                )}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                      <div className="col-span-5 p-3 flex justify-between items-center h-16 rounded-[1.8rem]" style={{ backgroundColor: '#FCE4D6', border: '1px solid black' }}>
                        <div className="text-center flex-1 flex flex-col justify-between h-full px-2 overflow-hidden">
                          {isEditing ? (
                            <input type="text" value={gridData.teacherName} onChange={(e) => handleHeaderChange("teacherName", e.target.value)} style={{ ...cellInputStyle, fontSize: '12px', fontWeight: 900 }} className="font-black text-black text-center bg-amber-50/70 border border-amber-300 rounded-xs outline-none w-full" />
                          ) : (
                            <div style={{ fontWeight: 900 }} className="font-black text-black text-center text-[12px] truncate">{gridData.teacherName || "वर्गशिक्षक"}</div>
                          )}
                          <div style={{ fontWeight: 900 }} className="border-t border-dashed border-black mt-1 pt-1 text-[10.5px] font-black text-black text-center uppercase tracking-wider">वर्गशिक्षकाचे नाव व स्वाक्षरी</div>
                        </div>
                        <div className="h-full w-px bg-black/20 mx-4" />
                        <div className="text-center flex-1 flex flex-col justify-between h-full px-2 overflow-hidden">
                          {isEditing ? (
                            <input type="text" value={gridData.headmasterName} onChange={(e) => handleHeaderChange("headmasterName", e.target.value)} style={{ ...cellInputStyle, fontSize: '12px', fontWeight: 900 }} className="font-black text-black text-center bg-amber-50/70 border border-amber-300 rounded-xs outline-none w-full" />
                          ) : (
                            <div style={{ fontWeight: 900 }} className="font-black text-black text-center text-[12px] truncate">{gridData.headmasterName || "मुख्याध्यापक"}</div>
                          )}
                          <div style={{ fontWeight: 900 }} className="border-t border-dashed border-black mt-1 pt-1 text-[10.5px] font-black text-black text-center uppercase tracking-wider">मुख्याध्यापकांचे नाव व स्वाक्षरी</div>
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

          {/* School Details Dedicated Modal Dialog */}
          <AnimatePresence>
            {isSchoolModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-sm">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 15 }}
                  className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
                >
                  {/* Modal Header */}
                  <div className="px-5 py-4 bg-gradient-to-r from-violet-600 via-indigo-600 to-indigo-700 text-white flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-xs">
                        <School className="size-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-black">
                          {lang === "mr" ? "शाळेची माहिती भरा (School Details)" : "Fill School Details"}
                        </h3>
                        <p className="text-[11px] text-violet-100 font-medium">
                          {lang === "mr" ? "ही माहिती वेळापत्रकात आपोआप आणि योग्य जागी सेट होईल." : "This information fits directly into your timetable."}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setIsSchoolModalOpen(false)}
                      className="size-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <X className="size-4" />
                    </button>
                  </div>

                  {/* Modal Body Form */}
                  <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1 text-left">
                    {/* School Name */}
                    <div>
                      <label className="block text-xs font-black text-slate-700 mb-1">
                        {lang === "mr" ? "शाळेचे नाव (School Name) *" : "School Name *"}
                      </label>
                      <input
                        type="text"
                        value={schoolForm.schoolName}
                        onChange={(e) => setSchoolForm({ ...schoolForm, schoolName: e.target.value })}
                        placeholder={lang === "mr" ? "उदा. जि. प. प्राथमिक शाळा..." : "e.g. Z.P. Primary School..."}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* Center */}
                      <div>
                        <label className="block text-xs font-black text-slate-700 mb-1">
                          {lang === "mr" ? "केंद्र (Center)" : "Center"}
                        </label>
                        <input
                          type="text"
                          value={schoolForm.center}
                          onChange={(e) => setSchoolForm({ ...schoolForm, center: e.target.value })}
                          placeholder={lang === "mr" ? "उदा. नरसिंगपूर" : "Center"}
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                        />
                      </div>

                      {/* Taluka */}
                      <div>
                        <label className="block text-xs font-black text-slate-700 mb-1">
                          {lang === "mr" ? "तालुका (Taluka)" : "Taluka"}
                        </label>
                        <input
                          type="text"
                          value={schoolForm.taluka}
                          onChange={(e) => setSchoolForm({ ...schoolForm, taluka: e.target.value })}
                          placeholder={lang === "mr" ? "उदा. तासगाव" : "Taluka"}
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                        />
                      </div>

                      {/* District */}
                      <div>
                        <label className="block text-xs font-black text-slate-700 mb-1">
                          {lang === "mr" ? "जिल्हा (District)" : "District"}
                        </label>
                        <input
                          type="text"
                          value={schoolForm.district}
                          onChange={(e) => setSchoolForm({ ...schoolForm, district: e.target.value })}
                          placeholder={lang === "mr" ? "उदा. सांगली" : "District"}
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* Academic Year */}
                      <div>
                        <label className="block text-xs font-black text-slate-700 mb-1">
                          {lang === "mr" ? "शैक्षणिक वर्ष (Year)" : "Academic Year"}
                        </label>
                        <input
                          type="text"
                          value={schoolForm.academicYear}
                          onChange={(e) => setSchoolForm({ ...schoolForm, academicYear: e.target.value })}
                          placeholder="2026-27"
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                        />
                      </div>

                      {/* Class Teacher */}
                      <div>
                        <label className="block text-xs font-black text-slate-700 mb-1">
                          {lang === "mr" ? "वर्गशिक्षक नाव" : "Class Teacher"}
                        </label>
                        <input
                          type="text"
                          value={schoolForm.teacherName}
                          onChange={(e) => setSchoolForm({ ...schoolForm, teacherName: e.target.value })}
                          placeholder={lang === "mr" ? "उदा. वर्गशिक्षक" : "Teacher Name"}
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                        />
                      </div>

                      {/* Headmaster */}
                      <div>
                        <label className="block text-xs font-black text-slate-700 mb-1">
                          {lang === "mr" ? "मुख्याध्यापक नाव" : "Headmaster"}
                        </label>
                        <input
                          type="text"
                          value={schoolForm.headmasterName}
                          onChange={(e) => setSchoolForm({ ...schoolForm, headmasterName: e.target.value })}
                          placeholder={lang === "mr" ? "उदा. मुख्याध्यापक" : "Headmaster"}
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Modal Footer */}
                  <div className="px-5 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
                    <button
                      onClick={() => setIsSchoolModalOpen(false)}
                      className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all cursor-pointer"
                    >
                      {lang === "mr" ? "रद्द करा" : "Cancel"}
                    </button>
                    <button
                      onClick={handleSaveSchoolDetails}
                      className="px-5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-md flex items-center gap-1.5 active:scale-95"
                    >
                      <Save className="size-4" />
                      <span>{lang === "mr" ? "जतन करा आणि वेळापत्रकात जोडा" : "Save & Apply to Timetable"}</span>
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
