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

        // Replace any existing instances of ["A", "B", "C", "D"] with ["A", "B"]
        // We'll just replace the string ["A", "B", "C", "D"] with ["A", "B"] globally in these files if they exist inside setDivisions
        const replaceStr2 = 'setDivisions(["A", "B", "C", "D"])';
        const replaceWith2 = 'setDivisions(["A", "B"])';

        let modified = false;

        // Count occurrences of targetStr1
        const count = content.split(targetStr1).length - 1;
        if (count > 0) {
            // Replace ONLY if it's not already inside an if block!
            // Wait, our previous replacements were:
            // if (divisionsForClass.size === 0) {
            //   setDivisions(["A", "B", "C", "D"]);
            // } else {
            //   setDivisions(Array.from(divisionsForClass));
            // }
            // So if targetStr1 is present, it might be the `else` block of the previous replacement,
            // OR it might be the original unmodified line.
            
            // Let's use Regex to find `setDivisions(Array.from(divisionsForClass));` 
            // that is NOT preceded by `else { \n`
            
            // Actually, an easier way is: replace `setDivisions(Array.from(divisionsForClass));` everywhere, 
            // but if the file already has `divisionsForClass.size === 0`, we skip the first replacement and only do the second.
            if (!content.includes('divisionsForClass.size === 0')) {
                content = content.split(targetStr1).join(replaceStr1);
                modified = true;
            }
        }
        
        if (content.includes(replaceStr2)) {
            content = content.split(replaceStr2).join(replaceWith2);
            modified = true;
        }

        if (modified) {
            fs.writeFileSync(filePath, content, 'utf-8');
            console.log('Updated ' + file);
        }
    }
});
