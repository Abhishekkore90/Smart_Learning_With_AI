const fs = require('fs');
const path = require('path');

const dir = 'c:/Users/sahil khade/Documents/Smart_Learn_With_AI-main/Smart_Learn_With_AI-main/src/result';

fs.readdirSync(dir).forEach(file => {
    if (file.endsWith('.jsx')) {
        const filePath = path.join(dir, file);
        let content = fs.readFileSync(filePath, 'utf-8');
        
        const replaceStr1 = 'const [divisions, setDivisions] = useState([])';
        const replaceWith1 = 'const [divisions, setDivisions] = useState(["A", "B", "C", "D"])';

        let modified = false;

        if (content.includes(replaceStr1)) {
            content = content.split(replaceStr1).join(replaceWith1);
            modified = true;
        }

        if (modified) {
            fs.writeFileSync(filePath, content, 'utf-8');
            console.log('Updated ' + file);
        }
    }
});
