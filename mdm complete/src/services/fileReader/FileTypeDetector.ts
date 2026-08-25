import { DetectedFileType } from "./types";

/**
 * Robust File Type & Signature Detector
 * Combines File Extension, MIME type, and Magic Bytes Binary Inspection
 * to accurately identify file formats even if MIME types are generic or missing.
 */

export interface FileTypeDetails {
  fileType: DetectedFileType;
  mimeType: string;
  extension: string;
  isZipBased: boolean;
  isLegacyOle: boolean;
}

const EXTENSION_MAP: Record<string, DetectedFileType> = {
  xlsx: "xlsx",
  xls: "xls",
  csv: "csv",
  pdf: "pdf",
  docx: "docx",
  doc: "doc",
  png: "image",
  jpg: "image",
  jpeg: "image",
  webp: "image",
};

export async function detectFileType(input: File | ArrayBuffer | Blob): Promise<FileTypeDetails> {
  let fileName = "";
  let mimeType = "";
  let arrayBuffer: ArrayBuffer;

  if (input instanceof File) {
    fileName = input.name || "";
    mimeType = input.type || "";
    arrayBuffer = await input.slice(0, 8192).arrayBuffer();
  } else if (input instanceof Blob) {
    mimeType = input.type || "";
    arrayBuffer = await input.slice(0, 8192).arrayBuffer();
  } else {
    arrayBuffer = input.slice(0, 8192);
  }

  const extMatch = fileName.match(/\.([a-z0-9]+)$/i);
  const rawExtension = extMatch ? extMatch[1].toLowerCase() : "";

  // Inspect Magic Bytes
  const uint8 = new Uint8Array(arrayBuffer);
  let magicType: DetectedFileType | null = null;
  let isZipBased = false;
  let isLegacyOle = false;

  if (uint8.length >= 4) {
    // PK\x03\x04 (ZIP Archive: .xlsx or .docx)
    if (uint8[0] === 0x50 && uint8[1] === 0x4b && uint8[2] === 0x03 && uint8[3] === 0x04) {
      isZipBased = true;
      if (rawExtension === "docx") {
        magicType = "docx";
      } else {
        magicType = "xlsx";
      }
    }
    // %PDF (% = 0x25, P = 0x50, D = 0x44, F = 0x46)
    else if (uint8[0] === 0x25 && uint8[1] === 0x50 && uint8[2] === 0x44 && uint8[3] === 0x46) {
      magicType = "pdf";
    }
    // D0 CF 11 E0 (Legacy OLE2: .xls or .doc)
    else if (uint8[0] === 0xd0 && uint8[1] === 0xcf && uint8[2] === 0x11 && uint8[3] === 0xe0) {
      isLegacyOle = true;
      if (rawExtension === "doc") {
        magicType = "doc";
      } else {
        magicType = "xls";
      }
    }
    // PNG (89 50 4E 47)
    else if (uint8[0] === 0x89 && uint8[1] === 0x50 && uint8[2] === 0x4e && uint8[3] === 0x47) {
      magicType = "image";
    }
    // JPEG (FF D8 FF)
    else if (uint8[0] === 0xff && uint8[1] === 0xd8 && uint8[2] === 0xff) {
      magicType = "image";
    }
  }

  // Fallback to extension map or MIME map
  let finalFileType: DetectedFileType = "unknown";

  if (magicType) {
    finalFileType = magicType;
  } else if (rawExtension && EXTENSION_MAP[rawExtension]) {
    finalFileType = EXTENSION_MAP[rawExtension];
  } else if (mimeType.includes("pdf")) {
    finalFileType = "pdf";
  } else if (mimeType.includes("sheet") || mimeType.includes("excel")) {
    finalFileType = "xlsx";
  } else if (mimeType.includes("wordprocessingml") || mimeType.includes("msword")) {
    finalFileType = "docx";
  } else if (mimeType.includes("csv")) {
    finalFileType = "csv";
  } else if (mimeType.startsWith("image/")) {
    finalFileType = "image";
  }

  return {
    fileType: finalFileType,
    mimeType: mimeType || getStandardMimeType(finalFileType),
    extension: rawExtension || getStandardExtension(finalFileType),
    isZipBased,
    isLegacyOle,
  };
}

function getStandardMimeType(type: DetectedFileType): string {
  switch (type) {
    case "xlsx":
      return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    case "xls":
      return "application/vnd.ms-excel";
    case "csv":
      return "text/csv";
    case "pdf":
      return "application/pdf";
    case "docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case "doc":
      return "application/msword";
    case "image":
      return "image/png";
    default:
      return "application/octet-stream";
  }
}

function getStandardExtension(type: DetectedFileType): string {
  switch (type) {
    case "xlsx":
      return "xlsx";
    case "xls":
      return "xls";
    case "csv":
      return "csv";
    case "pdf":
      return "pdf";
    case "docx":
      return "docx";
    case "doc":
      return "doc";
    case "image":
      return "png";
    default:
      return "bin";
  }
}
