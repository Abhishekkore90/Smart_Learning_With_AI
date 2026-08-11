const fs = require("fs");
const file = "src/components/results/StudentProgressReport.tsx";
let content = fs.readFileSync(file, "utf8");

const dict = {
  "विद्यार्थी प्रगती अहवाल": "Student Progress Report",
  "Result Section Dashboard": "Result Section Dashboard", // Already English, but let's make it t('निकाल विभाग डॅशबोर्ड', 'Result Section Dashboard')
  'placeholder="२०२५-२६"': 'placeholder={t("२०२५-२६", "2025-26")}',
  'placeholder="इयत्ता पाचवी"': 'placeholder={t("इयत्ता पाचवी", "Class 5")}',
  'placeholder="हजेरी क्रमांक"': 'placeholder={t("हजेरी क्रमांक", "Roll No.")}',
  "रजिस्टर क्र:": "Reg. No:",
  "विद्यार्थ्याचे नाव:": "Student Name:",
  "आईचे नाव:": "Mother Name:",
  "माध्यम:": "Medium:",
  "जन्म तारीख:": "Date of Birth:",
  "तालुका:": "Taluka:",
  "वडीलांचे नाव:": "Father Name:",
  "लिंग:": "Gender:",
  "जन्म ठिकाण:": "Birth Place:",
  "जिल्हा:": "District:",
  "सरल आयडी:": "Saral ID:",
  "धर्म / जात:": "Religion/Caste:",
  "शाळेचे नाव:": "School Name:",
};

// Also let's change <h2 className="text-2xl font-black text-slate-800 tracking-tight">Result Section Dashboard</h2>
content = content.replace(
  '<h2 className="text-2xl font-black text-slate-800 tracking-tight">Result Section Dashboard</h2>',
  '<h2 className="text-2xl font-black text-slate-800 tracking-tight">{t("निकाल विभाग डॅशबोर्ड", "Result Section Dashboard")}</h2>',
);

content = content.replace(
  />विद्यार्थी प्रगती अहवाल</g,
  `>{t('विद्यार्थी प्रगती अहवाल', 'Student Progress Report')}<`,
);
content = content.replace(
  />रजिस्टर क्र:</g,
  `>{t('रजिस्टर क्र:', 'Reg. No:')}<`,
);
content = content.replace(
  />विद्यार्थ्याचे नाव:</g,
  `>{t('विद्यार्थ्याचे नाव:', 'Student Name:')}<`,
);
content = content.replace(/>आईचे नाव:</g, `>{t('आईचे नाव:', 'Mother Name:')}<`);
content = content.replace(/>माध्यम:</g, `>{t('माध्यम:', 'Medium:')}<`);
content = content.replace(
  />जन्म तारीख:</g,
  `>{t('जन्म तारीख:', 'Date of Birth:')}<`,
);
content = content.replace(/>तालुका:</g, `>{t('तालुका:', 'Taluka:')}<`);
content = content.replace(
  />वडीलांचे नाव:</g,
  `>{t('वडीलांचे नाव:', 'Father Name:')}<`,
);
content = content.replace(/>लिंग:</g, `>{t('लिंग:', 'Gender:')}<`);
content = content.replace(
  />जन्म ठिकाण:</g,
  `>{t('जन्म ठिकाण:', 'Birth Place:')}<`,
);
content = content.replace(/>जिल्हा:</g, `>{t('जिल्हा:', 'District:')}<`);
content = content.replace(/>सरल आयडी:</g, `>{t('सरल आयडी:', 'Saral ID:')}<`);
content = content.replace(
  />धर्म \/ जात:</g,
  `>{t('धर्म / जात:', 'Religion/Caste:')}<`,
);
content = content.replace(
  />शाळेचे नाव:</g,
  `>{t('शाळेचे नाव:', 'School Name:')}<`,
);

content = content.replace(
  /placeholder="२०२५-२६"/g,
  'placeholder={t("२०२५-२६", "2025-26")}',
);
content = content.replace(
  /placeholder="इयत्ता पाचवी"/g,
  'placeholder={t("इयत्ता पाचवी", "Class 5")}',
);
content = content.replace(
  /placeholder="हजेरी क्रमांक"/g,
  'placeholder={t("हजेरी क्रमांक", "Roll No.")}',
);

fs.writeFileSync(file, content);
console.log("Second pass replacements done!");
