import fs from 'fs';
import mammoth from 'mammoth';

async function main() {
  const buf = fs.readFileSync('C:/Users/Win-11/Downloads/इयत्ता_१_घरचा_अभ्यास.docx');
  const res = await mammoth.extractRawText({ buffer: buf });
  console.log('EXTRACTED TEXT:');
  console.log(res.value);
}

main().catch(console.error);
