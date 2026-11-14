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
  rollNo?: string;
  gender?: string;
  dob?: string;
  bloodGroup?: string;
  caste?: string;
  category?: string;
  saralId?: string;
  aadhaar?: string;
  aparId?: string;
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
