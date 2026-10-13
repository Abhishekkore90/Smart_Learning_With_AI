import fs from 'fs';
import jszip from 'jszip';

async function main() {
  const buf = fs.readFileSync('C:/Users/Win-11/Downloads/इयत्ता_१_घरचा_अभ्यास.docx');
  const zip = await jszip.loadAsync(buf);
  const xml = await zip.file('word/document.xml').async('text');
  const extRegex = /<wp:extent\s+cx="(\d+)"\s+cy="(\d+)"/g;
  let match;
  let i = 0;
  while ((match = extRegex.exec(xml)) !== null) {
    i++;
    const cx = parseInt(match[1]);
    const cy = parseInt(match[2]);
    console.log(`Image ${i}: width = ${Math.round(cx / 9525)}px, height = ${Math.round(cy / 9525)}px (${Math.round(cy / 12700)}pt)`);
  }
}

main().catch(console.error);
