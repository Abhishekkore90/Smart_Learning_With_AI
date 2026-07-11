import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
<<<<<<< HEAD
import { doc, getDoc, getDocs, collection, query, where } from "firebase/firestore";
=======
import {
  doc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
} from "firebase/firestore";
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
import { toast } from "sonner";

export interface CCEDataBundle {
  students: any[];
  cceSettings: any;
  weightages: any;
  allMarks: Record<string, any>;
  remarksSem1: any;
  remarksSem2: any;
  attendance: any;
  workingDays: any;
  studentDetails: Record<string, any>;
}

export function useCCEPdfData(currentClass: string, academicYear: string) {
  const [students, setStudents] = useState<any[]>([]);
  const [cceSettings, setCceSettings] = useState<any>(null);
  const [weightages, setWeightages] = useState<any>(null);
  const [allMarks, setAllMarks] = useState<Record<string, any>>({});
  const [remarksSem1, setRemarksSem1] = useState<any>(null);
  const [remarksSem2, setRemarksSem2] = useState<any>(null);
  const [attendance, setAttendance] = useState<any>(null);
  const [workingDays, setWorkingDays] = useState<any>(null);
  const [studentDetails, setStudentDetails] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAllData = async () => {
      setLoading(true);
      try {
        // 1. Fetch Students
        const studentsQuery = query(
          collection(db, "users"),
          where("role", "==", "student"),
<<<<<<< HEAD
          where("class", "==", currentClass)
        );
        const studentsSnap = await getDocs(studentsQuery);
        const fetchedStudents = studentsSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
        fetchedStudents.sort((a, b) => (parseInt(a.rollNo) || 0) - (parseInt(b.rollNo) || 0));
=======
          where("class", "==", currentClass),
        );
        const studentsSnap = await getDocs(studentsQuery);
        const fetchedStudents = studentsSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as any[];
        fetchedStudents.sort(
          (a, b) => (parseInt(a.rollNo) || 0) - (parseInt(b.rollNo) || 0),
        );
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
        setStudents(fetchedStudents);

        // 1b. Fetch Student Details
        const detailsMap: Record<string, any> = {};
        await Promise.all(
          fetchedStudents.map(async (student) => {
<<<<<<< HEAD
            const detSnap = await getDoc(doc(db, "student_details", student.id));
            if (detSnap.exists()) {
              detailsMap[student.id] = detSnap.data();
            }
          })
=======
            const detSnap = await getDoc(
              doc(db, "student_details", student.id),
            );
            if (detSnap.exists()) {
              detailsMap[student.id] = detSnap.data();
            }
          }),
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
        );
        setStudentDetails(detailsMap);

        // 2. Fetch CCE Settings
<<<<<<< HEAD
        const settingsSnap = await getDoc(doc(db, "cce_settings", `${currentClass}_${academicYear}`));
=======
        const settingsSnap = await getDoc(
          doc(db, "cce_settings", `${currentClass}_${academicYear}`),
        );
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
        if (settingsSnap.exists()) {
          setCceSettings(settingsSnap.data());
        }

        // 3. Fetch CCE Weightages
<<<<<<< HEAD
        const weightageSnap = await getDoc(doc(db, "cce_weightage_v2", `${currentClass}_${academicYear}`));
=======
        const weightageSnap = await getDoc(
          doc(db, "cce_weightage_v2", `${currentClass}_${academicYear}`),
        );
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
        if (weightageSnap.exists()) {
          setWeightages(weightageSnap.data().data);
        }

        // 4. Fetch CCE Marks
<<<<<<< HEAD
        const exams = ["test1", "test2", "semester1", "test3", "test4", "semester2"];
        const marksData: Record<string, any> = {};
        for (const ex of exams) {
          const mSnap = await getDoc(doc(db, "cce_marks_v2", `${currentClass}_${academicYear}_${ex}`));
=======
        const exams = [
          "test1",
          "test2",
          "semester1",
          "test3",
          "test4",
          "semester2",
        ];
        const marksData: Record<string, any> = {};
        for (const ex of exams) {
          const mSnap = await getDoc(
            doc(db, "cce_marks_v2", `${currentClass}_${academicYear}_${ex}`),
          );
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
          marksData[ex] = mSnap.exists() ? mSnap.data().records || {} : {};
        }
        setAllMarks(marksData);

        // 5. Fetch CCE Remarks
<<<<<<< HEAD
        const rem1Snap = await getDoc(doc(db, "cce_remarks_v2", `${currentClass}_${academicYear}_sem1`));
        if (rem1Snap.exists()) setRemarksSem1(rem1Snap.data().records || {});

        const rem2Snap = await getDoc(doc(db, "cce_remarks_v2", `${currentClass}_${academicYear}_sem2`));
        if (rem2Snap.exists()) setRemarksSem2(rem2Snap.data().records || {});

        // 6. Fetch Attendance
        const attSnap = await getDoc(doc(db, "cce_attendance", `${currentClass}_${academicYear}_monthly`));
        if (attSnap.exists()) setAttendance(attSnap.data().records || {});

        const wdSnap = await getDoc(doc(db, "cce_working_days", `${currentClass}_${academicYear}`));
        if (wdSnap.exists()) setWorkingDays(wdSnap.data().days || {});

        // 7. Fetch Learning Outcomes Ratings
        const out1Snap = await getDoc(doc(db, "cce_outcomes", `${currentClass}_${academicYear}_sem1`));
        const out2Snap = await getDoc(doc(db, "cce_outcomes", `${currentClass}_${academicYear}_sem2`));
        (window as any)._cce_outcomes_sem1 = out1Snap.exists() ? out1Snap.data().ratings || {} : {};
        (window as any)._cce_outcomes_sem2 = out2Snap.exists() ? out2Snap.data().ratings || {} : {};

=======
        const rem1Snap = await getDoc(
          doc(db, "cce_remarks_v2", `${currentClass}_${academicYear}_sem1`),
        );
        if (rem1Snap.exists()) setRemarksSem1(rem1Snap.data().records || {});

        const rem2Snap = await getDoc(
          doc(db, "cce_remarks_v2", `${currentClass}_${academicYear}_sem2`),
        );
        if (rem2Snap.exists()) setRemarksSem2(rem2Snap.data().records || {});

        // 6. Fetch Attendance
        const attSnap = await getDoc(
          doc(db, "cce_attendance", `${currentClass}_${academicYear}_monthly`),
        );
        if (attSnap.exists()) setAttendance(attSnap.data().records || {});

        const wdSnap = await getDoc(
          doc(db, "cce_working_days", `${currentClass}_${academicYear}`),
        );
        if (wdSnap.exists()) setWorkingDays(wdSnap.data().days || {});

        // 7. Fetch Learning Outcomes Ratings
        const out1Snap = await getDoc(
          doc(db, "cce_outcomes", `${currentClass}_${academicYear}_sem1`),
        );
        const out2Snap = await getDoc(
          doc(db, "cce_outcomes", `${currentClass}_${academicYear}_sem2`),
        );
        (window as any)._cce_outcomes_sem1 = out1Snap.exists()
          ? out1Snap.data().ratings || {}
          : {};
        (window as any)._cce_outcomes_sem2 = out2Snap.exists()
          ? out2Snap.data().ratings || {}
          : {};
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
      } catch (err) {
        console.error("Error loading CCE Pdf data:", err);
        toast.error("माहिती लोड करताना त्रुटी आली.");
      } finally {
        setLoading(false);
      }
    };
    loadAllData();
  }, [currentClass, academicYear]);

  const dataBundle: CCEDataBundle = {
    students,
    cceSettings,
    weightages,
    allMarks,
    remarksSem1,
    remarksSem2,
    attendance,
    workingDays,
    studentDetails,
  };

  return { ...dataBundle, loading };
}
