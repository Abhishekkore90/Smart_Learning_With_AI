import React, { useState } from 'react';
import GunaNeendani from './GunaNeendani';
import ProgressSheet from './ProgressSheet';
import SubjectWiseResults from './SubjectWiseResults';
import CategoryWiseResults from './CategoryWiseResults';
import DailyRegister from './DailyRegister';
import ReExam from './ReExam';
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
        case "ReExam":
          return <ReExam />;

      default:
       
        // return <Sidebar onSelectOption={setSelectedOption} />;
    }
  };

  return (
    <div className="student-results-section">
      {renderSelectedOption()}
    </div>
  );
};

export default StudentResultsSection;
