export interface MCQQuestion {
  id: string;
  question: string;
  options: string[]; // typically 4 options [A, B, C, D]
  correctIndex: number; // 0, 1, 2, or 3
  explanation?: string;
  marks?: number; // default 1
}

export interface MCQHomeworkSet {
  id: string;
  title: string;
  classId: string; // "1st", "2nd", ... "8th", "10th"
  subject: string; // "मराठी", "इंग्रजी", "गणित", "विज्ञान", "सामान्य ज्ञान", etc.
  medium: "marathi" | "semi" | "english";
  date: string; // YYYY-MM-DD
  instructions?: string;
  timeLimitMinutes?: number; // e.g. 15, 20 or 0 for untimed
  questions: MCQQuestion[];
  totalMarks: number;
  createdBy: {
    uid?: string;
    name: string;
    role: "admin" | "teacher" | "student" | "user";
  };
  isCustom?: boolean; // true if created by student/user
  createdAt: string;
  updatedAt?: string;
}

export interface LocalMCQSubmission {
  quizId: string;
  answers: Record<string, number>; // questionId -> selectedOptionIndex
  submittedAt: string;
  score: number;
  totalMarks: number;
  percentage: number;
  timeTakenSeconds?: number;
}
