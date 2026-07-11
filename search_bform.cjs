const fs = require("fs");
const path = require("path");

const logPath =
  "C:\\Users\\Win-11\\.gemini\\antigravity-ide\\brain\\db905ede-3cc6-4262-b24b-5f54fd3ffceb\\.system_generated\\logs\\transcript.jsonl";
const logLines = fs.readFileSync(logPath, "utf8").split("\n");

console.log(`Total log lines: ${logLines.length}`);

// We want to find any text lines in the transcript that have B-Form modal details.
let linesFound = [];
logLines.forEach((line, idx) => {
  if (
    line.includes("stock-report-print") ||
    line.includes('Monthly \\"B\\" Form') ||
    line.includes('Monthly "B" Form') ||
    line.includes("stockMonth ===") ||
    line.includes("stockRecords.reduce")
  ) {
    linesFound.push({
      idx,
      step_index: JSON.parse(line).step_index,
      length: line.length,
    });
  }
});

console.log("Lines referencing B-Form modal:", linesFound);

// Let's write the content of each found line to a separate file so we can view it.
linesFound.forEach((lf) => {
  const obj = JSON.parse(logLines[lf.idx]);
  fs.writeFileSync(
    `step_${obj.step_index}_bform.txt`,
    JSON.stringify(obj, null, 2),
  );
  console.log(`Saved step_${obj.step_index}_bform.txt`);
});
