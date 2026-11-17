import base64
import os

images = {
    'ncertParakhLogo': ('public/hpc/ncert_parakh_logo.png', 'image/png'),
    'maharashtraSealLogo': ('public/hpc/maharashtra_seal_logo.png', 'image/png'),
    'scertPuneLogo': ('public/hpc/scert_pune_logo.png', 'image/png'),
    'foundationalCoverKids': ('public/hpc/foundational_cover_kids.jpeg', 'image/jpeg'),
    'proficiencyCircleBadge': ('public/hpc/proficiency_circle_badge.png', 'image/png'),
    'homeLearningResources': ('public/hpc/home_learning_resources.png', 'image/png'),
    'teacherRemarksLevelChart': ('public/hpc/teacher_remarks_level_chart.png', 'image/png'),
}

out = ['/**\n * Inline Base64 Data URLs for HPC Report Assets.\n * Pre-encoding images guarantees canvas is 100% origin-clean with ZERO taint!\n */\n']
out.append('export const HPC_BASE64_IMAGES = {\n')

for key, (path, mime) in images.items():
    if os.path.exists(path):
        with open(path, 'rb') as f:
            data = base64.b64encode(f.read()).decode('utf-8')
            out.append(f'  {key}: "data:{mime};base64,{data}",\n')
            print(f'Encoded {key}: {len(data)} chars')
    else:
        print(f'Warning: {path} not found')

out.append('};\n')

with open('src/hpc/reports/hpcBase64Images.ts', 'w', encoding='utf-8') as f:
    f.writelines(out)

print('Successfully generated src/hpc/reports/hpcBase64Images.ts')
