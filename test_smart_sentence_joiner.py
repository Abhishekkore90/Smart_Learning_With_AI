import os
import pypdf
import re
import json

def parse_pdf_smart(pdf_path):
    reader = pypdf.PdfReader(pdf_path)
    
    pages_remarks = {}
    
    for p_idx, page in enumerate(reader.pages):
        text = page.extract_text() or ""
        raw_lines = text.split("\n")
        
        # Join lines that belong to the same remark
        cleaned_lines = []
        curr_remark = ""
        
        for line in raw_lines:
            line_str = line.strip()
            if not line_str:
                continue
            
            # Skip page headers / footers / noise
            if "=== PAGE" in line_str or line_str.startswith("आकारिक") or line_str.startswith("मूल्यमापन") or "साधने" in line_str or "Formative" in line_str:
                if curr_remark:
                    cleaned_lines.append(curr_remark)
                    curr_remark = ""
                cleaned_lines.append(line_str)
                continue
            
            # Check if line starts a new numbered item (e.g. "1. ", "1 ", "12. ", "१. ")
            is_new_item = re.match(r'^\d+[\.\s]', line_str) or line_str.startswith("Subject:") or "वषय" in line_str or "विषय" in line_str or "प्रगती" in line_str or "अडथळ" in line_str or "अडचण" in line_str or "Observation" in line_str
            
            if is_new_item:
                if curr_remark:
                    cleaned_lines.append(curr_remark)
                curr_remark = line_str
            else:
                if curr_remark:
                    # Append wrapped word to current remark
                    curr_remark += " " + line_str
                else:
                    curr_remark = line_str
        
        if curr_remark:
            cleaned_lines.append(curr_remark)
            
        pages_remarks[p_idx + 1] = cleaned_lines
        
    return pages_remarks

print("Testing smart PDF line joining for Class 1 & Class 2 PDFs...")
p1 = parse_pdf_smart(r"C:\Users\Win-11\Downloads\1li varnanatmak nondi.pdf")
p2 = parse_pdf_smart(r"C:\Users\Win-11\Downloads\2ri varnanatmak nondi.pdf")

print("Class 1 PDF page 1 sample:")
for l in p1[1][:15]:
    print("  ", l)

print("\nClass 2 PDF page 6 (English) sample:")
for l in p2[6][:15]:
    print("  ", l)
