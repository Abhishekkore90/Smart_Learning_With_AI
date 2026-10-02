export type QuestionType =
  | "match_pairs"
  | "trace_write"
  | "add_matra"
  | "circle_letters"
  | "read_and_write"
  | "big_small_vehicles"
  | "color_shapes"
  | "fill_blanks"
  | "count_and_circle"
  | "count_and_write"
  | "custom";

export interface MatchPairItem {
  id: string;
  leftText?: string;
  leftImageUrl?: string;
  rightText?: string;
  rightImageUrl?: string;
}

export interface TraceWriteItem {
  id: string;
  char: string;
  guideLines?: number;
  sampleCount?: number;
}

export interface AddMatraItem {
  id: string;
  baseChar: string;
  exampleChar?: string;
  resultChar?: string;
}

export interface CircleLetterGroup {
  id: string;
  targetLetter: string;
  words: string[];
}

export interface ReadWriteWord {
  id: string;
  word: string;
}

export interface CountCircleItem {
  id: string;
  imageUrl?: string;
  imageAlt?: string;
  count: number;
  options: number[];
  correctAnswer?: number;
}

export interface CountWriteItem {
  id: string;
  name: string;
  imageUrl?: string;
  count: number;
  unitLabel?: string;
}

export interface QuestionPaperItemDef {
  id: string;
  qNo: string; // e.g. "प्रश्न १" or "Qu.1"
  title: string;
  subTitle?: string;
  marks: number | string;
  type: QuestionType;
  instructions?: string;
  
  // Specific data structures based on type
  matchPairs?: {
    pairs: MatchPairItem[];
    subSectionTitle?: string;
  }[];
  
  traceWriteItems?: TraceWriteItem[];
  addMatraItems?: AddMatraItem[];
  circleLetterGroups?: CircleLetterGroup[];
  readWriteWords?: ReadWriteWord[];
  
  // Math specific
  bigSmallData?: {
    item1: { title: string; imageUrl: string; isBigger?: boolean };
    item2: { title: string; imageUrl: string; isBigger?: boolean };
    questionPrompt: string;
  };
  
  oneManyData?: {
    item1: { title: string; imageUrl: string; isMany?: boolean };
    item2: { title: string; imageUrl: string; isMany?: boolean };
    questionPrompt: string;
  };

  colorShapesData?: {
    prompt: string;
    itemsCount: number;
    shapeType: string;
    imageUrl?: string;
  }[];

  fillBlanksData?: {
    sequence: Array<{ num: number | string; isBlank?: boolean; userValue?: string }>;
  };

  countCircleItems?: CountCircleItem[];
  countWriteItems?: CountWriteItem[];
  
  customHtml?: string;
}

export interface QuestionPaperData {
  id: string;
  templateKey?: string;
  medium: "marathi" | "semi-english" | "english";
  standard: string; // e.g. "१ ली" or "1"
  subject: string; // e.g. "भाषा", "गणित", "MATH"
  examName: string; // e.g. "आकारिक मूल्यमापन चाचणी क्र. १"
  schoolName: string;
  kendraName?: string;
  taluka?: string;
  district?: string;
  
  totalMarks: number;
  passingMarks?: number;
  
  studentNameLabel?: string;
  rollNoLabel?: string;
  dateLabel?: string;
  obtainedMarksLabel?: string;
  
  date?: string;
  academicYear?: string;
  
  questions: QuestionPaperItemDef[];
}
