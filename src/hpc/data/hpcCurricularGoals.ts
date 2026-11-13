import { HpcCurricularGoal, HpcCompetency, HpcStageInfo } from "../types/hpc";

export const HPC_STAGES_INFO: HpcStageInfo[] = [
  {
    id: "foundational",
    partNumber: 1,
    partLabelMarathi: "भाग १",
    partLabelEnglish: "Foundational Stage",
    titleMarathi: "पायाभूत स्तर",
    titleEnglish: "Foundational Stage (Classes 1 & 2)",
    classesLabelMarathi: "इयत्ता १ ली व २ री",
    classesLabelEnglish: "Class 1st & 2nd",
    classIds: ["1st", "2nd"],
    ageGroupMarathi: "वय वर्षे ६ ते ८",
    descriptionMarathi:
      "राष्ट्रीय अभ्यासक्रम आराखडा (NCF-FS) नुसार मूलभूत साक्षरता व संख्याज्ञान (FLN), खेळ व कृती आधारित ६ विकास क्षेत्रांमधील सर्वसमावेशक विकास नोंद.",
  },
  {
    id: "preparatory",
    partNumber: 2,
    partLabelMarathi: "भाग २",
    partLabelEnglish: "Preparatory Stage",
    titleMarathi: "पूर्वतयारी स्तर",
    titleEnglish: "Preparatory Stage (Classes 3 to 5)",
    classesLabelMarathi: "इयत्ता ३ री ते ५ वी",
    classesLabelEnglish: "Class 3rd, 4th & 5th",
    classIds: ["3rd", "4th", "5th"],
    ageGroupMarathi: "वय वर्षे ८ ते ११",
    descriptionMarathi:
      "NCF-SE व SCERT मार्गदर्शक तत्त्वांनुसार विषयनिहाय संकल्पनात्मक समज, गणितीय विचार, परिसर अभ्यास, उपक्रमशीलता, जाणीवजागृती, संवेदनशीलता व सर्जनशीलता मूल्यमापन.",
  },
  {
    id: "middle",
    partNumber: 3,
    partLabelMarathi: "भाग ३",
    partLabelEnglish: "Middle Stage",
    titleMarathi: "मध्य स्तर (पूर्व माध्यमिक)",
    titleEnglish: "Middle Stage (Classes 6 to 8)",
    classesLabelMarathi: "इयत्ता ६ वी ते ८ वी",
    classesLabelEnglish: "Class 6th, 7th & 8th",
    ageGroupMarathi: "वय वर्षे ११ ते १४",
    classIds: ["6th", "7th", "8th"],
    descriptionMarathi:
      "विषयनिहाय सखोल अध्ययन, वैज्ञानिक दृष्टिकोन, सामाजिक जाणिवा, व्यावसायिक परिचय व बहुआयामी कौशल्यांचे ३६० अंश मूल्यमापन.",
  },
];

export interface HpcAreaDefinition {
  id: string;
  code: string;
  nameMarathi: string;
  nameEnglish: string;
  stageId: "foundational" | "preparatory" | "middle";
  order: number;
}

// ---------------- Foundational Stage 6 Developmental Areas ----------------
export const FOUNDATIONAL_AREAS: HpcAreaDefinition[] = [
  {
    id: "physical_health",
    code: "क्षेत्र १",
    nameMarathi: "शारीरिक आणि आरोग्य विकास",
    nameEnglish: "Physical and Health Development",
    stageId: "foundational",
    order: 1,
  },
  {
    id: "socio_emotional",
    code: "क्षेत्र २",
    nameMarathi: "सामाजिक, भावनिक आणि नैतिक विकास",
    nameEnglish: "Socio-Emotional and Ethical Development",
    stageId: "foundational",
    order: 2,
  },
  {
    id: "cognitive",
    code: "क्षेत्र ३",
    nameMarathi: "बोधात्मक (ज्ञानात्मक) विकास",
    nameEnglish: "Cognitive Development",
    stageId: "foundational",
    order: 3,
  },
  {
    id: "language_literacy",
    code: "क्षेत्र ४",
    nameMarathi: "भाषा आणि साक्षरता विकास",
    nameEnglish: "Language and Literacy Development",
    stageId: "foundational",
    order: 4,
  },
  {
    id: "aesthetic_cultural",
    code: "क्षेत्र ५",
    nameMarathi: "सौंदर्यदृष्टी आणि सांस्कृतिक विकास",
    nameEnglish: "Aesthetic and Cultural Development",
    stageId: "foundational",
    order: 5,
  },
  {
    id: "positive_habits",
    code: "क्षेत्र ५.१",
    nameMarathi: "सकारात्मक अध्ययन सवयी",
    nameEnglish: "Positive Learning Habits",
    stageId: "foundational",
    order: 6,
  },
];

// ---------------- Preparatory Stage Subject Definitions ----------------
export const PREPARATORY_AREAS: HpcAreaDefinition[] = [
  {
    id: "prep_r1",
    code: "R1 / L1",
    nameMarathi: "प्रथम भाषा (मराठी)",
    nameEnglish: "Language 1 (R1 - First Language)",
    stageId: "preparatory",
    order: 1,
  },
  {
    id: "prep_r2",
    code: "R2 / L2",
    nameMarathi: "द्वितीय भाषा (इंग्रजी)",
    nameEnglish: "Language 2 (R2 - English)",
    stageId: "preparatory",
    order: 2,
  },
  {
    id: "prep_r3",
    code: "R3 / L3",
    nameMarathi: "तृतीय भाषा (हिंदी / इतर)",
    nameEnglish: "Language 3 (R3 - Hindi/Other)",
    stageId: "preparatory",
    order: 3,
  },
  {
    id: "prep_math",
    code: "MCG",
    nameMarathi: "गणित (Mathematics)",
    nameEnglish: "Mathematics",
    stageId: "preparatory",
    order: 4,
  },
  {
    id: "prep_evs",
    code: "TWCG",
    nameMarathi: "आपला परिसर / परिसर अभ्यास (The World Around Us)",
    nameEnglish: "The World Around Us (EVS)",
    stageId: "preparatory",
    order: 5,
  },
  {
    id: "prep_arts",
    code: "AECG / VACG",
    nameMarathi: "कला शिक्षण (दृश्य कला, संगीत, नाट्य)",
    nameEnglish: "Art Education",
    stageId: "preparatory",
    order: 6,
  },
  {
    id: "prep_pe",
    code: "PECG",
    nameMarathi: "शारीरिक शिक्षण व आरोग्य (Physical Education & Well-being)",
    nameEnglish: "Physical Education and Well-being",
    stageId: "preparatory",
    order: 7,
  },
];

// ---------------- Middle Stage Subject Definitions ----------------
export const MIDDLE_AREAS: HpcAreaDefinition[] = [
  {
    id: "mid_r1",
    code: "R1 / L1",
    nameMarathi: "प्रथम भाषा (मराठी)",
    nameEnglish: "Language 1 (R1 - First Language)",
    stageId: "middle",
    order: 1,
  },
  {
    id: "mid_r2",
    code: "R2 / L2",
    nameMarathi: "द्वितीय भाषा (इंग्रजी)",
    nameEnglish: "Language 2 (R2 - English)",
    stageId: "middle",
    order: 2,
  },
  {
    id: "mid_r3",
    code: "R3 / L3",
    nameMarathi: "तृतीय भाषा (हिंदी)",
    nameEnglish: "Language 3 (R3 - Hindi)",
    stageId: "middle",
    order: 3,
  },
  {
    id: "mid_math",
    code: "MCG",
    nameMarathi: "गणित (Mathematics)",
    nameEnglish: "Mathematics",
    stageId: "middle",
    order: 4,
  },
  {
    id: "mid_science",
    code: "SCG",
    nameMarathi: "विज्ञान (Science)",
    nameEnglish: "Science",
    stageId: "middle",
    order: 5,
  },
  {
    id: "mid_social_science",
    code: "SSCG",
    nameMarathi: "सामाजिक शास्त्रे (इतिहास, भूगोल, नागरिकशास्त्र)",
    nameEnglish: "Social Science",
    stageId: "middle",
    order: 6,
  },
  {
    id: "mid_arts",
    code: "AECG",
    nameMarathi: "कला शिक्षण (दृश्य कला, संगीत, नाट्य व हालचाल)",
    nameEnglish: "Art Education",
    stageId: "middle",
    order: 7,
  },
  {
    id: "mid_pe",
    code: "PECG",
    nameMarathi: "शारीरिक शिक्षण व आरोग्य",
    nameEnglish: "Physical Education & Health",
    stageId: "middle",
    order: 8,
  },
  {
    id: "mid_vocational",
    code: "VECG",
    nameMarathi: "कार्यानुभव व व्यावसायिक परिचय",
    nameEnglish: "Vocational & Work Education",
    stageId: "middle",
    order: 9,
  },
];

// ---------------- CURRICULAR GOALS (CG) ----------------
export const HPC_CURRICULAR_GOALS: HpcCurricularGoal[] = [
  // Foundational - Area 1
  {
    id: "CG-1",
    code: "CG-1",
    titleMarathi: "बालके त्यांना निरोगी आणि सुरक्षित ठेवणाऱ्या सवयी विकसित करतात.",
    stageId: "foundational",
    areaOrSubjectId: "physical_health",
  },
  {
    id: "CG-2",
    code: "CG-2",
    titleMarathi: "बालके ज्ञानेंद्रियांची कुशाग्रता विकसित करतात.",
    stageId: "foundational",
    areaOrSubjectId: "physical_health",
  },
  {
    id: "CG-3",
    code: "CG-3",
    titleMarathi: "सुदृढ आणि लवचीक शरीर विकसित होते.",
    stageId: "foundational",
    areaOrSubjectId: "physical_health",
  },

  // Foundational - Area 2
  {
    id: "CG-4",
    code: "CG-4",
    titleMarathi: "बालके भावनिक बुद्धिमत्ता विकसित करतात (स्वतःच्या भावनांचे व्यवस्थापन आणि सामाजिक नियमांना प्रतिसाद).",
    stageId: "foundational",
    areaOrSubjectId: "socio_emotional",
  },
  {
    id: "CG-5",
    code: "CG-5",
    titleMarathi: "बालके उत्पादक कार्याबाबत व सेवेबाबत सकारात्मक दृष्टिकोन विकसित करतात.",
    stageId: "foundational",
    areaOrSubjectId: "socio_emotional",
  },
  {
    id: "CG-6",
    code: "CG-6",
    titleMarathi: "बालके नैसर्गिक वातावरणाबद्दल कृतज्ञताभाव दर्शवितात.",
    stageId: "foundational",
    areaOrSubjectId: "socio_emotional",
  },

  // Foundational - Area 3
  {
    id: "CG-7",
    code: "CG-7",
    titleMarathi: "बालके निरीक्षण व तार्किक विचाराने सभोवतालच्या जगाची जाणीव करून घेतात.",
    stageId: "foundational",
    areaOrSubjectId: "cognitive",
  },
  {
    id: "CG-8",
    code: "CG-8",
    titleMarathi: "बालकांची गणितीय समज विकसित होते (राशी, आकार, मापे, संख्या).",
    stageId: "foundational",
    areaOrSubjectId: "cognitive",
  },

  // Foundational - Area 4
  {
    id: "CG-9",
    code: "CG-9",
    titleMarathi: "बालके दोन भाषांमध्ये दैनंदिन संवादासाठी प्रभावी कौशल्ये विकसित करतात.",
    stageId: "foundational",
    areaOrSubjectId: "language_literacy",
  },
  {
    id: "CG-10",
    code: "CG-10",
    titleMarathi: "बालके भाषा एक (L1) मध्ये सफाईदारपणे वाचन व लेखन करतात.",
    stageId: "foundational",
    areaOrSubjectId: "language_literacy",
  },
  {
    id: "CG-11",
    code: "CG-11",
    titleMarathi: "बालके भाषा दोन (L2) मध्ये वाचन आणि लेखनाचा आरंभ करतात.",
    stageId: "foundational",
    areaOrSubjectId: "language_literacy",
  },

  // Foundational - Area 5
  {
    id: "CG-12",
    code: "CG-12",
    titleMarathi: "बालके दृश्य आणि ललित कलांमध्ये आपली संवेदनशीलता कलेद्वारे व्यक्त करतात.",
    stageId: "foundational",
    areaOrSubjectId: "aesthetic_cultural",
  },

  // Foundational - Area 6 (5.1)
  {
    id: "CG-13",
    code: "CG-13",
    titleMarathi: "बालके अध्ययनाच्या सवयी विकसित करतात (औपचारिक शिक्षणासाठी तयारी).",
    stageId: "foundational",
    areaOrSubjectId: "positive_habits",
  },

  // Preparatory Stage Curricular Goals
  {
    id: "PREP-R1CG-1",
    code: "R1CG-1",
    titleMarathi: "विद्यार्थी प्रथम भाषेत स्पष्ट व आत्मविश्वासपूर्वक मौखिक संवाद साधतात आणि विविध संदर्भ समजून घेतात.",
    stageId: "preparatory",
    areaOrSubjectId: "prep_r1",
  },
  {
    id: "PREP-R1CG-2",
    code: "R1CG-2",
    titleMarathi: "विविध प्रकारच्या साहित्याचे अर्थपूर्ण वाचन करतात आणि सर्जनशील लेखन करतात.",
    stageId: "preparatory",
    areaOrSubjectId: "prep_r1",
  },
  {
    id: "PREP-R2CG-1",
    code: "R2CG-1",
    titleMarathi: "इंग्रजी भाषेतील साध्या सूचना, वाक्ये व संवाद समजून घेऊन प्रतिसाद देतात.",
    stageId: "preparatory",
    areaOrSubjectId: "prep_r2",
  },
  {
    id: "PREP-R3CG-1",
    code: "R3CG-1",
    titleMarathi: "तृतीय भाषेत परिचित शब्द, वाक्ये व साधे संभाषण समजतात व वापरतात.",
    stageId: "preparatory",
    areaOrSubjectId: "prep_r3",
  },
  {
    id: "PREP-MCG-1",
    code: "MCG-1",
    titleMarathi: "संख्यांवरील मूलभूत क्रिया, आकृत्या व दैनंदिन जीवनातील व्यावहारिक गणित समजतात.",
    stageId: "preparatory",
    areaOrSubjectId: "prep_math",
  },
  {
    id: "PREP-MCG-2",
    code: "MCG-2",
    titleMarathi: "तार्किक विचार, समस्या निराकरण आणि गणितीय आकृतिबंध (Patterns) शोधतात.",
    stageId: "preparatory",
    areaOrSubjectId: "prep_math",
  },
  {
    id: "PREP-TWCG-1",
    code: "TWCG-1",
    titleMarathi: "सभोवतालचा सजीव व निर्जीव परिसर, नैसर्गिक घटक व सामाजिक व्यवस्था समजून घेतात.",
    stageId: "preparatory",
    areaOrSubjectId: "prep_evs",
  },
  {
    id: "PREP-TWCG-2",
    code: "TWCG-2",
    titleMarathi: "पर्यावरण संवर्धन, स्वच्छता आणि आरोग्यदायी जीवनशैलीबाबत सजगता दाखवतात.",
    stageId: "preparatory",
    areaOrSubjectId: "prep_evs",
  },
  {
    id: "PREP-AECG-1",
    code: "AECG-1",
    titleMarathi: "दृश्य व सादरीकरण कलांद्वारे स्वतःची कल्पकता, भावना आणि सौंदर्यदृष्टी व्यक्त करतात.",
    stageId: "preparatory",
    areaOrSubjectId: "prep_arts",
  },
  {
    id: "PREP-PECG-1",
    code: "PECG-1",
    titleMarathi: "शारीरिक सुदृढता, खेळ भावना, सहकार्य व सुरक्षिततेचे नियम अंगीकारतात.",
    stageId: "preparatory",
    areaOrSubjectId: "prep_pe",
  },

  // Middle Stage Curricular Goals
  {
    id: "MID-R1CG-1",
    code: "R1CG-1",
    titleMarathi: "भाषेचे व्याकरण, समीक्षात्मक विचार आणि विविध साहित्य प्रकारांचे विश्लेषण करतात.",
    stageId: "middle",
    areaOrSubjectId: "mid_r1",
  },
  {
    id: "MID-R2CG-1",
    code: "R2CG-1",
    titleMarathi: "इंग्रजी भाषेत प्रभावी संवाद, परिच्छेद वाचन आणि विचार मांडण्याची क्षमता विकसित करतात.",
    stageId: "middle",
    areaOrSubjectId: "mid_r2",
  },
  {
    id: "MID-R3CG-1",
    code: "R3CG-1",
    titleMarathi: "हिंदी / तृतीय भाषेत व्याकरणशुद्ध लेखन आणि संवाद साधतात.",
    stageId: "middle",
    areaOrSubjectId: "mid_r3",
  },
  {
    id: "MID-MCG-1",
    code: "MCG-1",
    titleMarathi: "बीजगणित, भूमिती, सांख्यिकी आणि व्यावहारिक गणितीय संकल्पनांचे उपयोजन करतात.",
    stageId: "middle",
    areaOrSubjectId: "mid_math",
  },
  {
    id: "MID-SCG-1",
    code: "SCG-1",
    titleMarathi: "वैज्ञानिक पद्धत, प्रयोगशीलता, कार्यकारणभाव आणि पर्यावरण संरक्षणाचा अभ्यास करतात.",
    stageId: "middle",
    areaOrSubjectId: "mid_science",
  },
  {
    id: "MID-SSCG-1",
    code: "SSCG-1",
    titleMarathi: "ऐतिहासिक घडामोडी, भौगोलिक विविधता, राज्यघटना व सामाजिक न्यायाची समज वाढवतात.",
    stageId: "middle",
    areaOrSubjectId: "mid_social_science",
  },
  {
    id: "MID-AECG-1",
    code: "AECG-1",
    titleMarathi: "कलांचे विविध प्रकार (चित्रकला, संगीत, नाट्य) समजून घेऊन उत्कृष्ट निर्मिती करतात.",
    stageId: "middle",
    areaOrSubjectId: "mid_arts",
  },
  {
    id: "MID-PECG-1",
    code: "PECG-1",
    titleMarathi: "विविध क्रीडा प्रकारांचे नियम, नेतृत्व गुण, योगासने व मानसिक आरोग्याची जोपासना करतात.",
    stageId: "middle",
    areaOrSubjectId: "mid_pe",
  },
  {
    id: "MID-VECG-1",
    code: "VECG-1",
    titleMarathi: "श्रमप्रतिष्ठा, हस्तकौशल्ये, तंत्रज्ञान व स्थानिक व्यवसायांचा प्रत्यक्ष अनुभव घेतात.",
    stageId: "middle",
    areaOrSubjectId: "mid_vocational",
  },
];

// ---------------- COMPETENCIES (C) ----------------
export const HPC_COMPETENCIES: HpcCompetency[] = [
  // Foundational - Area 1: Physical & Health
  {
    id: "C-2.5",
    code: "C-2.5",
    titleMarathi: "विविध प्रकारच्या स्पर्धामधील फरक करण्याची क्षमता विकसित होते.",
    goalId: "CG-2",
    stageId: "foundational",
    applicableClassIds: ["1st", "2nd"],
    applicableSession: "session1",
  },
  {
    id: "C-2.1",
    code: "C-2.1",
    titleMarathi: "आकार, रंग आणि त्यांच्या यांच्यामधील फरक ओळखते.",
    goalId: "CG-2",
    stageId: "foundational",
    applicableClassIds: ["1st", "2nd"],
    applicableSession: "session2",
  },
  {
    id: "C-2.2",
    code: "C-2.2",
    titleMarathi: "चिन्हे आणि प्रतीके याकरिता दृक्-स्मृती (Visual Memory) विकसित करते.",
    goalId: "CG-2",
    stageId: "foundational",
    applicableClassIds: ["1st", "2nd"],
    applicableSession: "session2",
  },
  {
    id: "C-1.1",
    code: "C-1.1",
    titleMarathi: "दैनंदिन स्वच्छता आणि आरोग्यदायी खाण्यापिण्याच्या चांगल्या सवयींचे पालन करते.",
    goalId: "CG-1",
    stageId: "foundational",
    applicableClassIds: ["1st", "2nd"],
    applicableSession: "both",
  },
  {
    id: "C-3.1",
    code: "C-3.1",
    titleMarathi: "शरीराचा समतोल राखून विविध हालचाली आणि खेळ सहजतेने करते.",
    goalId: "CG-3",
    stageId: "foundational",
    applicableClassIds: ["1st", "2nd"],
    applicableSession: "both",
  },

  // Foundational - Area 2: Socio-Emotional
  {
    id: "C-4.1",
    code: "C-4.1",
    titleMarathi: "कुटुंब आणि समाजाचा घटक म्हणून स्वतःला ओळखायला सुरुवात करते.",
    goalId: "CG-4",
    stageId: "foundational",
    applicableClassIds: ["1st", "2nd"],
    applicableSession: "session1",
  },
  {
    id: "C-4.5",
    code: "C-4.5",
    titleMarathi: "शाळेतील सामाजिक नियम समजून घेऊन त्याप्रमाणे वर्तन करते.",
    goalId: "CG-4",
    stageId: "foundational",
    applicableClassIds: ["1st", "2nd"],
    applicableSession: "session1",
  },
  {
    id: "C-4.2",
    code: "C-4.2",
    titleMarathi: "विविध भावना ओळखते व त्यावर नियंत्रण मिळवण्याचा प्रयत्न करते.",
    goalId: "CG-4",
    stageId: "foundational",
    applicableClassIds: ["1st", "2nd"],
    applicableSession: "session2",
  },
  {
    id: "C-5.1",
    code: "C-5.1",
    titleMarathi: "इतरांना मदत करण्याची व सहकार्याने काम करण्याची वृत्ती दाखवते.",
    goalId: "CG-5",
    stageId: "foundational",
    applicableClassIds: ["1st", "2nd"],
    applicableSession: "both",
  },
  {
    id: "C-6.1",
    code: "C-6.1",
    titleMarathi: "झाडे, पशू-पक्षी व नैसर्गिक पर्यावरणाविषयी काळजी व आदर व्यक्त करते.",
    goalId: "CG-6",
    stageId: "foundational",
    applicableClassIds: ["1st", "2nd"],
    applicableSession: "both",
  },

  // Foundational - Area 3: Cognitive
  {
    id: "C-7.1",
    code: "C-7.1",
    titleMarathi: "वेगवेगळ्या वर्गातील/घटकातील वस्तूंमधील फरक व वस्तूंचा एकमेकांशी संबंध याचे निरीक्षण करतो व समजून घेतो.",
    goalId: "CG-7",
    stageId: "foundational",
    applicableClassIds: ["1st", "2nd"],
    applicableSession: "session1",
  },
  {
    id: "C-8.2",
    code: "C-8.2",
    titleMarathi: "परिसरातील आकार आणि संख्यांच्या आधारे आकृतिबंध (Patterns) ओळखते.",
    goalId: "CG-8",
    stageId: "foundational",
    applicableClassIds: ["1st", "2nd"],
    applicableSession: "session1",
  },
  {
    id: "C-8.10",
    code: "C-8.10",
    titleMarathi: "वेळ (मिनिटे, तास, दिवस, महिने) यामध्ये साधी मोजमापे करते.",
    goalId: "CG-8",
    stageId: "foundational",
    applicableClassIds: ["1st", "2nd"],
    applicableSession: "session1",
  },
  {
    id: "C-8.1",
    code: "C-8.1",
    titleMarathi: "एकापेक्षा जास्त गुणधर्मांच्या आधारे वस्तूंचे वर्गीकरण करते.",
    goalId: "CG-8",
    stageId: "foundational",
    applicableClassIds: ["1st", "2nd"],
    applicableSession: "session2",
  },
  {
    id: "C-8.13",
    code: "C-8.13",
    titleMarathi: "राशी, आकार, मोजमापे या संदर्भात सोपी गणिते सोडवते व तयार करते.",
    goalId: "CG-8",
    stageId: "foundational",
    applicableClassIds: ["1st", "2nd"],
    applicableSession: "session2",
  },

  // Foundational - Area 4: Language & Literacy
  {
    id: "C-9.1",
    code: "C-9.1",
    titleMarathi: "साधी गाणी, बडबडगीते, कविता ऐकते व आवड व्यक्त करते.",
    goalId: "CG-9",
    stageId: "foundational",
    applicableClassIds: ["1st", "2nd"],
    applicableSession: "both",
  },
  {
    id: "C-9.2",
    code: "C-9.2",
    titleMarathi: "स्वतःहून साधी गाणी आणि कविता तयार करते.",
    goalId: "CG-9",
    stageId: "foundational",
    applicableClassIds: ["1st", "2nd"],
    applicableSession: "session1",
  },
  {
    id: "C-9.4",
    code: "C-9.4",
    titleMarathi: "मौखिक सूचना समजून घेते व इतरांना स्पष्ट सूचना देते.",
    goalId: "CG-9",
    stageId: "foundational",
    applicableClassIds: ["1st", "2nd"],
    applicableSession: "session2",
  },
  {
    id: "C-10.1",
    code: "C-10.1",
    titleMarathi: "चित्रांचे निरीक्षण करून स्वतःच्या भाषेत व्यक्त होते आणि अक्षरे ओळखते.",
    goalId: "CG-10",
    stageId: "foundational",
    applicableClassIds: ["1st", "2nd"],
    applicableSession: "both",
  },
  {
    id: "C-11.1",
    code: "C-11.1",
    titleMarathi: "द्वितीय भाषेतील साधे शब्द व उच्चार ओळखते.",
    goalId: "CG-11",
    stageId: "foundational",
    applicableClassIds: ["1st", "2nd"],
    applicableSession: "both",
  },

  // Foundational - Area 5: Aesthetic & Cultural
  {
    id: "C-12.1",
    code: "C-12.1",
    titleMarathi: "2D आणि 3D कलाकृती तयार करण्यासाठी विविध साहित्य आणि साधने हाताळते व त्यासोबत खेळते.",
    goalId: "CG-12",
    stageId: "foundational",
    applicableClassIds: ["1st", "2nd"],
    applicableSession: "session1",
  },
  {
    id: "C-12.2",
    code: "C-12.2",
    titleMarathi: "संगीत, नृत्य आणि अभिनयासाठी आवाज व शरीराचा वापर करून शोध घेते.",
    goalId: "CG-12",
    stageId: "foundational",
    applicableClassIds: ["1st", "2nd"],
    applicableSession: "session1",
  },
  {
    id: "C-12.3",
    code: "C-12.3",
    titleMarathi: "स्वतःच्या कल्पना आणि भावना व्यक्त करण्यासाठी सर्जनशीलता वापरते.",
    goalId: "CG-12",
    stageId: "foundational",
    applicableClassIds: ["1st", "2nd"],
    applicableSession: "session2",
  },
  {
    id: "C-12.5",
    code: "C-12.5",
    titleMarathi: "स्थानिक संस्कृती आणि वारसा यांची प्रशंसा करते.",
    goalId: "CG-12",
    stageId: "foundational",
    applicableClassIds: ["1st", "2nd"],
    applicableSession: "session2",
  },

  // Foundational - Area 6: Positive Learning Habits
  {
    id: "C-13.1",
    code: "C-13.1",
    titleMarathi: "अवधान आणि हेतूपुरस्सर कृती, नियोजन, अवधान आणि विशिष्ट ध्येयप्राप्तीसाठी कृती करणे अशी कौशल्ये संपादित करतो.",
    goalId: "CG-13",
    stageId: "foundational",
    applicableClassIds: ["1st", "2nd"],
    applicableSession: "session1",
  },
  {
    id: "C-13.2",
    code: "C-13.2",
    titleMarathi: "स्मृती, मानसिक लवचिकता आणि स्व-नियंत्रण विकसित करते.",
    goalId: "CG-13",
    stageId: "foundational",
    applicableClassIds: ["1st", "2nd"],
    applicableSession: "session2",
  },
  {
    id: "C-13.3",
    code: "C-13.3",
    titleMarathi: "निरीक्षण, कुतूहल आणि शोध घेण्यासाठी प्रश्न विचारते.",
    goalId: "CG-13",
    stageId: "foundational",
    applicableClassIds: ["1st", "2nd"],
    applicableSession: "session1",
  },

  // Preparatory Stage Competencies (Classes 3, 4, 5)
  {
    id: "PREP-R1C-1",
    code: "R1C-1",
    titleMarathi: "वाचलेल्या मजकुराचा आशय, मध्यवर्ती विचार समजून घेऊन त्यावर स्वतःचे मत मांडतो/मांडते.",
    goalId: "PREP-R1CG-1",
    stageId: "preparatory",
    applicableClassIds: ["3rd", "4th", "5th"],
    applicableSession: "both",
  },
  {
    id: "PREP-R1C-2",
    code: "R1C-2",
    titleMarathi: "अनुभव, प्रसंग व कल्पनांचे लेखन योग्य विरामचिन्हे व व्याकरणासह करतो/करते.",
    goalId: "PREP-R1CG-2",
    stageId: "preparatory",
    applicableClassIds: ["3rd", "4th", "5th"],
    applicableSession: "both",
  },
  {
    id: "PREP-R2C-1",
    code: "R2C-1",
    titleMarathi: "Reads short stories, signs, and expresses simple feelings in English.",
    goalId: "PREP-R2CG-1",
    stageId: "preparatory",
    applicableClassIds: ["3rd", "4th", "5th"],
    applicableSession: "both",
  },
  {
    id: "PREP-R3C-1",
    code: "R3C-1",
    titleMarathi: "हिंदी भाषेतील परिच्छेद वाचून विचारलेल्या साध्या प्रश्नांची उत्तरे देतो/देते.",
    goalId: "PREP-R3CG-1",
    stageId: "preparatory",
    applicableClassIds: ["3rd", "4th", "5th"],
    applicableSession: "both",
  },
  {
    id: "PREP-MC-1",
    code: "MC-1",
    titleMarathi: "मोठ्या संख्यांची स्थानिक किंमत, बेरीज, वजाबाकी, गुणाकार व भागाकार योग्यरीतीने करतो.",
    goalId: "PREP-MCG-1",
    stageId: "preparatory",
    applicableClassIds: ["3rd", "4th", "5th"],
    applicableSession: "both",
  },
  {
    id: "PREP-MC-2",
    code: "MC-2",
    titleMarathi: "मापन (लांबी, वजन, धारकता, नाणी-नोटा व कालमापन) यांचा दैनंदिन व्यवहारात अचूक वापर करतो.",
    goalId: "PREP-MCG-1",
    stageId: "preparatory",
    applicableClassIds: ["3rd", "4th", "5th"],
    applicableSession: "both",
  },
  {
    id: "PREP-TWCO-1",
    code: "TWCO-1",
    titleMarathi: "परिसरातील वनस्पती, प्राणी, जलस्रोत, हवामान आणि मानवी जीवन यांच्या परस्परसंबंधांचे निरीक्षण करतो.",
    goalId: "PREP-TWCG-1",
    stageId: "preparatory",
    applicableClassIds: ["3rd", "4th", "5th"],
    applicableSession: "both",
  },
  {
    id: "PREP-TWCO-2",
    code: "TWCO-2",
    titleMarathi: "कचरा व्यवस्थापन, पाण्याचे संवर्धन आणि नैसर्गिक संसाधनांचा योग्य वापर करतो.",
    goalId: "PREP-TWCG-2",
    stageId: "preparatory",
    applicableClassIds: ["3rd", "4th", "5th"],
    applicableSession: "both",
  },
  {
    id: "PREP-AEC-1",
    code: "AEC-1",
    titleMarathi: "चित्रकाम, मातीकाम, हस्तकला व कागदी वस्तूंच्या निर्मितीत मौलिक कल्पकता दाखवतो.",
    goalId: "PREP-AECG-1",
    stageId: "preparatory",
    applicableClassIds: ["3rd", "4th", "5th"],
    applicableSession: "both",
  },
  {
    id: "PREP-PEC-1",
    code: "PEC-1",
    titleMarathi: "सांघिक खेळांमध्ये सक्रिय सहभाग घेऊन संघभावना, खिलाडूवृत्ती व नियमांचे काटेकोर पालन करतो.",
    goalId: "PREP-PECG-1",
    stageId: "preparatory",
    applicableClassIds: ["3rd", "4th", "5th"],
    applicableSession: "both",
  },

  // Middle Stage Competencies (Classes 6, 7, 8)
  {
    id: "MID-R1C-1",
    code: "R1C-1",
    titleMarathi: "साहित्य कृतींचे चिकित्सक वाचन करून सारांश लेखन व स्वमत प्रभावीपणे मांडतो.",
    goalId: "MID-R1CG-1",
    stageId: "middle",
    applicableClassIds: ["6th", "7th", "8th"],
    applicableSession: "both",
  },
  {
    id: "MID-R2C-1",
    code: "R2C-1",
    titleMarathi: "Drafts formal letters, essays, and delivers presentations in English with appropriate vocabulary.",
    goalId: "MID-R2CG-1",
    stageId: "middle",
    applicableClassIds: ["6th", "7th", "8th"],
    applicableSession: "both",
  },
  {
    id: "MID-R3C-1",
    code: "R3C-1",
    titleMarathi: "हिंदीतील विविध लेखकांच्या रचनांचे भावार्थ समजून घेऊन स्वतंत्र लेखन करतो.",
    goalId: "MID-R3CG-1",
    stageId: "middle",
    applicableClassIds: ["6th", "7th", "8th"],
    applicableSession: "both",
  },
  {
    id: "MID-MC-1",
    code: "MC-1",
    titleMarathi: "बैजिक राशी, समीकरणे, कोनांचे प्रकार, क्षेत्रफळ व घनफळ यांची सूत्रे वापरून उदाहरणे सोडवतो.",
    goalId: "MID-MCG-1",
    stageId: "middle",
    applicableClassIds: ["6th", "7th", "8th"],
    applicableSession: "both",
  },
  {
    id: "MID-SC-1",
    code: "SC-1",
    titleMarathi: "वैज्ञानिक प्रयोग स्वतः करून निष्कर्ष काढतो, प्रतिकृती तयार करतो व शोधक वृत्ती दाखवतो.",
    goalId: "MID-SCG-1",
    stageId: "middle",
    applicableClassIds: ["6th", "7th", "8th"],
    applicableSession: "both",
  },
  {
    id: "MID-SSC-1",
    code: "SSC-1",
    titleMarathi: "ऐतिहासिक साधनांचे वर्गीकरण, नकाशा वाचन, स्थानिक प्रशासन व संविधानातील मूल्यांचे आकलन स्पष्ट करतो.",
    goalId: "MID-SSCG-1",
    stageId: "middle",
    applicableClassIds: ["6th", "7th", "8th"],
    applicableSession: "both",
  },
  {
    id: "MID-AEC-1",
    code: "AEC-1",
    titleMarathi: "पारंपरिक व आधुनिक कला प्रकारांची जाण ठेवून नावीन्यपूर्ण कलाकृती सादर करतो.",
    goalId: "MID-AECG-1",
    stageId: "middle",
    applicableClassIds: ["6th", "7th", "8th"],
    applicableSession: "both",
  },
  {
    id: "MID-PEC-1",
    code: "PEC-1",
    titleMarathi: "क्रीडा स्पर्धांमध्ये उत्कृष्ट कौशल्य, योगासने, प्रथमोपचार व आरोग्याची काळजी घेण्याची तत्परता दाखवतो.",
    goalId: "MID-PECG-1",
    stageId: "middle",
    applicableClassIds: ["6th", "7th", "8th"],
    applicableSession: "both",
  },
  {
    id: "MID-VEC-1",
    code: "VEC-1",
    titleMarathi: "विविध व्यवसाय, उत्पादने व तंत्रज्ञानविषयक प्रकल्पांमध्ये सक्रिय सहभाग घेऊन कौशल्ये आत्मसात करतो.",
    goalId: "MID-VECG-1",
    stageId: "middle",
    applicableClassIds: ["6th", "7th", "8th"],
    applicableSession: "both",
  },
];

// Helper to get applicable areas for a stage
export const getAreasForStage = (stageId: "foundational" | "preparatory" | "middle"): HpcAreaDefinition[] => {
  if (stageId === "foundational") return FOUNDATIONAL_AREAS;
  if (stageId === "preparatory") return PREPARATORY_AREAS;
  return MIDDLE_AREAS;
};

// Helper to get curricular goals for an area/subject
export const getGoalsForArea = (areaOrSubjectId: string, stageId: "foundational" | "preparatory" | "middle"): HpcCurricularGoal[] => {
  return HPC_CURRICULAR_GOALS.filter((g) => g.areaOrSubjectId === areaOrSubjectId && g.stageId === stageId);
};

// Helper to get competencies for a goal and class
export const getCompetenciesForGoalAndClass = (
  goalId: string,
  classId: string,
  session?: "session1" | "session2"
): HpcCompetency[] => {
  return HPC_COMPETENCIES.filter((c) => {
    if (c.goalId !== goalId) return false;
    if (c.applicableClassIds.length > 0 && !c.applicableClassIds.includes(classId)) return false;
    if (session && c.applicableSession && c.applicableSession !== "both" && c.applicableSession !== session) {
      return false;
    }
    return true;
  });
};
