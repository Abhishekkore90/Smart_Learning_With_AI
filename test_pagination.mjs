import fs from 'fs';
import mammoth from 'mammoth';
import * as cheerio from 'cheerio';

async function main() {
  const buf = fs.readFileSync('C:/Users/Win-11/Downloads/इयत्ता_१_घरचा_अभ्यास.docx');
  const res = await mammoth.convertToHtml({ buffer: buf });
  const html = res.value;

  const $ = cheerio.load(html);
  const elements = $('body > *');
  console.log('Total top-level elements:', elements.length);

  const pages = [[]];
  let currentPage = 0;

  elements.each((i, el) => {
    const text = $(el).text().trim();
    // Check if this element triggers a new page
    const isNewPageHeader = text.includes('घरचा अभ्यास •') || text.includes('घरचा अभ्यास -');
    if (isNewPageHeader && pages[currentPage].length > 0) {
      currentPage++;
      pages[currentPage] = [];
    }
    pages[currentPage].push({
      tag: el.tagName,
      text: text.substring(0, 60),
      hasImg: $(el).find('img').length > 0
    });
  });

  console.log('Total pages produced:', pages.length);
  pages.forEach((p, idx) => {
    console.log(`\n=== PAGE ${idx + 1} (${p.length} elements) ===`);
    p.forEach(item => {
      console.log(`  <${item.tag}> ${item.hasImg ? '[IMAGE] ' : ''}${item.text}`);
    });
  });
}

main().catch(console.error);
