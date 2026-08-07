import re

cce_path = 'src/components/teacher/CCERemarks.tsx'
with open(cce_path, 'r', encoding='utf-8') as f:
    content = f.read()

match = re.search(r'const CLASS_1_REMARKS: Record<string, string\[\]> = (\{.*?\n\};)', content, re.DOTALL)
if not match:
    print("Could not find CLASS_1_REMARKS")
    exit(1)

block = match.group(1)

short_or_broken = []
for line in block.split('\n'):
    line_clean = line.strip()
    if line_clean.startswith('"') and (line_clean.endswith('",') or line_clean.endswith('"')):
        text = line_clean.strip('",')
        # Check if short or has double dots or looks incomplete
        if len(text) <= 15 or '..' in text or text.endswith(',') or text.endswith('व्य.') or text.endswith('व्य'):
            short_or_broken.append(text)

print(f"Found {len(short_or_broken)} short or broken fragments:")
for s in short_or_broken:
    print(f'   "{s}"')
