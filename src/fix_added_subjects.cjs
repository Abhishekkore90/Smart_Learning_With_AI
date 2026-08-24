const fs = require('fs');
const path = require('path');

const dir = 'c:/Users/sahil khade/Documents/Smart_Learn_With_AI-main/Smart_Learn_With_AI-main/src/result';

fs.readdirSync(dir).forEach(file => {
    if (file.endsWith('.jsx')) {
        const filePath = path.join(dir, file);
        let content = fs.readFileSync(filePath, 'utf-8');
        let modified = false;

        // Add cursor: pointer to modal buttons
        const buttonReplacements = [
            {
                from: "style={{ fontSize: '14px', padding: '5px 15px', borderRadius: '5px', backgroundColor: '#0d6efd', color: 'white', border: 'none' }}",
                to: "style={{ fontSize: '14px', padding: '5px 15px', borderRadius: '5px', backgroundColor: '#0d6efd', color: 'white', border: 'none', cursor: 'pointer' }}"
            },
            {
                from: "style={{ fontSize: '14px', padding: '8px 15px', borderRadius: '5px', backgroundColor: '#0d6efd', color: 'white', border: 'none' }}",
                to: "style={{ fontSize: '14px', padding: '8px 15px', borderRadius: '5px', backgroundColor: '#0d6efd', color: 'white', border: 'none', cursor: 'pointer' }}"
            }
        ];

        buttonReplacements.forEach(rep => {
            if (content.includes(rep.from)) {
                content = content.split(rep.from).join(rep.to);
                modified = true;
            }
        });

        // Fix fetchAddedSubjects
        const fetchAddedRegex = /const fetchAddedSubjects = async \(\) => \{[\s\S]*?finally \{\s*setLoading\(false\);\s*\}\s*\};/g;
        
        const newFetchAdded = `const fetchAddedSubjects = async () => {
    try {
      setLoading(true);
      const url = \`\${process.env.REACT_APP_FIREBASE_DATABASE_URL}/schoolRegister/\${udiseNumber}/subjectSequence/\${academicYear}/\${classValue}.json\`;
      const response = await fetch(url);
      const subjectsData = await response.json();
      if (subjectsData) {
        const validSubjects = Object.entries(subjectsData)
          .filter(([_, value]) => value !== null && value !== undefined)
          .map(([_, subject]) => subject);
        setAddedSubjects(validSubjects);
      } else {
        setAddedSubjects([]);
      }
    } catch (error) {
      console.error('Error fetching added subjects:', error);
    } finally {
      setLoading(false);
    }
  };`;

        if (fetchAddedRegex.test(content)) {
            content = content.replace(fetchAddedRegex, newFetchAdded);
            modified = true;
        }

        if (modified) {
            fs.writeFileSync(filePath, content, 'utf-8');
            console.log('Updated ' + file);
        }
    }
});
