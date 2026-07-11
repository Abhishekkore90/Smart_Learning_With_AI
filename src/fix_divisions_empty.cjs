<<<<<<< HEAD
const fs = require('fs');
const path = require('path');

const dir = 'c:/Users/sahil khade/Documents/Smart_Learn_With_AI-main/Smart_Learn_With_AI-main/src/result';

fs.readdirSync(dir).forEach(file => {
    if (file.endsWith('.jsx')) {
        const filePath = path.join(dir, file);
        let content = fs.readFileSync(filePath, 'utf-8');
        
        let modified = false;

        if (content.includes('setDivisions([])')) {
            content = content.replace(/setDivisions\(\[\]\)/g, 'setDivisions(["A", "B", "C", "D"])');
            modified = true;
        }

        if (modified) {
            fs.writeFileSync(filePath, content, 'utf-8');
            console.log('Updated ' + file);
        }
    }
=======
const fs = require("fs");
const path = require("path");

const dir =
  "c:/Users/sahil khade/Documents/Smart_Learn_With_AI-main/Smart_Learn_With_AI-main/src/result";

fs.readdirSync(dir).forEach((file) => {
  if (file.endsWith(".jsx")) {
    const filePath = path.join(dir, file);
    let content = fs.readFileSync(filePath, "utf-8");

    let modified = false;

    if (content.includes("setDivisions([])")) {
      content = content.replace(
        /setDivisions\(\[\]\)/g,
        'setDivisions(["A", "B", "C", "D"])',
      );
      modified = true;
    }

    if (modified) {
      fs.writeFileSync(filePath, content, "utf-8");
      console.log("Updated " + file);
    }
  }
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
});
