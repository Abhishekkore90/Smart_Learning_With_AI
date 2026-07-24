import pypdf
import re
import json

cce_path = 'src/components/teacher/CCERemarks.tsx'

CLEANUP_MAP = [
    ('काडार्गवरील', 'कार्डावरील'),
    ('वणर्गनि', 'वर्णन'),
    ('वणगन', 'वर्णन'),
    ('हिोतो', 'होतो'),
    ('वचारतो', 'विचारतो'),
    ('ठकाणाचे', 'ठिकाणाचे'),
    ('क ु टुंबाविषयी', 'कुटुंबाविषयी'),
    ('क ु टुंब', 'कुटुंब'),
    ('ऐक ू नि', 'ऐकून'),
    ('ऐक ू न', 'ऐकून'),
    ('लिखिता', 'लिहिता'),
    ('लहिता', 'लिहिता'),
    ('दलेल्या', 'दिलेल्या'),
    ('कवतेच्या', 'कवितेच्या'),
    ('कवतेचे', 'कवितेचे'),
    ('चत्राचे', 'चित्राचे'),
    ('चत्र', 'चित्र'),
    ('मत्रांशी', 'मित्रांशी'),
    ('परपाठात', 'परिपाठात'),
    ('शारीरक', 'शारीरिक'),
    ('शिारिीरिक', 'शारीरिक'),
    ('शिक्षणि', 'शिक्षण'),
    ('भाषक', 'भाषिक'),
    ('मत्र', 'मित्र'),
    ('अभनय', 'अभिनय'),
    ('अभनिय', 'अभिनय'),
    ('मळवलेल्या', 'मिळवलेल्या'),
    ('फ ु लांचे', 'फुलांचे'),
    ('दनक्रमाचे', 'दिनक्रमाची'),
    ('दनक्रमाची', 'दिनक्रमाची'),
    ('मजक ु राचे', 'मजकुराचे'),
    ('समुहिात', 'समूहात'),
    ('निाहिी', 'नाही'),
    ('निाहिीत', 'नाहीत'),
    ('नाहिी', 'नाही'),
    ('नाहिीत', 'नाहीत'),
    ('अंगवक्षेप', 'अंगविक्षेप'),
    ('ठ े वत', 'ठेवत'),
    ('ठ े वतानि', 'ठेवताना'),
    ('आहिे', 'आहे'),
    ('अथर्ग', 'अर्थ'),
    ('अपरचत', 'अपरिचित'),
    ('कवता', 'कविता'),
    ('पूणर्ग', 'पूर्ण'),
    ('मजक ू र', 'मजकूर'),
    ('संया', 'संख्या'),
    ('संयाकाडार्गचे', 'संख्याकार्डाचे'),
    ('क्रया', 'क्रिया'),
    ('ग णत', 'गणित'),
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
    ('भाषण करता येत निाहिी', 'भाषण करता येत नाही'),
    ('वापरात निाहिी', 'वापरत नाही'),
    ('T ells', 'Tells')
]

def clean_marathi_str(val):
    t = val
    for old, new in CLEANUP_MAP:
        t = t.replace(old, new)
    t = re.sub(r'\s+', ' ', t).strip()
    return t

# English specific multiline joiner
ENGLISH_PAIRS = [
    ("He frames meaningful sentences in English on", "his own", "He frames meaningful sentences in English on his own."),
    ("He translates sentences from English to his", "mother tongue", "He translates sentences from English to his mother tongue."),
    ("He translates sentences from his mother tongue", "to English", "He translates sentences from his mother tongue to English."),
    ("Never takes active participation in given", "projects", "Never takes active participation in given projects."),
    ("Provides practice in matching letters in the", "alphabet", "Provides practice in matching letters in the alphabet."),
    ("He picks out rhyming words from the", "poem", "He picks out rhyming words from the poem."),
    ("Narrates simple and short fables with the help", "of audio, video, and aids", "Narrates simple and short fables with the help of audio, video, and aids."),
    ("Provides opportunity to listen to the rhythm of", "rhymes", "Provides opportunity to listen to the rhythm of rhymes."),
    ("Organizes simple conversational activities for", "practice", "Organizes simple conversational activities for practice."),
    ("Presents model of simple questions and", "answers", "Presents model of simple questions and answers."),
    ("Presents nursery rhymes, prayers, and action", "songs", "Presents nursery rhymes, prayers, and action songs."),
    ("He never translates sentences from English to", "his mother tongue", "He never translates sentences from English to his mother tongue."),
    ("He is not able to tell a story using his own", "words", "He is not able to tell a story using his own words.")
]

def parse_pdf_strictly(pdf_path):
    reader = pypdf.PdfReader(pdf_path)
    subjects = {
        'prathambhasha': {'positive': [], 'difficulty': []},
        'dvitiybhasha': {'positive': [], 'difficulty': []},
        'ganit': {'positive': [], 'difficulty': []},
        'kala': {'positive': [], 'difficulty': []},
        'karyanubhav': {'positive': [], 'difficulty': []},
        'sharirik': {'positive': [], 'difficulty': []}
    }

    curr_subj = "prathambhasha"
    curr_sec = "positive"

    for page_idx, page in enumerate(reader.pages):
        raw = page.extract_text() or ""
        lines = [l.strip() for l in raw.split("\n") if l.strip()]

        for line in lines:
            if "=== PAGE" in line or line.startswith("आकारिक") or line.startswith("मूल्यमापन") or "Formative" in line or "साधने" in line or line == "6":
                continue

            # Subject
            if "Subject: English" in line or ("इंग्रजी" in line and ("विषय" in line or "वषय" in line)):
                curr_subj = "dvitiybhasha"
                continue
            elif "भाषा" in line and ("विषय" in line or "वषय" in line):
                curr_subj = "prathambhasha"
                continue
            elif ("गणित" in line or "गणत" in line) and ("विषय" in line or "वषय" in line):
                curr_subj = "ganit"
                continue
            elif "कला" in line and ("विषय" in line or "वषय" in line):
                curr_subj = "kala"
                continue
            elif ("कार्यानुभव" in line or "कायार्यानुभव" in line) and ("विषय" in line or "वषय" in line):
                curr_subj = "karyanubhav"
                continue
            elif ("शारीरिक" in line or "शिारिीरिक" in line) and ("विषय" in line or "वषय" in line or "शिक्षण" in line or "शिक्षणि" in line):
                curr_subj = "sharirik"
                continue

            # Section
            if "प्रगती" in line or "निरीक्षण" in line or "सकारात्मक" in line or "Daily Observation" in line or "(Positive)" in line:
                curr_sec = "positive"
                continue
            elif "अडथळ्यां" in line or "अडचणी" in line or "अडचण" in line or "Negative Observation" in line or "Obstacles" in line:
                curr_sec = "difficulty"
                continue

            if re.match(r'^\d+\.?$', line):
                continue

            cleaned_line = clean_marathi_str(line)
            if not cleaned_line or len(cleaned_line) < 3:
                continue

            target = subjects[curr_subj][curr_sec]

            if curr_subj == "dvitiybhasha":
                # English processing: check if this line is part of a continuation
                item = re.sub(r'^\d+[\.\s]+', '', cleaned_line).strip()
                
                # Check against known continuation lines
                is_standalone = True
                if target:
                    last_item = target[-1]
                    # Check if last_item + line forms a known English sentence
                    for p_part1, p_part2, p_full in ENGLISH_PAIRS:
                        if p_part1.lower() in last_item.lower() and p_part2.lower() in item.lower():
                            target[-1] = p_full
                            is_standalone = False
                            break
                        elif item.lower() == p_part2.lower():
                            target[-1] = clean_marathi_str(last_item + " " + item)
                            is_standalone = False
                            break
                
                if is_standalone and item and len(item) > 2:
                    if item not in target and item != "his own" and item != "mother tongue" and item != "to English" and item != "projects" and item != "alphabet":
                        # Add full stop if missing
                        if not item.endswith("."):
                            item += "."
                        target.append(item)
            else:
                # Marathi processing: Each line from the PDF page is a single distinct remark, unless it's table header noise
                item = re.sub(r'^\d+[\.\s]+', '', cleaned_line).strip()
                if len(item) > 3 and not item.startswith("तंत्रे व साधने") and not item.startswith("मूल्यमापन साधने") and not item.startswith("१. दैनिक"):
                    if not item.endswith("."):
                        item += "."
                    if item not in target:
                        target.append(item)

    # Interleave 1 positive, 1 difficulty
    interleaved = {}
    for key in ["prathambhasha", "dvitiybhasha", "ganit", "kala", "karyanubhav", "sharirik", "visheshpragati", "aavad", "sudharna", "vyaktimatva"]:
        content = subjects.get(key, {'positive': [], 'difficulty': []})
        pos_l = content.get('positive', [])
        diff_l = content.get('difficulty', [])
        
        arr = []
        max_l = max(len(pos_l), len(diff_l))
        for idx in range(max_l):
            if idx < len(pos_l):
                arr.append(pos_l[idx])
            if idx < len(diff_l):
                arr.append(diff_l[idx])
        interleaved[key] = arr

    return interleaved

c1_data = parse_pdf_strictly(r"C:\Users\Win-11\Downloads\1li varnanatmak nondi.pdf")
c2_data = parse_pdf_strictly(r"C:\Users\Win-11\Downloads\2ri varnanatmak nondi.pdf")

print("=== CLASS 1 STRICT SUMMARY ===")
for k, v in c1_data.items():
    print(f"  Class 1 '{k}': {len(v)} clean remarks")

print("\n=== CLASS 2 STRICT SUMMARY ===")
for k, v in c2_data.items():
    print(f"  Class 2 '{k}': {len(v)} clean remarks")

# Verify English remarks in Class 2
print("\n--- Class 2 English Remarks Preview ---")
for idx, r in enumerate(c2_data['dvitiybhasha'][:15]):
    print(f"  {idx+1}: {r}")

def build_ts_code(var_name, data):
    lines = [f"const {var_name}: Record<string, string[]> = {{\n"]
    keys = list(data.keys())
    for idx, k in enumerate(keys):
        items = data[k]
        lines.append(f"  {k}: [\n")
        for item_idx, item in enumerate(items):
            escaped = item.replace('"', '\\"')
            comma = "," if item_idx < len(items) - 1 else ""
            lines.append(f'    "{escaped}"{comma}\n')
        comma_key = "," if idx < len(keys) - 1 else ""
        lines.append(f"  ]{comma_key}\n")
    lines.append("};\n\n")
    return "".join(lines)

c1_code = build_ts_code("CLASS_1_REMARKS", c1_data)
c2_code = build_ts_code("CLASS_2_REMARKS", c2_data)

with open(cce_path, "r", encoding="utf-8") as f:
    cce_txt = f.read()

# Replace CLASS_1_REMARKS
pattern1 = r'const CLASS_1_REMARKS: Record<string, string\[\]> = \{[\s\S]*?\n\};\n\n'
cce_txt = re.sub(pattern1, c1_code, cce_txt, count=1)

# Replace CLASS_2_REMARKS
pattern2 = r'const CLASS_2_REMARKS: Record<string, string\[\]> = \{[\s\S]*?\n\};\n\n'
cce_txt = re.sub(pattern2, c2_code, cce_txt, count=1)

with open(cce_path, "w", encoding="utf-8") as f:
    f.write(cce_txt)

print("\nSuccessfully updated CLASS_1_REMARKS and CLASS_2_REMARKS in CCERemarks.tsx!")
