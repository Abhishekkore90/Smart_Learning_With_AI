import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Download,
  Share2,
  Save,
  User,
  GraduationCap,
  Type,
  Palette as PaletteIcon,
  Sparkles,
  Image as ImageIcon,
  CheckCircle2,
  Loader2,
  Crown,
  Rocket,
  Flame,
  Zap,
  Trophy,
  Cake,
  Send,
  MessageCircle,
  Heart,
  Star,
  PartyPopper,
  School,
  BookOpen,
  Compass,
  Flag,
  Calendar,
  Medal,
  Theater,
  Mic2,
  Music,
  Palette,
  Award,
  FileText,
} from "lucide-react";
import { useState, useRef, useMemo, useEffect } from "react";
import { flushSync } from "react-dom";
import { TeacherHeader } from "@/components/teacher/TeacherHeader";
import { TeacherSidebar } from "@/components/teacher/TeacherSidebar";
import { showToast as toast } from "@/lib/custom-toast";
import { useLanguage } from "@/hooks/use-language";
import { db } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";
import { toPng } from "html-to-image";
import {
  CornerOrnaments,
  CelebrationBalloonsLeft,
  CelebrationBalloonsRight,
  FestiveBirthdayCake,
  GoldenLaurelWreath,
  FloatingSparkles,
  CardBackgroundThemeLayer,
} from "@/components/teacher/CreativeCardDecorations";

export const Route = createFileRoute("/teacher/templates/edit/$templateId")({
  component: TemplateEditorPage,
});

const TEMPLATE_CONFIGS: Record<string, any> = {
  // Birthday Templates
  "birthday-1": {
    name: "Luxury Gold Royale",
    bg: "linear-gradient(135deg, #1a1a1a 0%, #3d2b1f 100%)",
    accent:
      "linear-gradient(to right, #bf953f, #fcf6ba, #b38728, #fbf5b7, #aa771c)",
    icon: Crown,
    title: "Happy Birthday!",
    quote: "May your day be as royal and golden as your future.",
    particleColor: "rgba(251, 245, 183, 0.4)",
  },
  "birthday-2": {
    name: "Cosmic Nebula",
    bg: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)",
    accent: "linear-gradient(to right, #818cf8, #c084fc, #e879f9)",
    icon: Rocket,
    title: "Celestial Celebration!",
    quote: "Shooting for the stars on your special day. Keep shining bright!",
    particleColor: "rgba(192, 132, 252, 0.4)",
  },
  "birthday-3": {
    name: "Emerald Gardenia",
    bg: "linear-gradient(135deg, #064e3b 0%, #022c22 100%)",
    accent: "linear-gradient(to right, #34d399, #6ee7b7, #10b981)",
    icon: Sparkles,
    title: "Birthday Blossoms",
    quote: "Wishing you a day filled with natural joy and infinite growth.",
    particleColor: "rgba(110, 231, 183, 0.4)",
  },
  "birthday-4": {
    name: "Sunset Ember",
    bg: "linear-gradient(135deg, #450a0a 0%, #7f1d1d 100%)",
    accent: "linear-gradient(to right, #f87171, #fb923c, #facc15)",
    icon: Flame,
    title: "Birthday Blaze!",
    quote:
      "Ignite your potential. Today is the spark for your greatest year yet.",
    particleColor: "rgba(251, 146, 60, 0.4)",
  },
  "birthday-5": {
    name: "Electric Azure",
    bg: "linear-gradient(135deg, #0c4a6e 0%, #082f49 100%)",
    accent: "linear-gradient(to right, #38bdf8, #818cf8, #2dd4bf)",
    icon: Zap,
    title: "Shockingly Awesome!",
    quote: "May your energy electrify the world. Have a powerful birthday!",
    particleColor: "rgba(56, 189, 248, 0.4)",
  },
  "birthday-6": {
    name: "Midnight Diamond",
    bg: "linear-gradient(135deg, #09090b 0%, #18181b 100%)",
    accent: "linear-gradient(to right, #94a3b8, #f8fafc, #64748b)",
    icon: Trophy,
    title: "Rare & Brilliant",
    quote: "You are a true gem. May your brilliance illuminate every path.",
    particleColor: "rgba(248, 250, 252, 0.4)",
  },
  // Admission Templates
  "admission-1": {
    name: "Royal Ivy Welcome",
    bg: "linear-gradient(135deg, #064e3b 0%, #1a2e21 100%)",
    accent: "linear-gradient(to right, #bf953f, #fcf6ba, #b38728)",
    icon: School,
    title: "Welcome to School!",
    quote:
      "Congratulations! We are thrilled to welcome you to our school family.",
    particleColor: "rgba(251, 245, 183, 0.3)",
  },
  "admission-2": {
    name: "Future Leaders Glow",
    bg: "linear-gradient(135deg, #4c1d95 0%, #1e1b4b 100%)",
    accent: "linear-gradient(to right, #a78bfa, #818cf8, #6366f1)",
    icon: Crown,
    title: "Welcome Dear Student!",
    quote:
      "Congratulations on your admission! Your bright future begins here with us.",
    particleColor: "rgba(167, 139, 250, 0.3)",
  },
  "admission-3": {
    name: "Academic Spark Hub",
    bg: "linear-gradient(135deg, #78350f 0%, #451a03 100%)",
    accent: "linear-gradient(to right, #fbbf24, #f59e0b, #d97706)",
    icon: BookOpen,
    title: "Congratulations!",
    quote:
      "Welcome to our school. We're excited to help you unlock your full potential.",
    particleColor: "rgba(251, 191, 36, 0.3)",
  },
  "admission-4": {
    name: "Oceanic Merit Shield",
    bg: "linear-gradient(135deg, #164e63 0%, #083344 100%)",
    accent: "linear-gradient(to right, #22d3ee, #0d9488, #2dd4bf)",
    icon: GraduationCap,
    title: "Welcome On Board!",
    quote:
      "Congratulations on joining our academy. Let's sail towards success together.",
    particleColor: "rgba(34, 211, 238, 0.3)",
  },
  "admission-5": {
    name: "Sunset Success Blaze",
    bg: "linear-gradient(135deg, #7f1d1d 0%, #450a0a 100%)",
    accent: "linear-gradient(to right, #f87171, #fbbf24, #facc15)",
    icon: Trophy,
    title: "Welcome Achiever!",
    quote:
      "Congratulations! You're now a part of our winning school community.",
    particleColor: "rgba(248, 113, 113, 0.3)",
  },
  "admission-6": {
    name: "Infinite Wisdom Star",
    bg: "linear-gradient(135deg, #312e81 0%, #1e1b4b 100%)",
    accent: "linear-gradient(to right, #818cf8, #c084fc, #e879f9)",
    icon: Compass,
    title: "Welcome to Excellence!",
    quote:
      "Congratulations on your admission. A world of wisdom awaits you here.",
    particleColor: "rgba(129, 140, 248, 0.3)",
  },
  // Sports Templates
  "sports-1": {
    name: "Grand Sports Day Invitation",
    bg: "linear-gradient(135deg, #450a0a 0%, #991b1b 100%)",
    accent: "linear-gradient(to right, #facc15, #fbbf24, #f59e0b)",
    icon: Flag,
    title: "YOU'RE INVITED!",
    quote: "Join us for a day of speed, strength, and school spirit!",
    particleColor: "rgba(250, 204, 21, 0.3)",
  },
  "sports-2": {
    name: "Victory Award Ceremony",
    bg: "linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)",
    accent: "linear-gradient(to right, #818cf8, #c084fc, #e879f9)",
    icon: Calendar,
    title: "OFFICIAL INVITATION",
    quote: "Celebrating our athletes' incredible journey and achievements.",
    particleColor: "rgba(129, 140, 248, 0.3)",
  },
  "sports-3": {
    name: "Gold Medal Achievement",
    bg: "linear-gradient(135deg, #1a1a1a 0%, #3d2b1f 100%)",
    accent: "linear-gradient(to right, #bf953f, #fcf6ba, #b38728)",
    icon: Medal,
    title: "CHAMPION!",
    quote: "Hard work pays off. Congratulations on your historic win!",
    particleColor: "rgba(251, 245, 183, 0.3)",
  },
  "sports-4": {
    name: "Athlete of the Year",
    bg: "linear-gradient(135deg, #064e3b 0%, #065f46 100%)",
    accent: "linear-gradient(to right, #34d399, #6ee7b7, #10b981)",
    icon: Trophy,
    title: "GOLDEN ACHIEVEMENT",
    quote: "You've set the bar high. A true inspiration to the whole school.",
    particleColor: "rgba(52, 211, 153, 0.3)",
  },
  // Annual Function Templates
  "annual-1": {
    name: "Royal Stage Welcome",
    bg: "linear-gradient(135deg, #1a1a1a 0%, #3d2b1f 100%)",
    accent: "linear-gradient(to right, #bf953f, #fcf6ba, #b38728)",
    icon: Theater,
    title: "THE STAGE IS SET!",
    quote: "Step into a night of wonder and celebration. Witness the magic!",
    particleColor: "rgba(251, 245, 183, 0.3)",
  },
  "annual-2": {
    name: "Golden Legacy Awards",
    bg: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)",
    accent: "linear-gradient(to right, #facc15, #fbbf24, #f59e0b)",
    icon: Trophy,
    title: "HONORING EXCELLENCE",
    quote: "Celebrating the hard work, talent, and achievements of our stars.",
    particleColor: "rgba(250, 204, 21, 0.3)",
  },
  "annual-3": {
    name: "Retro Drama Gala",
    bg: "linear-gradient(135deg, #450a0a 0%, #7f1d1d 100%)",
    accent: "linear-gradient(to right, #f87171, #fb923c, #facc15)",
    icon: Mic2,
    title: "A DRAMATIC NIGHT",
    quote: "Experience the timeless stories brought to life by our performers.",
    particleColor: "rgba(248, 113, 113, 0.3)",
  },
  "annual-4": {
    name: "Futuristic Fusion",
    bg: "linear-gradient(135deg, #0c4a6e 0%, #082f49 100%)",
    accent: "linear-gradient(to right, #38bdf8, #818cf8, #2dd4bf)",
    icon: Rocket,
    title: "FUSION FIESTA 2026",
    quote: "Where tradition meets the future. A high-energy showcase!",
    particleColor: "rgba(56, 189, 248, 0.3)",
  },
  "annual-5": {
    name: "Midnight Symphony",
    bg: "linear-gradient(135deg, #09090b 0%, #18181b 100%)",
    accent: "linear-gradient(to right, #94a3b8, #f8fafc, #64748b)",
    icon: Music,
    title: "GRAND FINALE",
    quote: "The final symphony of a year filled with growth and joy.",
    particleColor: "rgba(248, 250, 252, 0.3)",
  },
  // Cultural Templates
  "cultural-1": {
    name: "Paint & Splash Hub",
    bg: "linear-gradient(135deg, #064e3b 0%, #065f46 100%)",
    accent: "linear-gradient(to right, #34d399, #6ee7b7, #10b981)",
    icon: Palette,
    title: "CREATIVE CANVAS",
    quote: "Let your colors tell a story. Express your artistic soul!",
    particleColor: "rgba(52, 211, 153, 0.3)",
  },
  "cultural-2": {
    name: "Rhythm & Beats",
    bg: "linear-gradient(135deg, #4c1d95 0%, #1e1b4b 100%)",
    accent: "linear-gradient(to right, #a78bfa, #818cf8, #6366f1)",
    icon: Music,
    title: "DANCE REVOLUTION",
    quote: "Feel the beat, own the stage. Show the world your moves!",
    particleColor: "rgba(167, 139, 250, 0.3)",
  },
  "cultural-3": {
    name: "Traditional Roots",
    bg: "linear-gradient(135deg, #78350f 0%, #451a03 100%)",
    accent: "linear-gradient(to right, #fbbf24, #f59e0b, #d97706)",
    icon: School,
    title: "CULTURAL PRIDE",
    quote: "Celebrating the vibrant traditions that make us who we are.",
    particleColor: "rgba(251, 191, 36, 0.3)",
  },
  "cultural-4": {
    name: "Neon Talent Hunt",
    bg: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)",
    accent: "linear-gradient(to right, #22d3ee, #0d9488, #2dd4bf)",
    icon: Sparkles,
    title: "SHINE BRIGHT!",
    quote: "Uncover the hidden star within you. Your time to shine is now!",
    particleColor: "rgba(34, 211, 238, 0.3)",
  },
  "cultural-5": {
    name: "Storyteller's Nook",
    bg: "linear-gradient(135deg, #7f1d1d 0%, #450a0a 100%)",
    accent: "linear-gradient(to right, #f87171, #fbbf24, #facc15)",
    icon: BookOpen,
    title: "ONCE UPON A TIME...",
    quote: "Enchant us with your tales and take us to far-off worlds.",
    particleColor: "rgba(248, 113, 113, 0.3)",
  },
  // Achievement Templates
  "achievement-1": {
    name: "Elite Scholar Award",
    bg: "linear-gradient(135deg, #1e3a8a 0%, #1e1b4b 100%)",
    accent: "linear-gradient(to right, #fbbf24, #f59e0b, #d97706)",
    icon: Trophy,
    title: "CONGRATULATIONS!",
    quote: "Excellence is not a skill, it's an attitude. Well deserved!",
    particleColor: "rgba(251, 191, 36, 0.3)",
  },
  "achievement-2": {
    name: "Perfect Attendance",
    bg: "linear-gradient(135deg, #064e3b 0%, #065f46 100%)",
    accent: "linear-gradient(to right, #34d399, #6ee7b7, #10b981)",
    icon: Calendar,
    title: "DEDICATION AWARD",
    quote: "Your consistency is the foundation of your success. Well done!",
    particleColor: "rgba(52, 211, 153, 0.3)",
  },
  "achievement-3": {
    name: "Rising Star Growth",
    bg: "linear-gradient(135deg, #4c1d95 0%, #2e1065 100%)",
    accent: "linear-gradient(to right, #a78bfa, #818cf8, #6366f1)",
    icon: Sparkles,
    title: "RISING STAR!",
    quote: "Watching you grow and succeed is our greatest reward.",
    particleColor: "rgba(167, 139, 250, 0.3)",
  },
  "achievement-4": {
    name: "Citizen of Honor",
    bg: "linear-gradient(135deg, #7f1d1d 0%, #450a0a 100%)",
    accent: "linear-gradient(to right, #f87171, #fb923c, #facc15)",
    icon: Medal,
    title: "HONOR & INTEGRITY",
    quote: "Integrity and character define a true leader. We're proud of you!",
    particleColor: "rgba(248, 113, 113, 0.3)",
  },
};


const BACKGROUND_IMAGE_OPTIONS = [
  {
    id: "balloons",
    label: "🎈 3D Golden Balloons",
    labelMr: "🎈 ३D सोनेरी फुगे",
    url: "/templates/birthday_balloons_3d.jpg",
  },
  {
    id: "galaxy",
    label: "🌌 Cosmic Galaxy",
    labelMr: "🌌 कॉस्मिक आकाशगंगा",
    url: "/templates/birthday_galaxy_3d.jpg",
  },
  {
    id: "cake",
    label: "🎂 3D Cake Studio",
    labelMr: "🎂 ३D केक स्टुडिओ",
    url: "/templates/birthday_clean_3d.jpg",
  },
  {
    id: "poster",
    label: "✨ Royal Celebration",
    labelMr: "✨ रॉयल सेलिब्रेशन",
    url: "/templates/birthday_poster_hd.jpg",
  },
  {
    id: "redcarpet",
    label: "🏆 Red Carpet Gala",
    labelMr: "🏆 रेड कार्पेट सन्मान",
    url: "/templates/studentofmonth_red_carpet_3d.jpg",
  },
  {
    id: "library",
    label: "📚 Scholastic Hall",
    labelMr: "📚 भव्य ग्रंथालय हॉल",
    url: "/templates/studentofmonth_library_3d.jpg",
  },
  {
    id: "stage",
    label: "🎭 Annual Stage",
    labelMr: "🎭 वार्षिक महोत्सव मंच",
    url: "/templates/annual_hd.jpg",
  },
  {
    id: "award",
    label: "🎖️ Merit Citation",
    labelMr: "🎖️ सुवर्ण सन्मान",
    url: "/templates/achievement_clean_3d.jpg",
  },
];

function TemplateEditorPage() {
  const { templateId } = Route.useParams();
  const { lang } = useLanguage();
  const [studentName, setStudentName] = useState("ADITYA SHINDE");
  const [studentClass, setStudentClass] = useState("CLASS 5-A");
  const [cardTitle, setCardTitle] = useState("");
  const [cardQuote, setCardQuote] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const templateRef = useRef<HTMLDivElement>(null);
  const [studentPhoto, setStudentPhoto] = useState<string | null>(null);
  const [selectedBgTheme, setSelectedBgTheme] = useState<string>("auto");
  const [selectedBgImage, setSelectedBgImage] = useState<string>(() => {
    if (templateId?.includes("birthday-2")) return "/templates/birthday_galaxy_3d.jpg";
    if (templateId?.includes("birthday-3")) return "/templates/birthday_clean_3d.jpg";
    if (templateId?.includes("birthday")) return "/templates/birthday_balloons_3d.jpg";
    if (templateId?.includes("studentofmonth")) return "/templates/studentofmonth_red_carpet_3d.jpg";
    if (templateId?.includes("achievement")) return "/templates/achievement_clean_3d.jpg";
    if (templateId?.includes("annual")) return "/templates/annual_hd.jpg";
    return "/templates/birthday_balloons_3d.jpg";
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setStudentPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const config = useMemo(() => {
    if (TEMPLATE_CONFIGS[templateId]) return TEMPLATE_CONFIGS[templateId];

    // Improved Fallback
    const isAdmission = templateId?.includes("admission");
    const isSports = templateId?.includes("sports");
    const isAnnual = templateId?.includes("annual");
    const isCultural = templateId?.includes("cultural");
    const isAchievement = templateId?.includes("achievement");

    return {
      bg: isAdmission
        ? "linear-gradient(135deg, #064e3b 0%, #022c22 100%)"
        : isSports
          ? "linear-gradient(135deg, #450a0a 0%, #7f1d1d 100%)"
          : isAnnual
            ? "linear-gradient(135deg, #1a1a1a 0%, #3d2b1f 100%)"
            : isCultural
              ? "linear-gradient(135deg, #064e3b 0%, #065f46 100%)"
              : isAchievement
                ? "linear-gradient(135deg, #1e3a8a 0%, #1e1b4b 100%)"
                : "linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)",
      accent: "linear-gradient(to right, #ffffff, #ffffff)",
      icon: isAdmission
        ? School
        : isSports
          ? Trophy
          : isAnnual
            ? Theater
            : isCultural
              ? Palette
              : isAchievement
                ? Award
                : Cake,
      title: isAdmission
        ? "Welcome to School!"
        : isSports
          ? "Sports Victory!"
          : isAnnual
            ? "Annual Gala!"
            : isCultural
              ? "Cultural Star!"
              : isAchievement
                ? "Congratulations!"
                : "Happy Birthday!",
      quote: isAdmission
        ? "Congratulations! Welcome to our school family."
        : "Have a wonderful day filled with joy!",
      particleColor: "rgba(255, 255, 255, 0.4)",
    };
  }, [templateId]);

  const translatedTitle = useMemo(() => {
    if (lang === "mr") {
      if (templateId?.startsWith("birthday")) {
        if (templateId === "birthday-2") return "खगोलीय सोहळा!";
        if (templateId === "birthday-3") return "उगवते चैतन्य!";
        if (templateId === "birthday-4") return "यशस्वी तेजस्विता!";
        if (templateId === "birthday-5") return "उर्जावान वाढदिवस!";
        if (templateId === "birthday-6") return "अमूल्य हिरा!";
        return "वाढदिवसाच्या हार्दिक शुभेच्छा!";
      }
      if (templateId?.startsWith("admission")) {
        if (templateId === "admission-2") return " स्वागत आहे प्रिय विद्यार्थ्या!";
        if (templateId === "admission-4") return "सहर्ष स्वागत!";
        if (templateId === "admission-5") return "स्वागत विजेत्याचे!";
        if (templateId === "admission-6") return "स्वागत यशाचे!";
        return "शाळेत आपले सहर्ष स्वागत!";
      }
      if (templateId?.startsWith("sports")) {
        if (templateId === "sports-1") return "आग्रहाचे आमंत्रण!";
        if (templateId === "sports-2") return "अधिकृत आमंत्रण";
        if (templateId === "sports-3") return "विजेता!";
        return "सुवर्ण पदक यश संपादन!";
      }
      if (templateId?.startsWith("annual")) {
        if (templateId === "annual-1") return "मंच सज्ज आहे!";
        if (templateId === "annual-2") return "उत्कृष्टतेचा सन्मान";
        if (templateId === "annual-3") return "नाट्यमय संध्याकाळ";
        if (templateId === "annual-4") return "फ्युजन सोहळा २०२६";
        return "महा सोहळा";
      }
      if (templateId?.startsWith("cultural")) {
        if (templateId === "cultural-1") return "सर्जनशील कॅनव्हास";
        if (templateId === "cultural-2") return "नृत्य क्रांती";
        if (templateId === "cultural-3") return "सांस्कृतिक अभिमान";
        if (templateId === "cultural-4") return "तेजस्वी व्हा!";
        return "एकदा एका काळी...";
      }
      if (templateId?.startsWith("achievement")) {
        if (templateId === "achievement-2") return "उपस्थिती गौरव पुरस्कार";
        if (templateId === "achievement-3") return "उगवता तारा!";
        if (templateId === "achievement-4") return "सन्मान व प्रामाणिकता";
        return "हार्दिक अभिनंदन!";
      }
    } else if (lang === "hi") {
      if (templateId?.startsWith("birthday")) {
        if (templateId === "birthday-2") return "खगोलीय उत्सव!";
        if (templateId === "birthday-3") return "जन्मदिन बहार!";
        if (templateId === "birthday-4") return "जन्मदिन की ज्वाला!";
        if (templateId === "birthday-5") return "अद्भुत रूप से शानदार!";
        if (templateId === "birthday-6") return "दुर्लभ और शानदार!";
        return "जन्मदिन की हार्दिक शुभकामनाएं!";
      }
      if (templateId?.startsWith("admission")) {
        if (templateId === "admission-2") return "प्रिय छात्र, आपका स्वागत है!";
        if (templateId === "admission-4") return "बोर्ड पर आपका स्वागत है!";
        if (templateId === "admission-5") return "अचीवर का स्वागत है!";
        if (templateId === "admission-6") return "उत्कृष्टता में आपका स्वागत है!";
        return "स्कूल में आपका स्वागत है!";
      }
      if (templateId?.startsWith("sports")) {
        if (templateId === "sports-1") return "आपको आमंत्रित किया गया है!";
        if (templateId === "sports-2") return "आधिकारिक आमंत्रण";
        if (templateId === "sports-3") return "चैंपियन!";
        return "स्वर्ण पदक उपलब्धि!";
      }
      if (templateId?.startsWith("annual")) {
        if (templateId === "annual-1") return "मंच तैयार है!";
        if (templateId === "annual-2") return "उत्कृष्टता का सम्मान";
        if (templateId === "annual-3") return "एक नाटकीय रात";
        if (templateId === "annual-4") return "फ्यूजन उत्सव २०२६";
        return "महा समारोह";
      }
      if (templateId?.startsWith("cultural")) {
        if (templateId === "cultural-1") return "सृजनात्मक कैनवास";
        if (templateId === "cultural-2") return "डांस रेवोल्यूशन";
        if (templateId === "cultural-3") return "सांस्कृतिक गौरव";
        if (templateId === "cultural-4") return "चमक उठें!";
        return "एक समय की बात है...";
      }
      if (templateId?.startsWith("achievement")) {
        if (templateId === "achievement-2") return "समर्पण पुरस्कार";
        if (templateId === "achievement-3") return "उगता सितारा!";
        if (templateId === "achievement-4") return "सम्मान और ईमानदारी";
        return "बधाई हो!";
      }
    }
    return config.title;
  }, [config.title, templateId, lang]);

  const translatedQuote = useMemo(() => {
    if (lang === "mr") {
      if (templateId?.startsWith("birthday")) {
        if (templateId === "birthday-1") return "तुमचे आयुष्य तुमच्या भविष्यासारखेच शाही आणि सुवर्णमयी असो.";
        if (templateId === "birthday-2") return "तुमच्या या विशेष दिवशी यशाची उंच शिखरे गाठा. सदैव चमकत राहा!";
        if (templateId === "birthday-3") return "तुम्हाला नैसर्गिक आनंद आणि शाश्वत प्रगतीने समृद्ध आयुष्य लाभो.";
        if (templateId === "birthday-4") return "तुमची क्षमता ओळखा. आजचा दिवस तुमच्या सर्वोत्तम वर्षाची सुरुवात करो.";
        if (templateId === "birthday-5") return "तुमची उर्जा संपूर्ण जगाला प्रकाशमय करो. वाढदिवसाच्या हार्दिक शुभेच्छा!";
        return "तुम्ही एक मौल्यवान रत्न आहात. तुमची चमक प्रत्येक मार्गाला सुकर करो.";
      }
      if (templateId?.startsWith("admission")) {
        if (templateId === "admission-1") return "हार्दिक अभिनंदन! आमच्या शालेय परिवारात स्वागत करताना आम्हाला आनंद होत आहे.";
        if (templateId === "admission-2") return "नवीन प्रवेशाबद्दल अभिनंदन! तुमचे उज्ज्वल भविष्य आजपासून येथे सुरू होत आहे.";
        if (templateId === "admission-3") return "शाळेत आपले स्वागत आहे. तुमची कौशल्ये विकसित करण्यासाठी आम्ही कटिबद्ध आहोत.";
        if (templateId === "admission-4") return "शाळेत प्रवेश घेतल्याबद्दल अभिनंदन. चला यशाच्या दिशेने एकत्र वाटचाल करूया.";
        if (templateId === "admission-5") return "अभिनंदन! तुम्ही आता आमच्या विजयी शालेय समुदायाचा एक भाग आहात.";
        return "प्रवेशाबद्दल अभिनंदन. ज्ञानाचे एक मोठे दालन आता तुमच्यासाठी खुले आहे.";
      }
      if (templateId?.startsWith("sports")) {
        if (templateId === "sports-1") return "वेग, ताकद आणि शालेय उत्साहाच्या सोहळ्यात सहभागी व्हा!";
        if (templateId === "sports-2") return "आमच्या क्रीडापटूंच्या अविश्वसनीय प्रवासाचे आणि यशाचे कौतुक सोहळा.";
        if (templateId === "sports-3") return "कष्ट फळले! तुमच्या ऐतिहासिक विजयाबद्दल तुमचे खूप अभिनंदन!";
        return "तुम्ही एक नवा आदर्श प्रस्थापित केला आहे. संपूर्ण शाळेसाठी एक खरी प्रेरणा.";
      }
      if (templateId?.startsWith("annual")) {
        if (templateId === "annual-1") return "अद्भूत आणि उत्साहाच्या संध्याकाळमध्ये सामील व्हा. जादूचे साक्षीदार व्हा!";
        if (templateId === "annual-2") return "आमच्या ताऱ्यांच्या कठोर परिश्रम, प्रतिभा आणि यशाचा गौरव सोहळा.";
        if (templateId === "annual-3") return "आमच्या कलाकारांनी जिवंत केलेल्या अजरामर कथांचा अनुभव घ्या.";
        if (templateId === "annual-4") return "जिथे परंपरांचा आणि भविष्याचा मेळ होतो. एक उर्जावान सोहळा!";
        return "आनंद आणि विकासाने समृद्ध असलेल्या वर्षाची सांगता.";
      }
      if (templateId?.startsWith("cultural")) {
        if (templateId === "cultural-1") return "तुमच्या रंगांना एक कथा सांगू द्या. तुमची कला व्यक्त करा!";
        if (templateId === "cultural-2") return "ताल अनुभवा, मंचावर अधिराज्य गाजवा. जगाला तुमची कला दाखवा!";
        if (templateId === "cultural-3") return "आपल्याला समृद्ध करणाऱ्या सळसळत्या परंपरांचा उत्सव साजरा करा.";
        if (templateId === "cultural-4") return "तुमच्यातील लपलेला तारा शोधा. चमकण्याची वेळ आता आली आहे!";
        return "तुमच्या अद्भुत कथांनी आम्हाला मंत्रमुग्ध करा आणि एका वेगळ्या जगात घेऊन जा.";
      }
      if (templateId?.startsWith("admission")) {
        if (templateId === "admission-1") return "बधाई हो! हमारे स्कूल परिवार में आपका स्वागत करते हुए हमें बेहद खुशी है।";
        if (templateId === "admission-2") return "प्रवेश मिलने पर बधाई! आपका उज्ज्वल भविष्य आज से हमारे साथ शुरू हो रहा है।";
        if (templateId === "admission-3") return "स्कूल में आपका स्वागत है। आपकी पूरी क्षमता को उजागर करने में मदद करने के लिए हम उत्सुक हैं।";
        if (templateId === "admission-4") return "अकादमी में शामिल होने पर बधाई। आइए मिलकर सफलता की ओर कदम बढ़ाएं।";
        if (templateId === "admission-5") return "बधाई हो! अब आप हमारे विजयी स्कूल समुदाय का हिस्सा हैं।";
        return "प्रवेश पर बधाई। यहाँ ज्ञान का एक अनूठा संसार आपका इंतजार कर रहा है।";
      }
      if (templateId?.startsWith("sports")) {
        if (templateId === "sports-1") return "रफ़्तार, ताक़त और स्कूल भावना से भरे इस दिन में हमारे साथ शामिल हों!";
        if (templateId === "sports-2") return "हमारे एथलीटों की अविश्वसनीय यात्रा और उपलब्धियों का जश्न मनाते हुए।";
        if (templateId === "sports-3") return "कड़ी मेहनत रंग लाती है। आपकी ऐतिहासिक जीत पर बधाई!";
        return "आपने एक ऊँचा मानदंड स्थापित किया है। पूरे स्कूल के लिए एक सच्ची प्रेरणा।";
      }
      if (templateId?.startsWith("annual")) {
        if (templateId === "annual-1") return "अद्भुत और उत्सव की रात में शामिल हों। जादू के साक्षी बनें!";
        if (templateId === "annual-2") return "हमारे सितारों की कड़ी मेहनत, प्रतिभा और उपलब्धियों का उत्सव।";
        if (templateId === "annual-3") return "हमारे कलाकारों द्वारा जीवंत की गई कालजयी कहानियों का अनुभव करें।";
        if (templateId === "annual-4") return "जहां परंपरा का भविष्य से मेल होता है। एक उच्च ऊर्जा वाला शो!";
        return "विकास और खुशियों से भरे एक शानदार वर्ष का अंतिम सोपान।";
      }
      if (templateId?.startsWith("cultural")) {
        if (templateId === "cultural-1") return "अपने रंगों को एक कहानी बयां करने दें। अपनी कलात्मक आत्मा को व्यक्त करें!";
        if (templateId === "cultural-2") return "ताल महसूस करें, मंच पर राज करें। दुनिया को अपनी कला दिखाएं!";
        if (templateId === "cultural-3") return "उन जीवंत परंपराओं का जश्न मनाएं जो हमें अद्वितीय बनाती हैं।";
        if (templateId === "cultural-4") return "अपने भीतर छिपे सितारे को खोजें। आपके चमकने का समय आ गया है!";
        return "अपनी कहानियों से हमें मंत्रमुग्ध करें और दूरदराज के देशों की सैर कराएं।";
      }
      if (templateId?.startsWith("achievement")) {
        if (templateId === "achievement-1") return "उत्कृष्टता कोई कौशल नहीं, बल्कि एक दृष्टिकोण है। बहुत-बहुत बधाई!";
        if (templateId === "achievement-2") return "आपकी निरंतरता ही आपकी सफलता की नींव है। बहुत बढ़िया!";
        if (templateId === "achievement-3") return "आपको बढ़ते और सफल होते देखना हमारा सबसे बड़ा पुरस्कार है।";
        return "ईमानदारी और चरित्र एक सच्चे नेता की पहचान हैं। हमें आप पर गर्व है!";
      }
    }
    return config.quote;
  }, [config.quote, templateId, lang]);

  useEffect(() => {
    setCardTitle(translatedTitle);
  }, [translatedTitle]);

  useEffect(() => {
    setCardQuote(translatedQuote);
  }, [translatedQuote]);

  const configTrans = useMemo(() => {
    return { ...config, title: translatedTitle, quote: translatedQuote };
  }, [config, translatedTitle, translatedQuote]);

  const configToUse = useMemo(() => {
    return {
      ...configTrans,
      title: cardTitle,
      quote: cardQuote,
    };
  }, [configTrans, cardTitle, cardQuote]);

  const isAnnual = templateId?.includes("annual");
  const isCultural = templateId?.includes("cultural");
  const isAchievement = templateId?.includes("achievement");
  const isBirthday = templateId?.includes("birthday") || (!isAnnual && !isCultural && !isAchievement && !templateId?.includes("sports") && !templateId?.includes("admission"));
  const isSports = templateId?.includes("sports");
  const isAdmission = templateId?.includes("admission");

  const handleShareToStudent = async () => {
    setIsSaving(true);
    try {
      const type = templateId?.includes("admission")
        ? "Welcome"
        : templateId?.includes("sports")
          ? "Sports"
          : templateId?.includes("annual")
            ? "Annual"
            : templateId?.includes("cultural")
              ? "Cultural"
              : templateId?.includes("achievement")
                ? "Achievement"
                : "Birthday";

      await addDoc(collection(db, "shared_cards"), {
        templateId,
        studentName,
        studentClass,
        title: cardTitle,
        quote: cardQuote,
        studentPhoto: studentPhoto || "",
        createdAt: new Date().toISOString(),
        type,
      });

      toast.success(
        lang === "mr"
          ? `कार्ड यशस्वीरित्या ${studentName} च्या डॅशबोर्डवर शेअर केले!`
          : lang === "hi"
            ? `कार्ड सफलतापूर्वक ${studentName} के डैशबोर्ड पर साझा किया गया!`
            : `${type} card published to ${studentName}'s dashboard!`
      );
    } catch (error) {
      console.error("Error sharing card:", error);
      toast.error("Failed to share card to dashboard.");
    } finally {
      setIsSaving(false);
    }
  };



  const generateCardImage = async () => {
    if (!templateRef.current) {
      throw new Error("Card element not found");
    }

    const dataUrl = await toPng(templateRef.current, {
      quality: 1.0,
      pixelRatio: 3,
      cacheBust: true,
    });

    const res = await fetch(dataUrl);
    const blob = await res.blob();

    const safeStudentName = (studentName || "student").trim().replace(/\s+/g, '_');
    const safeTitle = (cardTitle || configToUse.title || "card").trim().replace(/\s+/g, '_');
    const filename = `${safeStudentName}_${safeTitle}.png`;

    return { blob, dataUrl, filename };
  };

  const handleDownloadTemplate = async () => {
    if (!templateRef.current) return;
    setIsDownloading(true);

    try {
      const { dataUrl, filename } = await generateCardImage();
      const link = document.createElement("a");
      link.download = filename;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(
        lang === "mr"
          ? "कार्ड यशस्वीरित्या डाउनलोड झाले!"
          : lang === "hi"
            ? "कार्ड सफलतापूर्वक डाउनलोड हुआ!"
            : "Card downloaded successfully!"
      );
    } catch (error) {
      console.error("Error downloading card:", error);
      const errMsg = error instanceof Error ? error.message : String(error);
      toast.error(
        lang === "mr"
          ? `कार्ड डाउनलोड करण्यात त्रुटी: ${errMsg}`
          : lang === "hi"
            ? `कार्ड डाउनलोड करने में त्रुटि: ${errMsg}`
            : `Failed to download card: ${errMsg}`
      );
    } finally {
      setIsDownloading(false);
    }
  };

  const handleWhatsAppShare = async () => {
    if (!templateRef.current) return;
    setIsDownloading(true);

    try {
      const { blob, dataUrl, filename } = await generateCardImage();
      const file = new File([blob], filename, { type: "image/png" });

      let sharedSuccessfully = false;

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
          });
          toast.success(
            lang === "mr" ? "कार्ड यशस्वीरित्या शेअर केले!" : "Card shared successfully!"
          );
          sharedSuccessfully = true;
        } catch (shareErr: any) {
          if (shareErr.name === "AbortError") {
            return;
          }
          console.error("Native share failed:", shareErr);
        }
      }

      if (!sharedSuccessfully) {
        try {
          await navigator.clipboard.write([
            new window.ClipboardItem({
              "image/png": blob,
            }),
          ]);
          toast.success(
            lang === "mr"
              ? "कार्ड इमेज कॉपी झाली! आता WhatsApp मध्ये पेस्ट (Ctrl+V) करा."
              : "Card image copied! Paste it in WhatsApp (Ctrl+V)."
          );

          setTimeout(() => {
            window.open("https://wa.me/", "_blank");
          }, 1200);
        } catch (err) {
          console.error("Clipboard failed, downloading file fallback:", err);
          const link = document.createElement("a");
          link.download = filename;
          link.href = dataUrl;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          toast.success(
            lang === "mr"
              ? "कार्ड इमेज डाउनलोड झाली! आता WhatsApp मध्ये जोडा (Attach)."
              : "Card image downloaded! Attach it in WhatsApp."
          );

          setTimeout(() => {
            window.open("https://wa.me/", "_blank");
          }, 1200);
        }
      }
    } catch (error: any) {
      console.error("Error sharing card:", error);
      const errMsg = error?.message || String(error);
      toast.error(
        lang === "mr"
          ? `कार्ड शेअर करण्यात त्रुटी: ${errMsg}`
          : `Failed to share card: ${errMsg}`
      );
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <TeacherHeader />
      <TeacherSidebar />

      <main className="lg:pl-0 pt-16 min-h-screen">
        <div className="p-6 md:p-10 max-w-full mx-auto grid grid-cols-1 xl:grid-cols-2 gap-10 items-start">
          {/* Editor Controls */}
          <div className="space-y-6">
            <button
              onClick={() => window.history.back()}
              className="flex items-center gap-2 text-slate-400 hover:text-slate-900 font-bold transition-all text-sm mb-4 group"
            >
              <ArrowLeft className="size-4 group-hover:-translate-x-1 transition-transform" />{" "}
              {lang === "mr"
                ? "टेम्पलेट्सवर परत जा"
                : lang === "hi"
                  ? "टेम्पलेट्स पर वापस जाएं"
                  : "Back to Templates"}
            </button>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white p-10 rounded-[3rem] shadow-xl border border-slate-100 space-y-10"
            >
              <div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tighter italic">
                  {lang === "mr"
                    ? "कला दालन"
                    : lang === "hi"
                      ? "सृजनात्मक स्टूडियो"
                      : "Creative Studio"}
                </h2>
                <p className="text-slate-400 text-xs font-black uppercase tracking-widest mt-1">
                  {lang === "mr"
                    ? "थेट सानुकूलन इंजिन"
                    : lang === "hi"
                      ? "लाइव पर्सनलाइजेशन इंजन"
                      : "Live Personalization Engine"}
                </p>
              </div>

              <div className="space-y-8">
                <div className="space-y-2 group">
                  <label className="text-xs sm:text-sm font-extrabold text-slate-700 ml-1 tracking-normal block">
                    {lang === "mr"
                      ? "विद्यार्थ्याचे पूर्ण नाव"
                      : lang === "hi"
                        ? "छात्र का पूरा नाम"
                        : "Student Full Name"}
                  </label>
                  <div className="bg-slate-50 rounded-[2rem] flex items-center gap-4 px-8 border-2 border-transparent focus-within:bg-white focus-within:border-emerald-500/20 transition-all shadow-inner">
                    <User className="size-5 text-slate-300 group-focus-within:text-emerald-500" />
                    <input
                      type="text"
                      value={studentName}
                      onChange={(e) =>
                        setStudentName(e.target.value.toUpperCase())
                      }
                      className="bg-transparent outline-none w-full py-6 text-sm font-black text-slate-900"
                    />
                  </div>
                </div>

                <div className="space-y-2 group">
                  <label className="text-xs sm:text-sm font-extrabold text-slate-700 ml-1 tracking-normal block">
                    {isAnnual ? (
                      lang === "mr" ? "कामगिरीची भूमिका" : lang === "hi" ? "प्रदर्शन की भूमिका" : "Performance Role"
                    ) : isCultural ? (
                      lang === "mr" ? "उपक्रम श्रेणी" : lang === "hi" ? "गतिविधि श्रेणी" : "Activity Category"
                    ) : isAchievement ? (
                      lang === "mr" ? "यशाचे नाव" : lang === "hi" ? "उपलब्धि का नाम" : "Achievement Title"
                    ) : (
                      lang === "mr" ? "इयत्ता आणि तुकडी" : lang === "hi" ? "कक्षा और अनुभाग" : "Class & Section"
                    )}
                  </label>
                  <div className="bg-slate-50 rounded-[2rem] flex items-center gap-4 px-8 border-2 border-transparent focus-within:bg-white focus-within:border-blue-500/20 transition-all shadow-inner">
                    {isAnnual ? (
                      <Theater className="size-5 text-slate-300 group-focus-within:text-blue-500" />
                    ) : isCultural ? (
                      <PaletteIcon className="size-5 text-slate-300 group-focus-within:text-blue-500" />
                    ) : isAchievement ? (
                      <Trophy className="size-5 text-slate-300 group-focus-within:text-blue-500" />
                    ) : (
                      <GraduationCap className="size-5 text-slate-300 group-focus-within:text-blue-500" />
                    )}
                    <input
                      type="text"
                      value={studentClass}
                      onChange={(e) =>
                        setStudentClass(e.target.value.toUpperCase())
                      }
                      className="bg-transparent outline-none w-full py-6 text-sm font-black text-slate-900"
                      placeholder={
                        isAnnual
                          ? (lang === "mr" ? "उदा. स्वागत नृत्य" : lang === "hi" ? "उदा. स्वागत नृत्य" : "E.G. WELCOME DANCE")
                          : isCultural
                            ? (lang === "mr" ? "उदा. चित्रकला स्पर्धा" : lang === "hi" ? "उदा. चित्रकला प्रतियोगिता" : "E.G. PAINTING CONTEST")
                            : isAchievement
                              ? (lang === "mr" ? "उदा. प्रथम क्रमांक" : lang === "hi" ? "उदा. प्रथम स्थान" : "E.G. CLASS TOPPER")
                              : "CLASS 5-A"
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2 group">
                  <label className="text-xs sm:text-sm font-extrabold text-slate-700 ml-1 tracking-normal block">
                    {lang === "mr" ? "कार्ड मथळा (Title)" : lang === "hi" ? "कार्ड का शीर्षक" : "Card Title"}
                  </label>
                  <div className="bg-slate-50 rounded-[2rem] flex items-center gap-4 px-8 border-2 border-transparent focus-within:bg-white focus-within:border-indigo-500/20 transition-all shadow-inner">
                    <FileText className="size-5 text-slate-300 group-focus-within:text-indigo-500" />
                    <input
                      type="text"
                      value={cardTitle}
                      onChange={(e) => setCardTitle(e.target.value)}
                      className="bg-transparent outline-none w-full py-6 text-sm font-black text-slate-900"
                    />
                  </div>
                </div>

                <div className="space-y-2 group">
                  <label className="text-xs sm:text-sm font-extrabold text-slate-700 ml-1 tracking-normal block">
                    {lang === "mr" ? "शुभेच्छा संदेश (Quote)" : lang === "hi" ? "शुभकामना संदेश (Quote)" : "Wishing Message / Quote"}
                  </label>
                  <div className="bg-slate-50 rounded-[2.5rem] flex items-start gap-4 px-8 py-4 border-2 border-transparent focus-within:bg-white focus-within:border-indigo-500/20 transition-all shadow-inner">
                    <MessageCircle className="size-5 text-slate-300 mt-2 group-focus-within:text-indigo-500" />
                    <textarea
                      value={cardQuote}
                      onChange={(e) => setCardQuote(e.target.value)}
                      rows={3}
                      className="bg-transparent outline-none w-full py-2 text-sm font-black text-slate-900 resize-none"
                    />
                  </div>
                </div>

                {/* Background Image Selection Gallery */}
                <div className="space-y-2.5 group">
                  <div className="flex items-center justify-between ml-1">
                    <label className="text-xs sm:text-sm font-extrabold text-slate-700 tracking-normal block">
                      {lang === "mr" ? "आकर्षक बॅकग्राउंड चित्र निवडा (Background Image)" : "Choose Background Image"}
                    </label>
                    <span className="text-[10px] text-pink-600 font-extrabold uppercase tracking-wider bg-pink-50 px-2 py-0.5 rounded-md border border-pink-200">
                      3D HD Scenery
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {BACKGROUND_IMAGE_OPTIONS.map((img) => (
                      <button
                        key={img.id}
                        type="button"
                        onClick={() => setSelectedBgImage(img.url)}
                        className={`group/btn relative aspect-[4/3] rounded-2xl overflow-hidden border-2 transition-all p-0.5 cursor-pointer ${
                          selectedBgImage === img.url
                            ? "border-pink-500 shadow-lg ring-2 ring-pink-500/40 scale-105 z-10"
                            : "border-slate-200 hover:border-slate-400 opacity-75 hover:opacity-100"
                        }`}
                      >
                        <img
                          src={img.url}
                          alt={img.label}
                          className="w-full h-full object-cover rounded-xl"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent flex items-end p-1">
                          <span className="text-[8px] sm:text-[9px] font-black text-white truncate drop-shadow-md w-full text-left">
                            {lang === "mr" ? img.labelMr : img.label}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Background Visual Theme Overlay Selector */}
                <div className="space-y-2 group">
                  <label className="text-xs sm:text-sm font-extrabold text-slate-700 ml-1 tracking-normal block">
                    {lang === "mr" ? "बॅकग्राउंड इफेक्ट्स (Lighting Effects)" : "Background Lighting Effects"}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: "royal-gold-bokeh", label: "🌟 Royal Gold Bokeh", labelMr: "🌟 रॉयल गोल्ड बोकेह" },
                      { id: "party-streamers", label: "🎉 Party Streamers", labelMr: "🎉 पार्टी स्ट्रीमर्स" },
                      { id: "cosmic-galaxy", label: "🌌 Cosmic Galaxy", labelMr: "🌌 कॉस्मिक गॅलक्सी" },
                      { id: "royal-palace", label: "🏛️ Red Velvet Palace", labelMr: "🏛️ रेड वेलव्हेट पॅलेस" },
                    ].map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setSelectedBgTheme(t.id)}
                        className={`px-3 py-2 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-1.5 border cursor-pointer ${
                          (selectedBgTheme === t.id || (selectedBgTheme === "auto" && t.id === "royal-gold-bokeh"))
                            ? "bg-slate-900 text-amber-300 border-slate-900 shadow-md scale-[1.02]"
                            : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {lang === "mr" ? t.labelMr : t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Photo Upload Option */}
                <div className="space-y-2 group">
                  <label className="text-xs sm:text-sm font-extrabold text-slate-700 ml-1 tracking-normal block">
                    {lang === "mr" ? "विद्यार्थ्याचा फोटो जोडा" : lang === "hi" ? "छात्र का फोटो जोड़ें" : "Add Student Photo"}
                  </label>
                  <div className="flex gap-4 items-center">
                    <input
                      type="file"
                      accept="image/*"
                      ref={fileInputRef}
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors font-bold text-xs uppercase tracking-wider rounded-2xl px-6 py-4 flex items-center gap-2 cursor-pointer shadow-sm"
                    >
                      <ImageIcon className="size-4" />
                      {studentPhoto ? (lang === "mr" ? "फोटो बदला" : "Change Photo") : (lang === "mr" ? "फोटो निवडा" : "Select Photo")}
                    </button>
                    {studentPhoto && (
                      <button
                        type="button"
                        onClick={() => setStudentPhoto(null)}
                        className="bg-red-50 border border-red-150 text-red-600 hover:bg-red-100 transition-colors font-bold text-xs uppercase tracking-wider rounded-2xl px-6 py-4 cursor-pointer shadow-sm"
                      >
                        {lang === "mr" ? "काढून टाका" : "Remove"}
                      </button>
                    )}
                  </div>
                </div>

                <div className="pt-6 space-y-4">
                  <button
                    onClick={handleShareToStudent}
                    disabled={isSaving}
                    className="w-full bg-slate-900 text-white py-6 rounded-[2rem] font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-slate-800 transition-all shadow-xl"
                  >
                    {isSaving ? (
                      <Loader2 className="size-5 animate-spin" />
                    ) : (
                      <Send className="size-5" />
                    )}{" "}
                    {lang === "mr" ? "डॅशबोर्डवर शेअर करा" : lang === "hi" ? "डैशबोर्ड पर साझा करें" : "Share to Dashboard"}
                  </button>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={handleDownloadTemplate}
                      disabled={isDownloading}
                      className="w-full bg-indigo-500 text-white py-4 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-indigo-600 transition-all shadow-lg"
                    >
                      {isDownloading ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Download className="size-4" />
                      )}{" "}
                      {lang === "mr" ? "डाउनलोड" : lang === "hi" ? "डाउनलोड" : "Download"}
                    </button>

                    <button
                      onClick={handleWhatsAppShare}
                      disabled={isDownloading}
                      className="w-full bg-[#25D366] text-white py-4 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-[#128C7E] transition-all shadow-lg"
                    >
                      {isDownloading ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Share2 className="size-4" />
                      )}{" "}
                      {lang === "mr" ? "शेअर" : lang === "hi" ? "शेयर" : "Share"}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Attractive Preview Card */}
          <div className="sticky top-24 w-full max-w-lg mx-auto xl:max-w-none">
            <motion.div
              ref={templateRef}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full aspect-[3/4] min-h-[480px] sm:min-h-[560px] rounded-[2rem] sm:rounded-[3rem] md:rounded-[4rem] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.4)] overflow-hidden relative group border-4 sm:border-8 md:border-[12px] border-white"
            >
              <div className="w-full h-full relative overflow-hidden flex flex-col">
                {/* Realistic Background Image */}
                {selectedBgImage ? (
                  <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    <img
                      src={selectedBgImage}
                      alt="Template Atmosphere"
                      className="w-full h-full object-cover object-center filter brightness-[0.52] contrast-[1.2] scale-105 transition-all duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/60 mix-blend-multiply" />
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_20%,rgba(0,0,0,0.85)_100%)]" />
                  </div>
                ) : (
                  <div
                    className="absolute inset-0"
                    style={{ background: configToUse.bg }}
                  />
                )}

                {/* Rich Theme Scenery (Bokeh Lights, Streamers, Cosmic Stars, Velvet Damask) */}
                <CardBackgroundThemeLayer themeType={selectedBgTheme} templateId={templateId} />

                {/* Animated Floating Elements */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  {[...Array(8)].map((_, i) => (
                    <motion.div
                      key={i}
                      animate={{
                        y: [0, -100, 0],
                        x: [0, Math.sin(i) * 20, 0],
                        rotate: [0, 180, 360],
                        opacity: [0.1, 0.3, 0.1],
                      }}
                      transition={{
                        duration: 8 + i,
                        repeat: Infinity,
                        delay: i * 0.5,
                      }}
                      className="absolute size-4 rounded-lg blur-[1px]"
                      style={{
                        background: configToUse.particleColor,
                        left: `${(i + 1) * 12}%`,
                        bottom: "-5%",
                      }}
                    />
                  ))}
                </div>

                {/* Decorative Glows */}
                <div className="absolute -top-32 -right-32 size-96 bg-white/10 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute -bottom-32 -left-32 size-96 bg-black/40 rounded-full blur-[120px]" />

                {/* Corner Ornaments */}
                <CornerOrnaments color="#fef08a" />

                {/* Floating Celebration Balloons & Sparkles (For Birthday & Celebratory) */}
                {isBirthday && (
                  <>
                    <CelebrationBalloonsLeft />
                    <CelebrationBalloonsRight />
                  </>
                )}
                <FloatingSparkles />

                {/* Card Content */}
                <div className="relative z-10 w-full h-full flex flex-col items-center justify-between p-4 sm:p-6 md:p-8 text-center overflow-y-auto no-scrollbar">
                  
                  {/* Top Celebratory Header Badge */}
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 border border-amber-300/40 backdrop-blur-md shadow-md mb-2 shrink-0"
                  >
                    <Sparkles className="size-3 text-amber-300 animate-spin" style={{ animationDuration: "6s" }} />
                    <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-amber-200">
                      {isBirthday
                        ? "✦ SPECIAL BIRTHDAY CELEBRATION ✦"
                        : isAchievement
                          ? "★ OFFICIAL MERIT AWARD ★"
                          : isAnnual
                            ? "✦ ANNUAL FUNCTION CELEBRATION ✦"
                            : "✦ SCHOLASTIC EXCELLENCE ✦"}
                    </span>
                    <Sparkles className="size-3 text-amber-300" />
                  </motion.div>

                  {/* Main Hero Container */}
                  <div className="w-full flex flex-col items-center my-auto py-1 sm:py-2">
                    
                    {/* Visual Focus: Prominent High-Impact Hero Photo Frame or 3D Cake / Laurel Wreath */}
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", damping: 14 }}
                      className="relative my-3 sm:my-4 shrink-0"
                    >
                      {studentPhoto ? (
                        <div className="relative size-44 sm:size-52 md:size-56 rounded-full p-2 bg-gradient-to-tr from-amber-400 via-yellow-200 to-amber-600 shadow-[0_20px_50px_rgba(0,0,0,0.8)] drop-shadow-[0_0_30px_rgba(251,191,36,0.4)] border-2 border-white/80">
                          {/* Inner Bevel Ring */}
                          <div className="w-full h-full rounded-full overflow-hidden border-2 border-amber-950/20 relative shadow-inner">
                            <img
                              src={studentPhoto}
                              alt={studentName}
                              className="w-full h-full object-cover rounded-full"
                            />
                          </div>

                          {/* Top-Center Royal Badge */}
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-amber-400 via-yellow-200 to-amber-500 rounded-full shadow-lg border border-white flex items-center gap-1.5 z-20 whitespace-nowrap">
                            <Crown className="size-3.5 sm:size-4 text-amber-950 fill-amber-950" />
                            <span className="text-[9px] sm:text-[10px] font-black uppercase text-amber-950 tracking-wider">
                              {isBirthday ? "BIRTHDAY STAR" : isAchievement ? "HONORED ACHIEVER" : "STAR SCHOLAR"}
                            </span>
                          </div>

                          {/* Bottom-Right Golden Star Emblem */}
                          <div className="absolute bottom-1 right-2 size-8 sm:size-9 bg-amber-400 rounded-full flex items-center justify-center shadow-lg border-2 border-white rotate-12">
                            <Star className="size-4 sm:size-5 text-amber-950 fill-amber-950" />
                          </div>
                        </div>
                      ) : isBirthday ? (
                        <div className="flex flex-col items-center py-2">
                          <div className="scale-125 sm:scale-150 transform mb-3">
                            <FestiveBirthdayCake />
                          </div>
                          <div className="px-4 py-1 rounded-full bg-pink-500/30 border border-pink-400/40 backdrop-blur-sm text-[10px] font-black text-pink-200 tracking-wider shadow-md">
                            🎂 CELEBRATION TIME • MAKE A WISH 🎂
                          </div>
                        </div>
                      ) : isAchievement ? (
                        <div className="relative flex items-center justify-center py-2">
                          <GoldenLaurelWreath className="size-36 sm:size-44" />
                          <Trophy className="absolute size-14 text-amber-300 drop-shadow-[0_0_20px_rgba(251,191,36,0.9)]" />
                        </div>
                      ) : (
                        <div className="size-32 sm:size-40 rounded-3xl bg-white/15 backdrop-blur-xl border border-white/30 flex items-center justify-center shadow-2xl relative">
                          <configToUse.icon className="size-16 sm:size-20 text-amber-300 drop-shadow-[0_0_20px_rgba(251,191,36,0.7)]" />
                          <div className="absolute -top-3 -right-3 size-10 bg-amber-400 rounded-full flex items-center justify-center shadow-md border-2 border-white">
                            <Star className="size-5 text-amber-950 fill-amber-950" />
                          </div>
                        </div>
                      )}
                    </motion.div>

                    {/* Card Title */}
                    <motion.h1
                      key={configToUse.title}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-white tracking-normal py-1 italic drop-shadow-2xl leading-tight"
                    >
                      {configToUse.title}
                    </motion.h1>

                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: "80px" }}
                      className="h-1 bg-gradient-to-r from-transparent via-amber-300 to-transparent rounded-full my-2 shadow-glow"
                    />

                    {/* Honored Student Name */}
                    <div className="space-y-0.5 sm:space-y-1 mb-2 max-w-full px-2">
                      <div className="flex items-center justify-center gap-2 text-amber-200/90 font-black uppercase tracking-[0.2em] text-[10px] sm:text-xs">
                        <span className="h-px w-5 bg-gradient-to-r from-transparent to-amber-300/60" />
                        <span>{lang === "mr" ? "गौरवमूर्ती" : lang === "hi" ? "गौरवान्वित नाम" : "Presented To"}</span>
                        <span className="h-px w-5 bg-gradient-to-l from-transparent to-amber-300/60" />
                      </div>
                      <motion.h2
                        key={studentName}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-normal leading-tight py-1 break-words max-w-full bg-gradient-to-r from-amber-100 via-yellow-200 to-amber-400 bg-clip-text text-transparent filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]"
                      >
                        {studentName}
                      </motion.h2>
                    </div>

                    {/* Frosted Wishing Quote Box */}
                    <motion.div
                      key={configToUse.quote}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="bg-black/35 backdrop-blur-md px-5 py-2.5 rounded-2xl border border-white/15 shadow-xl max-w-[92%] mx-auto my-2 relative"
                    >
                      <p className="text-white/95 font-medium text-xs sm:text-sm md:text-base italic leading-relaxed">
                        "{configToUse.quote}"
                      </p>
                    </motion.div>

                    {/* Student Class & Badge */}
                    <motion.div
                      initial={{ y: 15, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      className="bg-gradient-to-r from-amber-500/20 via-yellow-500/25 to-amber-500/20 border border-amber-300/40 px-5 py-1.5 rounded-full backdrop-blur-md shadow-lg inline-flex items-center gap-2 my-1"
                    >
                      {isAnnual ? (
                        <Theater className="size-4 text-amber-300" />
                      ) : isCultural ? (
                        <PaletteIcon className="size-4 text-amber-300" />
                      ) : isAchievement ? (
                        <Trophy className="size-4 text-amber-300" />
                      ) : (
                        <GraduationCap className="size-4 text-amber-300" />
                      )}
                      <span className="text-amber-100 font-black text-xs sm:text-sm tracking-widest uppercase">
                        {studentClass}
                      </span>
                      <Star className="size-3 text-amber-300 fill-amber-300" />
                    </motion.div>
                  </div>

                  {/* 3. Creative Footer: School Emblem & Academic Session Seal */}
                  <div className="w-full pt-2 border-t border-white/15 flex items-center justify-between px-2 text-amber-200/90 shrink-0">
                    <div className="flex items-center gap-2 text-left">
                      <div className="size-7 rounded-xl bg-amber-400/20 border border-amber-300/40 flex items-center justify-center">
                        <PartyPopper className="size-3.5 text-amber-300" />
                      </div>
                      <div>
                        <p className="text-[9px] font-black tracking-widest uppercase text-white/90">
                          SMART LEARNING ACADEMY
                        </p>
                        <p className="text-[8px] font-semibold text-amber-300/80">
                          ACADEMIC YEAR 2026-27 • ID: {templateId?.toUpperCase()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 border border-white/20 text-[8px] sm:text-[9px] font-black uppercase tracking-wider text-amber-200 shadow-sm">
                      <Award className="size-3 text-amber-300" />
                      <span>OFFICIAL CARD</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Shimmer Effect */}
              <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/0 pointer-events-none group-hover:translate-x-full transition-transform duration-1500 ease-in-out" />
            </motion.div>

            <p className="mt-6 text-slate-600 font-extrabold text-xs sm:text-sm tracking-normal flex items-center justify-center gap-3">
              <PartyPopper className="size-4 text-pink-500" /> {lang === "mr" ? "अल्ट्रा-प्रीमियम डिजिटल कार्ड" : lang === "hi" ? "अल्ट्रा-प्रीमियम डिजिटल एसेट" : "Ultra-Premium Digital Asset"}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
