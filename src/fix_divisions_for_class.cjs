const fs = require('fs');
const path = require('path');

const dir = 'c:/Users/sahil khade/Documents/Smart_Learn_With_AI-main/Smart_Learn_With_AI-main/src/result';

fs.readdirSync(dir).forEach(file => {
    if (file.endsWith('.jsx')) {
        const filePath = path.join(dir, file);
        let content = fs.readFileSync(filePath, 'utf-8');
        
        let modified = false;

        const replaceStr1 = 'setDivisions(divisionsForClass)';
        const replaceWith1 = 'if (divisionsForClass.length === 0) { setDivisions(["A", "B", "C", "D"]); } else { setDivisions(divisionsForClass); }';

        if (content.includes(replaceStr1)) {
            content = content.replace(/setDivisions\(divisionsForClass\);?/g, replaceWith1);
            modified = true;
        }

        if (modified) {
            fs.writeFileSync(filePath, content, 'utf-8');
            console.log('Updated ' + file);
        }
    }
});
