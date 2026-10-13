import fs from 'fs';
import mammoth from 'mammoth';
import * as cheerio from 'cheerio';

async function main() {
  const buf = fs.readFileSync('C:/Users/Win-11/Downloads/इयत्ता_१_घरचा_अभ्यास.docx');
  const res = await mammoth.convertToHtml({ buffer: buf });
  const rawHtml = res.value;

  const $ = cheerio.load(rawHtml);
  const elements = $('body').children();
  console.log('Total elements to paginate:', elements.length);

  const pageGroups = [];
  let currentPageElements = [];

  elements.each((i, el) => {
    const $el = $(el);
    const text = $el.text().trim();

    // Check if this element triggers a new page
    const isExplicitBreak = 
      $el.css('page-break-before') === 'always' || 
      $el.hasClass('docx-page-break') || 
      $el.hasClass('page-break');

    const isHwPage2Header = 
      (text.includes('घरचा अभ्यास •') || text.includes('घरचा अभ्यास -')) && 
      pageGroups.length === 0 && 
      currentPageElements.length > 0;

    const startsNewPage = isExplicitBreak || isHwPage2Header;

    if (startsNewPage && currentPageElements.length > 0) {
      pageGroups.push(currentPageElements);
      currentPageElements = [];
    }

    currentPageElements.push($.html(el));
  });

  if (currentPageElements.length > 0) {
    pageGroups.push(currentPageElements);
  }

  console.log('Paginated into', pageGroups.length, 'pages:');
  pageGroups.forEach((pg, idx) => {
    console.log(`Page ${idx + 1}: ${pg.length} elements`);
  });
}

main().catch(console.error);
