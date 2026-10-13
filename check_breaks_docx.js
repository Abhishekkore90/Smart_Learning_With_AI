const fs = require('fs');
const jszip = require('jszip');

async function main() {
  const buf = fs.readFileSync('C:/Users/Win-11/Downloads/इयत्ता_१_घरचा_अभ्यास.docx');
  const zip = await jszip.loadAsync(buf);
  const xml = await zip.file('word/document.xml').async('text');
  
  const regex = /<w:br\s+[^>]*w:type="page"[^>]*\/?>|<w:lastRenderedPageBreak\/>/g;
  let match;
  let count = 0;
  while ((match = regex.exec(xml)) !== null) {
    count++;
    const idx = match.index;
    const snippet = xml.substring(Math.max(0, idx - 200), Math.min(xml.length, idx + 200));
    console.log(`\n--- Page Break ${count} [${match[0]}] ---`);
    console.log(snippet.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
  }
  console.log(`\nTotal page breaks found: ${count}`);
}

main().catch(console.error);
