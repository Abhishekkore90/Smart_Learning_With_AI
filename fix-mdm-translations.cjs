const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "src", "routes", "teacher.mdm.tsx");
let content = fs.readFileSync(filePath, "utf-8");

// Section title replacements
const titleReplacements = [
  [">Food Menu</h2>", ">{t_global.mdm_menu}</h2>"],
  [">Incoming entry</h2>", ">{t_global.mdm_incoming}</h2>"],
  [">Daily register</h2>", ">{t_global.mdm_daily_reg}</h2>"],
  [">Demand</h2>", ">{t_global.mdm_demand}</h2>"],
];

// Table header "Class" and "Contents" in quantity section
const tableReplacements = [
  [">Class</th>", ">{t_global.mdm_class_label}</th>"],
  [">Contents</th>", ">{t_global.mdm_contents_label}</th>"],
  [">Quantity (in grams)</th>", ">{t_global.mdm_qty_grams}</th>"],
];

let count = 0;

for (const [from, to] of [...titleReplacements, ...tableReplacements]) {
  const occurrences = content.split(from).length - 1;
  if (occurrences > 0) {
    content = content.split(from).join(to);
    count += occurrences;
    console.log(`Replaced "${from}" -> "${to}" (${occurrences} times)`);
  } else {
    console.log(`NOT FOUND: "${from}"`);
  }
}

fs.writeFileSync(filePath, content, "utf-8");
console.log(`\nTotal replacements: ${count}`);
