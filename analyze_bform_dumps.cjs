const fs = require("fs");

const stepFiles = [
  "step_164_bform.txt",
  "step_180_bform.txt",
  "step_186_bform.txt",
  "step_194_bform.txt",
  "step_382_bform.txt",
];

stepFiles.forEach((file) => {
  if (!fs.existsSync(file)) return;
  const content = fs.readFileSync(file, "utf8");
  try {
    const obj = JSON.parse(content);
    const text = obj.content || JSON.stringify(obj);
    console.log(
      `\n=================== ${file} (Length: ${text.length}) ===================`,
    );
    console.log(text.substring(0, 1500));
  } catch (e) {
    console.error(`Error parsing ${file}`, e.message);
  }
});
