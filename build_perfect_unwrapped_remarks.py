import pypdf
import re
import json

cce_path = 'src/components/teacher/CCERemarks.tsx'

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
    ('वाचनिाचा', 'वाचनाचा'),
    ('T ells', 'Tells')
]

def clean_text(val):
    t = val
    for old, new in CLEANUP_MAP:
        t = t.replace(old, new)
    t = re.sub(r'\s+', ' ', t).strip()
    return t

def process_pdf_perfect(pdf_path):
    reader = pypdf.PdfReader(pdf_path)
    
    subjects = {}
    current_subject = "prathambhasha"
    current_section = "positive"

    for page_idx, page in enumerate(reader.pages):
        ptext = page.extract_text() or ""
        lines = [l.strip() for l in ptext.split("\n") if l.strip()]

        for line in lines:
            # Header check
            if "=== PAGE" in line or line.startswith("आकारिक") or line.startswith("मूल्यमापन") or "Formative" in line or "साधने" in line or line == "6":
                continue
            
            # Subject detection
            if "Subject: English" in line or ("इंग्रजी" in line and ("विषय" in line or "वषय" in line)):
                current_subject = "dvitiybhasha"
                if current_subject not in subjects:
                    subjects[current_subject] = {'positive': [], 'difficulty': []}
                continue
            elif "भाषा" in line and ("विषय" in line or "वषय" in line):
                current_subject = "prathambhasha"
                if current_subject not in subjects:
                    subjects[current_subject] = {'positive': [], 'difficulty': []}
                continue
            elif ("गणित" in line or "गणत" in line) and ("विषय" in line or "वषय" in line):
                current_subject = "ganit"
                if current_subject not in subjects:
                    subjects[current_subject] = {'positive': [], 'difficulty': []}
                continue
            elif "कला" in line and ("विषय" in line or "वषय" in line):
                current_subject = "kala"
                if current_subject not in subjects:
                    subjects[current_subject] = {'positive': [], 'difficulty': []}
                continue
            elif ("कार्यानुभव" in line or "कायार्यानुभव" in line) and ("विषय" in line or "वषय" in line):
                current_subject = "karyanubhav"
                if current_subject not in subjects:
                    subjects[current_subject] = {'positive': [], 'difficulty': []}
                continue
            elif ("शारीरिक" in line or "शिारिीरिक" in line) and ("विषय" in line or "वषय" in line or "शिक्षण" in line or "शिक्षणि" in line):
                current_subject = "sharirik"
                if current_subject not in subjects:
                    subjects[current_subject] = {'positive': [], 'difficulty': []}
                continue

            # Section detection
            if "प्रगती" in line or "निरीक्षण" in line or "सकारात्मक" in line or "Daily Observation (Positive)" in line or "(Positive)" in line:
                current_section = "positive"
                continue
            elif "अडथळ्यां" in line or "अडचणी" in line or "अडचण" in line or "Negative Observation" in line or "Obstacles" in line:
                current_section = "difficulty"
                continue

            # Ignore standalone table numbers like "1.", "2."
            if re.match(r'^\d+\.?$', line):
                continue

            # Check if this line is a continuation line or a new line
            if current_subject == "dvitiybhasha":
                # English remarks: A line starts a new item if it begins with a capital letter or number (e.g., "Encourages learner...", "3. Never takes...")
                # Continuation lines in English start with lowercase letters like "projects", "alphabet", "mother tongue"
                is_continuation = bool(re.match(r'^[a-z]', line)) and not line.startswith("to ") and not line.startswith("his ") and not line.startswith("mother ")
                if is_continuation and current_subject in subjects and subjects[current_subject][current_section]:
                    prev = subjects[current_subject][current_section][-1]
                    subjects[current_subject][current_section][-1] = clean_text(prev + " " + line)
                else:
                    cleaned = re.sub(r'^\d+[\.\s]+', '', line).strip()
                    cleaned = clean_text(cleaned)
                    if len(cleaned) > 2 and current_subject in subjects:
                        if cleaned not in subjects[current_subject][current_section]:
                            subjects[current_subject][current_section].append(cleaned)
            else:
                # Marathi remarks
                cleaned = re.sub(r'^\d+[\.\s]+', '', line).strip()
                cleaned = clean_text(cleaned)
                if len(cleaned) > 3 and current_subject in subjects:
                    if cleaned not in subjects[current_subject][current_section]:
                        subjects[current_subject][current_section].append(cleaned)

    # Interleave 1 positive, 1 difficulty pair by pair
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

c1_data = process_pdf_perfect(r"C:\Users\Win-11\Downloads\1li varnanatmak nondi.pdf")
c2_data = process_pdf_perfect(r"C:\Users\Win-11\Downloads\2ri varnanatmak nondi.pdf")

print("--- Class 1 Final Multiline-Joined Summary ---")
for k, v in c1_data.items():
    print(f"  Class 1 '{k}': {len(v)} complete joined remarks")

print("--- Class 2 Final Multiline-Joined Summary ---")
for k, v in c2_data.items():
    print(f"  Class 2 '{k}': {len(v)} complete joined remarks")

# Format TS code blocks for CLASS_1_REMARKS and CLASS_2_REMARKS
def build_ts_block(class_name, data):
    ts_lines = [f"const {class_name}: Record<string, string[]> = {{\n"]
    keys = list(data.keys())
    for idx, k in enumerate(keys):
        items = data[k]
        ts_lines.append(f"  {k}: [\n")
        for item_idx, item in enumerate(items):
            escaped = item.replace('"', '\\"')
            comma = "," if item_idx < len(items) - 1 else ""
            ts_lines.append(f'    "{escaped}"{comma}\n')
        comma_key = "," if idx < len(keys) - 1 else ""
        ts_lines.append(f"  ]{comma_key}\n")
    ts_lines.append("};\n\n")
    return "".join(ts_lines)

c1_ts = build_ts_block("CLASS_1_REMARKS", c1_data)
c2_ts = build_ts_block("CLASS_2_REMARKS", c2_data)

with open(cce_path, "r", encoding="utf-8") as f:
    cce_content = f.read()

pattern1 = r'const CLASS_1_REMARKS: Record<string, string\[\]> = \{[\s\S]*?\};\n\n'
new_cce_content = re.sub(pattern1, c1_ts, cce_content, count=1)

pattern2 = r'const CLASS_2_REMARKS: Record<string, string\[\]> = \{[\s\S]*?\};\n\n'
new_cce_content = re.sub(pattern2, c2_ts, new_cce_content, count=1)

with open(cce_path, "w", encoding="utf-8") as f:
    f.write(new_cce_content)

print("Successfully updated CLASS_1_REMARKS and CLASS_2_REMARKS in CCERemarks.tsx with complete multiline-joined sentences!")
