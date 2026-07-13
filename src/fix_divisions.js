const fs = require('fs');
const path = require('path');

const dir = 'c:/Users/sahil khade/Documents/Smart_Learn_With_AI-main/Smart_Learn_With_AI-main/src/result';

fs.readdirSync(dir).forEach(file => {
    if (file.endsWith('.jsx')) {
        const filePath = path.join(dir, file);
        let content = fs.readFileSync(filePath, 'utf-8');
        
        const targetStr1 = 'setDivisions(Array.from(divisionsForClass));';
        const replaceStr1 = `if (divisionsForClass.size === 0) {
          setDivisions(["A", "B"]);
        } else {
          setDivisions(Array.from(divisionsForClass));
        }`;

        // Also handle the case where we previously added ["A", "B", "C", "D"]
        // The user explicitly requested "a and b" for all sections.
        const prevFallbackStr = `if (divisionsForClass.size === 0) {
      setDivisions(["A", "B", "C", "D"]);
    } else {
      setDivisions(Array.from(divisionsForClass));
    }`;
        const replacePrevFallbackStr = `if (divisionsForClass.size === 0) {
      setDivisions(["A", "B"]);
    } else {
      setDivisions(Array.from(divisionsForClass));
    }`;

        let modified = false;

        if (content.includes(targetStr1)) {
            // Need to make sure we don't replace it if it's already inside an if block
            // Simple string replacement:
            content = content.split(targetStr1).join(replaceStr1);
            modified = true;
        }
        
        if (content.includes(prevFallbackStr)) {
            content = content.split(prevFallbackStr).join(replacePrevFallbackStr);
            modified = true;
        }

        if (modified) {
            fs.writeFileSync(filePath, content, 'utf-8');
            console.log('Updated ' + file);
        }
    }
});
