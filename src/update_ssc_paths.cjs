const fs = require('fs');
const path = require('path');

const dir = 'c:/Users/sahil khade/Documents/Smart_Learn_With_AI-main/Smart_Learn_With_AI-main/src/result';

const filesToUpdate = [
    'MarkEnterySSC.jsx',
    'GunaNeendani.jsx',
    'ResultSSC.jsx',
    'SubjectWiseResult.jsx',
    'SemesterResult9th10th.jsx'
];

filesToUpdate.forEach(file => {
    const filePath = path.join(dir, file);
    if (!fs.existsSync(filePath)) return;

    let content = fs.readFileSync(filePath, 'utf-8');
    let modified = false;

    // Replace strict paths
    const target1 = "`/schoolRegister/${udiseNumber}/subjectSequence/${academicYear}/${classValue}`";
    const replacement1 = "`/schoolRegister/${udiseNumber}/subjectSequence/ssc/${academicYear}/${classValue}/${division}`";
    
    if (content.includes(target1)) {
        content = content.split(target1).join(replacement1);
        modified = true;
    }

    const target2 = "`${process.env.REACT_APP_FIREBASE_DATABASE_URL}/schoolRegister/${udiseNumber}/subjectSequence/${academicYear}/${classValue}.json`";
    const replacement2 = "`${process.env.REACT_APP_FIREBASE_DATABASE_URL}/schoolRegister/${udiseNumber}/subjectSequence/ssc/${academicYear}/${classValue}/${division}.json`";
    
    if (content.includes(target2)) {
        content = content.split(target2).join(replacement2);
        modified = true;
    }

    // In ResultSSC, classToUse is used instead of classValue sometimes
    const target3 = "`${process.env.REACT_APP_FIREBASE_DATABASE_URL}/schoolRegister/${udiseNumber}/subjectSequence/${academicYear}/${classToUse}.json`";
    const replacement3 = "`${process.env.REACT_APP_FIREBASE_DATABASE_URL}/schoolRegister/${udiseNumber}/subjectSequence/ssc/${academicYear}/${classToUse}/${division}.json`";
    
    if (content.includes(target3)) {
        content = content.split(target3).join(replacement3);
        modified = true;
    }

    // Replace fetchAddedSubjects URL which was changed recently
    const target4 = "const url = `${process.env.REACT_APP_FIREBASE_DATABASE_URL}/schoolRegister/${udiseNumber}/subjectSequence/${academicYear}/${classValue}.json`;";
    const replacement4 = "const url = `${process.env.REACT_APP_FIREBASE_DATABASE_URL}/schoolRegister/${udiseNumber}/subjectSequence/ssc/${academicYear}/${classValue}/${division}.json`;";
    
    if (content.includes(target4)) {
        content = content.split(target4).join(replacement4);
        modified = true;
    }

    if (modified) {
        fs.writeFileSync(filePath, content, 'utf-8');
        console.log('Updated ' + file);
    }
});
