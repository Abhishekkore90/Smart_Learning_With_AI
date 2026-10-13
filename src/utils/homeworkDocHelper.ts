/**
 * Helper to identify whether a homework item is a Word (.docx / .doc) document
 */
export const isWordHomework = (item: any): boolean => {
  if (!item) return false;
  if (item.wordFileUrl) return true;
  if (item.documentType === "docx" || item.documentType === "word") return true;
  const lowerUrl = (item.fileUrl || "").toLowerCase();
  const lowerName = (item.fileName || "").toLowerCase();
  const lowerWordName = (item.wordFileName || "").toLowerCase();
  return (
    lowerName.endsWith(".docx") ||
    lowerName.endsWith(".doc") ||
    lowerWordName.endsWith(".docx") ||
    lowerWordName.endsWith(".doc") ||
    lowerUrl.includes(".docx") ||
    lowerUrl.includes(".doc")
  );
};
