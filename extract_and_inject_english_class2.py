import re
import json
import pypdf

pdf_path = r"C:\Users\Win-11\Downloads\2ri varnanatmak nondi.pdf"
reader = pypdf.PdfReader(pdf_path)

full_text = []
for i, page in enumerate(reader.pages):
    t = page.extract_text() or ""
    full_text.append(f"=== PAGE {i+1} ===\n" + t)

text = "\n\n".join(full_text)

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

def fix_str(val):
    t = val
    for old, new in CLEANUP_MAP:
        t = t.replace(old, new)
    t = re.sub(r'\s+', ' ', t).strip()
    return t

lines = [line.strip() for line in text.split("\n") if line.strip()]

subjects = {}
current_subject = "prathambhasha"
current_section = "positive"

for line in lines:
    if "=== PAGE" in line:
        continue
    
    # Subject detection
    if "Subject: English" in line or "विषय : इंग्रजी" in line or "इंग्रजी" in line:
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
    if "प्रगती" in line or "निरीक्षण" in line or "सकारात्मक" in line or "Daily Observation (Positive)" in line or "Positive" in line:
        current_section = "positive"
        continue
    elif "अडथळ्यां" in line or "अडचणी" in line or "अडचण" in line or "Negative Observation" in line or "Obstacles" in line:
        current_section = "difficulty"
        continue

    # Ignore numbers and template noise
    if line.startswith("आकारिक") or line.startswith("मूल्यमापन") or line.startswith("१.") or line.startswith("५.") or "साधने" in line or "Formative" in line:
        continue
    if re.match(r'^\d+\.?$', line):
        continue

    if len(line) > 3 and current_subject in subjects:
        cleaned = fix_str(line)
        if cleaned and cleaned not in subjects[current_subject][current_section]:
            subjects[current_subject][current_section].append(cleaned)

class2_interleaved = {}
for key in ["prathambhasha", "dvitiybhasha", "ganit", "kala", "karyanubhav", "sharirik", "visheshpragati", "aavad", "sudharna", "vyaktimatva"]:
    content = subjects.get(key, {'positive': [], 'difficulty': []})
    pos_list = content.get('positive', [])
    diff_list = content.get('difficulty', [])
    
    alternating = []
    max_len = max(len(pos_list), len(diff_list))
    for i in range(max_len):
        if i < len(pos_list):
            alternating.append(pos_list[i])
        if i < len(diff_list):
            alternating.append(diff_list[i])
            
    class2_interleaved[key] = alternating

print("Final Class 2 Subject Summary (including English):")
for k, v in class2_interleaved.items():
    print(f"  Subject '{k}': {len(v)} total alternating remarks")

# Inject into CCERemarks.tsx
cce_path = 'src/components/teacher/CCERemarks.tsx'

ts_lines = ["const CLASS_2_REMARKS: Record<string, string[]> = {\n"]
keys = list(class2_interleaved.keys())
for idx, k in enumerate(keys):
    items = class2_interleaved[k]
    ts_lines.append(f"  {k}: [\n")
    for item_idx, item in enumerate(items):
        escaped = item.replace('"', '\\"')
        comma = "," if item_idx < len(items) - 1 else ""
        ts_lines.append(f'    "{escaped}"{comma}\n')
    comma_key = "," if idx < len(keys) - 1 else ""
    ts_lines.append(f"  ]{comma_key}\n")
ts_lines.append("};\n\n")

class2_ts_str = "".join(ts_lines)

with open(cce_path, "r", encoding="utf-8") as f:
    cce_content = f.read()

pattern = r'const CLASS_2_REMARKS: Record<string, string\[\]> = \{[\s\S]*?\};\n\n'
new_cce_content = re.sub(pattern, class2_ts_str, cce_content)

with open(cce_path, "w", encoding="utf-8") as f:
    f.write(new_cce_content)

print("Successfully injected full Class 2 remarks (including English) into CCERemarks.tsx!")
