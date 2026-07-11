<<<<<<< HEAD
import React, { useState } from 'react';
import GunaNeendani from './GunaNeendani';
import ProgressSheet from './ProgressSheet';
import SubjectWiseResults from './SubjectWiseResults';
import CategoryWiseResults from './CategoryWiseResults';
import DailyRegister from './DailyRegister';
import ReExam from './ReExam';
=======
import React, { useState } from "react";
import GunaNeendani from "./GunaNeendani";
import ProgressSheet from "./ProgressSheet";
import SubjectWiseResults from "./SubjectWiseResults";
import CategoryWiseResults from "./CategoryWiseResults";
import DailyRegister from "./DailyRegister";
import ReExam from "./ReExam";
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
// import Sidebar from '../../components/Sidebar';

const StudentResultsSection = () => {
  const [selectedOption, setSelectedOption] = useState(null);

  const renderSelectedOption = () => {
    switch (selectedOption) {
      case "Guna Nondani":
        return <GunaNeendani />;
      case "Progress sheet":
        return <ProgressSheet />;
      case "Collect out":
        return <CollectOut />;
      case "Subject wise results":
        return <SubjectWiseResults />;
      case "Grade Wise Results":
        return <CategoryWiseResults />;
      case "Daily register":
        return <DailyRegister />;
<<<<<<< HEAD
        case "ReExam":
          return <ReExam />;

      default:
       
        // return <Sidebar onSelectOption={setSelectedOption} />;
=======
      case "ReExam":
        return <ReExam />;

      default:

      // return <Sidebar onSelectOption={setSelectedOption} />;
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
    }
  };

  return (
<<<<<<< HEAD
    <div className="student-results-section">
      {renderSelectedOption()}
    </div>
=======
    <div className="student-results-section">{renderSelectedOption()}</div>
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
  );
};

export default StudentResultsSection;
