import fs from 'fs';
import jszip from 'jszip';

async function main() {
  const buf = fs.readFileSync('C:/Users/Win-11/Downloads/इयत्ता_१_घरचा_अभ्यास.docx');
  const zip = await jszip.loadAsync(buf);
  const xml = await zip.file('word/document.xml').async('text');
  
  const idx = xml.indexOf('lastRenderedPageBreak');
  if (idx !== -1) {
    console.log('BEFORE:');
    console.log(xml.substring(Math.max(0, idx - 1000), idx).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '));
    console.log('\nAFTER:');
    console.log(xml.substring(idx, Math.min(xml.length, idx + 1000)).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '));
  }
}

main().catch(console.error);
