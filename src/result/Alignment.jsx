import React, { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import {
  SlidersHorizontal,
  X,
  Calendar,
  GraduationCap,
  Columns,
  ChevronDown,
  Loader2,
  AlertCircle,
  Info,
  GripVertical
} from "lucide-react";

const ALL_CLASSES = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th"];

function Alignment({ onClose }) {
  const [academicYear, setAcademicYear] = useState("");
  const [classValue, setClassValue] = useState("");
  const [division, setDivision] = useState("");
  const [divisions, setDivisions] = useState(["A", "B", "C", "D"]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [language, setLanguage] = useState(localStorage.getItem('language') || 'English');
  const [alertMessage, setAlertMessage] = useState('');

  const udiseNumber = localStorage.getItem("udiseNumber");

  useEffect(() => {
    const storedLanguage = localStorage.getItem('language') || 'English';
    setLanguage(storedLanguage);
  }, []);

  const handleAcademicYearChange = (e) => {
    setAcademicYear(e.target.value);
    setClassValue("");
  };

  const handleClassChange = (e) => {
    setClassValue(e.target.value);
  };

  const fetchClasses = async () => {
    if (!academicYear) return;

    setLoading(true);
    try {
      // First try to fetch from ssc path if they started using it
      let response = await fetch(
        `${process.env.REACT_APP_FIREBASE_DATABASE_URL}/schoolRegister/${udiseNumber}/subjectSequence/ssc/${academicYear}.json`
      );
      let data = await response.json();
      
      // Fallback to legacy path to show classes if they haven't migrated yet
      if (!data) {
        response = await fetch(
          `${process.env.REACT_APP_FIREBASE_DATABASE_URL}/schoolRegister/${udiseNumber}/subjectSequence/${academicYear}.json`
        );
        data = await response.json();
      }

      setClasses(data ? Object.keys(data).filter(k => k !== 'null' && k !== undefined) : []);
      setError(null);
    } catch (err) {
      console.error("Error fetching classes:", err);
      setError("Failed to fetch classes");
      setClasses([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubjects = async () => {
    if (!academicYear || !classValue || !division) return;

    setLoading(true);
    try {
      const response = await fetch(
        `${process.env.REACT_APP_FIREBASE_DATABASE_URL}/schoolRegister/${udiseNumber}/subjectSequence/ssc/${academicYear}/${classValue}/${division}.json`
      );
      if (!response.ok) throw new Error("Failed to fetch subjects");

      const data = await response.json();
      const mappedSubjects = data ? Object.values(data) : [];

      setSubjects(mappedSubjects);
      setError(null);
    } catch (err) {
      console.error("Error fetching subjects:", err);
      setError("Failed to fetch subjects");
      setSubjects([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const reorderedSubjects = Array.from(subjects);
    const [movedItem] = reorderedSubjects.splice(result.source.index, 1);
    reorderedSubjects.splice(result.destination.index, 0, movedItem);

    setSubjects(reorderedSubjects);
    updateSubjectSequence(reorderedSubjects);
  };

  const updateSubjectSequence = async (newSequence) => {
    if (!academicYear || !classValue || !division) return;

    try {
      await fetch(
        `${process.env.REACT_APP_FIREBASE_DATABASE_URL}/schoolRegister/${udiseNumber}/subjectSequence/ssc/${academicYear}/${classValue}/${division}.json`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            newSequence.reduce((acc, subject, index) => {
              acc[index + 1] = subject;
              return acc;
            }, {})
          ),
        }
      );
    } catch (error) {
      console.error("Error updating subject sequence:", error);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, [academicYear, udiseNumber]);

  useEffect(() => {
    fetchSubjects();
  }, [academicYear, classValue, division, udiseNumber]);

  const fetchDivisions = async () => {
    if (!academicYear || !classValue) return;
  
    setLoading(true);
    try {
      const response = await fetch(
        `${process.env.REACT_APP_FIREBASE_DATABASE_URL}/schoolRegister/${udiseNumber}/subjectSequence/ssc/${academicYear}/${classValue}.json`
      );
      if (!response.ok) throw new Error("Failed to fetch divisions");
  
      const data = await response.json();
      const fetchedDivisions = data ? Object.keys(data).filter((key) => isNaN(key)) : [];
      if (fetchedDivisions.length > 0) {
        setDivisions(fetchedDivisions);
      } else {
        setDivisions(["A", "B", "C", "D"]);
      }
      setError(null);
    } catch (err) {
      console.error("Error fetching divisions:", err);
      setError("Failed to fetch divisions");
      setDivisions(["A", "B", "C", "D"]);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchDivisions();
  }, [academicYear, classValue]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-premium border border-slate-100 dark:border-slate-800 w-full max-w-4xl overflow-hidden flex flex-col transform transition-all duration-300">
        {/* Modal Header */}
        <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <SlidersHorizontal className="size-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                Subject Alignment (SSC)
              </h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                Manage subject order and sequence
              </p>
            </div>
          </div>
          <button
            type="button"
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-8 overflow-y-auto space-y-6 max-h-[70vh]">
          {/* Selections Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Academic Year Selection */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">
                Academic Year
              </label>
              <div className="relative flex items-center bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800/80 rounded-2xl px-4 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all shadow-sm">
                <Calendar className="size-5 text-slate-400 shrink-0" />
                <select
                  value={academicYear}
                  onChange={handleAcademicYearChange}
                  className="w-full bg-transparent border-0 outline-none py-4 px-3 text-sm font-bold text-slate-700 dark:text-slate-300 cursor-pointer appearance-none"
                >
                  <option value="">Select Academic Year</option>
                  <option value="2023-2024">2023-2024</option>
                  <option value="2024-2025">2024-2025</option>
                  <option value="2025-2026">2025-2026</option>
                  <option value="2026-2027">2026-2027</option>
                  <option value="2027-2028">2027-2028</option>
                  <option value="2028-2029">2028-2029</option>
                </select>
                <ChevronDown className="size-4 text-slate-400 pointer-events-none absolute right-4" />
              </div>
            </div>

            {/* Class Selection */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">
                Class Standard
              </label>
              <div className="relative flex items-center bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800/80 rounded-2xl px-4 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all shadow-sm">
                <GraduationCap className="size-5 text-slate-400 shrink-0" />
                <select
                  value={classValue}
                  onChange={handleClassChange}
                  className="w-full bg-transparent border-0 outline-none py-4 px-3 text-sm font-bold text-slate-700 dark:text-slate-300 cursor-pointer appearance-none"
                >
                  <option value="">Select Class</option>
                  {ALL_CLASSES.map((cls, index) => (
                    <option key={index} value={cls}>
                      {cls}
                    </option>
                  ))}
                </select>
                <ChevronDown className="size-4 text-slate-400 pointer-events-none absolute right-4" />
              </div>
            </div>

            {/* Division Selection */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">
                Division
              </label>
              <div className="relative flex items-center bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800/80 rounded-2xl px-4 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all shadow-sm">
                <Columns className="size-5 text-slate-400 shrink-0" />
                <select
                  id="division"
                  value={division}
                  onChange={(e) => setDivision(e.target.value)}
                  className="w-full bg-transparent border-0 outline-none py-4 px-3 text-sm font-bold text-slate-700 dark:text-slate-300 cursor-pointer appearance-none"
                >
                  <option value="">
                    {language === "English" ? "Select Division" : "तुकडी निवडा"}
                  </option>
                  {divisions.map((div, index) => (
                    <option key={index} value={div}>
                      {div}
                    </option>
                  ))}
                </select>
                <ChevronDown className="size-4 text-slate-400 pointer-events-none absolute right-4" />
              </div>
            </div>
          </div>

          {/* Loading Indicator */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-8 gap-2 text-slate-400 dark:text-slate-500">
              <Loader2 className="size-7 animate-spin text-indigo-600 dark:text-indigo-400" />
              <span className="text-[10px] font-black uppercase tracking-wider">Syncing Sequence Data...</span>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 rounded-2xl border border-red-100 dark:border-red-900/30 text-sm font-medium">
              <AlertCircle className="size-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Alert / Info Message */}
          {alertMessage && (
            <div className="flex items-center gap-3 p-4 bg-blue-50/50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 rounded-2xl border border-indigo-100/50 dark:border-indigo-900/30 text-sm font-medium">
              <Info className="size-5 shrink-0" />
              <span>{alertMessage}</span>
            </div>
          )}

          {/* Draggable Subjects List */}
          {subjects.length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Subject Sequence List
                </span>
                <span className="text-[10px] font-bold text-slate-400 italic">
                  Drag the handles below to reorder
                </span>
              </div>
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="subjects">
                  {(provided) => (
                    <ul
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className="space-y-2.5"
                    >
                      {subjects.map((subject, index) => (
                        <Draggable
                          key={subject}
                          draggableId={subject}
                          index={index}
                        >
                          {(provided) => (
                            <li
                              {...provided.draggableProps}
                              ref={provided.innerRef}
                              className="bg-slate-50/50 hover:bg-slate-50 dark:bg-slate-900/40 dark:hover:bg-slate-900/80 border border-slate-100 dark:border-slate-800 rounded-2xl px-5 py-4 flex items-center justify-between transition-all duration-200 group hover:shadow-sm"
                            >
                              <div className="flex items-center gap-3">
                                <span className="size-6 bg-slate-200/60 dark:bg-slate-800 rounded-lg flex items-center justify-center text-[10px] font-black text-slate-500">
                                  {index + 1}
                                </span>
                                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                  {subject}
                                </span>
                              </div>
                              <div
                                {...provided.dragHandleProps}
                                className="p-1 text-slate-300 hover:text-slate-500 dark:hover:text-slate-400 transition-colors cursor-grab active:cursor-grabbing"
                              >
                                <GripVertical className="size-5" />
                              </div>
                            </li>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </ul>
                  )}
                </Droppable>
              </DragDropContext>
            </div>
          ) : (
            !loading && academicYear && classValue && division && (
              <div className="text-center py-12 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-[2rem] text-slate-400">
                <SlidersHorizontal className="size-8 mx-auto mb-2 text-slate-300" />
                <p className="text-xs font-bold">No subjects aligned for this class yet.</p>
              </div>
            )
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-8 py-5 border-t border-slate-100 dark:border-slate-800 flex justify-end bg-slate-50/30 dark:bg-slate-900/20">
          <button
            type="button"
            className="px-6 py-3 bg-slate-900 text-white dark:bg-white dark:text-slate-900 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-md hover:bg-slate-800 dark:hover:bg-slate-100 transition-all cursor-pointer"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default Alignment;