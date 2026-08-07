import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { 
  CalendarRange, 
  Megaphone, 
  Sparkles, 
  BookOpen, 
  PenTool, 
  Award, 
  IdCard, 
  ClipboardList, 
  ArrowRight,
  Sparkle
} from "lucide-react";
import { Footer } from "@/components/Footer";

export const Route = createFileRoute("/products")({
  head: () => ({ meta: [{ title: "Our Products — Smart Learning With AI" }] }),
  component: ProductsPage,
});

const cardsData = [
  {
    num: "01",
    title: "वेळापत्रक (Timetable)",
    icon: CalendarRange,
    desc: "इयत्ता १ ली ते ८ वीचे वर्गनिहाय दैनिक व साप्ताहिक वेळापत्रक उपलब्ध. आवश्यकतेनुसार एडिट करून शाळा, शिक्षक व मुख्याध्यापकांच्या नावासह प्रिंट करा आणि वर्गात वापरा.",
    badgeColor: "from-[#E73F1E] to-[#FB6C00]",
    iconBg: "bg-[#FFDD9C]/20 text-[#E73F1E] dark:text-[#FB6C00] border-[#F9B637]/20",
    glowColor: "group-hover:shadow-[0_20px_40px_rgba(231,63,30,0.1)] group-hover:border-[#E73F1E]/50",
  },
  {
    num: "02",
    title: "परिपाठ (Daily Assembly)",
    icon: Megaphone,
    desc: "शाळेतील दैनिक परिपाठाची PDF डाऊनलोड करून विद्यार्थ्यांच्या व्हॉट्सॲप ग्रुपवर शेअर करा. परिपाठ रजिस्टरसाठी महिन्याची एकत्रित PDF देखील उपलब्ध.",
    badgeColor: "from-[#FB6C00] to-[#F9B637]",
    iconBg: "bg-[#FFDD9C]/20 text-[#FB6C00] border-[#F9B637]/20",
    glowColor: "group-hover:shadow-[0_20px_40px_rgba(251,108,0,0.1)] group-hover:border-[#FB6C00]/50",
  },
  {
    num: "03",
    title: "टेम्पलेट (Templates & Greetings)",
    icon: Sparkles,
    desc: "नाव, फोटो, इयत्ता आणि संदेश एडिट करा! वाढदिवस, प्रवेश स्वागत, क्रीडा दिन, सांस्कृतिक कार्यक्रम, स्नेहसंमेलन आणि निकालाचे आकर्षक शुभेच्छा संदेश व्हॉट्सॲपवर पाठवा.",
    badgeColor: "from-[#E73F1E] to-[#F9B637]",
    iconBg: "bg-[#FFDD9C]/20 text-[#E73F1E] dark:text-[#F9B637] border-[#F9B637]/20",
    glowColor: "group-hover:shadow-[0_20px_40px_rgba(231,63,30,0.1)] group-hover:border-[#F9B637]/50",
  },
  {
    num: "04",
    title: "नियोजन व प्रश्नपेढी (Planning & Question Bank)",
    icon: BookOpen,
    desc: "इयत्ता १ ली ते ८ वी (मराठी व सेमी माध्यम) चे वार्षिक, मासिक नियोजन आणि प्रश्नपेढी. शाळेची व शिक्षकांची माहिती भरून एडिट करा आणि सहज प्रिंट काढा.",
    badgeColor: "from-[#FB6C00] to-[#E73F1E]",
    iconBg: "bg-[#FFDD9C]/20 text-[#FB6C00] dark:text-[#E73F1E] border-[#F9B637]/20",
    glowColor: "group-hover:shadow-[0_20px_40px_rgba(251,108,0,0.1)] group-hover:border-[#FB6C00]/50",
  },
  {
    num: "05",
    title: "टाचणवही (Daily Lesson Plan)",
    icon: PenTool,
    desc: "इयत्ता १ ली ते ८ वी (मराठी व सेमी माध्यम) चे दैनंदिन टाचण. प्रत्येक दिवसाचे टाचण सोप्या पद्धतीने एडिट करा आणि शिक्षकांच्या/मुख्याध्यापकांच्या नावासह प्रिंट काढा.",
    badgeColor: "from-[#E73F1E] to-[#FB6C00]",
    iconBg: "bg-[#FFDD9C]/20 text-[#E73F1E] dark:text-[#FB6C00] border-[#F9B637]/20",
    glowColor: "group-hover:shadow-[0_20px_40px_rgba(231,63,30,0.1)] group-hover:border-[#E73F1E]/50",
  },
  {
    num: "06",
    title: "CCE निकाल (Evaluation & Result)",
    icon: Award,
    desc: "१ ली ते ८ वी मराठी व सेमी माध्यमाचा निकाल सहज तयार करा. सर्वंकष मूल्यमापन नोंदवही, गुणपत्रक, प्रगती पत्रक आणि श्रेणीनिहाय निकाल एकाच ठिकाणी उपलब्ध.",
    badgeColor: "from-[#FB6C00] to-[#F9B637]",
    iconBg: "bg-[#FFDD9C]/20 text-[#FB6C00] border-[#F9B637]/20",
    glowColor: "group-hover:shadow-[0_20px_40px_rgba(251,108,0,0.1)] group-hover:border-[#FB6C00]/50",
  },
  {
    num: "07",
    title: "HPC कार्ड (HPC Progress Card)",
    icon: IdCard,
    desc: "१ ली ते ८ वी साठी सर्व स्तरांतील HPC कार्ड्स उपलब्ध. CCE सेक्शनमधील विद्यार्थ्यांची माहिती ऑटोमॅटिक इथे लिंक होईल; दुबार माहिती भरण्याची गरज नाही.",
    badgeColor: "from-[#E73F1E] to-[#F9B637]",
    iconBg: "bg-[#FFDD9C]/20 text-[#E73F1E] dark:text-[#F9B637] border-[#F9B637]/20",
    glowColor: "group-hover:shadow-[0_20px_40px_rgba(231,63,30,0.1)] group-hover:border-[#F9B637]/50",
  },
  {
    num: "08",
    title: "मासिक सभा व अहवाल (Meetings & Reports)",
    icon: ClipboardList,
    desc: "शाळा व्यवस्थापन समिती (SMC), विद्यार्थी सुरक्षा, सखी सावित्री, महिला तक्रार निवारण, माजी विद्यार्थी संघ आणि इको क्लब या सर्व समित्यांचे मासिक अहवाल व इतिवृत्त उपलब्ध.",
    badgeColor: "from-[#FB6C00] to-[#E73F1E]",
    iconBg: "bg-[#FFDD9C]/20 text-[#FB6C00] dark:text-[#E73F1E] border-[#F9B637]/20",
    glowColor: "group-hover:shadow-[0_20px_40px_rgba(251,108,0,0.1)] group-hover:border-[#FB6C00]/50",
  }
];

function ProductsPage() {
  return (
    <div className="min-h-screen relative text-[#3A2315] dark:text-slate-100 bg-[#FFFDF9] dark:bg-transparent overflow-x-hidden flex flex-col justify-between font-sans">
      {/* Background gradients */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" style={{ background: "var(--hero-gradient)" }}>
        <div className="absolute top-[20%] -left-1/4 w-[600px] h-[600px] bg-[#E73F1E]/5 rounded-full blur-[150px] pointer-events-none" />
        <div className="absolute top-[50%] -right-1/4 w-[600px] h-[600px] bg-[#FB6C00]/5 rounded-full blur-[150px] pointer-events-none" />
      </div>

      <main className="relative z-10 flex-grow pt-32 pb-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        {/* Header Section */}
        <section className="text-center max-w-3xl mx-auto mb-16 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#FFF5EC] border border-[#F9B637]/30 dark:bg-slate-800/60 dark:border-slate-700 text-[#E73F1E] dark:text-[#F9B637] text-xs font-black uppercase tracking-[0.2em] shadow-inner"
          >
            <Sparkle className="size-4 animate-pulse text-[#E73F1E]" />
            <span>शालेय डिजिटल सुविधा</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight leading-tight text-[#1E0900] dark:text-white"
          >
            आमची प्रमुख <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#E73F1E] to-[#FB6C00]">वैशिष्ट्ये व सेवा</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-base sm:text-lg text-[#3A2315]/80 dark:text-slate-350 font-medium leading-relaxed"
          >
            शिक्षकांचे काम अधिक सुलभ आणि डिजिटल करण्यासाठी उपलब्ध करून दिलेली विविध शैक्षणिक साधने.
          </motion.p>
        </section>

        {/* 8 Features Grid */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-16">
          {cardsData.map((card, idx) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={card.num}
                initial={{ opacity: 0, y: 25 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ delay: idx * 0.05, type: "spring", stiffness: 100 }}
                whileHover={{ y: -6, scale: 1.01 }}
                className={`group relative p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 transition-all duration-300 flex flex-col justify-between overflow-hidden shadow-sm ${card.glowColor}`}
              >
                {/* Background soft glow card accent */}
                <div className="absolute -top-10 -right-10 w-24 h-24 rounded-full bg-[#FFDD9C]/10 blur-xl pointer-events-none group-hover:scale-155 transition-transform duration-500" />

                <div className="space-y-4">
                  {/* Top row with Badge number and Icon */}
                  <div className="flex items-center justify-between">
                    <span className={`px-2.5 py-1 text-xs font-black text-white rounded-md bg-gradient-to-r ${card.badgeColor} shadow-sm`}>
                      {card.num}
                    </span>
                    <div className={`p-2.5 rounded-xl border ${card.iconBg} transition-transform duration-300 group-hover:scale-110`}>
                      <Icon className="size-5" />
                    </div>
                  </div>

                  {/* Card Title */}
                  <h3 className="text-lg font-black text-[#1E0900] dark:text-white leading-snug group-hover:text-[#E73F1E] dark:group-hover:text-[#FB6C00] transition-colors duration-300">
                    {card.title}
                  </h3>

                  {/* Card Content Description */}
                  <p className="text-sm font-semibold text-[#3A2315]/80 dark:text-slate-300 leading-relaxed">
                    {card.desc}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </section>

        {/* Centered Explore All Products Button */}
        <div className="flex justify-center mt-12">
          <Link
            to="/login"
            search={{ role: "teacher" }}
            className="inline-flex items-center gap-2.5 px-8 py-4 bg-[#E73F1E] hover:bg-[#FB6C00] text-white font-black text-sm uppercase tracking-wider rounded-full shadow-md hover:shadow-lg hover:-translate-y-0.5 active:scale-95 transition-all duration-300"
            style={{ backgroundImage: "linear-gradient(135deg, #FB6C00, #E73F1E)" }}
          >
            <span>Explore All Products</span>
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
