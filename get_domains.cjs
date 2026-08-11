const fs = require('fs');
const file = fs.readFileSync('src/routes/teacher.sqaaf.tsx', 'utf8');
const domainMatches = Array.from(file.matchAll(/domain:\s*"([^"]+)"/g)).map(m=>m[1]);
let unique = [];
domainMatches.forEach(d => { if(!unique.includes(d)) unique.push(d); });
console.log(JSON.stringify(unique, null, 2));
