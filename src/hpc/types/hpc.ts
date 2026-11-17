export type HpcStageId = "foundational" | "preparatory" | "middle";

export interface HpcStageInfo {
  id: HpcStageId;
  partNumber: number;
  partLabelMarathi: string;
  partLabelEnglish: string;
  titleMarathi: string;
  titleEnglish: string;
  classesLabelMarathi: string;
  classesLabelEnglish: string;
  classIds: string[];
  ageGroupMarathi: string;
  descriptionMarathi: string;
}

export interface HpcCurricularGoal {
  id: string; // e.g. "CG-1", "MCG-1", "R1CG-1"
  code: string;
  titleMarathi: string;
  titleEnglish?: string;
  stageId: HpcStageId;
  areaOrSubjectId: string; // "physical", "socio_emotional", "cognitive", "language", "arts", "habits", or subject id
}

export interface HpcCompetency {
  id: string; // e.g. "C-2.5", "C-4.1"
  code: string;
  titleMarathi: string;
  titleEnglish?: string;
  goalId: string;
  stageId: HpcStageId;
  applicableClassIds: string[];
  applicableSession?: "session1" | "session2" | "both";
  learningOutcomes?: string[]; // अध्ययन निष्पत्ती
}

export interface HpcRubricDescriptor {
  dimension: "awareness" | "sensitivity" | "creativity";
  dimensionLabelMarathi: string;
  levels: {
    levelKey: "beginner" | "proficient" | "advanced"; // Foundational: प्रवाह/पर्वत/आकाश; Prep & Middle: प्रारंभिक/प्रवीण/प्रगत
    labelMarathi: string;
    descriptionMarathi: string;
  }[];
}

// Student Personal Profile (Part A - Me and My Surroundings / Personal Development)
export interface HpcStudentProfile {
  studentId: string;
  academicYear: string;
  stageId: HpcStageId;
  classId: string;
  division?: string;
  
  // Part A(1) - School & Teacher Info
  schoolName?: string;
  udiseNumber?: string;
  cluster?: string; // केंद्र
  taluka?: string; // तालुका
  district?: string; // जिल्हा
  headmasterName?: string; // मुख्याध्यापक
  teacherName?: string; // वर्गशिक्षक
  teacherPhone?: string; // वर्गशिक्षक मोबाईल

  // Part A(1) - Student & Parent Details
  fullName?: string;
  englishName?: string; // विद्यार्थ्याचे नाव (इंग्रजी)
  rollNo?: string;
  grNo?: string; // जन. रजि. नं. (GR No)
  gender?: string;
  dob?: string;
  bloodGroup?: string;
  caste?: string;
  category?: string;
  saralId?: string;
  aadhaar?: string;
  aparId?: string;
  penNo?: string; // Student PEN (पेन क्रमांक)
  udidNo?: string; // UDID (दिव्यांग युडीआयडी)
  regNo?: string; // नोंदणी क्रमांक (Reg. No)

  // Part A - Physical Measurements (उंची व वजन सर्व सत्रे)
  term1Height?: string; // सत्र १ उंची (सें.मी.)
  term1Weight?: string; // सत्र १ वजन (कि.ग्रॅ.)
  term2Height?: string; // सत्र २ उंची (सें.मी.)
  term2Weight?: string; // सत्र २ वजन (कि.ग्रॅ.)

  // Part A - Social & Category Information (सामाजिक व वैयक्तिक माहिती)
  religion?: string; // धर्म
  minority?: string; // अल्पसंख्याक (होय / नाही)
  cwsn?: string; // दिव्यांग (होय / नाही)
  bpl?: string; // दारिद्र्यरेषेखालील (होय / नाही)
  birthPlace?: string; // जन्मगाव / ठिकाण
  studentTaluka?: string; // तालुका
  studentDistrict?: string; // जिल्हा

  // Part A - Family & Contact Details (कुटुंब व संपर्क माहिती)
  motherName?: string;
  motherEducation?: string;
  motherOccupation?: string;
  fatherName?: string;
  fatherEducation?: string;
  fatherOccupation?: string;
  guardianName?: string;
  guardianRelation?: string;
  siblingCount?: string;
  siblingAge?: string;
  addressLine1?: string;
  addressLine2?: string;
  fatherPhone?: string;
  motherPhone?: string;
  areaType?: string; // ग्रामीण / शहरी
  motherTongue?: string; // मातृभाषा
  mediumOfInstruction?: string; // शिक्षणाचे माध्यम

  // Part A - Bank Account Details (बँक खाते माहिती)
  bankName?: string;
  bankAccountNo?: string;
  bankIfscCode?: string;

  parentName?: string;
  parentPhone?: string;
  parentOccupation?: string;
  parentEducation?: string;

  // Part A(2) - Attendance Record (महिनानिहाय उपस्थिती)
  monthlyAttendance?: Record<string, number>;
  monthlyWorkingDays?: Record<string, number>;
  
  // Part A(2) - Basic personal details (मी व माझा परिसर)
  photoUrl?: string;
  age?: string;
  birthday?: string;
  homeAddress?: string;
  familyDescription?: string;
  ambition?: string; // मोठे होऊन मला व्हायचे आहे
  friends?: string[]; // हे माझे मित्र/मैत्रिणी आहेत
  bestFriend1?: string; // जवळचा मित्र/मैत्रीण १
  bestFriend2?: string; // जवळचा मित्र/मैत्रीण २
  bestFriend3?: string; // जवळचा मित्र/मैत्रीण ३
  
  // Favorites (माझा आवडता)
  favoriteColor?: string; // रंग
  favoriteFlower?: string; // फूल
  favoriteFood?: string; // अन्नपदार्थ
  favoriteGame?: string; // खेळ
  favoriteAnimal?: string; // प्राणी
  favoriteSubject?: string; // विषय
  
  // Hobbies / Interests (माझी आवड आहे - checkboxes)
  hobbies?: string[]; // "वाचन", "नृत्य", "गायन", "वादन", "क्रीडा किंवा खेळ", "सर्जनशील लेखन", "बागकाम", "योगाभ्यास", "कला", "हस्तकला", "पाककला", "इतर"
  otherHobby?: string;
  
  // Household chores with family
  regularHomeChores?: string; // इतर व्यक्तींसोबत घरातील खालील कामे नियमित करतो/करते
  
  // Self reflection
  studentSelfReflection?: string; // विद्यार्थी स्वतःच्या प्रगतीविषयी नोंदी
  parentCollaborationNotes?: string; // पालक-शिक्षक सहयोग
  
  updatedAt?: string;
}

// 360-Degree Assessment Feedback
export interface Hpc360Assessment {
  selfAssessment: {
    likedActivity?: "yes" | "no" | "dont_know" | string; // मला हे काम करायला आवडले (होय / नाही / माहीत नाही)
    feltEasy?: "yes" | "no" | "dont_know" | string; // मला हे काम सोपे वाटले
    neededHelpFrom?: string[]; // वर्गमित्र, शिक्षक, पुस्तक, संगणक, यापैकी नाही
    customRemark?: string;
  };
  peerAssessment: {
    peerLiked?: "yes" | "no" | "dont_know" | string; // माझ्या मित्राला हे काम करायला आवडले
    peerFeltEasy?: "yes" | "no" | "dont_know" | string; // माझ्या मित्राला हे काम सोपे वाटले
    peerNeededHelpFrom?: string[];
    peerRemarks?: string;
  };
  parentFeedback: {
    learningResourcesAtHome?: string[]; // पुस्तके/मासिके, वृत्तपत्र, खेळणी/खेळ, फोन/संगणक, इंटरनेट (आंतरजाल)
    parentObservations?: string;
    parentExpectations?: string;
  };
  teacherRemarks: {
    observation: string;
    guidanceSuggestion?: string;
    level?: "nirjhar" | "parvat" | "aakash" | string;
  };
}

// Single area / subject assessment record
export interface HpcAreaAssessment {
  areaOrSubjectId: string;
  areaOrSubjectNameMarathi: string;
  selectedGoalIds: string[];
  selectedCompetencyIds: string[];
  
  // Activities & Questions
  activity1Title?: string;
  activity1Description?: string;
  activity1Outcome?: string; // निष्पत्ती
  activity2Title?: string;
  activity2Description?: string;
  activity2Outcome?: string; // निष्पत्ती
  
  // Selected Learning Outcomes (अध्ययन निष्पत्ती)
  selectedLearningOutcomes?: string[];
  learningOutcomeNotes?: string;
  
  assessmentQuestions?: string[];
  assessmentEvidence?: string;
  
  // Performance Rubric Level Selections
  awarenessLevel: "beginner" | "proficient" | "advanced" | ""; // जाणीवजागृती
  sensitivityLevel: "beginner" | "proficient" | "advanced" | ""; // संवेदनशीलता
  creativityLevel: "beginner" | "proficient" | "advanced" | ""; // सर्जनशीलता
  
  // Optional custom text for dimensions if edited
  awarenessText?: string;
  sensitivityText?: string;
  creativityText?: string;
  
  // 360 Assessment
  threeSixty: Hpc360Assessment;
}

// Session Assessment (Session 1 or Session 2)
export interface HpcSessionAssessment {
  studentId: string;
  academicYear: string;
  stageId: HpcStageId;
  classId: string;
  session: "session1" | "session2";
  status: "draft" | "completed";
  
  areaAssessments: Record<string, HpcAreaAssessment>;
  teacherGeneralRemarks?: string;
  
  updatedAt?: string;
  completedAt?: string;
}

// Annual Summary (Part C)
export interface HpcAnnualSummary {
  studentId: string;
  academicYear: string;
  stageId: HpcStageId;
  classId: string;
  
  areaSummaries: Record<
    string,
    {
      areaOrSubjectId: string;
      areaOrSubjectNameMarathi: string;
      finalLevel: "beginner" | "proficient" | "advanced" | "";
      awarenessSummary?: string;
      sensitivitySummary?: string;
      creativitySummary?: string;
      qualitativeRemarks?: string;
    }
  >;
  
  finalTeacherRemarks: string; // शिक्षकांचा अंतिम सर्वंकष वार्षिक अभिप्राय
  finalParentRemarks?: string; // पालकांचा अंतिम अभिप्राय
  specialAchievements?: string;
  recommendationsForNextClass?: string;
  
  attendanceSummary?: {
    term1WorkingDays: number;
    term1PresentDays: number;
    term2WorkingDays: number;
    term2PresentDays: number;
    totalWorkingDays: number;
    totalPresentDays: number;
    percentage: number;
  };
  
  status: "draft" | "completed";
  updatedAt?: string;
}

// ---------------------------------------------------------------------------
// Dynamic HPC Activities, Questions, Rubrics & Remarks (Managed via Admin Panel & Excel)
// ---------------------------------------------------------------------------

export interface HpcDynamicActivity {
  id: string;
  classId?: string; // e.g. "1st", "2nd", etc.
  stageId: HpcStageId;
  subjectOrArea: string; // उदा. प्रथम भाषा (R1), गणित, शारीरिक विकास
  goalCode: string; // उदा. L1CG1, CG-1
  goalTitle: string;
  competencyCode: string; // उदा. L1C1.1, C-1.1
  competencyTitle: string;
  activityNumber?: number; // 1 ते 5
  activityTitle: string; // उदा. आपल्या आवडत्या सणाबद्दल पाच वाक्यांत सलग बोला.
  activityDescription: string; // थोडक्यात कृती
  description?: string; // पर्यायी alias
  learningOutcomes?: string[]; // अध्ययन निष्पत्ती
  learningOutcomeText?: string;
  questions: string[]; // ५ प्रश्नांची यादी
  teacherFeedbackSample?: string; // शिक्षकांचा अभिप्राय
  parentFeedbackSample?: string; // पालकांचा अभिप्राय
  createdAt?: string;
  updatedAt?: string;
}

export interface HpcDynamicRubric {
  id: string;
  classId?: string;
  stageId: HpcStageId;
  goalCode?: string;
  competencyCode?: string;
  activityTitle?: string;
  dimension: string; // उदा. जाणीवजागृती, संवेदनशीलता, सर्जनशीलता
  beginner: string; // प्रारंभिक / निर्झर
  proficient: string; // प्रवीण / पर्वत
  advanced: string; // प्रगत / आकाश
  createdAt?: string;
}

export interface HpcDynamicRemark {
  id: string;
  classId?: string;
  stageId?: HpcStageId;
  subjectOrArea: string; // विषय किंवा विकास क्षेत्र
  level: string; // प्रारंभिक / प्रवीण / प्रगत किंवा निर्झर / पर्वत / आकाश
  remarkText: string; // शिक्षकांचा अभिप्राय (वर्षाच्या शेवटी सारांश)
  recommendationText?: string; // पुढील इयत्तेसाठी मार्गदर्शन/शिफारस
  type?: string; // final_comprehensive किंवा next_class_recommendation
  createdAt?: string;
}
