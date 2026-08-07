import re

cce_path = 'src/components/teacher/CCERemarks.tsx'
with open(cce_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Exact mapping of broken fragments / short phrases to full clean Marathi sentences
fragment_map = {
    "वर, व्यं.": "स्वर, व्यंजने योग्य उच्चारण करतो.",
    "वर, व्यं": "स्वर, व्यंजने योग्य उच्चारण करतो.",
    "बडबडगीताचे सामूहिक गायन करते..": "बडबडगीताचे सामूहिक गायन करतो.",
    "बडबडगीताचे सामूहिक गायन करतो..": "बडबडगीताचे सामूहिक गायन करतो.",
    "इतरांना कामात व्य": "इतरांना कामात व्यत्यय, अडथळा आणू नये.",
    "त्यय, अडथळा आणू नये.": "",
    "हवेचे उपयोग सांगते.♂.": "हवेचे उपयोग सांगतो.",
    "हवेचे उपयोग सांगतो.♂.": "हवेचे उपयोग सांगतो.",
    "वतःच्या भावना, विचार, भाव व्यक्त करतो.": "स्वतःच्या भावना, विचार, भाव व्यक्त करतो.",
    "वतःच्या भावना, विचार, भाव व्यक्त करते.": "स्वतःच्या भावना, विचार, भाव व्यक्त करतो.",
}

# Regex fixes for double dots and short snippets
def fix_line(line):
    # Check exact replacement first
    if line in fragment_map:
        return fragment_map[line]
    
    t = line
    # Remove double dots
    t = re.sub(r'\.\s*\.', '.', t)
    t = re.sub(r'\.\.', '.', t)

    # Replace feminine 'करते' with standard 'करतो' if present
    t = t.replace('करते.', 'करतो.')
    t = t.replace('आणते.', 'आणतो.')
    t = t.replace('ऐकते,', 'ऐकतो,')
    t = t.replace('सांगते.', 'सांगतो.')

    # Drop any fragment less than 12 characters that doesn't make a complete sentence
    if len(t) < 12 and not any(w in t for w in ["करतो", "आहे", "गातो", "सांगतो"]):
        return ""
        
    return t

def process_match(m):
    prefix = m.group(1)
    val = m.group(2)
    suffix = m.group(3)
    
    fixed = fix_line(val)
    if not fixed:
        return ""
    return f'{prefix}{fixed}{suffix}'

pattern = r'(\s*")([^"\n]+)("(?:\s*,)?\s*)'
new_content = re.sub(pattern, process_match, content)

# Remove empty lines left by deleted fragments
new_content = re.sub(r'\n\s*\n', '\n', new_content)

with open(cce_path, 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Finished repairing broken fragments in CCERemarks.tsx!")
