const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'routes/teacher.mdm.tsx');
let content = fs.readFileSync(file, 'utf8');

const targetStr =               // Apply table sizing to fit all columns inside the 1046px width without scroll overflow
              const table = reportEl.querySelector(\	able\);
              if (table) {
                table.style.width = \100%\;
                table.style.minWidth = \100%\;
                table.style.maxWidth = \100%\;
                table.style.tableLayout = \ixed\; // enforce column widths strictly;

const newStr =               // Apply table sizing to fit all columns inside the 1046px width without scroll overflow
              const tables = reportEl.querySelectorAll(\	able\);
              
              const isGrainReport = window.document.getElementById('annual-report-print')?.innerText.includes('??? ???');
              
              tables.forEach(table => {
                table.style.width = \100%\;
                table.style.minWidth = \100%\;
                table.style.maxWidth = \100%\;
                table.style.tableLayout = \ixed\; // enforce column widths strictly
                
                // Increase the size of the table rows to fill the page
                const rows = table.querySelectorAll('tr');
                rows.forEach(r => {
                   r.style.height = isGrainReport ? '42px' : '30px';
                });
                
                // Set small padding, font sizes and wrap properties on cells
                const cells = table.querySelectorAll(\	h, td\);
                cells.forEach((cell: any) => {
                  cell.style.padding = isGrainReport ? \2px 1px\ : \4px 2px\;
                  cell.style.fontSize = isGrainReport ? \9px\ : \10px\;
                  cell.style.lineHeight = \1.1\;
                  cell.style.wordBreak = \reak-all\;
                });
                
                // Adjust vertical writing headers styling to ensure they fit correctly
                const verticalDivs = table.querySelectorAll(\.writing-vertical\);
                verticalDivs.forEach((div: any) => {
                  div.style.padding = \4px 1px\;
                  div.style.fontSize = \9px\;
                  div.style.height = \75px\;
                  div.style.lineHeight = \1\;
                });
              });;

let result = content.replace(targetStr, newStr);

// Also remove the old cells.forEach loop
const oldLoop =                 // Insert colgroup to define column widths
                // Printable width = 1046px - 20px padding = 1026px;
                
result = result.replace(oldLoop,                 // Insert colgroup to define column widths
                if (tables[0]) {
                  const colgroup = clonedDoc.createElement('colgroup');
                  // we'll just let it apply to the first table if Rice report
                }
                // Printable width = 1046px - 20px padding = 1026px);

// Actually, this is too complex. Let's just use regular expressions or simpler replaces
fs.writeFileSync(file, result);
console.log('Done');
