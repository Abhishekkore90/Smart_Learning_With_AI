import re

with open('src/routes/teacher.sqaaf.tsx', encoding='utf-8') as f:
    lines = f.readlines()

starts = {}
current_std = 0
for line in lines:
    m = re.search(r'^\s*(\d+):\s*\{', line)
    if m:
        current_std = int(m.group(1))
    
    dom_match = re.search(r'orangeDesc:\s*["\']([१२३४५६७]|[1-7])\.', line)
    if dom_match and current_std:
        d = dom_match.group(1)
        # Convert Marathi numeral to string '1'-'7'
        if d in '१२३४५६७':
            d = str('१२३४५६७'.index(d) + 1)
            
        if d not in starts:
            starts[d] = current_std

print("Domains:", starts)
