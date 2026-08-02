import re

cce_path = 'src/components/teacher/CCERemarks.tsx'
with open(cce_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Exact mapping for broken/split sentences from screenshots
EXACT_MAP = {
    "स्वतःच्या भावना, विचार, भाव व्य.": "स्वतःच्या भावना, विचार, भाव व्यक्त करतो.",
    "क्त करते..": "",
    "क्त करते.": "",
    "गटामध्ये प्रकट वाचन करते..ते.": "गटामध्ये प्रकट वाचन करतो.",
    "गटामध्ये प्रकट वाचन करते.ते.": "गटामध्ये प्रकट वाचन करतो.",
}

# Substring word repairs
WORD_REPLACEMENTS = [
    ('प्रत्येक गो जाणून', 'प्रत्येक गोष्ट जाणून'),
    ('घेयाची', 'घेण्याची'),
    ('जोडाराया', 'जोडाक्षरांच्या'),
    ('ुत-लेखन', 'श्रुतलेखन'),
    ('करयास', 'करण्यास'),
    ('करयाची', 'करण्याची'),
    ('वाय बनवते', 'वाक्य बनवतो'),
    ('वाय बनवतो', 'वाक्य बनवतो'),
    ('पिरसरातील', 'परिसरातील'),
    ('निसगाची', 'निसर्गाची'),
    ('मिहती', 'माहिती'),
    ('सूचनाप्रमाण', 'सूचनेप्रमाणे'),
    ('बातम्हया', 'बातम्या'),
    ('संह करते', 'संग्रह करतो'),
    ('वाचनाया', 'वाचनाच्या'),
    ('अरांची', 'अक्षरांची'),
    ('अरांचे', 'अक्षरांचे'),
    ('अरांचा', 'अक्षरांचा'),
    ('योय', 'योग्य'),
    ('चिचे', 'चित्राचे'),
    ('निरीण', 'निरीक्षण'),
    (' कन ', ' करून '),
    ('सामुिहक', 'सामूहिक'),
    ('वििध', 'विविध'),
    ('ििचत्र', 'चित्र'),
    ('ििचत्रे', 'चित्रे'),
    ('ििचत्राचे', 'चित्राचे'),
    ('ििसंगीत', 'संगीत'),
    ('ििशक्षण', 'शिक्षण'),
    ('ििशक्षक', 'शिक्षक'),
    ('ििनसग', 'निसर्ग'),
    ('ििनरीक्षण', 'निरीक्षण'),
    ('ििनयम', 'नियम'),
]

def clean_sentence(s):
    if s in EXACT_MAP:
        return EXACT_MAP[s]

    t = s
    for old, new in WORD_REPLACEMENTS:
        t = t.replace(old, new)

    # Clean double dots and trailing noise
    t = re.sub(r'\.\s*\.ते\.', '.', t)
    t = re.sub(r'\.\s*\.ते', '.', t)
    t = re.sub(r'\.\s*\.', '.', t)
    t = re.sub(r'\.\.', '.', t)
    t = re.sub(r'\.\s*स्\.\s*$', '.', t)

    # Standardize verb endings
    t = t.replace('करते.', 'करतो.')
    t = t.replace('आणते.', 'आणतो.')
    t = t.replace('ऐकते,', 'ऐकतो,')
    t = t.replace('सांगते.', 'सांगतो.')

    t = re.sub(r'\s+', ' ', t).strip()

    if not t or len(t) < 4 or t in [".", "..", "करते.", "करतो.", "क्त करतो."]:
        return ""

    if not t.endswith('.'):
        t += '.'

    return t

def process_match(m):
    prefix = m.group(1)
    val = m.group(2)
    suffix = m.group(3)

    # Ignore code literals
    if re.search(r'[a-zA-Z0-9_\-\/@]\.$', val) or val in ["sem1", "sem2", "button", "prathambhasha", "dvitiybhasha", "ganit", "kala", "karyanubhav", "sharirik", "aavad", "sudharna"]:
        return f'{prefix}{val}{suffix}'

    cleaned = clean_sentence(val)
    if not cleaned:
        return ""

    return f'{prefix}{cleaned}{suffix}'

pattern = r'(\s*")([^"\n]+)("(?:\s*,)?\s*)'
new_content = re.sub(pattern, process_match, content)

# Clean empty lines
new_content = re.sub(r'\n\s*\n', '\n', new_content)

with open(cce_path, 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Finished fixing typos and split sentences in CCERemarks.tsx!")
