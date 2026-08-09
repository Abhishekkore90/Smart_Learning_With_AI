import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, getDocs, collection, query, where } from "firebase/firestore";
// @ts-ignore
import { getTeacherId, matchStudentTeacherClassAndMedium } from "@/lib/teacherIsolationHelper";
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

export function useCCEPdfData(currentClass: string, academicYear: string, medium: string = "marathi") {
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
          where("role", "==", "student")
        );
        const studentsSnap = await getDocs(studentsQuery);
        const rawStudents = studentsSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
        const teacherId = getTeacherId();
        const fetchedStudents = rawStudents.filter((s) => {
          return matchStudentTeacherClassAndMedium(s, teacherId, currentClass, medium);
        });
        fetchedStudents.sort((a, b) => (parseInt(a.rollNo) || 0) - (parseInt(b.rollNo) || 0));
        setStudents(fetchedStudents);

        // 1b. Fetch Student Details
        const detailsMap: Record<string, any> = {};
        await Promise.all(
          fetchedStudents.map(async (student) => {
            const detSnap = await getDoc(doc(db, "student_details", student.id));
            if (detSnap.exists()) {
              detailsMap[student.id] = detSnap.data();
            }
          })
        );
        setStudentDetails(detailsMap);

        // 2. Fetch CCE Settings
        const settingsSnap = await getDoc(doc(db, "cce_settings", `${currentClass}_${academicYear}`));
        if (settingsSnap.exists()) {
          setCceSettings(settingsSnap.data());
        }

        // 3. Fetch CCE Weightages
        const weightageSnap = await getDoc(doc(db, "cce_weightage_v2", `${currentClass}_${academicYear}`));
        if (weightageSnap.exists()) {
          setWeightages(weightageSnap.data().data);
        }

        // 4. Fetch CCE Marks
        const exams = ["test1", "test2", "semester1", "test3", "test4", "semester2"];
        const marksData: Record<string, any> = {};
        for (const ex of exams) {
          const mSnap = await getDoc(doc(db, "cce_marks_v2", `${currentClass}_${academicYear}_${ex}`));
          marksData[ex] = mSnap.exists() ? mSnap.data().records || {} : {};
        }
        setAllMarks(marksData);

        // 5. Fetch CCE Remarks (Medium-isolated & local cache aware)
        const fetchSemRemarks = async (sem: string) => {
          let recs: any = null;
          const cacheKey = `cce_remarks_cache_${currentClass}_${academicYear}_${sem}_${medium}`;
          try {
            const cached = localStorage.getItem(cacheKey);
            if (cached) {
              const parsed = JSON.parse(cached);
              if (parsed && typeof parsed === "object" && Object.keys(parsed).length > 0) {
                recs = parsed;
              }
            }
          } catch (e) {}

          if (!recs) {
            const docIds = [
              teacherId ? `${teacherId}_${currentClass}_${academicYear}_${sem}_${medium}` : null,
              teacherId ? `${teacherId}_${currentClass}_${academicYear}_${sem}` : null,
              `${currentClass}_${academicYear}_${sem}_${medium}`,
              `${currentClass}_${academicYear}_${sem}`,
            ].filter(Boolean) as string[];

            for (const dId of docIds) {
              try {
                const rSnap = await getDoc(doc(db, "cce_remarks_v2", dId));
                if (rSnap.exists()) {
                  const d = rSnap.data();
                  recs = d.records || d.remarks || d.data || null;
                  if (recs && typeof recs === "object" && Object.keys(recs).length > 0) break;
                }
              } catch (e) {}
            }
          }
          return recs || {};
        };

        const rem1Data = await fetchSemRemarks("sem1");
        const rem2Data = await fetchSemRemarks("sem2");

        setRemarksSem1(rem1Data);
        setRemarksSem2(rem2Data);

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
