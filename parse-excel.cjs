const fs = require('fs');
const path = require('path');
const filePath = 'C:/Users/vaishnavi/Downloads/SQAAF (1).xlsx';
const outputPath = 'C:/Users/vaishnavi/Downloads/Smart_Learn_With_AI-main (1)/Smart_Learn_With_AI-main/excel-out.json';

try {
  const XLSX = require('xlsx');
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2), 'utf-8');
  console.log('Success');
} catch (e) {
  console.error(e);
}
