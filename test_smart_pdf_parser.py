import pypdf
import re
import json

CLEANUP_MAP = [
    ('वषय', 'विषय'),
    ('मरिाठी', 'मराठी'),
    ('दैनक', 'दैनंदिन'),
    ('दैनंदन', 'दैनंदिन'),
    ('नरिीक्षण', 'निरीक्षण'),
    ('नरिीक्षणि', 'निरीक्षण'),
    ('नरीक्षण', 'निरीक्षण'),
    ('वाचनि', 'वाचन'),
    ('वाचनिाचा', 'वाचनाचा'),
    ('करतोनिसगार्गची', 'करतो'),
    ('अनिुभव', 'अनुभव'),
    ('अनिुभवाचे', 'अनुभवाचे'),
    ('चत्राचे', 'चित्राचे'),
    ('चत्र', 'चित्र'),
    ('मत्रांशी', 'मित्रांशी'),
    ('परपाठात', 'परिपाठात'),
    ('हियोतो', 'होतो'),
    ('वणर्गनि', 'वर्णन'),
    ('वणगन', 'वर्णन'),
    ('ठकाणाचे', 'ठिकाणाचे'),
    ('शारीरक', 'शारीरिक'),
    ('शिारिीरिक', 'शारीरिक'),
    ('शिक्षणि', 'शिक्षण'),
    ('भाषक', 'भाषिक'),
    ('मत्र', 'मित्र'),
    ('स्वाध्याय', 'स्वाध्याय'),
    ('क ु टुंब', 'कुटुंब'),
    ('लक्ष पूणर्ग', 'लक्षपूर्वक'),
    ('लक्षपूवर्गक', 'लक्षपूर्वक'),
    ('सामुहिक', 'सामूहिक'),
    ('रत्या', 'रीत्या'),
    ('अभनिय', 'अभिनय'),
    ('मळवलेल्या', 'मिळवलेल्या'),
    ('फ ु लांचे', 'फुलांचे'),
    ('दनक्रमाचे', 'दिनक्रमाची'),
    ('दनक्रमाची', 'दिनक्रमाची'),
    ('मजक ु राचे', 'मजकुराचे'),
    ('मजक ू र', 'मजकूर'),
    ('बडबड गीताचे', 'बडबडगीताचे'),
    ('बडबडगीताचे', 'बडबडगीताचे'),
    ('समुहिात', 'समूहात'),
    ('निाहिी', 'नाही'),
    ('निाहिीत', 'नाहीत'),
    ('नाहिी', 'नाही'),
    ('नाहिीत', 'नाहीत'),
    ('अंगवक्षेप', 'अंगविक्षेप'),
    ('ठ े वत', 'ठेवत'),
    ('ठ े वतानि', 'ठेवताना'),
    ('लहिता', 'लिहिता'),
    ('लिखिता', 'लिहिता'),
    ('आहिे', 'आहे'),
    ('एक ू नि', 'ऐकून'),
    ('एक ू न', 'ऐकून'),
    ('अथर्ग', 'अर्थ'),
    ('अपरचत', 'अपरिचित'),
    ('कवता', 'कविता'),
    ('कवतेच्या', 'कवितेच्या'),
    ('कवतेचे', 'कवितेचे'),
    ('पूणर्ग', 'पूर्ण'),
    ('संया', 'संख्या'),
    ('संयाकाडार्गचे', 'संख्याकार्डाचे'),
    ('क्रया', 'क्रिया'),
    ('ग णत', 'गणित'),
    ('इंग्रजी', 'इंग्रजी'),
    ('शास्त्र', 'शास्त्र'),
    ('कायार्यानुभव', 'कार्यानुभव'),
    ('कायर्गनुभव', 'कार्यानुभव'),
    ('शारीरक शक्षण', 'शारीरिक शिक्षण'),
    ('कला', 'कला'),
    ('म्हिनतो', 'म्हणतो'),
    ('म्हिणतो', 'म्हणतो'),
    ('म्हिणता', 'म्हणता'),
    ('म्हिनता', 'म्हणता'),
    ('लहिान', 'लहान'),
    ('परचय', 'परिचय'),
    ('गणतीय', 'गणितीय'),
    ('सहिाय्याने', 'सहाय्याने'),
    ('वतर्गमानपत्राच्या', 'वर्तमानपत्राच्या'),
    ('दनदशर्शिक े च्या', 'दिनदर्शिकेच्या'),
    ('मोठ े पणा', 'मोठेपणा'),
    ('उदाहिरणे', 'उदाहरणे'),
    ('उदाहिरणाची', 'उदाहरणाची'),
    (' क ृ ती', ' कृती'),
    ('क ृ ती', 'कृती'),
    ('आक ृ ती', 'आकृती'),
    ('आक ृ त्या', 'आकृत्या'),
    ('नसगार्गची', 'निसर्गाची'),
    ('पर्यात', 'पर्यंत'),
    ('पयर्वंत', 'पर्यंत'),
    ('सहिभागी', 'सहभागी'),
    ('सहिजपणे', 'सहजपणे'),
    ('अथार्गसहि', 'अर्थासहित'),
    ('काडार्गवरील', 'कार्डावरील'),
    ('वचारतो', 'विचारतो'),
    ('दलेल्या', 'दिलेल्या'),
    ('परस्परांनिा', 'परस्परांना'),
    ('स्वताच्या', 'स्वतःच्या'),
    ('स्वताचे', 'स्वतःचे'),
    ('पानिा', 'पाने'),
    ('ध्वनिीमधील', 'ध्वनीमधील'),
    ('बोलतांनिा', 'बोलताना'),
    ('मोठ्यांचा', 'मोठ्यांचा'),
    ('मानि', 'मान'),
    ('सूचनिेचा', 'सूचनेचा'),
    ('सूचनिा', 'सूचना'),
    ('निाव्यानिे', 'नावाने'),
    ('मुद्द्याच्या', 'मुद्यांच्या'),
    ('पद्धतीनिे', 'पद्धतीने'),
    ('वाचनि', 'वाचन'),
    ('वाचनिाचा', 'वाचनाचा')
]

def clean_text(val):
    t = val
    for old, new in CLEANUP_MAP:
        t = t.replace(old, new)
    t = re.sub(r'\s+', ' ', t).strip()
    return t

def parse_pdf_smart(pdf_path):
    reader = pypdf.PdfReader(pdf_path)
    full_pages = [page.extract_text() or "" for page in reader.pages]
    
    subjects = {}
    current_subject = "prathambhasha"
    current_section = "positive"
    
    current_remark_buf = []

    def flush_remark():
        nonlocal current_remark_buf
        if current_remark_buf:
            combined = " ".join(current_remark_buf)
            # Remove leading numbers like "3. ", "12. "
            cleaned_rem = re.sub(r'^\d+[\.\s]+', '', combined).strip()
            cleaned_rem = clean_text(cleaned_rem)
            if len(cleaned_rem) > 3 and current_subject in subjects:
                if cleaned_rem not in subjects[current_subject][current_section]:
                    subjects[current_subject][current_section].append(cleaned_rem)
            current_remark_buf = []

    for page_idx, ptext in enumerate(full_pages):
        raw_lines = ptext.split("\n")
        for line in raw_lines:
            l = line.strip()
            if not l:
                continue
            
            # Check for header/noise
            if "=== PAGE" in l or l.startswith("आकारिक") or l.startswith("मूल्यमापन") or "Formative" in l or "साधने" in l:
                flush_remark()
                continue
            
            # Subject detection
            if ("Subject: English" in l) or ("इंग्रजी" in l):
                flush_remark()
                current_subject = "dvitiybhasha"
                if current_subject not in subjects:
                    subjects[current_subject] = {'positive': [], 'difficulty': []}
                continue
            elif "भाषा" in l and ("विषय" in l or "वषय" in l):
                flush_remark()
                current_subject = "prathambhasha"
                if current_subject not in subjects:
                    subjects[current_subject] = {'positive': [], 'difficulty': []}
                continue
            elif ("गणित" in l or "गणत" in l) and ("विषय" in l or "वषय" in l):
                flush_remark()
                current_subject = "ganit"
                if current_subject not in subjects:
                    subjects[current_subject] = {'positive': [], 'difficulty': []}
                continue
            elif "कला" in l and ("विषय" in l or "वषय" in l):
                flush_remark()
                current_subject = "kala"
                if current_subject not in subjects:
                    subjects[current_subject] = {'positive': [], 'difficulty': []}
                continue
            elif ("कार्यानुभव" in l or "कायार्यानुभव" in l) and ("विषय" in l or "वषय" in l):
                flush_remark()
                current_subject = "karyanubhav"
                if current_subject not in subjects:
                    subjects[current_subject] = {'positive': [], 'difficulty': []}
                continue
            elif ("शारीरिक" in l or "शिारिीरिक" in l) and ("विषय" in l or "वषय" in l or "शिक्षण" in l or "शिक्षणि" in l):
                flush_remark()
                current_subject = "sharirik"
                if current_subject not in subjects:
                    subjects[current_subject] = {'positive': [], 'difficulty': []}
                continue

            # Section detection
            if "प्रगती" in l or "निरीक्षण" in l or "सकारात्मक" in l or "Daily Observation (Positive)" in l or "(Positive)" in l:
                flush_remark()
                current_section = "positive"
                continue
            elif "अडथळ्यां" in l or "अडचणी" in l or "अडचण" in l or "Negative Observation" in l or "Obstacles" in l:
                flush_remark()
                current_section = "difficulty"
                continue

            # Check if line starts a new numbered item (e.g. "1. ", "12. ", "3. ")
            if re.match(r'^\d+[\.\s]+', l):
                flush_remark()
                current_remark_buf.append(l)
            else:
                # If we are inside an active remark buffer, append continuation line!
                if current_remark_buf:
                    current_remark_buf.append(l)
                else:
                    # Line without number but might be first item or standalone
                    if len(l) > 3 and not re.match(r'^\d+\.?$', l):
                        current_remark_buf.append(l)

    flush_remark()
    
    # Interleave 1 positive, 1 difficulty
    interleaved = {}
    for key in ["prathambhasha", "dvitiybhasha", "ganit", "kala", "karyanubhav", "sharirik", "visheshpragati", "aavad", "sudharna", "vyaktimatva"]:
        content = subjects.get(key, {'positive': [], 'difficulty': []})
        pos_list = content.get('positive', [])
        diff_list = content.get('difficulty', [])
        
        arr = []
        max_l = max(len(pos_list), len(diff_list))
        for idx in range(max_l):
            if idx < len(pos_list):
                arr.append(pos_list[idx])
            if idx < len(diff_list):
                arr.append(diff_list[idx])
        interleaved[key] = arr

    return interleaved

c1_res = parse_pdf_smart(r"C:\Users\Win-11\Downloads\1li varnanatmak nondi.pdf")
c2_res = parse_pdf_smart(r"C:\Users\Win-11\Downloads\2ri varnanatmak nondi.pdf")

print("--- Class 1 Smart Parsed Summary ---")
for k, v in c1_res.items():
    print(f"  Class 1 '{k}': {len(v)} complete multiline-joined remarks")

print("--- Class 2 Smart Parsed Summary ---")
for k, v in c2_res.items():
    print(f"  Class 2 '{k}': {len(v)} complete multiline-joined remarks")

with open("c1_smart.json", "w", encoding="utf-8") as f:
    json.dump(c1_res, f, ensure_ascii=False, indent=2)

with open("c2_smart.json", "w", encoding="utf-8") as f:
    json.dump(c2_res, f, ensure_ascii=False, indent=2)

print("Saved c1_smart.json and c2_smart.json successfully!")
