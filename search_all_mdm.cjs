const fs = require("fs");
const path = require("path");

const logPath =
  "C:\\Users\\Win-11\\.gemini\\antigravity-ide\\brain\\db905ede-3cc6-4262-b24b-5f54fd3ffceb\\.system_generated\\logs\\transcript.jsonl";
const logLines = fs.readFileSync(logPath, "utf8").split("\n");

logLines.forEach((line, idx) => {
  if (!line.trim()) return;
  try {
    const obj = JSON.parse(line);
    const text = JSON.stringify(obj);
    if (text.includes("teacher.mdm.tsx")) {
      console.log(
        `Idx: ${idx}, Step index: ${obj.step_index}, Type: ${obj.type}, Status: ${obj.status}, Length: ${text.length}`,
      );
      // If it contains a view_file with a large response of lines around 3000-3500, write it.
      if (text.includes("Showing lines 3")) {
        const match = text.match(/Showing lines \d+ to \d+/);
        console.log(`  -> Shows lines: ${match ? match[0] : "unknown"}`);
      }
    }
  } catch (e) {}
});
