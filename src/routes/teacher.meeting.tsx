import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { showToast as toast } from "@/lib/custom-toast";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";
import { db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  getDoc,
  getDocs,
  setDoc,
} from "firebase/firestore";
import { TeacherHeader } from "@/components/teacher/TeacherHeader";
import { TeacherSidebar } from "@/components/teacher/TeacherSidebar";
import { PinGate } from "@/components/teacher/PinGate";
import {
  Users,
  Calendar,
  Clock,
  Plus,
  Trash2,
  Printer,
  FileText,
  Shield,
  UserCheck,
  X,
  Sparkles,
  Globe,
  Info,
  ClipboardList,
  CheckCircle2,
  ArrowRight,
  Edit2,
  Save,
  Download,
  UserPlus,
  ArrowLeft,
  ChevronUp,
  ChevronDown,
} from "lucide-react";

export const Route = createFileRoute("/teacher/meeting")({
  validateSearch: (
    search: Record<string, unknown>,
  ): {
    committeeId?: string;
    meetingId?: string;
    tab?: "form" | "history";
    edit?: boolean;
  } => ({
    committeeId: search.committeeId as string | undefined,
    meetingId: search.meetingId as string | undefined,
    tab: search.tab as "form" | "history" | undefined,
    edit: search.edit === "true" || search.edit === true || undefined,
  }),
  component: TeacherMeetingPage,
});

interface Committee {
  id: string;
  name: string;
  description: string;
  icon: any;
  defaultMembers: { name: string; post: string; role: string }[];
}

const COMMITTEES: Committee[] = [
  {
    id: "smc",
    name: "शाळा व्यवस्थापन समिती (SMC)",
    description:
      "शाळेच्या दैनंदिन कामकाजावर आणि विकासावर नियंत्रण ठेवणारी समिती.",
    icon: Shield,
    defaultMembers: [],
  },
  {
    id: "safety",
    name: "विद्यार्थी सुरक्षा व भौतिक सुविधा विकास समिती",
    description:
      "विद्यार्थ्यांच्या सुरक्षिततेसाठी आणि शाळेतील पायाभूत सुविधांच्या विकासासाठी समिती.",
    icon: UserCheck,
    defaultMembers: [],
  },
  {
    id: "women",
    name: "महिला तक्रार निवारण समिती",
    description:
      "शाळेतील महिला शिक्षक व विद्यार्थिनींच्या तक्रारींचे निवारण करणारी समिती.",
    icon: Users,
    defaultMembers: [],
  },
  {
    id: "sakhi",
    name: "सखी सावित्री समिती",
    description:
      "मुलींच्या गळतीचे प्रमाण रोखणे, उपस्थिती वाढवणे आणि सक्षमीकरणासाठी समिती.",
    icon: Sparkles,
    defaultMembers: [],
  },
  {
    id: "eco",
    name: "इको क्लब (Eco Club)",
    description:
      "शाळेत पर्यावरण पूरक उपक्रम राबवून विद्यार्थ्यांमध्ये पर्यावरण जाणीव जागृती करणे.",
    icon: Globe,
    defaultMembers: [],
  },
  {
    id: "alumni",
    name: "माजी विद्यार्थी संघ",
    description:
      "शाळेच्या प्रगतीमध्ये आणि विकासामध्ये माजी विद्यार्थ्यांचे योगदान मिळवणे.",
    icon: ClipboardList,
    defaultMembers: [],
  },
];

const MOCK_NAMES = [
  // SMC
  "श्री. रमेश तांबे", "सौ. सुनीता पाटील", "श्री. संजय कदम", "सौ. विद्या जोशी", "श्री. अनिल गायकवाड", "सौ. मीना शेलार",
  // Safety
  "श्री. बाबासाहेब तुकाराम कोले", "सौ. पुनम नंदकुमार जाधव", "श्री. विशाल विष्णू खाडे", "सौ. कविता हरिभाऊ जाधव",
  "श्री. नारायण बाळकृष्ण जाधव", "सौ. आशाराणी प्रविण जाधव", "श्री. राजाराम सुखदेव हातेकर", "सौ. चित्राताई नारायण जाधव",
  "श्री. पांडुरंग दिनकर जाधव", "श्री. युवराज धोंडीराम जाधव", "श्री. मंगलसिंग भगवान जाधव", "श्री. शंकर वसंत कोकरे",
  "श्री. अमोल नारायण केंगार", "श्री. बाबासाहेब रामकिशन केंद्रे",
  // Women
  "सौ. पुनम जाधव", "सौ. आशा जाधव",
  // Sakhi Savitri
  "सौ. सुलोचना कदम", "सौ. संगीता कोळी", "कु. अनुष्का माने",
  // Eco Club
  "श्री. विशाल खाडे", "श्री. सचिन गुरव", "कु. वेदांत कदम", "कु. संस्कृती कदम",
  // Alumni
  "श्री. युवराज जाधव", "श्री. पांडुरंग जाधव", "सौ. स्वाती थोरात"
];

const cleanMeetingMembers = (meeting: any) => {
  if (!meeting) return null;
  const cleaned = { ...meeting };
  if (cleaned.members) {
    cleaned.members = cleaned.members.filter((m: any) => {
      if (!m || !m.name) return false;
      return !MOCK_NAMES.includes(m.name.trim());
    });
  }
  return cleaned;
};

const SAKHI_SAVITRI_DESIGNATIONS = [
  "शाळेचे मुख्याध्यापक",
  "शाळा व्यवस्थापन समिती (SMC) अध्यक्ष",
  "ग्रामपंचायतीच्या महिला प्रतिनिधी / सरपंच ",
  "महिला शिक्षक प्रतिनिधी",
  "अंगणवाडी सेविका",
  "आरोग्य सेविका ",
  "पोलीस पाटील ",
  "समुपदेशक ",
  "पालक प्रतिनिधी माता ",
  "पालक प्रतिनिधी पिता ",
  "विद्यार्थी प्रतिनिधी मुलगा",
  "विद्यार्थी प्रतिनिधी मुलगी",
  "ज्येष्ठ महिला शिक्षक ",
];

const SMC_DESIGNATIONS = [
  "पालक प्रतिनिधी",
  "स्थानिक प्राधिकरण प्रतिनिधी",
  "शिक्षक प्रतिनिधी",
  "शिक्षण तज्ज्ञ",
  "महिला आरक्षण",
  "मुख्याध्यापक",
  "महिला प्रतिनिधी",
  "विद्यार्थी प्रतिनिधी",
  "विद्यार्थिनी प्रतिनिधी",
];

const SAFETY_DESIGNATIONS = [
  "सरपंच",
  "नगरसेवक",
  "स्थानिक प्राधिकरणाचे निवडून आलेले प्रतिनिधी",
  "शाळेच्या शिक्षकांमधून निवडलेला शिक्षक",
  "स्थानिक शिक्षणतज्ज्ञ",
  "बालविकास तज्ज्ञ",
  "समुपदेशक",
  "आरोग्य सेविका",
  "आशा सेविका",
  "अंगणवाडी सेविका",
  "ग्रामसेवक",
  "पोलीस पाटील",
  "डॉक्टर",
  "वकील",
  "माजी विद्यार्थी",
  "पालक प्रतिनिधी",
  "व्यावसायिक क्षेत्रातील व्यक्ती",
  "मुख्याध्यापक",
  "प्रभारी मुख्याध्यापक",
  "केंद्र प्रमुख",
  "विस्तार अधिकारी",
]; const ALUMNI_DESIGNATIONS = [
  "माजी विद्यार्थी",
  "मुख्याध्यापक",
  "शिक्षक",
  "अध्यापक",
  "प्राचार्य प्रतिनिधी",
  "पालक प्रतिनिधी",
  "सेवानिवृत्त अधिकारी",
  "सेवानिवृत्त शिक्षक",
  "माजी विद्यार्थी संघ",
]; const ECO_CLUB_DESIGNATIONS = [
  "मुख्याध्यापक",
  "शिक्षक",
  "विद्यार्थी",
  "शाळा व्यवस्थापन समितीचे प्रतिनिधी",
  "ग्रामपंचायत सदस्य",
  "वन विभाग",
  "कृषी विभागाचे अधिकारी",
  "स्थानिक पर्यावरणप्रेमी",
  "स्वयंसेवी संस्थांचे प्रतिनिधी",
  "इको क्लब",
];

const WOMEN_COMPLAINT_DESIGNATIONS = [
  "वरिष्ठ महिला कर्मचारी",
  "वरिष्ठ महिला शिक्षिका",
  "शिक्षक",
  "कर्मचारी प्रतिनिधी",
  "सामाजिक कार्यकर्त्या",
  "महिला वकील",
  "महिला हक्क क्षेत्रातील अनुभवी व्यक्ती",
];

const COMMITTEE_ROLES = [
  "अध्यक्ष",
  "उपाध्यक्ष",
  "सदस्य",
  "सदस्य सचिव",
  "सचिव",
];

const getCommitteeDesignations = (committeeId: string) => {
  switch (committeeId) {
    case "smc":
      return SMC_DESIGNATIONS;
    case "safety":
      return SAFETY_DESIGNATIONS;
    case "women":
      return WOMEN_COMPLAINT_DESIGNATIONS;
    case "sakhi":
      return SAKHI_SAVITRI_DESIGNATIONS;
    case "eco":
      return ECO_CLUB_DESIGNATIONS;
    case "alumni":
      return ALUMNI_DESIGNATIONS;
    default:
      return [];
  }
};

const ACADEMIC_MONTHS = [
  { id: "06", name: "जून", english: "June" },
  { id: "07", name: "जुलै", english: "July" },
  { id: "08", name: "ऑगस्ट", english: "August" },
  { id: "09", name: "सप्टेंबर", english: "September" },
  { id: "10", name: "ऑक्टोबर", english: "October" },
  { id: "11", name: "नोव्हेंबर", english: "November" },
  { id: "12", name: "डिसेंबर", english: "December" },
  { id: "01", name: "जानेवारी", english: "January" },
  { id: "02", name: "फेब्रुवारी", english: "February" },
  { id: "03", name: "मार्च", english: "March" },
  { id: "04", name: "एप्रिल", english: "April" },
  { id: "05", name: "मे", english: "May" }
];

const ALUMNI_MEETINGS = [
  { id: "sem1", name: "प्रथम सत्र बैठक", english: "First Semester" },
  { id: "sem2", name: "द्वितीय सत्र बैठक", english: "Second Semester" }
];

function TeacherMeetingPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const { lang } = useLanguage();
  const navigate = useNavigate({ from: Route.fullPath });
  const search = Route.useSearch();

  // Helper to dynamically calculate the current academic year based on current date
  const getCurrentAcademicYear = () => {
    const now = new Date();
    const realMonth = now.getMonth() + 1; // 1-12
    const realYear = now.getFullYear();
    let startYear = realYear;
    if (realMonth < 6) {
      startYear = realYear - 1;
    }
    const endYear = startYear + 1;

    const toMarathiDigits = (strOrNum: string | number) => {
      const marathiDigits: Record<string, string> = {
        "0": "०", "1": "१", "2": "२", "3": "३", "4": "४", "5": "५", "6": "६", "7": "७", "8": "८", "9": "९"
      };
      return strOrNum
        .toString()
        .split("")
        .map((d) => marathiDigits[d] || d)
        .join("");
    };

    const startStr = toMarathiDigits(startYear);
    const endStr = toMarathiDigits((endYear % 100).toString().padStart(2, "0"));
    return `${startStr}-${endStr}`;
  };

  // Helper to dynamically calculate the calendar year based on selected academic year and selected month
  const getCalendarYear = (academicYearStr: string, monthVal: string) => {
    if (!academicYearStr) return new Date().getFullYear();
    const marathiToEnglish: Record<string, string> = {
      "०": "0", "१": "1", "२": "2", "३": "3", "४": "4", "५": "5", "६": "6", "७": "7", "८": "8", "९": "9"
    };
    const englishYearStr = academicYearStr.split("").map(c => marathiToEnglish[c] || c).join("");
    const parts = englishYearStr.split("-");
    const startYear = parseInt(parts[0]);
    if (isNaN(startYear)) return new Date().getFullYear();

    if (monthVal === "sem1" || monthVal === "sem2") return startYear;

    const monthNum = parseInt(monthVal);
    if (monthNum >= 6 && monthNum <= 12) {
      return startYear;
    } else {
      return startYear + 1;
    }
  };

  // Helper to get the current month as a 2-digit string (e.g. "06", "01")
  const getCurrentMonth = () => {
    const now = new Date();
    const month = now.getMonth() + 1; // 1-12
    return month.toString().padStart(2, "0");
  };

  const currentMonth = getCurrentMonth();

  const udise =
    profile?.udise ||
    (typeof window !== "undefined"
      ? localStorage.getItem("teacher_udise")
      : null) ||
    "default";

  useEffect(() => {
    if (!authLoading) {
      if (sessionStorage.getItem("is_super_admin")) {
        // Allow
      } else if (!user || profile?.role !== "teacher") {
        navigate({
          to: "/login",
          search: { redirect: "/teacher/meeting", role: "teacher" } as any,
        });
      }
    }
  }, [user, profile, authLoading, navigate]);

  // Sidebar committee selection (null by default to show card list first)
  const [selectedCommittee, setSelectedCommittee] = useState<Committee | null>(
    null,
  );

  // Tab control: 'form' or 'history'
  const [activeTab, setActiveTab] = useState<"form" | "history">("form");
  const [formStep, setFormStep] = useState<1 | 2>(1);

  // Form State
  const [schoolName, setSchoolName] = useState("");
  const [headmasterName, setHeadmasterName] = useState("");
  const [presidentName, setPresidentName] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [academicYear, setAcademicYear] = useState("");
  const [meetingNumber, setMeetingNumber] = useState("१");
  const [formMembers, setFormMembers] = useState<any[]>(
    Array.from({ length: 10 }, () => ({ name: "", post: "", role: "" })),
  );

  const ensureTenMembers = (members: any[] | undefined | null) => {
    const base = members && members.length > 0 ? members : [];
    const padding = Math.max(0, 10 - base.length);
    return [...base, ...Array.from({ length: padding }, () => ({ name: "", post: "", role: "" }))];
  };
  const [formResolutions, setFormResolutions] = useState<any[]>([]);
  const [committeeName, setCommitteeName] = useState("");
  const [formOutroText, setFormOutroText] = useState("ऐन वेळेस उपस्थित होणाऱ्या विषयांवर चर्चा करून समितीचे सचिव यांनी सभेत उपस्थित सर्व सदस्यांचे आभार व्यक्त केले व अध्यक्ष यांच्या संमतीने सभा संपन्न झाली असे घोषीत केले.");
  const [customIntroText, setCustomIntroText] = useState("");
  const [isIntroEdited, setIsIntroEdited] = useState(false);

  // Auto-generate introductory text if it hasn't been manually edited
  useEffect(() => {
    if (!isIntroEdited) {
      const formattedDate = meetingDate ? meetingDate.split("-").reverse().join(".") : "________";
      const text = `आज दि. ${formattedDate} रोजी ${schoolName || "________"} येथे ${committeeName || selectedCommittee?.name || "________"} चे अध्यक्ष ${presidentName || formMembers.find((m: any) => m.role === "अध्यक्ष")?.name || "________"} यांच्या अध्यक्षतेखाली सभा घेण्यात आली. सदर सभेस खालील प्रमाणे सदस्य उपस्थित होते.`;
      setCustomIntroText(text);
    }
  }, [meetingDate, schoolName, committeeName, selectedCommittee, presidentName, formMembers, isIntroEdited]);

  // Saved Meetings List State
  const [savedMeetings, setSavedMeetings] = useState<any[]>([]);
  const [selectedPastMeeting, setSelectedPastMeeting] = useState<any | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [hasSavedProfile, setHasSavedProfile] = useState(false);

  // Month, template loading, and cumulative resolution states
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [loadingTemplate, setLoadingTemplate] = useState<boolean>(false);
  const [startResolutionNo, setStartResolutionNo] = useState<number>(1);

  // Custom template states for non-current months
  const [showCustomForm, setShowCustomForm] = useState<boolean>(false);
  const [savingCustomTemplate, setSavingCustomTemplate] = useState<boolean>(false);

  // Template cache states for instant loading
  const [cachedAdminTemplates, setCachedAdminTemplates] = useState<Record<string, any>>({});
  const [cachedCustomTemplates, setCachedCustomTemplates] = useState<Record<string, any>>({});
  const [isTemplatesLoading, setIsTemplatesLoading] = useState<boolean>(false);

  // Edit Mode States
  const isEditing = search.edit === true;
  const [editSchoolName, setEditSchoolName] = useState("");
  const [editHeadmasterName, setEditHeadmasterName] = useState("");
  const [editPresidentName, setEditPresidentName] = useState("");
  const [editMeetingDate, setEditMeetingDate] = useState("");
  const [editAcademicYear, setEditAcademicYear] = useState("");
  const [editMeetingNumber, setEditMeetingNumber] = useState("");
  const [editMembers, setEditMembers] = useState<any[]>(
    Array.from({ length: 10 }, () => ({ name: "", post: "", role: "" })),
  );
  const [editResolutions, setEditResolutions] = useState<any[]>([]);
  const [editCommitteeName, setEditCommitteeName] = useState("");
  const [editIntroText, setEditIntroText] = useState("");
  const [editOutroText, setEditOutroText] = useState("");

  // Sync search parameters to local states
  useEffect(() => {
    // 1. Sync selected committee
    if (search.committeeId) {
      if (selectedCommittee?.id !== search.committeeId) {
        const foundComm = COMMITTEES.find((c) => c.id === search.committeeId);
        if (foundComm) {
          setSelectedCommittee(foundComm);
        }
      }
    } else {
      if (selectedCommittee !== null) {
        setSelectedCommittee(null);
      }
    }

    // 2. Sync tab selection
    if (search.tab) {
      if (activeTab !== search.tab) {
        setActiveTab(search.tab);
      }
    } else {
      if (activeTab !== "form") {
        setActiveTab("form");
      }
    }

    // 3. Sync selected past meeting
    if (search.meetingId) {
      if (selectedPastMeeting?.id !== search.meetingId) {
        const foundMeeting = savedMeetings.find(
          (m) => m.id === search.meetingId,
        );
        if (foundMeeting) {
          setSelectedPastMeeting(foundMeeting);
        }
      }
    } else {
      if (selectedPastMeeting !== null) {
        setSelectedPastMeeting(null);
      }
    }
  }, [search.committeeId, search.meetingId, search.tab, savedMeetings]);

  // Prefill form with previous meeting details or default committee members when tab, committee, or meetings list length changes
  useEffect(() => {
    if (activeTab === "form" && selectedCommittee) {
      setAcademicYear(getCurrentAcademicYear());

      const loadProfile = async () => {
        try {
          if (savedMeetings.length > 0) {
            const prevMeeting = savedMeetings[0];

            setSchoolName(prevMeeting.schoolName || profile?.schoolName || "");
            setHeadmasterName(prevMeeting.headmasterName || profile?.fullName || "");
            setPresidentName(prevMeeting.presidentName || "");
            setCommitteeName(prevMeeting.committeeName || selectedCommittee.name);

            const prevNum = parseInt(prevMeeting.meetingNumber || "");
            if (!isNaN(prevNum)) {
              setMeetingNumber((prevNum + 1).toString());
            } else {
              setMeetingNumber("");
            }

            // Check if prevMeeting.members matches selectedCommittee.defaultMembers
            const isDefaultMock = selectedCommittee.defaultMembers &&
              prevMeeting.members &&
              prevMeeting.members.length === selectedCommittee.defaultMembers.length &&
              prevMeeting.members.every((m: any, idx: number) => {
                const dm = selectedCommittee.defaultMembers[idx];
                return m.name === dm.name && m.post === dm.post && m.role === dm.role;
              });

            if (isDefaultMock) {
              setFormMembers(ensureTenMembers([]));
            } else {
              setFormMembers(
                ensureTenMembers(
                  prevMeeting.members && prevMeeting.members.length > 0
                    ? JSON.parse(JSON.stringify(prevMeeting.members))
                    : []
                )
              );
            }

            const profileDoc = await getDoc(doc(db, "teacher_committee_profiles", `${udise}_${selectedCommittee.id}`));
            setHasSavedProfile(profileDoc.exists());
          } else {
            const profileDoc = await getDoc(doc(db, "teacher_committee_profiles", `${udise}_${selectedCommittee.id}`));
            if (profileDoc.exists()) {
              const data = profileDoc.data();
              setSchoolName(data.schoolName || profile?.schoolName || "");
              setHeadmasterName(data.headmasterName || profile?.fullName || "");
              setPresidentName(data.presidentName || "");
              setCommitteeName(data.committeeName || selectedCommittee.name);
              setFormMembers(ensureTenMembers(data.formMembers));
              setHasSavedProfile(true);
            } else {
              setHasSavedProfile(false);
              setSchoolName("");
              setHeadmasterName("");
              setPresidentName("");
              setMeetingNumber("१");
              setFormMembers(
                ensureTenMembers(
                  selectedCommittee.defaultMembers && selectedCommittee.defaultMembers.length > 0
                    ? JSON.parse(JSON.stringify(selectedCommittee.defaultMembers))
                    : []
                )
              );
              setCommitteeName(selectedCommittee.name);
            }
          }
        } catch (error) {
          console.error("Error loading committee profile / previous meeting:", error);
        }
      };

      loadProfile();

      setMeetingDate("");
      setFormResolutions([]);
      setSelectedMonth("");
      setStartResolutionNo(1);
      setFormStep(1);
      setMeetingNumber("१");
    } else if (!selectedCommittee) {
      setFormMembers(Array.from({ length: 10 }, () => ({ name: "", post: "", role: "" })));
      setFormResolutions([]);
      setCommitteeName("");
      setSelectedMonth("");
      setStartResolutionNo(1);
      setFormStep(1);
    }
  }, [activeTab, selectedCommittee?.id, savedMeetings.length, profile, udise]);

  // Sync saved meetings from Firestore
  useEffect(() => {
    if (!selectedCommittee) return;
    const q = query(
      collection(db, "monthly_meetings"),
      where("udise", "==", udise),
      where("committeeId", "==", selectedCommittee.id),
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => {
        const meeting = {
          id: doc.id,
          ...doc.data(),
        } as any;
        return cleanMeetingMembers(meeting);
      }) as any[];

      // Sort meetings in memory by createdAt descending to avoid composite index requirement
      data.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });

      setSavedMeetings(data);
    });

    return () => unsubscribe();
  }, [selectedCommittee?.id, udise]);

  // Cache all templates (admin and teacher custom) for the selected committee to enable instant month switching
  useEffect(() => {
    if (!selectedCommittee) {
      setCachedAdminTemplates({});
      setCachedCustomTemplates({});
      return;
    }

    const cacheAllTemplates = async () => {
      setIsTemplatesLoading(true);
      try {
        // 1. Fetch and cache admin meeting templates
        const adminQ = query(
          collection(db, "meeting_templates"),
          where("committeeId", "==", selectedCommittee.id)
        );
        const adminSnapshot = await getDocs(adminQ);
        const adminMap: Record<string, any> = {};
        adminSnapshot.docs.forEach((doc) => {
          const data = doc.data();
          adminMap[data.month] = { id: doc.id, ...data };
        });
        setCachedAdminTemplates(adminMap);

        // 2. Fetch and cache teacher custom templates
        const customQ = query(
          collection(db, "teacher_custom_templates"),
          where("udise", "==", udise),
          where("committeeId", "==", selectedCommittee.id)
        );
        const customSnapshot = await getDocs(customQ);
        const customMap: Record<string, any> = {};
        customSnapshot.docs.forEach((doc) => {
          const data = doc.data();
          customMap[data.month] = { id: doc.id, ...data };
        });
        setCachedCustomTemplates(customMap);
      } catch (err) {
        console.error("Error caching meeting templates:", err);
      } finally {
        setIsTemplatesLoading(false);
      }
    };

    cacheAllTemplates();
  }, [selectedCommittee?.id, udise]);

  // Switch committee
  useEffect(() => {
    if (!selectedCommittee) return;
    setSelectedPastMeeting(null);
    setIsIntroEdited(false);
  }, [selectedCommittee]);

  // Sync edit states when entering edit mode or selecting a past meeting
  useEffect(() => {
    if (selectedPastMeeting && isEditing) {
      setEditSchoolName(selectedPastMeeting.schoolName || "");
      setEditHeadmasterName(selectedPastMeeting.headmasterName || "");
      setEditPresidentName(selectedPastMeeting.presidentName || "");
      setEditMeetingDate(selectedPastMeeting.date || "");
      setEditAcademicYear(selectedPastMeeting.academicYear || "२०२५-२६");
      setEditMeetingNumber(selectedPastMeeting.meetingNumber || "");
      setEditMembers(
        selectedPastMeeting.members && selectedPastMeeting.members.length > 0
          ? JSON.parse(JSON.stringify(selectedPastMeeting.members))
          : []
      );
      setEditResolutions(selectedPastMeeting.resolutions || []);
      setEditCommitteeName(selectedPastMeeting.committeeName || "");

      const formattedDate = selectedPastMeeting.date
        ? selectedPastMeeting.date.split("-").reverse().join(".")
        : "________";
      const defaultIntro =
        selectedPastMeeting.introText ||
        `आज दि. ${formattedDate} रोजी ${selectedPastMeeting.schoolName || "________"} येथे ${selectedPastMeeting.committeeName || "________"} चे अध्यक्ष ${selectedPastMeeting.presidentName || "________"} यांच्या अध्यक्षतेखाली सभा घेण्यात आली. सदर सभेस खालील प्रमाणे सदस्य उपस्थित होते.`;
      setEditIntroText(defaultIntro);

      const defaultOutro =
        selectedPastMeeting.outroText ||
        "ऐन वेळेस उपस्थित होणाऱ्या विषयांवर चर्चा करून समितीचे सचिव यांनी सभेत उपस्थित सर्व सदस्यांचे आभार व्यक्त केले व अध्यक्ष यांच्या संमतीने सभा संपन्न झाली असे घोषीत केले.";
      setEditOutroText(defaultOutro);
    }
  }, [selectedPastMeeting, isEditing]);

  // Members edit action handlers
  const handleAddMemberRow = () => {
    setEditMembers([
      ...editMembers,
      { name: "", post: "", role: "" },
    ]);
  };

  const handleUpdateMemberField = (
    index: number,
    field: string,
    value: string,
  ) => {
    const updated = [...editMembers];
    updated[index] = { ...updated[index], [field]: value };
    setEditMembers(updated);
  };

  const handleRemoveMemberRow = (index: number) => {
    const updated = editMembers.filter((_, i) => i !== index);
    setEditMembers(updated);
  };

  // Resolutions edit action handlers
  const handleAddResolutionRow = () => {
    const nextSubjectNo = editResolutions.length + 1;
    const currentMaxNo =
      editResolutions.length > 0
        ? Math.max(...editResolutions.map((r) => Number(r.resolutionNo) || 0))
        : 34;
    const nextResolutionNo = currentMaxNo + 1;

    setEditResolutions([
      ...editResolutions,
      {
        subjectNo: nextSubjectNo,
        resolutionNo: nextResolutionNo,
        subject: "",
        discussion: "",
        resolution: "",
        remark: "",
        proposer: "",
        seconder: "",
        statusText: "ठराव सर्वानुमते मंजूर करण्यात आला.",
      },
    ]);
  };

  const handleUpdateResolutionField = (
    index: number,
    field: string,
    value: any,
  ) => {
    const updated = [...editResolutions];
    updated[index] = { ...updated[index], [field]: value };
    setEditResolutions(updated);
  };

  const handleRemoveResolutionRow = (index: number) => {
    const updated = editResolutions
      .filter((_, i) => i !== index)
      .map((res, i) => ({
        ...res,
        subjectNo: i + 1,
      }));
    setEditResolutions(updated);
  };

  // formMembers edit action handlers
  const handleAddFormMemberRow = () => {
    setFormMembers([
      ...formMembers,
      { name: "", post: "", role: "" },
    ]);
  };

  const handleUpdateFormMemberField = (
    index: number,
    field: string,
    value: any,
  ) => {
    setFormMembers((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleRemoveFormMemberRow = (index: number) => {
    const updated = formMembers.filter((_: any, i: number) => i !== index);
    setFormMembers(updated);
  };

  const handleSaveCommitteeProfile = async () => {
    if (!selectedCommittee) return;
    setIsSavingProfile(true);
    try {
      await setDoc(doc(db, "teacher_committee_profiles", `${udise}_${selectedCommittee.id}`), {
        schoolName,
        headmasterName,
        presidentName,
        committeeName,
        formMembers,
        updatedAt: new Date().toISOString()
      });
      setHasSavedProfile(true);
      toast.success("समितीची माहिती कायमस्वरूपी सेव्ह करण्यात आली!");
    } catch (error) {
      console.error("Error saving committee profile:", error);
      toast.error("समिती माहिती सेव्ह करताना त्रुटी आली.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  // formResolutions edit action handlers
  const handleAddFormResolutionRow = () => {
    const nextSubjectNo = formResolutions.length + 1;
    let nextResolutionNo = startResolutionNo + formResolutions.length;

    if (formResolutions.length > 0) {
      const maxResNo = Math.max(
        ...formResolutions.map((r: any) => Number(r.resolutionNo) || 0)
      );
      if (maxResNo >= nextResolutionNo) {
        nextResolutionNo = maxResNo + 1;
      }
    }

    setFormResolutions([
      ...formResolutions,
      {
        subjectNo: nextSubjectNo,
        resolutionNo: nextResolutionNo,
        subject: "",
        discussion: "",
        resolution: "",
        remark: "",
        proposer: "",
        seconder: "",
        statusText: "ठराव सर्वानुमते मंजूर करण्यात आला.",
      },
    ]);
  };

  const handleUpdateFormResolutionField = (
    index: number,
    field: string,
    value: any,
  ) => {
    const updated = [...formResolutions];
    updated[index] = { ...updated[index], [field]: value };
    setFormResolutions(updated);
  };

  const handleRemoveFormResolutionRow = (index: number) => {
    const updated = formResolutions
      .filter((_, i) => i !== index)
      .map((res, i) => ({
        ...res,
        subjectNo: i + 1,
        resolutionNo: startResolutionNo + i,
      }));
    setFormResolutions(updated);
  };

  const moveFormMember = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex >= 0 && targetIndex < formMembers.length) {
      const updated = [...formMembers];
      const temp = updated[index];
      updated[index] = updated[targetIndex];
      updated[targetIndex] = temp;
      setFormMembers(updated);
    }
  };

  const moveEditMember = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex >= 0 && targetIndex < editMembers.length) {
      const updated = [...editMembers];
      const temp = updated[index];
      updated[index] = updated[targetIndex];
      updated[targetIndex] = temp;
      setEditMembers(updated);
    }
  };

  const moveFormResolution = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex >= 0 && targetIndex < formResolutions.length) {
      const updated = [...formResolutions];
      const temp = updated[index];
      updated[index] = updated[targetIndex];
      updated[targetIndex] = temp;
      
      updated.forEach((res, i) => {
        res.subjectNo = i + 1;
        res.resolutionNo = startResolutionNo + i;
      });
      
      setFormResolutions(updated);
    }
  };

  const moveEditResolution = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex >= 0 && targetIndex < editResolutions.length) {
      const updated = [...editResolutions];
      const temp = updated[index];
      updated[index] = updated[targetIndex];
      updated[targetIndex] = temp;

      const startResNo = editResolutions.length > 0 
        ? Math.min(...editResolutions.map((r) => Number(r.resolutionNo) || 0))
        : 1;

      updated.forEach((res, i) => {
        res.subjectNo = i + 1;
        res.resolutionNo = startResNo + i;
      });

      setEditResolutions(updated);
    }
  };

  const loadMeetingTemplate = (commId: string, monthStr: string, force = false) => {
    if (!commId || !monthStr) return;
    setLoadingTemplate(true);
    try {
      // Calculate cumulative start resolution from admin templates cache
      const monthsList = commId === "alumni" ? ["sem1", "sem2"] : ["06", "07", "08", "09", "10", "11", "12", "01", "02", "03", "04", "05"];
      const targetIdx = monthsList.indexOf(monthStr);
      let calculatedStartNo = 1;
      if (targetIdx > 0) {
        const preceding = monthsList.slice(0, targetIdx);
        const totalPreceding = preceding.reduce((sum, m) => {
          const subjects = cachedAdminTemplates[m]?.subjects || [];
          return sum + subjects.length;
        }, 0);
        calculatedStartNo = 1 + totalPreceding;
      }
      setStartResolutionNo(calculatedStartNo);

      // Find the specific template document in the cache
      const matchedDoc = cachedAdminTemplates[monthStr];
      const dynamicOutro = matchedDoc?.outroText || "ऐन वेळेस उपस्थित होणाऱ्या विषयांवर चर्चा करून समितीचे सचिव यांनी सभेत उपस्थित सर्व सदस्यांचे आभार व्यक्त केले व अध्यक्ष यांच्या संमतीने सभा संपन्न झाली असे घोषीत केले.";
      setFormOutroText(dynamicOutro);

      // Now set form resolutions from template subjects mapped with correct subjectNo and resolutionNo
      const currentTemplateSubjects = matchedDoc?.subjects || [];
      const formattedSubjects = currentTemplateSubjects.map((item: any, idx: number) => ({
        subjectNo: idx + 1,
        resolutionNo: calculatedStartNo + idx,
        subject: item.subject || "",
        discussion: item.discussion || "",
        resolution: item.resolution || "",
        remark: item.remark || "",
        proposer: item.proposer || "",
        seconder: item.seconder || "",
        statusText: item.statusText || "ठराव सर्वानुमते मंजूर करण्यात आला.",
      }));

      if (formattedSubjects.length > 0) {
        const hasEnteredData = formResolutions.some(
          (res: any) => res.subject || res.discussion || res.resolution
        );
        if (force || !hasEnteredData) {
          setFormResolutions(formattedSubjects);
          if (force) {
            toast.success("या महिन्याचे विषय व ठराव यशस्वीरित्या लोड केले गेले!");
          }
        } else {
          if (
            window.confirm(
              "या महिन्याचे पूर्व-निर्धारित विषय व ठराव आढळले आहेत. ते फॉर्ममध्ये लोड करायचे का? (याने तुमचे सध्याचे विषय आणि ठराव बदलले जातील)"
            )
          ) {
            setFormResolutions(formattedSubjects);
            toast.success("पूर्व-निर्धारित विषय व ठराव यशस्वीरित्या लोड केले गेले!");
          }
        }
      } else {
        if (force) {
          toast.info("या महिन्यासाठी कोणतेही पूर्व-निर्धारित विषय आढळले नाहीत.");
        }
      }
    } catch (err: any) {
      console.error("Error loading templates: ", err);
      toast.error("टेम्पलेट लोड करताना त्रुटी आली!");
    } finally {
      setLoadingTemplate(false);
    }
  };

  // Save teacher's custom template for non-current months (stored separately from admin templates)
  const saveTeacherCustomTemplate = async () => {
    if (!selectedCommittee || !selectedMonth) return;
    setSavingCustomTemplate(true);
    try {
      const q = query(
        collection(db, "teacher_custom_templates"),
        where("udise", "==", udise),
        where("committeeId", "==", selectedCommittee.id),
        where("month", "==", selectedMonth)
      );
      const snapshot = await getDocs(q);

      const templateData: any = {
        udise,
        committeeId: selectedCommittee.id,
        month: selectedMonth,
        subjects: formResolutions.map((r: any) => ({
          subjectNo: r.subjectNo,
          resolutionNo: r.resolutionNo,
          subject: r.subject,
          discussion: r.discussion || "",
          resolution: r.resolution || "",
          remark: r.remark || "",
          proposer: r.proposer || "",
          seconder: r.seconder || "",
          statusText: r.statusText || "ठराव सर्वानुमते मंजूर करण्यात आला.",
        })),
        outroText: formOutroText,
        updatedAt: new Date().toISOString(),
      };

      if (snapshot.docs.length > 0) {
        await updateDoc(doc(db, "teacher_custom_templates", snapshot.docs[0].id), templateData);
        setCachedCustomTemplates(prev => ({
          ...prev,
          [selectedMonth]: { id: snapshot.docs[0].id, ...templateData }
        }));
      } else {
        const newDocRef = await addDoc(collection(db, "teacher_custom_templates"), {
          ...templateData,
          createdAt: new Date().toISOString(),
        });
        setCachedCustomTemplates(prev => ({
          ...prev,
          [selectedMonth]: { id: newDocRef.id, ...templateData, createdAt: new Date().toISOString() }
        }));
      }

      toast.success("तुमचे विषय आणि ठराव यशस्वीरीत्या जतन केले गेले!");
    } catch (err: any) {
      console.error("Error saving custom template:", err);
      toast.error("विषय आणि ठराव जतन करताना त्रुटी आली!");
    } finally {
      setSavingCustomTemplate(false);
    }
  };

  // Load teacher's custom template for non-current months
  const loadTeacherCustomTemplate = (commId: string, monthStr: string): boolean => {
    setFormStep(2);
    try {
      // First, calculate cumulative start resolution number from cached admin templates
      const monthsList = commId === "alumni" ? ["sem1", "sem2"] : ["06", "07", "08", "09", "10", "11", "12", "01", "02", "03", "04", "05"];
      const targetIdx = monthsList.indexOf(monthStr);
      let calculatedStartNo = 1;
      if (targetIdx > 0) {
        const preceding = monthsList.slice(0, targetIdx);
        const totalPreceding = preceding.reduce((sum, m) => {
          const subjects = cachedAdminTemplates[m]?.subjects || [];
          return sum + subjects.length;
        }, 0);
        calculatedStartNo = 1 + totalPreceding;
      }
      setStartResolutionNo(calculatedStartNo);

      // Fetch the outroText from cached admin templates
      const matchedAdminDoc = cachedAdminTemplates[monthStr];
      const fallbackOutroText = matchedAdminDoc?.outroText || "ऐन वेळेस उपस्थित होणाऱ्या विषयांवर चर्चा करून समितीचे सचिव यांनी सभेत उपस्थित सर्व सदस्यांचे आभार व्यक्त केले व अध्यक्ष यांच्या संमतीने सभा संपन्न झाली असे घोषीत केले.";

      // Load custom template from in-memory cache
      const customDoc = cachedCustomTemplates[monthStr];

      if (customDoc) {
        const subjects = customDoc.subjects || [];
        if (customDoc.outroText) {
          setFormOutroText(customDoc.outroText);
        } else {
          setFormOutroText(fallbackOutroText);
        }
        if (subjects.length > 0) {
          setFormResolutions(subjects.map((item: any, idx: number) => ({
            subjectNo: item.subjectNo || idx + 1,
            resolutionNo: item.resolutionNo || (calculatedStartNo + idx),
            subject: item.subject || "",
            discussion: item.discussion || "",
            resolution: item.resolution || "",
            remark: item.remark || "",
            proposer: item.proposer || "",
            seconder: item.seconder || "",
            statusText: item.statusText || "ठराव सर्वानुमते मंजूर करण्यात आला.",
          })));
          setShowCustomForm(true);
          toast.success("तुमचे जतन केलेले विषय आणि ठराव लोड केले गेले!");
          return true;
        }
      } else {
        setFormOutroText(fallbackOutroText);
      }
      return false;
    } catch (err) {
      console.error("Error loading custom template:", err);
      return false;
    }
  };

  const handleMonthChange = (monthVal: string) => {
    setSelectedMonth(monthVal);

    // Automatically select the current academic year
    const autoAcademicYear = getCurrentAcademicYear();
    setAcademicYear(autoAcademicYear);

    // Calculate calendar year and set meeting date to 1st of that month, so calendar view shifts
    if (monthVal) {
      const calYear = getCalendarYear(autoAcademicYear, monthVal);
      if (monthVal !== "sem1" && monthVal !== "sem2") {
        setMeetingDate(`${calYear}-${monthVal}-01`);
      } else {
        setMeetingDate("");
      }
    }

    setShowCustomForm(false);
    if (selectedCommittee && monthVal) {
      const hasCustom = loadTeacherCustomTemplate(selectedCommittee.id, monthVal);
      if (!hasCustom) {
        loadMeetingTemplate(selectedCommittee.id, monthVal, true);
      }
    }
  };

  const handleDateChange = (dateVal: string) => {
    setMeetingDate(dateVal);
    if (dateVal) {
      const parts = dateVal.split("-");
      if (parts.length === 3) {
        const monthStr = parts[1]; // "01" to "12"
        if (monthStr !== selectedMonth) {
          setSelectedMonth(monthStr);
          if (selectedCommittee) {
            setShowCustomForm(false);
            const hasCustom = loadTeacherCustomTemplate(selectedCommittee.id, monthStr);
            if (!hasCustom) {
              loadMeetingTemplate(selectedCommittee.id, monthStr, true);
            }
          }
        }
      }
    }
  };

  // Submit/Save Form to Firestore
  const handleSaveMeeting = async () => {
    if (!selectedCommittee) return;
    if (!schoolName) {
      toast.error("कृपया शाळेचे नाव प्रविष्ट करा!");
      return;
    }
    if (!headmasterName) {
      toast.error("कृपया मुख्याध्यापकांचे नाव प्रविष्ट करा!");
      return;
    }

    setIsSubmitting(true);
    try {
      const formattedDate = meetingDate
        ? meetingDate.split("-").reverse().join(".")
        : "________";
      const defaultIntroText = `आज दि. ${formattedDate} रोजी ${schoolName || "________"} येथे ${committeeName || selectedCommittee.name || "________"} चे अध्यक्ष ${presidentName || formMembers.find((m: any) => m.role === "अध्यक्ष")?.name || "" || "________"} यांच्या अध्यक्षतेखाली सभा घेण्यात आली. सदर सभेस खालील प्रमाणे सदस्य उपस्थित होते.`;

      const meetingData = {
        committeeId: selectedCommittee.id,
        committeeName: committeeName || selectedCommittee.name,
        schoolName,
        headmasterName,
        presidentName:
          presidentName ||
          formMembers.find((m: any) => m.role === "अध्यक्ष")?.name ||
          "",
        date: meetingDate,
        academicYear,
        meetingNumber,
        createdAt: new Date().toISOString(),
        udise,
        members: formMembers,
        resolutions: formResolutions,
        introText: customIntroText || defaultIntroText,
        outroText: formOutroText,
      };

      const docRef = await addDoc(
        collection(db, "monthly_meetings"),
        meetingData,
      );

      toast.success("बैठक नोंद यशस्वीरित्या जतन केली गेली!");
      // Update local state directly to prevent split-second flash
      setSelectedPastMeeting({ id: docRef.id, ...meetingData });
      // Update URL query parameters
      navigate({
        search: (prev) => ({
          ...prev,
          tab: "history",
          meetingId: docRef.id,
          edit: undefined,
        }),
      });
    } catch (e: any) {
      console.error(e);
      toast.error("माहिती जतन करण्यात अडचण आली!");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update existing meeting record in Firestore
  const handleUpdateMeetingRecord = async () => {
    if (!selectedPastMeeting) return;
    setIsSubmitting(true);
    try {
      const docRef = doc(db, "monthly_meetings", selectedPastMeeting.id);
      await updateDoc(docRef, {
        schoolName: editSchoolName,
        headmasterName: editHeadmasterName,
        presidentName: editPresidentName,
        date: editMeetingDate,
        academicYear: editAcademicYear,
        meetingNumber: editMeetingNumber,
        members: editMembers,
        resolutions: editResolutions,
        committeeName: editCommitteeName,
        introText: editIntroText,
        outroText: editOutroText,
      });

      // Update local state
      setSelectedPastMeeting({
        ...selectedPastMeeting,
        schoolName: editSchoolName,
        headmasterName: editHeadmasterName,
        presidentName: editPresidentName,
        date: editMeetingDate,
        academicYear: editAcademicYear,
        meetingNumber: editMeetingNumber,
        members: editMembers,
        resolutions: editResolutions,
        committeeName: editCommitteeName,
        introText: editIntroText,
        outroText: editOutroText,
      });

      toast.success("बदल यशस्वीरित्या जतन केले गेले!");
      navigate({ search: (prev) => ({ ...prev, edit: undefined }) });
    } catch (e: any) {
      console.error(e);
      toast.error("बदल जतन करण्यात अडचण आली!");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete saved meeting record
  const handleDeleteMeeting = async (id: string) => {
    if (
      !window.confirm(
        "तुम्हाला खात्री आहे की तुम्ही हा बैठक अहवाल डिलीट करू इच्छिता?",
      )
    ) {
      return;
    }
    try {
      await deleteDoc(doc(db, "monthly_meetings", id));
      toast.success("बैठक अहवाल यशस्वीरित्या डिलीट केला गेला!");
      if (selectedPastMeeting?.id === id) {
        setSelectedPastMeeting(null);
        navigate({
          search: (prev) => ({
            ...prev,
            meetingId: undefined,
            tab: "history",
            edit: undefined,
          }),
        });
      }
    } catch (e: any) {
      console.error(e);
      toast.error("अहवाल डिलीट करण्यात अडचण आली!");
    }
  };

  // PDF download handler
  const handlePrint = async () => {
    try {
      const element = document.getElementById("meeting-pdf-content");
      if (!element) return;

      toast.info("PDF तयार होत आहे, कृपया प्रतीक्षा करा...");

      const html2pdf = (await import("html2pdf.js")).default;

      const opt = {
        margin: [10, 0, 10, 0], // top, left, bottom, right (0 for sides to use container's own padding)
        filename: `meeting_report.pdf`,
        image: { type: 'jpeg', quality: 1 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          windowWidth: 800 // Force consistent width for A4 aspect ratio
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'] }
      };

      await html2pdf().from(element).set(opt).save();
      toast.success("PDF यशस्वीरित्या डाउनलोड झाली!");
    } catch (error) {
      console.error("Error generating PDF", error);
      toast.error("PDF तयार करताना त्रुटी आली. कृपया पुन्हा प्रयत्न करा.");
    }
  };

  if (authLoading)
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="size-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 animate-pulse">
            माहिती लोड होत आहे...
          </p>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-[#FDFEFF]">
      <TeacherHeader />
      <TeacherSidebar />

      {/* Main Container */}
      <main className="lg:pl-64 pt-16 min-h-screen">
        <PinGate sectionKey="meeting">
          <div className="p-4 md:p-8 space-y-8 max-w-[1600px] mx-auto print:p-0 print:pl-0">
            {/* Header section (Hidden on print) */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 print:hidden">
              <div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                  <Users className="size-8 text-blue-600" />
                  मासिक सभा <span className="text-blue-600">समित्या</span>
                </h1>
                <p className="text-slate-500 text-sm font-medium mt-1">
                  शाळेतील विविध मासिक सभा आणि समित्यांचे इतिवृत्त, सदस्य आणि ठराव
                  व्यवस्थापन करा.
                </p>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
                <div className="size-2 bg-blue-600 rounded-full animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest">
                  स्वयंचलित संचयन (Auto-Sync)
                </span>
              </div>
            </div>

            {/* Core Content Layout Area */}
            <AnimatePresence mode="wait">
              {!selectedCommittee ? (
                // Option 1: Card Grid View (No Committee Selected)
                <motion.div
                  key="grid-view"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-6 print:hidden"
                >
                  <div className="bg-gradient-to-r from-violet-50 to-indigo-50/50 p-4 sm:p-8 rounded-2xl sm:rounded-[2rem] border border-indigo-100/50 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-1">
                      <h2 className="text-base sm:text-lg font-black text-slate-800 flex items-center gap-2">
                        <Sparkles className="size-5 text-indigo-600" /> समिती निवड
                      </h2>
                      <p className="text-[11px] sm:text-xs font-bold text-slate-500">
                        माहिती भरण्यासाठी किंवा मागील अहवाल पाहण्यासाठी खालीलपैकी
                        कोणतीही एक समिती निवडा.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] sm:text-xs font-black text-indigo-600 bg-indigo-50 border border-indigo-100 px-4 py-2 rounded-xl self-start md:self-auto">
                      <span>एकूण ६ सक्रिय समित्या</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
                    {COMMITTEES.map((comm) => {
                      const CommIcon = comm.icon;
                      return (
                        <motion.button
                          whileHover={{ scale: 1.04, y: -6 }}
                          whileTap={{ scale: 0.98 }}
                          key={comm.id}
                          onClick={() =>
                            navigate({
                              search: (prev) => ({
                                ...prev,
                                committeeId: comm.id,
                                tab: "form",
                                edit: undefined,
                              }),
                            })
                          }
                          className="min-h-[15rem] bg-gradient-to-br from-[#8b5cf6] to-[#6d28d9] text-white rounded-3xl sm:rounded-[2.5rem] p-6 sm:p-8 shadow-md hover:shadow-[0_20px_45px_rgba(139,92,246,0.3)] text-left flex flex-col justify-between transition-all border border-[#7c3aed]/30 relative overflow-hidden group cursor-pointer w-full"
                        >
                          {/* Watermark background icon */}
                          <div className="absolute right-[-10%] bottom-[-10%] opacity-10 group-hover:opacity-20 transition-opacity duration-300 pointer-events-none">
                            <CommIcon className="size-36 sm:size-48" strokeWidth={1} />
                          </div>

                          {/* Small Icon Badge */}
                          <div className="size-10 sm:size-12 bg-white/10 rounded-2xl flex items-center justify-center border border-white/20 backdrop-blur-sm group-hover:scale-110 transition-transform">
                            <CommIcon className="size-5 sm:size-6 text-white" />
                          </div>

                          {/* Committee Name */}
                          <div className="space-y-2 mt-4">
                            <h3 className="text-lg sm:text-xl font-black leading-tight tracking-tight pr-4">
                              {comm.name}
                            </h3>
                            <p className="text-[10px] sm:text-[11px] text-violet-100/70 font-semibold line-clamp-2 leading-relaxed">
                              {comm.description}
                            </p>
                          </div>

                          {/* Footer Arrow Action */}
                          <div className="flex items-center gap-1.5 text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-violet-200 mt-6 pt-2 border-t border-white/10">
                            प्रवेश करा{" "}
                            <ArrowRight className="size-3 group-hover:translate-x-1.5 transition-transform duration-300" />
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                </motion.div>
              ) : (
                // Option 2: Active Committee Form & History View (Full Width)
                <motion.div
                  key="form-view"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="w-full bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden print:border-0 print:shadow-none"
                >
                  {/* Header/Tab Navigation (Hidden on print) */}
                  <div className="bg-slate-50 border-b border-slate-200 px-6 py-5 flex flex-col md:flex-row md:items-center justify-between gap-6 print:hidden">
                    <div className="flex flex-wrap items-center gap-4">
                      <button
                        onClick={() => {
                          if (activeTab === "form" && formStep === 2 && !selectedPastMeeting) {
                            setFormStep(1);
                          } else {
                            navigate({
                              search: (prev) => ({
                                ...prev,
                                committeeId: undefined,
                                tab: undefined,
                                meetingId: undefined,
                                edit: undefined,
                              }),
                            });
                          }
                        }}
                        className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-black rounded-xl text-[10px] uppercase tracking-wider transition-all duration-300 shadow-sm active:scale-95 cursor-pointer"
                      >
                        ← मागे जा
                      </button>
                      <div className="h-8 w-px bg-slate-200 hidden sm:block" />
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
                          <selectedCommittee.icon className="size-5" />
                        </div>
                        <div>
                          <h2 className="text-lg font-black text-slate-800 leading-tight">
                            {selectedCommittee.name}
                          </h2>
                          <p className="text-[10.5px] font-bold text-slate-400 mt-0.5">
                            {selectedCommittee.description}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex bg-slate-200/60 p-1 rounded-xl shrink-0 self-start md:self-center">
                      <button
                        onClick={() => {
                          setFormStep(1);
                          navigate({
                            search: (prev) => ({
                              ...prev,
                              tab: "form",
                              meetingId: undefined,
                              edit: undefined,
                            }),
                          });
                        }}
                        className={`px-5 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === "form" && !selectedPastMeeting
                          ? "bg-white text-slate-900 shadow-sm font-black"
                          : "text-slate-500 hover:text-slate-950"
                          }`}
                      >
                        नवीन बैठक नोंदवा
                      </button>
                      <button
                        onClick={() =>
                          navigate({
                            search: (prev) => ({
                              ...prev,
                              tab: "history",
                              edit: undefined,
                            }),
                          })
                        }
                        className={`px-5 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === "history" || selectedPastMeeting
                          ? "bg-white text-slate-900 shadow-sm font-black"
                          : "text-slate-500 hover:text-slate-950"
                          }`}
                      >
                        मागील अहवाल ({savedMeetings.length})
                      </button>
                    </div>
                  </div>

                  {/* Tab Content - View 1: History & Details View */}
                  {activeTab === "history" && (
                    <div className="p-6 md:p-10">
                      {selectedPastMeeting ? (
                        // Detail Report View / Print View
                        <div className="space-y-8 register-print-area">
                          {/* Action Bar (Hidden on print) */}
                          <div className="flex items-center justify-between border-b border-slate-100 pb-6 print:hidden">
                            <button
                              onClick={() => {
                                if (isEditing) {
                                  navigate({
                                    search: (prev) => ({
                                      ...prev,
                                      edit: undefined,
                                    }),
                                  });
                                } else {
                                  navigate({
                                    search: (prev) => ({
                                      ...prev,
                                      meetingId: undefined,
                                    }),
                                  });
                                }
                              }}
                              className="flex items-center gap-2 px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-xs transition-colors"
                            >
                              <X className="size-4" /> मागे जा
                            </button>
                            <div className="flex items-center gap-3">
                              {isEditing ? (
                                <>
                                  <button
                                    onClick={handleUpdateMeetingRecord}
                                    disabled={isSubmitting}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white font-black rounded-xl text-xs tracking-wider transition-colors shadow-md disabled:opacity-50"
                                  >
                                    <Save className="size-4" /> बदल जतन करा
                                  </button>
                                  <button
                                    onClick={() => {
                                      navigate({
                                        search: (prev) => ({
                                          ...prev,
                                          edit: undefined,
                                        }),
                                      });
                                    }}
                                    className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-xs transition-colors"
                                  >
                                    रद्द करा
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => {
                                      navigate({
                                        search: (prev) => ({
                                          ...prev,
                                          edit: true,
                                        }),
                                      });
                                    }}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl text-xs tracking-wider transition-colors shadow-md cursor-pointer"
                                  >
                                    <Edit2 className="size-4" /> संपादन करा
                                  </button>
                                  <button
                                    onClick={handlePrint}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl text-xs tracking-wider transition-colors shadow-md cursor-pointer"
                                  >
                                    <Download className="size-4" /> PDF डाउनलोड करा
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleDeleteMeeting(selectedPastMeeting.id)
                                    }
                                    className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl text-xs tracking-wider transition-colors shadow-md cursor-pointer"
                                  >
                                    <Trash2 className="size-4" /> डिलीट करा
                                  </button>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Register notebook styling */}
                          <style>{`
                          @import url('https://fonts.googleapis.com/css2?family=Kalam:wght@400;700&display=swap');
                          
                          .register-container {
                            background-color: #fdfcf7; /* Ledger Cream background */
                            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.04);
                            font-family: 'Kalam', cursive, 'Inter', sans-serif;
                            position: relative;
                            border-left: 2px solid #ef4444; /* double red margin */
                            padding: 3rem 2.5rem 3rem 4.5rem;
                            min-height: 1000px;
                            border-radius: 1.5rem;
                          }
                          
                          .register-container::before {
                            content: '';
                            position: absolute;
                            top: 0;
                            bottom: 0;
                            left: 3.5rem;
                            width: 3px;
                            border-left: 1px solid #ef4444;
                            border-right: 1px solid #ef4444;
                            height: 100%;
                            pointer-events: none;
                          }

                          /* Ledger notebook page grid background */
                          .register-page-bg {
                            background-image: linear-gradient(rgba(59, 130, 246, 0.08) 1px, transparent 1px);
                            background-size: 100% 2.4rem;
                            line-height: 2.4rem;
                          }

                          .register-header-text {
                            font-size: 1.3rem;
                            color: #1e293b;
                            line-height: 2.4rem;
                            text-indent: 3rem;
                            text-align: justify;
                            margin-bottom: 2rem;
                            font-weight: 600;
                          }

                          .register-table {
                            width: 100%;
                            border-collapse: collapse;
                            margin-bottom: 2rem;
                            font-size: 0.95rem;
                          }

                          .register-table tr {
                            page-break-inside: avoid;
                            break-inside: avoid;
                          }

                          .register-table th, .register-table td {
                            border: 1px solid #475569;
                            padding: 0.5rem 0.8rem;
                            text-align: left;
                          }

                          .register-table th {
                            background-color: rgba(71, 85, 105, 0.05);
                            font-weight: 700;
                            color: #0f172a;
                          }

                          .register-table td {
                            color: #334155;
                          }

                          .register-res-section {
                            margin-top: 3rem;
                            border-top: 1px dashed #94a3b8;
                            padding-top: 2rem;
                          }

                          .register-res-item {
                            margin-bottom: 3rem;
                            font-size: 1.25rem;
                            line-height: 2.6rem;
                            border-bottom: 1px dotted #cbd5e1;
                            padding-bottom: 1.5rem;
                            page-break-inside: avoid;
                            break-inside: avoid;
                          }

                          .register-res-title {
                            font-weight: 700;
                            color: #0f172a;
                            display: inline-block;
                            min-width: 6.5rem;
                          }

                          .register-signature-area {
                            margin-top: 6rem;
                            display: grid;
                            grid-template-columns: repeat(2, 1fr);
                            gap: 2rem;
                            text-align: center;
                            font-size: 1.15rem;
                            font-weight: 700;
                            page-break-inside: avoid;
                            break-inside: avoid;
                          }
                          
                          .ledger-input {
                            background: transparent;
                            border: none;
                            border-bottom: 1px dashed rgba(59, 130, 246, 0.4);
                            color: #1e3a8a; /* Blue handwriting ink */
                            font-family: 'Kalam', cursive, 'Inter', sans-serif;
                            font-size: inherit;
                            font-weight: 700;
                            outline: none;
                            padding: 0 4px;
                            transition: all 0.2s ease;
                          }
                          
                          .ledger-input:focus {
                            border-bottom: 2px solid #2563eb;
                            background-color: rgba(59, 130, 246, 0.03);
                          }
                          
                          .ledger-input::placeholder {
                            color: #94a3b8;
                            font-weight: 400;
                            font-style: italic;
                          }

                          @media print {
                            body {
                              background: white !important;
                              color: black !important;
                            }
                            .print\\:hidden, 
                            header, 
                            nav, 
                            aside, 
                            button, 
                            .action-bar-print {
                              display: none !important;
                            }
                            main {
                              padding-left: 0 !important;
                              padding-top: 0 !important;
                              min-height: auto !important;
                            }
                            .register-container {
                              box-shadow: none !important;
                              border: none !important;
                              padding: 1.5rem 1rem 1.5rem 3.5rem !important;
                              background-color: #fdfcf7 !important;
                              -webkit-print-color-adjust: exact;
                              print-color-adjust: exact;
                              width: 100% !important;
                              border-radius: 0 !important;
                            }
                            .register-container::before {
                              left: 2.5rem !important;
                            }
                          }
                        `}</style>

                          {/* Notebook Ledger Sheet */}
                          <div id="meeting-pdf-content" className="register-container register-page-bg">
                            {isEditing ? (
                              // --- EDITING MODE IN-PLACE LEDGER VIEW ---
                              <div className="space-y-8 select-text">
                                {/* Meeting Ledger Letterhead */}
                                <div className="text-center pb-4 pt-2">
                                  <h1 className="text-3xl font-black text-slate-900 border-b-2 border-slate-800 pb-2 tracking-wide inline-block px-8">
                                    मासिक सभा इतिवृत्त नोंदवही
                                  </h1>
                                </div>

                                {/* Meeting Metadata Header (Editable) */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 border-b-2 border-slate-300 pb-4 mb-4 text-[13px] md:text-sm font-bold text-slate-800 tracking-tight font-sans">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-slate-500 font-black text-[10px] uppercase tracking-wider shrink-0">
                                      शैक्षणिक वर्ष:
                                    </span>
                                    <input
                                      type="text"
                                      value={editAcademicYear}
                                      onChange={(e) =>
                                        setEditAcademicYear(e.target.value)
                                      }
                                      className="bg-transparent border-none outline-none underline decoration-dotted decoration-slate-400 font-extrabold text-slate-900 w-full"
                                    />
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-slate-500 font-black text-[10px] uppercase tracking-wider shrink-0">
                                      सभा क्रमांक:
                                    </span>
                                    <input
                                      type="text"
                                      value={editMeetingNumber}
                                      onChange={(e) =>
                                        setEditMeetingNumber(e.target.value)
                                      }
                                      className="bg-transparent border-none outline-none underline decoration-dotted decoration-slate-400 font-extrabold text-slate-900 w-full"
                                    />
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-slate-500 font-black text-[10px] uppercase tracking-wider shrink-0">
                                      सचिव/मुख्याध्यापक:
                                    </span>
                                    <input
                                      type="text"
                                      value={editHeadmasterName}
                                      onChange={(e) =>
                                        setEditHeadmasterName(e.target.value)
                                      }
                                      className="bg-transparent border-none outline-none underline decoration-dotted decoration-slate-400 font-extrabold text-slate-900 w-full"
                                    />
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-slate-500 font-black text-[10px] uppercase tracking-wider shrink-0">
                                      शाळेचे नाव:
                                    </span>
                                    <input
                                      type="text"
                                      value={editSchoolName}
                                      onChange={(e) =>
                                        setEditSchoolName(e.target.value)
                                      }
                                      className="bg-transparent border-none outline-none underline decoration-dotted decoration-slate-400 font-extrabold text-slate-900 w-full"
                                    />
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-slate-500 font-black text-[10px] uppercase tracking-wider shrink-0">
                                      समिती अध्यक्षांचे नाव:
                                    </span>
                                    <input
                                      type="text"
                                      value={editPresidentName}
                                      onChange={(e) =>
                                        setEditPresidentName(e.target.value)
                                      }
                                      className="bg-transparent border-none outline-none underline decoration-dotted decoration-slate-400 font-extrabold text-slate-900 w-full"
                                    />
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-slate-500 font-black text-[10px] uppercase tracking-wider shrink-0">
                                      समितीचे नाव:
                                    </span>
                                    <input
                                      type="text"
                                      value={editCommitteeName}
                                      onChange={(e) =>
                                        setEditCommitteeName(e.target.value)
                                      }
                                      className="bg-transparent border-none outline-none underline decoration-dotted decoration-slate-400 font-extrabold text-slate-900 w-full"
                                    />
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-slate-500 font-black text-[10px] uppercase tracking-wider shrink-0">
                                      सभा दिनांक:
                                    </span>
                                    <input
                                      type="date"
                                      value={editMeetingDate}
                                      onChange={(e) =>
                                        setEditMeetingDate(e.target.value)
                                      }
                                      className="bg-transparent border-none outline-none underline decoration-dotted decoration-slate-400 font-extrabold text-slate-900 w-full cursor-pointer"
                                    />
                                  </div>
                                </div>

                                {/* Introductory Paragraph (Editable) */}
                                <p className="register-header-text">
                                  <textarea
                                    value={editIntroText}
                                    onChange={(e) =>
                                      setEditIntroText(e.target.value)
                                    }
                                    className="bg-transparent border-none outline-none w-full resize-y min-h-[120px]"
                                    rows={3}
                                  />
                                </p>

                                {/* Committee Members Table (Editable) */}
                                <div className="space-y-4">
                                  <div className="flex items-center justify-between border-b border-slate-300 pb-2">
                                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">
                                      समिती सदस्य यादी
                                    </h3>
                                    <button
                                      type="button"
                                      onClick={handleAddMemberRow}
                                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg text-xs font-bold font-sans transition-colors cursor-pointer"
                                    >
                                      <UserPlus className="size-4" /> सदस्य जोडा
                                    </button>
                                  </div>

                                  <div className="w-full overflow-x-auto no-scrollbar">
                                    <table className="register-table min-w-[600px] w-full">
                                      <thead>
                                        <tr className="bg-slate-100 whitespace-nowrap">
                                          <th className="w-16 text-center px-1 py-2">अ.क्र.</th>
                                          <th className="text-left px-2 py-2">सदस्याचे नाव</th>
                                          <th className="text-left px-2 py-2">पदनाम</th>
                                          <th className="text-left px-2 py-2">पद</th>
                                          <th className="w-24 text-center px-2 py-2">स्वाक्षरी</th>
                                          <th className="w-10 text-center px-2 py-2">कृती</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {editMembers.map(
                                          (member: any, index: number) => (
                                            <tr
                                              key={index}
                                              className="hover:bg-slate-50/30 whitespace-nowrap"
                                            >
                                              <td className="text-center w-16 px-1 py-2">
                                                {index + 1}
                                              </td>
                                              <td className="px-2 py-2">
                                                <input
                                                  type="text"
                                                  value={member.name}
                                                  onChange={(e) =>
                                                    handleUpdateMemberField(
                                                      index,
                                                      "name",
                                                      e.target.value,
                                                    )
                                                  }
                                                  placeholder="सदस्याचे नाव..."
                                                  className="bg-transparent border-none outline-none font-bold text-slate-900 w-full"
                                                />
                                              </td>
                                              <td className="px-2 py-2">
                                                <input
                                                  list={`designations-list-${selectedCommittee?.id}`}
                                                  value={member.post}
                                                  onChange={(e) =>
                                                    handleUpdateMemberField(
                                                      index,
                                                      "post",
                                                      e.target.value,
                                                    )
                                                  }
                                                  placeholder="पदनाम निवडा किंवा लिहा..."
                                                  className="bg-transparent border-none outline-none font-bold text-slate-900 w-full"
                                                />
                                              </td>
                                              <td className="px-2 py-2">
                                                <input
                                                  list="roles-list"
                                                  value={member.role}
                                                  onChange={(e) =>
                                                    handleUpdateMemberField(
                                                      index,
                                                      "role",
                                                      e.target.value,
                                                    )
                                                  }
                                                  placeholder="पद निवडा किंवा लिहा..."
                                                  className="bg-transparent border-none outline-none font-bold text-slate-900 w-full"
                                                />
                                              </td>
                                              <td className="text-center w-24 px-2 py-2">
                                                <div className="h-6 w-full" />
                                              </td>
                                              <td className="text-center w-10 px-2 py-2">
                                                <div className="flex items-center justify-center gap-1">
                                                  <button
                                                    type="button"
                                                    disabled={index === 0}
                                                    onClick={() => moveEditMember(index, "up")}
                                                    className="p-0.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 rounded transition-colors disabled:opacity-30 cursor-pointer"
                                                    title="वर घ्या"
                                                  >
                                                    <ChevronUp className="size-4" />
                                                  </button>
                                                  <button
                                                    type="button"
                                                    disabled={index === editMembers.length - 1}
                                                    onClick={() => moveEditMember(index, "down")}
                                                    className="p-0.5 text-slate-500 hover:bg-slate-100 hover:text-slate-805 rounded transition-colors disabled:opacity-30 cursor-pointer"
                                                    title="खाली घ्या"
                                                  >
                                                    <ChevronDown className="size-4" />
                                                  </button>
                                                  <button
                                                    type="button"
                                                    onClick={() =>
                                                      handleRemoveMemberRow(index)
                                                    }
                                                    className="text-red-500 hover:text-red-700 cursor-pointer p-0.5"
                                                    title="काढून टाका"
                                                  >
                                                    <Trash2 className="size-4" />
                                                  </button>
                                                </div>
                                              </td>
                                            </tr>
                                          ),
                                        )}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>

                                {/* Resolutions Section (Editable) */}
                                <div className="register-res-section space-y-8">
                                  <div className="flex items-center justify-between border-b border-slate-300 pb-2">
                                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">
                                      विषय आणि ठराव तपशील
                                    </h3>
                                    <button
                                      type="button"
                                      onClick={handleAddResolutionRow}
                                      className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg text-xs font-bold font-sans transition-colors cursor-pointer"
                                    >
                                      <Plus className="size-4" /> विषय व ठराव जोडा
                                    </button>
                                  </div>

                                  {editResolutions.map(
                                    (res: any, index: number) => (
                                      <div
                                        key={index}
                                        className="register-res-item relative group/res"
                                      >
                                        <div className="absolute top-0 right-0 flex items-center gap-1 opacity-0 group-hover/res:opacity-100 transition-opacity font-sans text-xs">
                                          <button
                                            type="button"
                                            disabled={index === 0}
                                            onClick={() => moveEditResolution(index, "up")}
                                            className="p-1 text-slate-500 hover:bg-slate-100 rounded disabled:opacity-30 cursor-pointer"
                                            title="वर घ्या"
                                          >
                                            <ChevronUp className="size-4" />
                                          </button>
                                          <button
                                            type="button"
                                            disabled={index === editResolutions.length - 1}
                                            onClick={() => moveEditResolution(index, "down")}
                                            className="p-1 text-slate-500 hover:bg-slate-100 rounded disabled:opacity-30 cursor-pointer"
                                            title="खाली घ्या"
                                          >
                                            <ChevronDown className="size-4" />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              handleRemoveResolutionRow(index)
                                            }
                                            className="p-1 text-red-500 hover:bg-red-50 rounded flex items-center gap-1 cursor-pointer"
                                            title="काढून टाका"
                                          >
                                            <Trash2 className="size-3.5" /> काढून टाका
                                          </button>
                                        </div>

                                        <div className="flex gap-4 items-start">
                                          <div className="flex items-center register-res-title shrink-0 whitespace-nowrap">
                                            विषय -
                                            <input
                                              type="number"
                                              value={res.subjectNo}
                                              onChange={(e) =>
                                                handleUpdateResolutionField(
                                                  index,
                                                  "subjectNo",
                                                  Number(e.target.value),
                                                )
                                              }
                                              className="bg-transparent border-none outline-none w-8 text-center mx-1 font-bold text-slate-800"
                                            />{" "}
                                            :
                                          </div>
                                          <textarea
                                            value={res.subject}
                                            onChange={(e) =>
                                              handleUpdateResolutionField(
                                                index,
                                                "subject",
                                                e.target.value,
                                              )
                                            }
                                            placeholder="विषयाचा तपशील प्रविष्ट करा..."
                                            className="bg-transparent border-none outline-none underline decoration-dotted decoration-slate-400 font-bold text-slate-800 w-full resize-y min-h-[4rem]"
                                          />
                                        </div>



                                        <div className="flex gap-4 items-start mt-2">
                                          <div className="flex items-center register-res-title shrink-0 whitespace-nowrap">
                                            ठराव -
                                            <input
                                              type="number"
                                              value={res.resolutionNo}
                                              onChange={(e) =>
                                                handleUpdateResolutionField(
                                                  index,
                                                  "resolutionNo",
                                                  Number(e.target.value),
                                                )
                                              }
                                              className="bg-transparent border-none outline-none w-8 text-center mx-1 font-bold text-slate-800"
                                            />{" "}
                                            :
                                          </div>
                                          <textarea
                                            value={res.resolution}
                                            onChange={(e) =>
                                              handleUpdateResolutionField(
                                                index,
                                                "resolution",
                                                e.target.value,
                                              )
                                            }
                                            placeholder="ठरावाचा सविस्तर तपशील प्रविष्ट करा..."
                                            className="bg-transparent border-none outline-none text-slate-700 text-justify w-full resize-y min-h-[6rem]"
                                          />
                                        </div>

                                        <div className="pl-[6.5rem] mt-3 space-y-2 font-bold text-slate-700">
                                          <div className="flex items-center gap-2">
                                            <span>• सूचक :</span>
                                            <select
                                              value={res.proposer}
                                              onChange={(e) =>
                                                handleUpdateResolutionField(
                                                  index,
                                                  "proposer",
                                                  e.target.value,
                                                )
                                              }
                                              className="ledger-input bg-transparent py-0.5 max-w-xs"
                                            >
                                              <option
                                                value=""
                                                className="text-slate-800 bg-white"
                                              >
                                                -- सूचक निवडा --
                                              </option>
                                              {editMembers.map(
                                                (m, mIdx) =>
                                                  m.name && (
                                                    <option
                                                      key={mIdx}
                                                      value={m.name}
                                                      className="text-slate-800 bg-white"
                                                    >
                                                      {m.name} ({m.post})
                                                    </option>
                                                  ),
                                              )}
                                            </select>
                                          </div>

                                          <div className="flex items-center gap-2">
                                            <span>• अनुमोदक :</span>
                                            <select
                                              value={res.seconder}
                                              onChange={(e) =>
                                                handleUpdateResolutionField(
                                                  index,
                                                  "seconder",
                                                  e.target.value,
                                                )
                                              }
                                              className="ledger-input bg-transparent py-0.5 max-w-xs"
                                            >
                                              <option
                                                value=""
                                                className="text-slate-800 bg-white"
                                              >
                                                -- अनुमोदक निवडा --
                                              </option>
                                              {editMembers.map(
                                                (m, mIdx) =>
                                                  m.name && (
                                                    <option
                                                      key={mIdx}
                                                      value={m.name}
                                                      className="text-slate-800 bg-white"
                                                    >
                                                      {m.name} ({m.post})
                                                    </option>
                                                  ),
                                              )}
                                            </select>
                                          </div>

                                        </div>
                                      </div>
                                    ),
                                  )}

                                  {/* ऐन वेळेचे आभार प्रदर्शन व सभा सांगता परिच्छेद (Editable) */}
                                  <div className="mt-8 pt-4 border-t border-dashed border-slate-350">
                                    <textarea
                                      value={editOutroText}
                                      onChange={(e) => setEditOutroText(e.target.value)}
                                      className="bg-transparent border-none outline-none text-slate-900 font-bold text-justify leading-relaxed text-[16px] sm:text-lg pl-4 w-full resize-y min-h-[100px]"
                                      rows={3}
                                      placeholder="आभार प्रदर्शन व सभा सांगता परिच्छेद..."
                                    />
                                  </div>
                                </div>
                              </div>
                            ) : (
                              // --- READ / PRINT REGISTER NOTEBOOK VIEW ---
                              <div className="space-y-8 select-text">
                                {/* Meeting Ledger Letterhead */}
                                <div className="text-center pb-4 pt-2">
                                  <h1 className="text-3xl font-black text-slate-900 border-b-2 border-slate-800 pb-2 tracking-wide inline-block px-8">
                                    मासिक सभा इतिवृत्त नोंदवही
                                  </h1>
                                </div>

                                {/* Meeting Metadata Header (Read/Print View) */}
                                <div className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-slate-300 pb-4 mb-4 text-[13px] md:text-sm font-bold text-slate-800 tracking-tight font-sans">
                                  <div className="flex items-center gap-1.5 whitespace-nowrap">
                                    <span className="text-slate-500 font-black text-[10px] uppercase tracking-wider shrink-0">
                                      शैक्षणिक वर्ष:
                                    </span>
                                    <span className="underline decoration-dotted decoration-slate-400 font-extrabold text-slate-900">
                                      {selectedPastMeeting.academicYear || "________"}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1.5 whitespace-nowrap">
                                    <span className="text-slate-500 font-black text-[10px] uppercase tracking-wider shrink-0">
                                      सभा क्रमांक:
                                    </span>
                                    <span className="underline decoration-dotted decoration-slate-400 font-extrabold text-slate-900">
                                      {selectedPastMeeting.meetingNumber || "________"}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1.5 whitespace-nowrap">
                                    <span className="text-slate-500 font-black text-[10px] uppercase tracking-wider shrink-0">
                                      सचिव/मुख्याध्यापक:
                                    </span>
                                    <span className="underline decoration-dotted decoration-slate-400 font-extrabold text-slate-900">
                                      {selectedPastMeeting.headmasterName || "________"}
                                    </span>
                                  </div>
                                </div>

                                {/* Introductory Paragraph styled like handwritten ledger */}
                                <p className="register-header-text">
                                  {selectedPastMeeting.introText ||
                                    `आज दि. ${selectedPastMeeting.date ? selectedPastMeeting.date.split("-").reverse().join(".") : "________"} रोजी ${selectedPastMeeting.schoolName || "________"} येथे ${selectedPastMeeting.committeeName || "________"} चे अध्यक्ष ${selectedPastMeeting.presidentName || "________"} यांच्या अध्यक्षतेखाली सभा घेण्यात आली. सदर सभेस खालील प्रमाणे सदस्य उपस्थित होते.`}
                                </p>

                                {/* Committee Members Present table with blank signature column */}
                                {selectedPastMeeting.members &&
                                  selectedPastMeeting.members.length > 0 && (
                                    <div className="space-y-4">
                                      <div className="w-full">
                                        <table className="register-table w-full table-fixed">
                                          <thead>
                                            <tr className="bg-slate-100">
                                              <th style={{ width: '8%' }} className="text-center px-1 py-2">
                                                अ.क्र.
                                              </th>
                                              <th style={{ width: '38%' }} className="text-left px-2 py-2">सदस्याचे नाव</th>
                                              <th style={{ width: '31%' }} className="text-left px-2 py-2">पदनाम</th>
                                              <th style={{ width: '11%' }} className="text-left px-2 py-2">पद</th>
                                              <th style={{ width: '12%' }} className="text-center px-2 py-2">
                                                स्वाक्षरी
                                              </th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {selectedPastMeeting.members
                                              .filter((member: any) => member.name?.trim() || member.post?.trim())
                                              .map((member: any, index: number) => (
                                                <tr
                                                  key={index}
                                                  className="hover:bg-slate-50/30"
                                                >
                                                  <td className="text-center px-1 py-2">
                                                    {index + 1}
                                                  </td>
                                                  <td className="font-bold text-slate-900 px-2 py-2 whitespace-normal break-words">
                                                    {member.name}
                                                  </td>
                                                  <td className="px-2 py-2 whitespace-normal break-words">{member.post}</td>
                                                  <td className="px-2 py-2 whitespace-normal break-words">{member.role || "सदस्य"}</td>
                                                  <td className="text-center px-2 py-2">
                                                    {/* Left blank for physical signing as requested */}
                                                    <div className="h-6 w-full" />
                                                  </td>
                                                </tr>
                                              ),
                                              )}
                                          </tbody>
                                        </table>
                                      </div>
                                    </div>
                                  )}

                                {/* Resolutions Section */}
                                {selectedPastMeeting.resolutions &&
                                  selectedPastMeeting.resolutions.length > 0 && (
                                    <div className="register-res-section space-y-6">
                                      {selectedPastMeeting.resolutions.map(
                                        (res: any, index: number) => (
                                          <div
                                            key={index}
                                            className="register-res-item"
                                          >
                                            <div className="flex gap-4 items-start">
                                              <span className="register-res-title shrink-0">
                                                विषय - {res.subjectNo} :
                                              </span>
                                              <span className="font-bold text-slate-800 underline decoration-dotted decoration-slate-400">
                                                {res.subject}
                                              </span>
                                            </div>
                                            <div className="flex gap-4 items-start mt-2">
                                              <span className="register-res-title shrink-0">
                                                ठराव - {res.resolutionNo} :
                                              </span>
                                              <span className="text-slate-700 text-justify">
                                                {res.resolution}
                                              </span>
                                            </div>
                                            <div className="pl-[6.5rem] mt-3 space-y-1 font-bold text-slate-700">
                                              <p>
                                                • सूचक :{" "}
                                                <span className="text-slate-900">
                                                  {res.proposer || "________"}
                                                </span>
                                              </p>
                                              <p>
                                                • अनुमोदक :{" "}
                                                <span className="text-slate-900">
                                                  {res.seconder || "________"}
                                                </span>
                                              </p>

                                            </div>
                                          </div>
                                        ),
                                      )}

                                      {/* ऐन वेळेचे आभार प्रदर्शन व सभा सांगता परिच्छेद */}
                                      <div className="mt-8 pt-4 border-t border-dashed border-slate-350">
                                        <p className="text-slate-900 font-bold text-justify leading-relaxed text-[16px] sm:text-lg pl-4">
                                          {selectedPastMeeting.outroText || "ऐन वेळेस उपस्थित होणाऱ्या विषयांवर चर्चा करून समितीचे सचिव यांनी सभेत उपस्थित सर्व सदस्यांचे आभार व्यक्त केले व अध्यक्ष यांच्या संमतीने सभा संपन्न झाली असे घोषीत केले."}
                                        </p>
                                      </div>
                                    </div>
                                  )}

                                {/* Bottom Signatures Block */}
                                <div className="register-signature-area pt-16">
                                  <div className="space-y-12">
                                    <p>समिती अध्यक्ष स्वाक्षरी</p>
                                    <div className="w-32 border-b border-slate-600 mx-auto" />
                                  </div>
                                  <div className="space-y-12">
                                    <p>सचिव / मुख्याध्यापक स्वाक्षरी</p>
                                    <div className="w-32 border-b border-slate-600 mx-auto" />
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        // List of past meetings
                        <div className="space-y-6">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">
                              नोंदवलेले बैठक अहवाल ({savedMeetings.length})
                            </h3>
                          </div>

                          {savedMeetings.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {savedMeetings.map((mt) => (
                                <div
                                  key={mt.id}
                                  className="bg-white border border-slate-200 hover:border-blue-500/50 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-6 group relative overflow-hidden"
                                >
                                  <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50/50 rounded-bl-full -z-10 group-hover:bg-blue-50 transition-colors" />
                                  <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                      <span className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-lg text-[9px] font-black uppercase tracking-widest">
                                        सभा दिनांक: {mt.date}
                                      </span>
                                      {mt.time && (
                                        <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1">
                                          <Clock size={10} /> {mt.time} वा.
                                        </span>
                                      )}
                                    </div>
                                    <h4 className="font-black text-slate-900 text-base group-hover:text-blue-600 transition-colors">
                                      {mt.committeeName}
                                    </h4>
                                    <div className="space-y-1 text-xs text-slate-500 font-bold">
                                      <p>शाळा: {mt.schoolName}</p>
                                      <p>मुख्याध्यापक: {mt.headmasterName}</p>
                                    </div>
                                  </div>

                                  <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-2">
                                    <button
                                      onClick={() =>
                                        navigate({
                                          search: (prev) => ({
                                            ...prev,
                                            meetingId: mt.id,
                                            tab: "history",
                                            edit: undefined,
                                          }),
                                        })
                                      }
                                      className="text-[11px] font-black text-blue-600 hover:text-blue-700 hover:underline uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
                                    >
                                      पूर्ण अहवाल पहा <Printer size={12} />
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteMeeting(mt.id);
                                      }}
                                      className="text-[11px] font-black text-red-600 hover:text-red-700 hover:underline uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
                                    >
                                      डिलीट करा <Trash2 size={12} />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="p-20 text-center border-2 border-dashed border-slate-200 rounded-[2rem]">
                              <div className="size-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300">
                                <FileText size={40} />
                              </div>
                              <h3 className="text-slate-400 font-black uppercase tracking-widest text-xs">
                                कोणतेही अहवाल आढळले नाहीत
                              </h3>
                              <p className="text-slate-300 text-[10px] font-bold mt-2 italic">
                                या समितीची पहिली बैठक नोंदवण्यासाठी वरील 'नवीन
                                बैठक नोंदवा' बटणावर क्लिक करा.
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tab Content - View 2: Form to Fill New Meeting */}
                  {activeTab === "form" && (
                    <div className="p-4 sm:p-8 md:p-12 space-y-8 md:space-y-12">
                      {/* Basic Details Form Section */}
                      {formStep === 1 && (
                        <>
                          <div className="space-y-8">
                            <h3 className="text-lg font-black text-slate-800 uppercase tracking-widest border-b-2 border-slate-100 pb-3">
                              १. बैठकीची प्राथमिक माहिती
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                              <div className="space-y-2.5">
                                <label className="text-lg font-black text-slate-800 block">
                                  शाळेचे नाव
                                </label>
                                <input
                                  type="text"
                                  value={schoolName}
                                  onChange={(e) => setSchoolName(e.target.value)}
                                  placeholder="शाळेचे नाव प्रविष्ट करा..."
                                  className="w-full px-6 py-4.5 bg-white border-2 border-slate-300 rounded-xl text-lg font-extrabold outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600 transition-all text-slate-950 shadow-md"
                                />
                              </div>
                              <div className="space-y-2.5">
                                <label className="text-lg font-black text-slate-800 block">
                                  मुख्याध्यापकांचे नाव
                                </label>
                                <input
                                  type="text"
                                  value={headmasterName}
                                  onChange={(e) => setHeadmasterName(e.target.value)}
                                  placeholder="मुख्याध्यापकांचे नाव..."
                                  className="w-full px-6 py-4.5 bg-white border-2 border-slate-300 rounded-xl text-lg font-extrabold outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600 transition-all text-slate-950 shadow-md"
                                />
                              </div>
                              <div className="space-y-2.5">
                                <label className="text-lg font-black text-slate-800 block">
                                  समिती अध्यक्षांचे नाव
                                </label>
                                <input
                                  type="text"
                                  value={presidentName}
                                  onChange={(e) => setPresidentName(e.target.value)}
                                  placeholder="समिती अध्यक्षांचे नाव प्रविष्ट करा..."
                                  className="w-full px-6 py-4.5 bg-white border-2 border-slate-300 rounded-xl text-lg font-extrabold outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600 transition-all text-slate-950 shadow-md"
                                />
                              </div>
                              <div className="space-y-2.5">
                                <label className="text-lg font-black text-slate-800 block">
                                  समितीचे नाव (Committee Name)
                                </label>
                                <input
                                  type="text"
                                  value={committeeName}
                                  onChange={(e) => setCommitteeName(e.target.value)}
                                  placeholder="उदा. शाळा व्यवस्थापन समिती..."
                                  className="w-full px-6 py-4.5 bg-white border-2 border-slate-300 rounded-xl text-lg font-extrabold outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600 transition-all text-slate-950 shadow-md"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Committee Members List Section */}
                          <div className="space-y-6 pt-8 border-t border-slate-100">
                            <div className="flex items-center justify-between border-b-2 border-slate-100 pb-3">
                              <h3 className="text-lg font-black text-slate-800 uppercase tracking-widest">
                                २. समिती सदस्यांची नावे
                              </h3>
                              <button
                                type="button"
                                onClick={handleAddFormMemberRow}
                                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-black uppercase tracking-wider transition-all shadow-md"
                              >
                                <UserPlus className="size-4" /> सदस्य जोडा
                              </button>
                            </div>

                            <div className="overflow-x-auto border-2 border-slate-300 rounded-2xl bg-white shadow-sm">
                              <table className="w-full text-left border-collapse text-base">
                                <thead>
                                  <tr className="bg-slate-100 text-slate-800 font-extrabold border-b-2 border-slate-300">
                                    <th className="px-1.5 py-4 text-center w-16">
                                      अ.क्र.
                                    </th>
                                    <th className="px-4 py-4 w-[35%] min-w-[250px]">सदस्याचे नाव</th>
                                    <th className="px-6 py-4">पदनाम (Designation)</th>
                                    <th className="px-6 py-4">पद (Post)</th>
                                    <th className="px-6 py-4 text-center w-24">स्वाक्षरी</th>
                                    <th className="px-6 py-4 text-center w-24">
                                      कृती
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 font-extrabold text-slate-950">
                                  {formMembers.map((m: any, idx: number) => (
                                    <tr key={idx} className="hover:bg-slate-50/50">
                                      <td className="px-2 py-4 text-center text-slate-500 font-extrabold text-lg">
                                        {idx + 1}
                                      </td>
                                      <td className="px-4 py-4">
                                        <input
                                          type="text"
                                          value={m.name}
                                          onChange={(e) =>
                                            handleUpdateFormMemberField(
                                              idx,
                                              "name",
                                              e.target.value,
                                            )
                                          }
                                          placeholder="सदस्याचे नाव प्रविष्ट करा..."
                                          className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600 font-extrabold text-slate-950 bg-white text-lg"
                                        />
                                      </td>
                                      <td className="px-6 py-4">
                                        {m.isCustomPost ? (
                                          <div className="flex gap-2">
                                            <input
                                              type="text"
                                              value={m.post}
                                              onChange={(e) => handleUpdateFormMemberField(idx, "post", e.target.value)}
                                              placeholder="स्वतः लिहा..."
                                              autoFocus
                                              className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600 font-extrabold text-slate-950 bg-white text-lg"
                                            />
                                            <button
                                              type="button"
                                              onClick={() => handleUpdateFormMemberField(idx, "isCustomPost", false)}
                                              className="p-3 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors border border-transparent hover:border-slate-300"
                                              title="ड्रॉपडाऊनवर परत जा"
                                            >
                                              <X className="size-5" />
                                            </button>
                                          </div>
                                        ) : (
                                          <select
                                            value={m.post}
                                            onChange={(e) => {
                                              if (e.target.value === "__CUSTOM__") {
                                                handleUpdateFormMemberField(idx, "isCustomPost", true);
                                                handleUpdateFormMemberField(idx, "post", "");
                                              } else {
                                                handleUpdateFormMemberField(idx, "post", e.target.value);
                                              }
                                            }}
                                            className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600 font-extrabold text-slate-950 bg-white text-lg cursor-pointer"
                                          >
                                            <option value="">-- पदनाम निवडा --</option>
                                            {selectedCommittee && getCommitteeDesignations(selectedCommittee.id).map((designation, dIdx) => (
                                              <option key={dIdx} value={designation}>{designation}</option>
                                            ))}
                                            {m.post && selectedCommittee && !getCommitteeDesignations(selectedCommittee.id).includes(m.post) && (
                                              <option value={m.post}>{m.post}</option>
                                            )}
                                            <option value="__CUSTOM__" className="font-bold text-blue-600">-- स्वतः लिहा --</option>
                                          </select>
                                        )}
                                      </td>
                                      <td className="px-6 py-4">
                                        {m.isCustomRole ? (
                                          <div className="flex gap-2">
                                            <input
                                              type="text"
                                              value={m.role}
                                              onChange={(e) => handleUpdateFormMemberField(idx, "role", e.target.value)}
                                              placeholder="स्वतः लिहा..."
                                              autoFocus
                                              className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600 font-extrabold text-slate-950 bg-white text-lg"
                                            />
                                            <button
                                              type="button"
                                              onClick={() => handleUpdateFormMemberField(idx, "isCustomRole", false)}
                                              className="p-3 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors border border-transparent hover:border-slate-300"
                                              title="ड्रॉपडाऊनवर परत जा"
                                            >
                                              <X className="size-5" />
                                            </button>
                                          </div>
                                        ) : (
                                          <select
                                            value={m.role}
                                            onChange={(e) => {
                                              if (e.target.value === "__CUSTOM__") {
                                                handleUpdateFormMemberField(idx, "isCustomRole", true);
                                                handleUpdateFormMemberField(idx, "role", "");
                                              } else {
                                                handleUpdateFormMemberField(idx, "role", e.target.value);
                                              }
                                            }}
                                            className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600 font-extrabold text-slate-950 bg-white text-lg cursor-pointer"
                                          >
                                            <option value="">-- पद निवडा --</option>
                                            {COMMITTEE_ROLES.map((roleOpt, rIdx) => (
                                              <option key={rIdx} value={roleOpt}>{roleOpt}</option>
                                            ))}
                                            {m.role && !COMMITTEE_ROLES.includes(m.role) && (
                                              <option value={m.role}>{m.role}</option>
                                            )}
                                            <option value="__CUSTOM__" className="font-bold text-blue-600">-- स्वतः लिहा --</option>
                                          </select>
                                        )}
                                      </td>
                                      <td className="px-6 py-4"></td>
                                      <td className="px-6 py-4 text-center">
                                        <div className="flex items-center justify-center gap-1">
                                          <button
                                            type="button"
                                            disabled={idx === 0}
                                            onClick={() => moveFormMember(idx, "up")}
                                            className="p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800 rounded-lg transition-colors border border-transparent disabled:opacity-30 disabled:hover:bg-transparent"
                                            title="वर घ्या"
                                          >
                                            <ChevronUp className="size-5" />
                                          </button>
                                          <button
                                            type="button"
                                            disabled={idx === formMembers.length - 1}
                                            onClick={() => moveFormMember(idx, "down")}
                                            className="p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800 rounded-lg transition-colors border border-transparent disabled:opacity-30 disabled:hover:bg-transparent"
                                            title="खाली घ्या"
                                          >
                                            <ChevronDown className="size-5" />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              handleRemoveFormMemberRow(idx)
                                            }
                                            className="p-2 text-red-500 hover:bg-red-50 hover:text-red-700 rounded-xl transition-colors border border-transparent hover:border-red-200"
                                            title="काढून टाका"
                                          >
                                            <Trash2 className="size-5" />
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>

                            {/* Save Primary Details Button */}
                            <div className="flex justify-end pt-4">
                              <button
                                type="button"
                                onClick={async () => {
                                  await handleSaveCommitteeProfile();
                                  setFormStep(2);
                                }}
                                disabled={isSavingProfile}
                                className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-black uppercase tracking-wider transition-all shadow-md disabled:opacity-50"
                              >
                                <Save className="size-4" />
                                {isSavingProfile ? "सेव्ह होत आहे..." : "सेव्ह करा आणि पुढे जा"}
                              </button>
                            </div>

                            {/* Datalists for Comboboxes */}
                            {/* Removed datalists as we are now using select elements */}
                          </div>
                        </>
                      )}

                      {formStep === 2 && (
                        <div className="space-y-12">
                          {/* Month Selection Navbar & Metadata */}
                          <div className="bg-slate-50 border border-slate-200/80 p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-[2rem] space-y-6">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                              <div className="space-y-1">
                                <label className="text-sm font-black text-slate-800 uppercase tracking-wider block">
                                  मासिक सभा महिना निवडा (Select Meeting Month)
                                </label>
                                <p className="text-xs text-slate-500 font-bold">
                                  प्रत्येक महिन्यासाठी पूर्व-निर्धारित विषय आणि ठराव लोड करण्यासाठी महिना निवडा.
                                </p>
                              </div>
                              {loadingTemplate && (
                                <div className="flex items-center gap-2 text-xs font-black text-blue-600 bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-xl self-start md:self-auto animate-pulse">
                                  <div className="size-3.5 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
                                  <span>टेम्पलेट लोड होत आहे...</span>
                                </div>
                              )}
                            </div>

                            {/* Horizontal Month Navbar */}
                            <div className="flex overflow-x-auto gap-2.5 pb-2 pt-1 -mx-2 px-2 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                              {(selectedCommittee?.id === "alumni" ? ALUMNI_MEETINGS : ACADEMIC_MONTHS).map((m) => {
                                const isSelected = selectedMonth === m.id;
                                const currentIdx = ACADEMIC_MONTHS.findIndex(x => x.id === currentMonth);
                                const mIdx = ACADEMIC_MONTHS.findIndex(x => x.id === m.id);
                                const isFuture = selectedCommittee?.id !== "alumni" && mIdx > currentIdx && currentIdx !== -1;
                                return (
                                  <button
                                    key={m.id}
                                    type="button"
                                    disabled={loadingTemplate || isFuture}
                                    onClick={() => handleMonthChange(m.id)}
                                    className={`px-5 py-3 rounded-xl text-sm font-black uppercase tracking-wider transition-all duration-300 shrink-0 cursor-pointer ${isSelected
                                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25 scale-[1.03]"
                                      : "bg-white text-slate-600 hover:text-slate-955 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 active:scale-95 disabled:opacity-50"
                                      }`}
                                  >
                                    {m.name} ({m.english}) {isFuture && "(येणार)"}
                                  </button>
                                );
                              })}
                            </div>

                            {/* Year & Date Selection options appearing after month selection */}
                            <AnimatePresence>
                              {selectedMonth && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: "auto" }}
                                  exit={{ opacity: 0, height: 0 }}
                                  transition={{ duration: 0.3 }}
                                  className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4 border-t border-slate-200 overflow-hidden"
                                >
                                  <div className="space-y-2">
                                    <label className="text-sm font-black text-slate-800 block">
                                      शैक्षणिक वर्ष निवडा (Select Academic Year)
                                    </label>
                                    <select
                                      value={academicYear}
                                      onChange={(e) => setAcademicYear(e.target.value)}
                                      className="w-full px-5 py-4 bg-white border-2 border-slate-300 rounded-xl text-base font-extrabold outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600 text-slate-955 shadow-md cursor-pointer transition-all"
                                    >
                                      <option value="२०२४-२५">२०२४-२५</option>
                                      <option value="२०२५-२६">२०२५-२६</option>
                                      <option value="२०२६-२७">२०२६-२७</option>
                                      <option value="२०२७-२८">२०२७-२८</option>
                                    </select>
                                  </div>

                                  <div className="space-y-2">
                                    <label className="text-sm font-black text-slate-800 block">
                                      सभा क्रमांक प्रविष्ट करा (Enter Meeting Number)
                                    </label>
                                    <input
                                      type="text"
                                      value={meetingNumber}
                                      onChange={(e) => setMeetingNumber(e.target.value)}
                                      placeholder="उदा. १, २, ३..."
                                      className="w-full px-5 py-4 bg-white border-2 border-slate-300 rounded-xl text-base font-extrabold outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600 text-slate-955 shadow-md transition-all"
                                    />
                                  </div>

                                  <div className="space-y-2">
                                    <label className="text-sm font-black text-slate-800 block">
                                      सभा दिनांक निवडा (Select Meeting Date)
                                    </label>
                                    <div className="relative">
                                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 size-5 pointer-events-none" />
                                      <input
                                        type="date"
                                        value={meetingDate}
                                        onChange={(e) => handleDateChange(e.target.value)}
                                        className="w-full pl-12 pr-5 py-3.5 bg-white border-2 border-slate-300 rounded-xl text-base font-extrabold outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600 text-slate-955 cursor-pointer shadow-md transition-all"
                                      />
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>

                          {selectedMonth && (
                            <>
                              {/* Complete Primary Info, Intro Paragraph & Committee Members Table Structure (Fully Editable) */}
                              <div className="bg-white border-2 border-slate-300 p-6 sm:p-8 rounded-2xl space-y-8 shadow-sm">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-slate-100 pb-4">
                                  <div>
                                    <h3 className="text-xl font-black text-slate-900">
                                      १. शाळा व समिती प्राथमिक माहिती
                                    </h3>
                                    <p className="text-xs font-bold text-slate-500 mt-1">
                                      खालील सर्व प्राथमिक माहिती व सदस्यांची यादी थेट संपादित (Edit) करता येईल.
                                    </p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      await handleSaveCommitteeProfile();
                                      toast.success(lang === "mr" ? "प्राथमिक माहिती व सदस्य यादी जतन झाली!" : "Primary details and members saved!");
                                    }}
                                    disabled={isSavingProfile}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-sm disabled:opacity-50 self-start sm:self-auto cursor-pointer"
                                  >
                                    <Save className="size-4" />
                                    {isSavingProfile ? "सेव्ह होत आहे..." : "बदल जतन करा"}
                                  </button>
                                </div>

                                {/* Editable Primary Info Fields Box */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-5 rounded-2xl border-2 border-slate-200">
                                  <div className="space-y-1.5">
                                    <label className="text-slate-700 font-black block text-xs">शाळेचे नाव:</label>
                                    <input
                                      type="text"
                                      value={schoolName}
                                      onChange={(e) => setSchoolName(e.target.value)}
                                      placeholder="शाळेचे नाव..."
                                      className="w-full px-4 py-2.5 bg-white border-2 border-slate-300 rounded-xl text-sm font-extrabold text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600 shadow-sm"
                                    />
                                  </div>
                                  <div className="space-y-1.5">
                                    <label className="text-slate-700 font-black block text-xs">समितीचे नाव:</label>
                                    <input
                                      type="text"
                                      value={committeeName}
                                      onChange={(e) => setCommitteeName(e.target.value)}
                                      placeholder="समितीचे नाव..."
                                      className="w-full px-4 py-2.5 bg-white border-2 border-slate-300 rounded-xl text-sm font-extrabold text-blue-700 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600 shadow-sm"
                                    />
                                  </div>
                                  <div className="space-y-1.5">
                                    <label className="text-slate-700 font-black block text-xs">मुख्याध्यापक:</label>
                                    <input
                                      type="text"
                                      value={headmasterName}
                                      onChange={(e) => setHeadmasterName(e.target.value)}
                                      placeholder="मुख्याध्यापक नाव..."
                                      className="w-full px-4 py-2.5 bg-white border-2 border-slate-300 rounded-xl text-sm font-extrabold text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600 shadow-sm"
                                    />
                                  </div>
                                  <div className="space-y-1.5">
                                    <label className="text-slate-700 font-black block text-xs">समिती अध्यक्ष:</label>
                                    <input
                                      type="text"
                                      value={presidentName}
                                      onChange={(e) => setPresidentName(e.target.value)}
                                      placeholder="अध्यक्ष नाव..."
                                      className="w-full px-4 py-2.5 bg-white border-2 border-slate-300 rounded-xl text-sm font-extrabold text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600 shadow-sm"
                                    />
                                  </div>
                                </div>

                                {/* Introductory Paragraph Box (Positioned directly between top info box and members table) */}
                                <div className="space-y-3 pt-2">
                                  <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center justify-between border-b-2 border-slate-100 pb-2">
                                    <span>२. प्रास्ताविक (INTRODUCTORY PARAGRAPH)</span>
                                  </h4>
                                  <div className="bg-slate-50 border-2 border-slate-200 p-4 sm:p-5 rounded-2xl relative space-y-2">
                                    <textarea
                                      value={customIntroText}
                                      onChange={(e) => {
                                        setCustomIntroText(e.target.value);
                                        setIsIntroEdited(true);
                                      }}
                                      placeholder="प्रास्ताविक मजकूर प्रविष्ट करा..."
                                      className="w-full h-28 px-5 py-4 border-2 border-slate-300 rounded-xl bg-white font-extrabold text-slate-950 text-base leading-relaxed outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600 resize-y shadow-inner"
                                    />
                                  </div>
                                </div>

                                {/* Committee Members Table (Shows ONLY filled members) */}
                                <div className="space-y-3 pt-2">
                                  <div className="flex items-center justify-between border-b-2 border-slate-100 pb-3">
                                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest">
                                      ३. समिती सदस्यांची नावे ({formMembers.filter((m: any) => m.name?.trim() || m.post?.trim() || m.role?.trim()).length} सदस्य)
                                    </h4>
                                    <button
                                      type="button"
                                      onClick={handleAddFormMemberRow}
                                      className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-sm cursor-pointer"
                                    >
                                      <UserPlus className="size-4" /> + सदस्य जोडा
                                    </button>
                                  </div>

                                  <div className="overflow-x-auto border-2 border-slate-300 rounded-2xl bg-white shadow-sm">
                                    <table className="w-full text-left border-collapse text-base">
                                      <thead>
                                        <tr className="bg-slate-100 text-slate-800 font-black border-b-2 border-slate-300">
                                          <th className="px-1.5 py-3.5 text-center w-16 border-r border-slate-200">अ.क्र.</th>
                                          <th className="px-4 py-3.5 border-r border-slate-200 w-[35%] min-w-[220px]">सदस्याचे नाव</th>
                                          <th className="px-4 py-3.5 border-r border-slate-200 min-w-[200px]">पदनाम (Designation)</th>
                                          <th className="px-4 py-3.5 border-r border-slate-200 min-w-[180px]">पद (Post)</th>
                                          <th className="px-4 py-3.5 text-center w-24 border-r border-slate-200">स्वाक्षरी</th>
                                          <th className="px-4 py-3.5 text-center w-20">कृती</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-200 font-extrabold text-slate-950">
                                        {formMembers
                                          .map((m: any, originalIdx: number) => ({ ...m, originalIdx }))
                                          .filter((m: any) => m.name?.trim() !== "" || m.post?.trim() !== "" || m.role?.trim() !== "").length > 0 ? (
                                          formMembers
                                            .map((m: any, originalIdx: number) => ({ ...m, originalIdx }))
                                            .filter((m: any) => m.name?.trim() !== "" || m.post?.trim() !== "" || m.role?.trim() !== "")
                                            .map((m: any, displayIdx: number) => {
                                              const idx = m.originalIdx;
                                              return (
                                                <tr key={idx} className="hover:bg-slate-50/50">
                                                  <td className="px-3 py-3 text-center text-slate-500 font-extrabold text-lg border-r border-slate-200">
                                                    {displayIdx + 1}
                                                  </td>
                                                  <td className="px-4 py-3 border-r border-slate-200">
                                                    <input
                                                      type="text"
                                                      value={m.name}
                                                      onChange={(e) => handleUpdateFormMemberField(idx, "name", e.target.value)}
                                                      placeholder="सदस्याचे नाव प्रविष्ट करा..."
                                                      className="w-full px-4 py-2.5 border-2 border-slate-300 rounded-lg outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600 font-extrabold text-slate-950 bg-white text-base shadow-sm"
                                                    />
                                                  </td>
                                                  <td className="px-4 py-3 border-r border-slate-200">
                                                    {m.isCustomPost ? (
                                                      <div className="flex gap-2">
                                                        <input
                                                          type="text"
                                                          value={m.post}
                                                          onChange={(e) => handleUpdateFormMemberField(idx, "post", e.target.value)}
                                                          placeholder="स्वतः लिहा..."
                                                          className="w-full px-4 py-2.5 border-2 border-slate-300 rounded-lg outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600 font-extrabold text-slate-950 bg-white text-base shadow-sm"
                                                        />
                                                        <button
                                                          type="button"
                                                          onClick={() => handleUpdateFormMemberField(idx, "isCustomPost", false)}
                                                          className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg"
                                                        >
                                                          <X className="size-4" />
                                                        </button>
                                                      </div>
                                                    ) : (
                                                      <select
                                                        value={m.post}
                                                        onChange={(e) => {
                                                          if (e.target.value === "__CUSTOM__") {
                                                            handleUpdateFormMemberField(idx, "isCustomPost", true);
                                                            handleUpdateFormMemberField(idx, "post", "");
                                                          } else {
                                                            handleUpdateFormMemberField(idx, "post", e.target.value);
                                                          }
                                                        }}
                                                        className="w-full px-4 py-2.5 border-2 border-slate-300 rounded-lg outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600 font-extrabold text-slate-950 bg-white text-base cursor-pointer shadow-sm"
                                                      >
                                                        <option value="">-- पदनाम निवडा --</option>
                                                        {selectedCommittee && getCommitteeDesignations(selectedCommittee.id).map((designation, dIdx) => (
                                                          <option key={dIdx} value={designation}>{designation}</option>
                                                        ))}
                                                        {m.post && selectedCommittee && !getCommitteeDesignations(selectedCommittee.id).includes(m.post) && (
                                                          <option value={m.post}>{m.post}</option>
                                                        )}
                                                        <option value="__CUSTOM__" className="font-bold text-blue-600">-- स्वतः लिहा --</option>
                                                      </select>
                                                    )}
                                                  </td>
                                                  <td className="px-4 py-3 border-r border-slate-200">
                                                    {m.isCustomRole ? (
                                                      <div className="flex gap-2">
                                                        <input
                                                          type="text"
                                                          value={m.role}
                                                          onChange={(e) => handleUpdateFormMemberField(idx, "role", e.target.value)}
                                                          placeholder="स्वतः लिहा..."
                                                          className="w-full px-4 py-2.5 border-2 border-slate-300 rounded-lg outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600 font-extrabold text-slate-950 bg-white text-base shadow-sm"
                                                        />
                                                        <button
                                                          type="button"
                                                          onClick={() => handleUpdateFormMemberField(idx, "isCustomRole", false)}
                                                          className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg"
                                                        >
                                                          <X className="size-4" />
                                                        </button>
                                                      </div>
                                                    ) : (
                                                      <select
                                                        value={m.role}
                                                        onChange={(e) => {
                                                          if (e.target.value === "__CUSTOM__") {
                                                            handleUpdateFormMemberField(idx, "isCustomRole", true);
                                                            handleUpdateFormMemberField(idx, "role", "");
                                                          } else {
                                                            handleUpdateFormMemberField(idx, "role", e.target.value);
                                                          }
                                                        }}
                                                        className="w-full px-4 py-2.5 border-2 border-slate-300 rounded-lg outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600 font-extrabold text-slate-950 bg-white text-base cursor-pointer shadow-sm"
                                                      >
                                                        <option value="">-- पद निवडा --</option>
                                                        {COMMITTEE_ROLES.map((roleOpt, rIdx) => (
                                                          <option key={rIdx} value={roleOpt}>{roleOpt}</option>
                                                        ))}
                                                        {m.role && !COMMITTEE_ROLES.includes(m.role) && (
                                                          <option value={m.role}>{m.role}</option>
                                                        )}
                                                        <option value="__CUSTOM__" className="font-bold text-blue-600">-- स्वतः लिहा --</option>
                                                      </select>
                                                    )}
                                                  </td>
                                                  <td className="px-4 py-3 text-center text-slate-400 font-bold italic border-r border-slate-200">
                                                    स्वाक्षरी
                                                  </td>
                                                  <td className="px-4 py-3 text-center">
                                                    <div className="flex items-center justify-center gap-1">
                                                      <button
                                                        type="button"
                                                        disabled={idx === 0}
                                                        onClick={() => moveFormMember(idx, "up")}
                                                        className="p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800 rounded-lg transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                                                        title="वर घ्या"
                                                      >
                                                        <ChevronUp className="size-4" />
                                                      </button>
                                                      <button
                                                        type="button"
                                                        disabled={idx === formMembers.length - 1}
                                                        onClick={() => moveFormMember(idx, "down")}
                                                        className="p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800 rounded-lg transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                                                        title="खाली घ्या"
                                                      >
                                                        <ChevronDown className="size-4" />
                                                      </button>
                                                      <button
                                                        type="button"
                                                        onClick={() => handleRemoveFormMemberRow(idx)}
                                                        className="p-2 text-red-500 hover:bg-red-50 hover:text-red-700 rounded-xl transition-colors"
                                                        title="सदस्य काढून टाका"
                                                      >
                                                        <Trash2 className="size-5" />
                                                      </button>
                                                    </div>
                                                  </td>
                                                </tr>
                                              );
                                            })
                                        ) : (
                                          <tr>
                                            <td colSpan={6} className="px-4 py-8 text-center text-slate-500 font-bold">
                                              कोणताही सदस्य प्रविष्ट केलेला नाही. नवीन सदस्य जोडण्यासाठी वर '+ सदस्य जोडा' वर क्लिक करा.
                                            </td>
                                          </tr>
                                        )}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              </div>

                              {/* Introductory Paragraph Preview */}
                              {selectedMonth && (
                                <div className="pt-8 pb-4 font-sans">
                                  <div className="bg-white border-2 border-slate-300 p-8 rounded-2xl relative space-y-4 shadow-sm">
                                    <h3 className="text-lg font-black text-slate-800 uppercase tracking-widest border-b-2 border-slate-100 pb-3">
                                      २. प्रास्ताविक (Introductory Paragraph)
                                    </h3>
                                    <textarea
                                      value={customIntroText}
                                      onChange={(e) => {
                                        setCustomIntroText(e.target.value);
                                        setIsIntroEdited(true);
                                      }}
                                      className="w-full h-32 px-6 py-5 border-2 border-slate-300 rounded-xl bg-slate-50 font-extrabold text-slate-950 text-lg leading-relaxed shadow-inner outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600 resize-y"
                                    />
                                  </div>
                                </div>
                              )}

                              {/* Dynamic Subjects and Resolutions Section */}
                              {selectedMonth && formResolutions.length === 0 ? (
                                <div className="pt-8 border-t border-slate-100 space-y-6">
                                  <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-8 text-center space-y-4">
                                    <div className="size-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
                                      <Info className="size-8 text-amber-600" />
                                    </div>
                                    <h3 className="text-lg font-black text-amber-800">
                                      या महिन्यासाठी पूर्व-निर्धारित विषय उपलब्ध नाहीत
                                    </h3>
                                    <p className="text-sm font-bold text-amber-600 max-w-lg mx-auto">
                                      तुम्हाला हवे असल्यास तुमचे स्वतःचे विषय आणि ठराव जोडू शकता.
                                      जतन केल्यानंतर ते फक्त तुमच्यासाठी उपलब्ध राहतील.
                                    </p>
                                    {!showCustomForm && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          // Calculate cumulative start resolution number from admin templates cache
                                          if (selectedCommittee && selectedMonth) {
                                            const monthsList = ["06", "07", "08", "09", "10", "11", "12", "01", "02", "03", "04", "05"];
                                            const targetIdx = monthsList.indexOf(selectedMonth);
                                            let calcStartNo = 1;
                                            if (targetIdx > 0) {
                                              const preceding = monthsList.slice(0, targetIdx);
                                              const totalPreceding = preceding.reduce((sum, m) => {
                                                const subjects = cachedAdminTemplates[m]?.subjects || [];
                                                return sum + subjects.length;
                                              }, 0);
                                              calcStartNo = 1 + totalPreceding;
                                            }
                                            setStartResolutionNo(calcStartNo);
                                            // Directly create first resolution with correct number
                                            if (formResolutions.length === 0) {
                                              setFormResolutions([{
                                                subjectNo: 1,
                                                resolutionNo: calcStartNo,
                                                subject: "",
                                                discussion: "",
                                                resolution: "",
                                                remark: "",
                                                proposer: "",
                                                seconder: "",
                                                statusText: "ठराव सर्वानुमते मंजूर करण्यात आला.",
                                              }]);
                                            }
                                          } else {
                                            if (formResolutions.length === 0) {
                                              handleAddFormResolutionRow();
                                            }
                                          }
                                          setShowCustomForm(true);
                                        }}
                                        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl text-sm font-black uppercase tracking-wider transition-all shadow-lg hover:shadow-xl active:scale-95 cursor-pointer mt-2"
                                      >
                                        <Plus className="size-4" /> विषय आणि ठराव जोडा
                                      </button>
                                    )}
                                  </div>

                                  {/* Custom Resolutions Form for non-current month */}
                                  {showCustomForm && (
                                    <div className="space-y-6 font-sans">
                                      <div className="flex items-center justify-between border-b-2 border-slate-100 pb-3">
                                        <h3 className="text-lg font-black text-slate-800 uppercase tracking-widest">
                                          ३. तुमचे विषय आणि ठराव
                                        </h3>
                                        <div className="flex items-center gap-3">
                                          <button
                                            type="button"
                                            onClick={handleAddFormResolutionRow}
                                            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-black uppercase tracking-wider transition-all shadow-md cursor-pointer"
                                          >
                                            <Plus className="size-4" /> विषय व ठराव जोडा
                                          </button>
                                          <button
                                            type="button"
                                            onClick={saveTeacherCustomTemplate}
                                            disabled={savingCustomTemplate || formResolutions.length === 0}
                                            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl text-sm font-black uppercase tracking-wider transition-all shadow-md disabled:opacity-50 cursor-pointer"
                                          >
                                            {savingCustomTemplate ? (
                                              <>
                                                <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                जतन होत आहे...
                                              </>
                                            ) : (
                                              <>
                                                <Save className="size-4" /> विषय व ठराव जतन करा
                                              </>
                                            )}
                                          </button>
                                        </div>
                                      </div>

                                      <div className="space-y-6">
                                        {formResolutions.map((res: any, index: number) => (
                                          <div
                                            key={index}
                                            className="bg-white border-2 border-slate-300 p-8 rounded-2xl relative space-y-6 shadow-sm"
                                          >
                                            <div className="absolute top-6 right-6 flex items-center gap-1">
                                              <button
                                                type="button"
                                                disabled={index === 0}
                                                onClick={() => moveFormResolution(index, "up")}
                                                className="p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 rounded-xl transition-colors border border-transparent disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
                                                title="वर घ्या"
                                              >
                                                <ChevronUp className="size-5" />
                                              </button>
                                              <button
                                                type="button"
                                                disabled={index === formResolutions.length - 1}
                                                onClick={() => moveFormResolution(index, "down")}
                                                className="p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 rounded-xl transition-colors border border-transparent disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
                                                title="खाली घ्या"
                                              >
                                                <ChevronDown className="size-5" />
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  handleRemoveFormResolutionRow(index)
                                                }
                                                className="p-2 text-red-500 hover:bg-red-50 hover:text-red-700 rounded-xl transition-colors border border-transparent hover:border-red-200 cursor-pointer"
                                                title="Delete this block"
                                              >
                                                <Trash2 className="size-5" />
                                              </button>
                                            </div>

                                            <div className="grid grid-cols-2 gap-6 w-5/6">
                                              <div className="space-y-1.5">
                                                <label className="text-xs font-black text-slate-500 uppercase tracking-wider block">
                                                  विषय क्रमांक
                                                </label>
                                                <input
                                                  type="number"
                                                  value={res.subjectNo}
                                                  onChange={(e) =>
                                                    handleUpdateFormResolutionField(
                                                      index,
                                                      "subjectNo",
                                                      Number(e.target.value),
                                                    )
                                                  }
                                                  className="w-24 px-4 py-3 border-2 border-slate-300 rounded-lg outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600 font-extrabold text-lg text-slate-900 bg-white"
                                                />
                                              </div>
                                              <div className="space-y-1.5">
                                                <label className="text-xs font-black text-slate-500 uppercase tracking-wider block">
                                                  ठराव क्रमांक
                                                </label>
                                                <input
                                                  type="number"
                                                  value={res.resolutionNo}
                                                  onChange={(e) =>
                                                    handleUpdateFormResolutionField(
                                                      index,
                                                      "resolutionNo",
                                                      Number(e.target.value),
                                                    )
                                                  }
                                                  className="w-24 px-4 py-3 border-2 border-slate-300 rounded-lg outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600 font-extrabold text-lg text-slate-900 bg-white"
                                                />
                                              </div>
                                            </div>

                                            <div className="space-y-2">
                                              <label className="text-base font-black text-slate-800 tracking-wider block">
                                                विषय (Subject Title)
                                              </label>
                                              <input
                                                type="text"
                                                value={res.subject}
                                                onChange={(e) =>
                                                  handleUpdateFormResolutionField(
                                                    index,
                                                    "subject",
                                                    e.target.value,
                                                  )
                                                }
                                                placeholder="उदा. मागील सभेचे इतिवृत्त वाचून मंजूर करणेबाबत."
                                                className="w-full px-5 py-3.5 border-2 border-slate-300 rounded-xl outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600 font-extrabold text-slate-950 bg-white text-lg placeholder-slate-400"
                                              />
                                            </div>

                                            <div className="space-y-2">
                                              <label className="text-base font-black text-slate-800 tracking-wider block">
                                                ठराव तपशील (Resolution Details)
                                              </label>
                                              <textarea
                                                value={res.resolution || ""}
                                                onChange={(e) =>
                                                  handleUpdateFormResolutionField(
                                                    index,
                                                    "resolution",
                                                    e.target.value,
                                                  )
                                                }
                                                placeholder="ठरावाचा सविस्तर तपशील लिहा..."
                                                className="w-full h-40 px-5 py-4 border-2 border-slate-300 rounded-xl outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600 font-extrabold text-slate-950 bg-white text-lg placeholder-slate-400 resize-y leading-relaxed"
                                              />
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                                              <div className="space-y-2">
                                                <label className="text-base font-black text-slate-800 tracking-wider block">
                                                  सूचक (Proposer)
                                                </label>
                                                <select
                                                  value={res.proposer}
                                                  onChange={(e) =>
                                                    handleUpdateFormResolutionField(
                                                      index,
                                                      "proposer",
                                                      e.target.value,
                                                    )
                                                  }
                                                  className="w-full px-5 py-3.5 border-2 border-slate-300 rounded-xl outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600 bg-white font-extrabold text-slate-950 text-lg cursor-pointer shadow-sm"
                                                >
                                                  <option value="">-- सूचक निवडा --</option>
                                                  {formMembers.map(
                                                    (m: any, mIdx: number) =>
                                                      m.name && (
                                                        <option key={mIdx} value={m.name}>
                                                          {m.name} ({m.post})
                                                        </option>
                                                      ),
                                                  )}
                                                </select>
                                              </div>
                                              <div className="space-y-2">
                                                <label className="text-base font-black text-slate-800 tracking-wider block">
                                                  अनुमोदक (Seconder)
                                                </label>
                                                <select
                                                  value={res.seconder}
                                                  onChange={(e) =>
                                                    handleUpdateFormResolutionField(
                                                      index,
                                                      "seconder",
                                                      e.target.value,
                                                    )
                                                  }
                                                  className="w-full px-5 py-3.5 border-2 border-slate-300 rounded-xl outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600 bg-white font-extrabold text-slate-950 text-lg cursor-pointer shadow-sm"
                                                >
                                                  <option value="">-- अनुमोदक निवडा --</option>
                                                  {formMembers.map(
                                                    (m: any, mIdx: number) =>
                                                      m.name && (
                                                        <option key={mIdx} value={m.name}>
                                                          {m.name} ({m.post})
                                                        </option>
                                                      ),
                                                  )}
                                                </select>
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>

                                      {/* Save Custom Template Button (bottom) */}
                                      {formResolutions.length > 0 && (
                                        <div className="flex items-center justify-end pt-4">
                                          <button
                                            type="button"
                                            onClick={saveTeacherCustomTemplate}
                                            disabled={savingCustomTemplate}
                                            className="flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl text-sm font-black uppercase tracking-wider transition-all shadow-lg hover:shadow-xl disabled:opacity-50 cursor-pointer"
                                          >
                                            {savingCustomTemplate ? (
                                              <>
                                                <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                जतन होत आहे...
                                              </>
                                            ) : (
                                              <>
                                                <Save className="size-4" /> विषय व ठराव जतन करा
                                              </>
                                            )}
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="space-y-6 pt-8 border-t border-slate-100 font-sans">
                                  <div className="flex items-center justify-between border-b-2 border-slate-100 pb-3">
                                    <h3 className="text-lg font-black text-slate-800 uppercase tracking-widest">
                                      ३. विषय आणि ठराव तपशील
                                    </h3>
                                    <button
                                      type="button"
                                      onClick={handleAddFormResolutionRow}
                                      className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-black uppercase tracking-wider transition-all shadow-md"
                                    >
                                      <Plus className="size-4" /> विषय व ठराव जोडा
                                    </button>
                                  </div>

                                  <div className="space-y-6">
                                    {formResolutions.map((res: any, index: number) => (
                                      <div
                                        key={index}
                                        className="bg-white border-2 border-slate-300 p-8 rounded-2xl relative space-y-6 shadow-sm"
                                      >
                                        <div className="absolute top-6 right-6 flex items-center gap-1">
                                          <button
                                            type="button"
                                            disabled={index === 0}
                                            onClick={() => moveFormResolution(index, "up")}
                                            className="p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 rounded-xl transition-colors border border-transparent disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
                                            title="वर घ्या"
                                          >
                                            <ChevronUp className="size-5" />
                                          </button>
                                          <button
                                            type="button"
                                            disabled={index === formResolutions.length - 1}
                                            onClick={() => moveFormResolution(index, "down")}
                                            className="p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 rounded-xl transition-colors border border-transparent disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
                                            title="खाली घ्या"
                                          >
                                            <ChevronDown className="size-5" />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              handleRemoveFormResolutionRow(index)
                                            }
                                            className="p-2 text-red-500 hover:bg-red-50 hover:text-red-700 rounded-xl transition-colors border border-transparent hover:border-red-200 cursor-pointer"
                                            title="Delete this block"
                                          >
                                            <Trash2 className="size-5" />
                                          </button>
                                        </div>

                                        <div className="grid grid-cols-2 gap-6 w-5/6">
                                          <div className="space-y-1.5">
                                            <label className="text-xs font-black text-slate-500 uppercase tracking-wider block">
                                              विषय क्रमांक
                                            </label>
                                            <input
                                              type="number"
                                              value={res.subjectNo}
                                              onChange={(e) =>
                                                handleUpdateFormResolutionField(
                                                  index,
                                                  "subjectNo",
                                                  Number(e.target.value),
                                                )
                                              }
                                              className="w-24 px-4 py-3 border-2 border-slate-300 rounded-lg outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600 font-extrabold text-lg text-slate-900 bg-white"
                                            />
                                          </div>
                                          <div className="space-y-1.5">
                                            <label className="text-xs font-black text-slate-500 uppercase tracking-wider block">
                                              ठराव क्रमांक
                                            </label>
                                            <input
                                              type="number"
                                              value={res.resolutionNo}
                                              onChange={(e) =>
                                                handleUpdateFormResolutionField(
                                                  index,
                                                  "resolutionNo",
                                                  Number(e.target.value),
                                                )
                                              }
                                              className="w-24 px-4 py-3 border-2 border-slate-300 rounded-lg outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600 font-extrabold text-lg text-slate-900 bg-white"
                                            />
                                          </div>
                                        </div>

                                        <div className="space-y-2">
                                          <label className="text-base font-black text-slate-800 tracking-wider block">
                                            विषय (Subject Title)
                                          </label>
                                          <input
                                            type="text"
                                            value={res.subject}
                                            onChange={(e) =>
                                              handleUpdateFormResolutionField(
                                                index,
                                                "subject",
                                                e.target.value,
                                              )
                                            }
                                            placeholder="उदा. मागील सभेचे इतिवृत्त वाचून मंजूर करणेबाबत."
                                            className="w-full px-5 py-3.5 border-2 border-slate-300 rounded-xl outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600 font-extrabold text-slate-950 bg-white text-lg placeholder-slate-400"
                                          />
                                        </div>



                                        <div className="space-y-2">
                                          <label className="text-base font-black text-slate-800 tracking-wider block">
                                            ठराव तपशील (Resolution Details)
                                          </label>
                                          <textarea
                                            value={res.resolution || ""}
                                            onChange={(e) =>
                                              handleUpdateFormResolutionField(
                                                index,
                                                "resolution",
                                                e.target.value,
                                              )
                                            }
                                            placeholder="ठरावाचा सविस्तर तपशील लिहा..."
                                            className="w-full h-40 px-5 py-4 border-2 border-slate-300 rounded-xl outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600 font-extrabold text-slate-950 bg-white text-lg placeholder-slate-400 resize-y leading-relaxed"
                                          />
                                        </div>



                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                                          <div className="space-y-2">
                                            <label className="text-base font-black text-slate-800 tracking-wider block">
                                              सूचक (Proposer)
                                            </label>
                                            <select
                                              value={res.proposer}
                                              onChange={(e) =>
                                                handleUpdateFormResolutionField(
                                                  index,
                                                  "proposer",
                                                  e.target.value,
                                                )
                                              }
                                              className="w-full px-5 py-3.5 border-2 border-slate-300 rounded-xl outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600 bg-white font-extrabold text-slate-950 text-lg cursor-pointer shadow-sm"
                                            >
                                              <option value="">-- सूचक निवडा --</option>
                                              {formMembers.map(
                                                (m: any, mIdx: number) =>
                                                  m.name && (
                                                    <option key={mIdx} value={m.name}>
                                                      {m.name} ({m.post})
                                                    </option>
                                                  ),
                                              )}
                                            </select>
                                          </div>
                                          <div className="space-y-2">
                                            <label className="text-base font-black text-slate-800 tracking-wider block">
                                              अनुमोदक (Seconder)
                                            </label>
                                            <select
                                              value={res.seconder}
                                              onChange={(e) =>
                                                handleUpdateFormResolutionField(
                                                  index,
                                                  "seconder",
                                                  e.target.value,
                                                )
                                              }
                                              className="w-full px-5 py-3.5 border-2 border-slate-300 rounded-xl outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600 bg-white font-extrabold text-slate-950 text-lg cursor-pointer shadow-sm"
                                            >
                                              <option value="">-- अनुमोदक निवडा --</option>
                                              {formMembers.map(
                                                (m: any, mIdx: number) =>
                                                  m.name && (
                                                    <option key={mIdx} value={m.name}>
                                                      {m.name} ({m.post})
                                                    </option>
                                                  ),
                                              )}
                                            </select>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Outro Paragraph Section */}
                              {selectedMonth && (
                                <div className="space-y-6 pt-8 border-t border-slate-100 font-sans">
                                  <div className="border-b-2 border-slate-100 pb-3">
                                    <h3 className="text-lg font-black text-slate-800 uppercase tracking-widest">
                                      ४. आभार प्रदर्शन व सभा सांगता परिच्छेद
                                    </h3>
                                  </div>

                                  <div className="bg-white border-2 border-slate-300 p-8 rounded-2xl shadow-sm space-y-4">
                                    <label className="text-base font-black text-slate-800 tracking-wider block">
                                      परिच्छेद मजकूर (Paragraph Details)
                                    </label>
                                    <textarea
                                      value={formOutroText}
                                      onChange={(e) => setFormOutroText(e.target.value)}
                                      placeholder="उदा. ऐन वेळेस उपस्थित होणाऱ्या विषयांवर चर्चा करून..."
                                      className="w-full h-32 px-5 py-4 border-2 border-slate-300 rounded-xl outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600 font-extrabold text-slate-950 bg-white text-lg placeholder-slate-400 resize-y leading-relaxed"
                                    />
                                  </div>
                                </div>
                              )}

                              {/* Form Submission Button */}
                              <div className="border-t border-slate-100 pt-8 flex items-center justify-end">
                                <button
                                  type="button"
                                  onClick={handleSaveMeeting}
                                  disabled={isSubmitting}
                                  className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl px-16 py-5 shadow-xl hover:shadow-2xl hover:opacity-95 disabled:opacity-50 transition-all text-sm font-black uppercase tracking-widest flex items-center gap-2"
                                >
                                  {isSubmitting ? (
                                    <>
                                      <div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                      जतन होत आहे...
                                    </>
                                  ) : (
                                    <>
                                      <CheckCircle2 size={18} /> बैठक नोंद जतन करा
                                    </>
                                  )}
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </PinGate>
      </main>
    </div>
  );
}
