const fs = require("fs");
const file = "src/components/results/StudentProgressReport.tsx";
let content = fs.readFileSync(file, "utf8");

// 1. Add state and t function
if (!content.includes("const [lang, setLang] = useState")) {
  content = content.replace(
    "const [activeTab, setActiveTab] = useState('dashboard');",
    "const [lang, setLang] = useState<'mr' | 'en'>('mr');\n  const t = (mr: string, en: string) => lang === 'mr' ? mr : en;\n  const [activeTab, setActiveTab] = useState('dashboard');",
  );
}

// 2. Add Toggle Button next to H2 inside Dashboard
if (!content.includes("setLang('en')")) {
  content = content.replace(
    '<h2 className="text-2xl font-black text-slate-800 tracking-tight">Result Section Dashboard</h2>',
    `<div className="flex items-center justify-between">
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Result Section Dashboard</h2>
            <div className="flex bg-slate-200 rounded-full p-1 w-fit shadow-inner">
              <button onClick={() => setLang('en')} className={\`px-6 py-2 rounded-full text-sm font-bold transition-all \${lang === 'en' ? 'bg-white text-slate-800 shadow-md' : 'text-slate-500 hover:text-slate-700'}\`}>English</button>
              <button onClick={() => setLang('mr')} className={\`px-6 py-2 rounded-full text-sm font-bold transition-all \${lang === 'mr' ? 'bg-white text-slate-800 shadow-md' : 'text-slate-500 hover:text-slate-700'}\`}>मराठी</button>
            </div>
          </div>`,
  );
}

const dict = {
  // Common terms
  "विद्यार्थी माहिती": "Student Information",
  "शैक्षणिक वर्ष:": "Academic Year:",
  "वर्ग:": "Class:",
  "तुकडी:": "Division:",
  "परीक्षेचा प्रकार:": "Exam Type:",
  "हजेरी क्रमांक:": "Roll Number:",
  "हजेरी क्रमांक (ऐच्छिक):": "Roll Number (Optional):",
  "विषय:": "Subject:",
  "अहवाल पहा": "View Report",
  "अहवाल मिळवा": "Get Report",
  "पुढील शैक्षणिक वर्ष:": "Next Academic Year:",
  "पुढील वर्ग:": "Next Class:",
  "पुढील तुकडी:": "Next Division:",
  "उन्हाळी सुट्टी:": "Summer Holiday From:",
  "पर्यंत:": "To:",
  "शाळा उघडण्याचा दिनांक:": "School Reopening Date:",
  "विद्यार्थ्यांना सूचना": "Instructions for Students",
  "सदर निकाल": "This result",

  // Dashboard & headers
  "वर्गाची माहिती": "Class Information",
  "निकाल फिल्टर": "Result Filter",
  "प्रथम सत्र मूल्यमापन": "First Term Evaluation",
  "एकत्रित निकाल अहवाल": "Consolidated Result Report",
  "विषयनिहाय निकाल अहवाल": "Subject-wise Result Report",
  "विद्यार्थी प्रगतीपत्रक": "Student Progress Report",
  "विद्यार्थी मूल्यांकन": "Student Evaluation",
  "एकत्रित निकाल": "Overall Result",
  "विषयानिहाय निकाल": "Subject-wise Result",
  "विद्यार्थ्याच्या नोंदी": "Student Records",

  // Table columns
  "अनु क्र": "Sr. No.",
  "हजेरी क्र": "Roll No.",
  "विद्यार्थ्याचे नाव": "Student Name",
  आकारिक: "Formative",
  संकलित: "Summative",
  "अ \\+ ब": "A + B",
  "दैनिक निरीक्षण": "Daily Obs.",
  "तोंडी काम": "Oral Work",
  "प्रात्यक्षिक प्रयोग": "Practical",
  उपक्रम: "Activity",
  प्रकल्प: "Project",
  "चाचणी \\(लेखी\\)": "Test (Written)",
  स्वाध्याय: "Homework",
  इतर: "Other",
  एकूण: "Total",
  तोंडी: "Oral",
  प्रात्यक्षिक: "Practical",
  लेखी: "Written",
  श्रेणी: "Grade",
  निकाल: "Result",
  "एकूण गुण": "Total Marks",
  टक्केवारी: "Percentage",
  "किमान गुण": "Min Marks",
  "मिळालेले गुण": "Obtained Marks",
  उत्तीर्ण: "Pass",
  "वर्ग शिक्षकाची स्वाक्षरी": "Class Teacher Signature",
  "वर्ग शिक्षक स्वाक्षरी": "Class Teacher Signature",
  "मुख्याध्यापकाची स्वाक्षरी व शिक्का": "Principal Signature & Seal",
  "मुख्याध्यापक स्वाक्षरी व शिक्का": "Principal Signature & Seal",

  // Options
  "इयत्ता पहिली": "Class 1",
  "इयत्ता दुसरी": "Class 2",
  "इयत्ता तिसरी": "Class 3",
  "इयत्ता चौथी": "Class 4",
  "इयत्ता पाचवी": "Class 5",
  "इयत्ता सहावी": "Class 6",
  "इयत्ता सातवी": "Class 7",
  "प्रथम सत्र": "First Term",
  "द्वितीय सत्र": "Second Term",
  वार्षिक: "Annual",
  मराठी: "Marathi",
  हिंदी: "Hindi",
  इंग्रजी: "English",
  गणित: "Maths",
  विज्ञान: "Science",
  कला: "Art",
  कार्यानुभव: "Work Exp.",
  "शारीरिक शिक्षण": "Physical Ed.",
};

// Replace text nodes in JSX.
Object.keys(dict).forEach((mr) => {
  const en = dict[mr];
  const regexJSX = new RegExp(`>\\s*${mr}\\s*<`, "g");
  content = content.replace(
    regexJSX,
    `>{t('${mr.replace(/\\/g, "")}', '${en}')}<`,
  );
});

// Also replace option values for dropdown text
content = content.replace(/>२०२४-२५</g, `>{t('२०२४-२५', '2024-25')}<`);
content = content.replace(/>२०२५-२६</g, `>{t('२०२५-२६', '2025-26')}<`);
content = content.replace(/>अ</g, `>{t('अ', 'A')}<`);
content = content.replace(/>ब</g, `>{t('ब', 'B')}<`);

content = content.replace(
  /placeholder="उदा. 1"/g,
  `placeholder={t("उदा. 1", "e.g. 1")}`,
);
content = content.replace(
  /<span>वर्ग :- /g,
  `<span>{t('वर्ग :- ', 'Class :- ')}`,
);
content = content.replace(
  /<span>तुकडी :- /g,
  `<span>{t('तुकडी :- ', 'Div :- ')}`,
);
content = content.replace(
  /<span>शैक्षणिक वर्ष :- /g,
  `<span>{t('शैक्षणिक वर्ष :- ', 'Academic Year :- ')}`,
);
content = content.replace(
  /<span>विषय :- /g,
  `<span>{t('विषय :- ', 'Subject :- ')}`,
);

const subjectsArray = `['मराठी', 'हिंदी', 'इंग्रजी', 'गणित', 'विज्ञान', 'कला', 'कार्यानुभव', 'शारीरिक शिक्षण']`;
content = content.replace(
  subjectsArray,
  `['मराठी', 'हिंदी', 'इंग्रजी', 'गणित', 'विज्ञान', 'कला', 'कार्यानुभव', 'शारीरिक शिक्षण'].map(s => t(s, { 'मराठी': 'Marathi', 'हिंदी': 'Hindi', 'इंग्रजी': 'English', 'गणित': 'Maths', 'विज्ञान': 'Science', 'कला': 'Art', 'कार्यानुभव': 'Work Exp.', 'शारीरिक शिक्षण': 'Physical Ed.' }[s] || s))`,
);

fs.writeFileSync(file, content);
console.log("Replacements done!");
