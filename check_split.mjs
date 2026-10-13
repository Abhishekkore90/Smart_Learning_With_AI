import fs from 'fs';
import mammoth from 'mammoth';

async function main() {
  const buf = fs.readFileSync('C:/Users/Win-11/Downloads/इयत्ता_१_घरचा_अभ्यास.docx');
  const res = await mammoth.convertToHtml({ buffer: buf });
  const html = res.value;

  const p1Header = 'घरचा अभ्यास • इयत्ता १ ली';
  const splitIdx = html.indexOf(p1Header);
  console.log('Split index found:', splitIdx !== -1);
  
  if (splitIdx !== -1) {
    const page1Html = html.substring(0, splitIdx);
    const page2Html = html.substring(splitIdx);
    console.log('Page 1 HTML length:', page1Html.length);
    console.log('Page 2 HTML length:', page2Html.length);
  }
}

main().catch(console.error);
