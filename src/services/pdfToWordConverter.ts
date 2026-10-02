import * as pdfjsLib from "pdfjs-dist";
import {
  Document,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  Packer,
  BorderStyle,
  PageBreak,
} from "docx";

// Set PDF.js worker
if (typeof window !== "undefined") {
  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
}

interface PdfLineItem {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontName?: string;
  isBold?: boolean;
}

interface PdfLine {
  items: PdfLineItem[];
  y: number;
  minX: number;
  maxX: number;
  text: string;
  avgFontSize: number;
  isBold: boolean;
  alignment: (typeof AlignmentType)[keyof typeof AlignmentType];
}

/**
 * Converts a PDF ArrayBuffer into a high-fidelity Word (.docx) document Blob
 * preserving page layout, page breaks, fonts, alignments, and structure.
 */
export async function convertPdfToDocxBlob(
  pdfBuffer: ArrayBuffer,
  documentTitle: string = "Question Paper"
): Promise<{
  blob: Blob;
  textContent: string;
  pageCount: number;
}> {
  const loadingTask = pdfjsLib.getDocument({
    data: pdfBuffer,
    useSystemFonts: true,
  });
  const pdfDoc = await loadingTask.promise;
  const numPages = pdfDoc.numPages;

  const docParagraphs: (Paragraph | Table)[] = [];
  const fullTextParts: string[] = [];

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1 });
    const pageWidth = viewport.width;
    const pageHeight = viewport.height;
    const pageCenterX = pageWidth / 2;

    const textContent = await page.getTextContent();
    const rawItems = textContent.items as any[];

    // Extract valid text items with geometry
    const items: PdfLineItem[] = rawItems
      .filter((it) => it.str && it.str.trim())
      .map((it) => {
        const tx = it.transform ? it.transform[4] : 0;
        const ty = it.transform ? it.transform[5] : 0;
        const fontSize = Math.hypot(it.transform[0], it.transform[1]) || 12;
        const y = pageHeight - ty - fontSize; // distance from top
        const width = it.width || it.str.length * fontSize * 0.55;
        const height = it.height || fontSize * 1.2;
        const fontName = (it.fontName || "").toLowerCase();
        const isBold =
          fontName.includes("bold") ||
          fontName.includes("black") ||
          fontName.includes("heavy") ||
          fontSize >= 15;

        return {
          str: it.str,
          x: tx,
          y,
          width,
          height,
          fontSize,
          fontName: it.fontName,
          isBold,
        };
      });

    // Sort items by Y (top to bottom), then by X (left to right)
    items.sort((a, b) => {
      if (Math.abs(a.y - b.y) > 4) {
        return a.y - b.y;
      }
      return a.x - b.x;
    });

    // Group items into lines
    const lines: PdfLine[] = [];
    let currentLineItems: PdfLineItem[] = [];

    const flushLine = () => {
      if (currentLineItems.length === 0) return;
      currentLineItems.sort((a, b) => a.x - b.x);

      const minX = Math.min(...currentLineItems.map((i) => i.x));
      const maxX = Math.max(...currentLineItems.map((i) => i.x + i.width));
      const text = currentLineItems.map((i) => i.str).join(" ").trim();
      const avgFontSize =
        currentLineItems.reduce((acc, i) => acc + i.fontSize, 0) /
        currentLineItems.length;
      const isBold = currentLineItems.some((i) => i.isBold);
      const lineCenter = (minX + maxX) / 2;
      const lineWidth = maxX - minX;

      let alignment: (typeof AlignmentType)[keyof typeof AlignmentType] = AlignmentType.LEFT;
      if (
        Math.abs(lineCenter - pageCenterX) < 45 &&
        lineWidth < pageWidth * 0.8
      ) {
        alignment = AlignmentType.CENTER;
      } else if (minX > pageWidth * 0.65 && lineWidth < pageWidth * 0.35) {
        alignment = AlignmentType.RIGHT;
      }

      lines.push({
        items: [...currentLineItems],
        y: currentLineItems[0].y,
        minX,
        maxX,
        text,
        avgFontSize,
        isBold,
        alignment,
      });

      currentLineItems = [];
    };

    for (const item of items) {
      if (currentLineItems.length === 0) {
        currentLineItems.push(item);
        continue;
      }
      const prev = currentLineItems[currentLineItems.length - 1];
      const sameLine = Math.abs(item.y - prev.y) <= Math.max(5, prev.fontSize * 0.35);

      if (sameLine) {
        currentLineItems.push(item);
      } else {
        flushLine();
        currentLineItems.push(item);
      }
    }
    flushLine();

    // If this is page 2+, add page break before page content
    if (pageNum > 1) {
      docParagraphs.push(
        new Paragraph({
          children: [new PageBreak()],
        })
      );
    }

    // Process lines of this page into Word paragraphs / tables
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.text) continue;
      fullTextParts.push(line.text);

      // Check if line has a two-column split (e.g. Left Question & Right Marks)
      if (
        line.items.length >= 2 &&
        line.alignment === AlignmentType.LEFT
      ) {
        const firstPart = line.items[0];
        const lastPart = line.items[line.items.length - 1];
        const gap = lastPart.x - (firstPart.x + firstPart.width);

        // Substantial gap indicating right-aligned marks or two columns
        if (gap > 70 && lastPart.x > pageWidth * 0.6) {
          const leftText = line.items
            .slice(0, line.items.length - 1)
            .map((it) => it.str)
            .join(" ")
            .trim();
          const rightText = lastPart.str.trim();

          const table = new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 75, type: WidthType.PERCENTAGE },
                    borders: {
                      top: { style: BorderStyle.NONE },
                      bottom: { style: BorderStyle.NONE },
                      left: { style: BorderStyle.NONE },
                      right: { style: BorderStyle.NONE },
                    },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.LEFT,
                        children: [
                          new TextRun({
                            text: leftText,
                            bold: line.isBold || isQuestionStart(leftText),
                            size: Math.round(line.avgFontSize * 2),
                            font: "Noto Sans Devanagari, Mangal, Arial",
                          }),
                        ],
                      }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 25, type: WidthType.PERCENTAGE },
                    borders: {
                      top: { style: BorderStyle.NONE },
                      bottom: { style: BorderStyle.NONE },
                      left: { style: BorderStyle.NONE },
                      right: { style: BorderStyle.NONE },
                    },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.RIGHT,
                        children: [
                          new TextRun({
                            text: rightText,
                            bold: true,
                            size: Math.round(line.avgFontSize * 2),
                            font: "Noto Sans Devanagari, Mangal, Arial",
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          });

          docParagraphs.push(table);
          continue;
        }
      }

      // Standard Paragraph
      const isHeader =
        line.avgFontSize >= 15 ||
        (line.alignment === AlignmentType.CENTER && line.isBold);
      const isQuestion = isQuestionStart(line.text);

      const pSize = isHeader
        ? Math.round(line.avgFontSize * 2)
        : Math.max(22, Math.round(line.avgFontSize * 2));

      docParagraphs.push(
        new Paragraph({
          alignment: line.alignment,
          spacing: {
            before: isHeader ? 160 : isQuestion ? 120 : 60,
            after: isHeader ? 120 : 60,
            line: 280,
          },
          children: [
            new TextRun({
              text: line.text,
              bold: line.isBold || isHeader || isQuestion,
              size: pSize,
              font: "Noto Sans Devanagari, Mangal, Arial",
            }),
          ],
        })
      );
    }
  }

  // Create full Word Document
  const doc = new Document({
    title: documentTitle,
    description: "Question Paper converted from PDF with layout structure preserved",
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 720, // 0.5 inch
              bottom: 720,
              left: 720,
              right: 720,
            },
          },
        },
        children:
          docParagraphs.length > 0
            ? docParagraphs
            : [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: documentTitle,
                      bold: true,
                      size: 28,
                    }),
                  ],
                }),
              ],
      },
    ],
  });

  const docBlob = await Packer.toBlob(doc);
  return {
    blob: docBlob,
    textContent: fullTextParts.join("\n"),
    pageCount: numPages,
  };
}

/**
 * Checks if line starts with question indicator (प्र., प्रश्न, Q., etc.)
 */
function isQuestionStart(text: string): boolean {
  const t = text.trim();
  return (
    t.startsWith("प्र.") ||
    t.startsWith("प्रश्न") ||
    t.startsWith("सूचना") ||
    t.startsWith("विभाग") ||
    /^[Qq]u?(estion|\.)?\s*\d+/.test(t) ||
    /^\d+[\.\)]\s/.test(t) ||
    /^[अ-ह][\.\)]\s/.test(t)
  );
}

/**
 * Generates an editable Word (.docx) file from teacher/admin edited Question Paper details
 */
export async function generateDocxFromQuestionPaper(data: {
  title: string;
  schoolName?: string;
  className?: string;
  subject?: string;
  examTypeLabel?: string;
  totalMarks?: string;
  academicYear?: string;
  examDate?: string;
  time?: string;
  studentNamePlaceholder?: string;
  rollNo?: string;
  content?: string;
  questions?: Array<{
    qNo?: string;
    question: string;
    marks?: string;
    options?: string[];
  }>;
}): Promise<Blob> {
  const children: (Paragraph | Table)[] = [];

  // 1. School Name (Centered, Bold, 16pt = 32 half-pt)
  if (data.schoolName) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 80 },
        children: [
          new TextRun({
            text: data.schoolName,
            bold: true,
            size: 32,
            font: "Noto Sans Devanagari, Mangal, Arial",
          }),
        ],
      })
    );
  }

  // 2. Exam Title & Academic Year (Centered, Bold, 14pt = 28 half-pt)
  const examLine = [
    data.examTypeLabel || data.title,
    data.academicYear ? `(${data.academicYear})` : "",
  ]
    .filter(Boolean)
    .join(" ");

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 40, after: 120 },
      children: [
        new TextRun({
          text: examLine,
          bold: true,
          size: 28,
          font: "Noto Sans Devanagari, Mangal, Arial",
        }),
      ],
    })
  );

  // 3. Meta Table: Class, Subject, Time, Marks
  const metaRow1Left = `इयत्ता : ${data.className || "१ ली"}`;
  const metaRow1Mid = `विषय : ${data.subject || "मराठी"}`;
  const metaRow1Right = `एकूण गुण : ${data.totalMarks || "२०"}`;

  const metaTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 35, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 4, color: "cbd5e1" },
              bottom: { style: BorderStyle.SINGLE, size: 4, color: "cbd5e1" },
              left: { style: BorderStyle.NONE },
              right: { style: BorderStyle.NONE },
            },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: metaRow1Left,
                    bold: true,
                    size: 24,
                    font: "Noto Sans Devanagari, Mangal, Arial",
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 35, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 4, color: "cbd5e1" },
              bottom: { style: BorderStyle.SINGLE, size: 4, color: "cbd5e1" },
              left: { style: BorderStyle.NONE },
              right: { style: BorderStyle.NONE },
            },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: metaRow1Mid,
                    bold: true,
                    size: 24,
                    font: "Noto Sans Devanagari, Mangal, Arial",
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 30, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 4, color: "cbd5e1" },
              bottom: { style: BorderStyle.SINGLE, size: 4, color: "cbd5e1" },
              left: { style: BorderStyle.NONE },
              right: { style: BorderStyle.NONE },
            },
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: metaRow1Right,
                    bold: true,
                    size: 24,
                    font: "Noto Sans Devanagari, Mangal, Arial",
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });
  children.push(metaTable);

  // 4. Student Name & Roll No Row
  const studentRow = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 70, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.NONE },
              bottom: { style: BorderStyle.SINGLE, size: 4, color: "cbd5e1" },
              left: { style: BorderStyle.NONE },
              right: { style: BorderStyle.NONE },
            },
            children: [
              new Paragraph({
                spacing: { before: 80, after: 80 },
                children: [
                  new TextRun({
                    text:
                      data.studentNamePlaceholder ||
                      "विद्यार्थ्याचे नाव : ________________________________________",
                    size: 22,
                    font: "Noto Sans Devanagari, Mangal, Arial",
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 30, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.NONE },
              bottom: { style: BorderStyle.SINGLE, size: 4, color: "cbd5e1" },
              left: { style: BorderStyle.NONE },
              right: { style: BorderStyle.NONE },
            },
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                spacing: { before: 80, after: 80 },
                children: [
                  new TextRun({
                    text: data.rollNo ? `हजेरी क्र. : ${data.rollNo}` : "हजेरी क्र. : ______",
                    size: 22,
                    font: "Noto Sans Devanagari, Mangal, Arial",
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });
  children.push(studentRow);

  // Space before questions
  children.push(new Paragraph({ spacing: { before: 120, after: 60 } }));

  // 5. Questions List (if structured questions array provided)
  if (data.questions && data.questions.length > 0) {
    data.questions.forEach((q, idx) => {
      const qNum = q.qNo || `प्र. ${idx + 1}.`;
      const marksText = q.marks ? `[${q.marks} गुण]` : "";

      if (marksText) {
        // Table row for Question + Marks
        const qTable = new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  width: { size: 85, type: WidthType.PERCENTAGE },
                  borders: {
                    top: { style: BorderStyle.NONE },
                    bottom: { style: BorderStyle.NONE },
                    left: { style: BorderStyle.NONE },
                    right: { style: BorderStyle.NONE },
                  },
                  children: [
                    new Paragraph({
                      spacing: { before: 120, after: 40 },
                      children: [
                        new TextRun({
                          text: `${qNum} ${q.question}`,
                          bold: true,
                          size: 24,
                          font: "Noto Sans Devanagari, Mangal, Arial",
                        }),
                      ],
                    }),
                  ],
                }),
                new TableCell({
                  width: { size: 15, type: WidthType.PERCENTAGE },
                  borders: {
                    top: { style: BorderStyle.NONE },
                    bottom: { style: BorderStyle.NONE },
                    left: { style: BorderStyle.NONE },
                    right: { style: BorderStyle.NONE },
                  },
                  children: [
                    new Paragraph({
                      alignment: AlignmentType.RIGHT,
                      spacing: { before: 120, after: 40 },
                      children: [
                        new TextRun({
                          text: marksText,
                          bold: true,
                          size: 24,
                          font: "Noto Sans Devanagari, Mangal, Arial",
                        }),
                      ],
                    }),
                  ],
                }),
              ],
            }),
          ],
        });
        children.push(qTable);
      } else {
        children.push(
          new Paragraph({
            spacing: { before: 120, after: 40 },
            children: [
              new TextRun({
                text: `${qNum} ${q.question}`,
                bold: true,
                size: 24,
                font: "Noto Sans Devanagari, Mangal, Arial",
              }),
            ],
          })
        );
      }

      // Options / Sub-questions if any
      if (q.options && q.options.length > 0) {
        q.options.forEach((opt) => {
          children.push(
            new Paragraph({
              spacing: { before: 30, after: 30 },
              indent: { left: 720 },
              children: [
                new TextRun({
                  text: opt,
                  size: 22,
                  font: "Noto Sans Devanagari, Mangal, Arial",
                }),
              ],
            })
          );
        });
      }
    });
  } else if (data.content && data.content.trim()) {
    // 6. Otherwise parse content text line-by-line
    const lines = data.content.split("\n");
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) {
        children.push(new Paragraph({ spacing: { before: 60, after: 60 } }));
        continue;
      }

      const isQ = isQuestionStart(line);
      children.push(
        new Paragraph({
          spacing: {
            before: isQ ? 120 : 40,
            after: 40,
            line: 280,
          },
          children: [
            new TextRun({
              text: line,
              bold: isQ,
              size: isQ ? 24 : 22,
              font: "Noto Sans Devanagari, Mangal, Arial",
            }),
          ],
        })
      );
    }
  }

  const doc = new Document({
    title: data.title,
    sections: [
      {
        properties: {
          page: {
            margin: { top: 720, bottom: 720, left: 720, right: 720 },
          },
        },
        children,
      },
    ],
  });

  return await Packer.toBlob(doc);
}

/**
 * Triggers browser download of a generated blob
 */
export function downloadBlobAsFile(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}
