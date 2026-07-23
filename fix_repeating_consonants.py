import re

cce_path = 'src/components/teacher/CCERemarks.tsx'
with open(cce_path, 'r', encoding='utf-8') as f:
    text = f.read()

# Fix repeating 'स्' prefixes
text = re.sub(r'स्{2,}', 'स्', text)

# Fix misplaced 'ि' or artifacts
text = text.replace('ध्विनमधील', 'ध्वनीमधील')
text = text.replace('म्हहणते', 'म्हणतो')
text = text.replace('म्हहणतो', 'म्हणतो')

with open(cce_path, 'w', encoding='utf-8') as f:
    f.write(text)

print("Finished fixing repeated consonants in CCERemarks.tsx!")
