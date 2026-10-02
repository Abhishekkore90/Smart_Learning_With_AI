export interface DocumentTextBlock {
  id: string;
  text: string;
  x: number; // percentage (0 - 100) of page width
  y: number; // percentage (0 - 100) of page height
  width: number; // percentage (0 - 100)
  height: number; // percentage (0 - 100)
  fontSize: number; // in pt/px equivalent
  fontFamily?: string;
  fontWeight?: string | number;
  color?: string;
  align?: "left" | "center" | "right";
  rotation?: number;
  editable?: boolean;
  isCustom?: boolean; // created manually by user overlay
}

export interface DocumentPage {
  pageNumber: number;
  width: number; // original point width (e.g. 595.28 for A4)
  height: number; // original point height (e.g. 841.89 for A4)
  backgroundUrl?: string; // high-res canvas rendering data URL
  textBlocks: DocumentTextBlock[];
  isScanned?: boolean;
}

export interface DocumentModel {
  documentId: string;
  sourceFileUrl: string;
  fileName?: string;
  fileType?: string;
  pageCount: number;
  pages: DocumentPage[];
  isScannedPdf?: boolean;
}

export interface UserDocumentEdits {
  sourceDocumentId: string;
  userId: string;
  userRole?: string;
  userName?: string;
  pages: {
    pageNumber: number;
    textBlocks: DocumentTextBlock[];
  }[];
  updatedAt: string;
}

export interface DailySubjectTask {
  subjectName: string;
  topic?: string;
  instructions?: string;
  questions: string[];
  examples?: string[];
  activity?: string;
}

export interface DailyHomeworkVariables {
  weekday: string;
  date: string;
  schoolName?: string;
  kendra?: string;
  marathi?: DailySubjectTask;
  english?: DailySubjectTask;
  maths?: DailySubjectTask;
  activity?: {
    title: string;
    description: string;
    instructions?: string;
  };
  customSections?: {
    id: string;
    title: string;
    content: string;
  }[];
}

import type { QuestionPaperData } from "./questionPaper";

export interface HomeworkItem {
  id: string;
  medium: string;
  class: string;
  subject: string;

  homeworkDate: string; // YYYY-MM-DD
  dueDate?: string; // YYYY-MM-DD

  title: string;
  description: string;
  content?: string;

  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;

  templateId?: string;
  pageCount?: number;
  documentType?: "pdf" | "image" | "template" | "text" | "question_paper";

  contentBlocks?: any[];
  originalFileUrl?: string;

  variables?: DailyHomeworkVariables;
  questionPaperData?: QuestionPaperData;

  editableVersion?: any;

  createdAt?: string;
  uploadedAt: string;
  updatedAt?: string;
  uploadedBy: "admin" | "teacher" | string;
}

export interface QuestionPaperItem {
  id: string;
  medium: string;
  class: string;
  subject: string;
  examType: string;
  examTypeLabel: string;
  totalMarks: string;
  academicYear?: string;
  paperDate?: string;

  title: string;
  description: string;
  content?: string;

  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;

  // Converted Word (.docx) file fields (question paper only)
  wordFileUrl?: string;
  wordFileName?: string;
  wordFileSize?: number;

  pageCount?: number;
  documentType?: "pdf" | "image" | "text" | "word";

  createdAt?: string;
  uploadedAt: string;
  updatedAt?: string;
  uploadedBy: "admin" | "teacher" | string;
}
