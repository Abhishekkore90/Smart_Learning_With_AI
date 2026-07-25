const fs = require("fs");

const logPath =
  "C:\\Users\\Win-11\\.gemini\\antigravity-ide\\brain\\db905ede-3cc6-4262-b24b-5f54fd3ffceb\\.system_generated\\logs\\transcript.jsonl";

const logLines = fs.readFileSync(logPath, "utf8").split("\n");

let foundChunk2601_3400 = null;
let foundChunk3201_3707 = null;

for (const line of logLines) {
  if (!line.trim()) continue;
  try {
    const obj = JSON.parse(line);
    if (obj.content) {
      if (obj.content.includes("Showing lines 2601 to 3400")) {
        foundChunk2601_3400 = obj.content;
      }
      if (obj.content.includes("Showing lines 3201 to 3707")) {
        foundChunk3201_3707 = obj.content;
      }
    }
  } catch (e) {}
}

if (foundChunk2601_3400) {
  console.log("Found chunk 2601-3400 in logs!");
  const lines = foundChunk2601_3400.split("\n");
  const reconstructed = [];
  for (const l of lines) {
    const match = l.match(/^\d+:\s?(.*)$/);
    if (match) reconstructed.push(match[1]);
  }
  fs.writeFileSync("reconstructed_2601_3400.txt", reconstructed.join("\n"));
  console.log("Saved lines 2601-3400 to reconstructed_2601_3400.txt");
  console.log(`Reconstructed length: ${reconstructed.length} lines.`);
} else {
  console.log("Chunk 2601-3400 NOT found.");
}

if (foundChunk3201_3707) {
  console.log("Found chunk 3201-3707 in logs!");
  const lines = foundChunk3201_3707.split("\n");
  const reconstructed = [];
  for (const l of lines) {
    const match = l.match(/^\d+:\s?(.*)$/);
    if (match) reconstructed.push(match[1]);
  }
  fs.writeFileSync("reconstructed_3201_3707.txt", reconstructed.join("\n"));
  console.log("Saved lines 3201-3707 to reconstructed_3201_3707.txt");
  console.log(`Reconstructed length: ${reconstructed.length} lines.`);
}
