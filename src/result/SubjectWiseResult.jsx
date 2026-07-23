import React, { useState, useEffect, useRef } from "react";
import { db } from "../lib/firebase";
import { doc, getDoc, collection, getDocs, query, where } from "firebase/firestore";
import { Download, Printer, ArrowLeft, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import "./result.css";

// -------------------- CLASS-WISE LEARNING OUTCOMES BANKS --------------------

// Class 1st Outcomes
const MARATHI_OUTCOMES_1ST = [
  { code: "9.1.1", text: "जास्त लांबीची अपरिचित गाणी, मोठ्या वाक्यांच्या गोष्टी (४ ते ८ वाक्ये) काळजीपूर्वक ऐकतो. त्याबद्दल संभाषण करतो आणि प्रश्न विचारतो." },
  { code: "9.1.2", text: "मोठी (१० ओळी) गाणी/कविता गातो व मोठ्याने पुन्हा म्हणून दाखवतो." },
  { code: "9.2", text: "शिक्षकांच्या मदतीने यमक जुळवतो लहानलहान कविता तयार करतो." },
  { code: "9.3", text: "भाषणात सहभागी होतो. बोलण्यासाठी स्वतःची वेळ घेण्याची वाट पाहतो आणि इतरांना बोलू देतो." },
  { code: "9.3.2", text: "वर्गात वाचून दाखवलेल्या किंवा चर्चा केलेल्या माहितीपर/कथेतर आशय स्वतःच्या अनुभवांशी सक्षमपणे जोडतो आणि त्याबद्दल बोलतो." },
  { code: "9.4.1", text: "साध्या स्वरूपाच्या अनेक कृतींचा समावेश असलेल्या सूचनांचे पालन करतो. (काच वेळी ६ ते ९ सूचना एकत्र दिल्यास)" },
  { code: "9.4.2", text: "साध्या स्वरूपाच्या अनेक कृतींचा समावेश असलेल्या सूचनांचे पालन करतो. (काच वेळी ८ ते ९ सूचना एकत्र दिल्यास)" },
  { code: "9.5", text: "गोष्टींची मध्यवर्ती कल्पना व पात्रांच्या भावना लक्षात घेऊन संवादासह सांगतो." },
  { code: "9.6", text: "साधे कथानक व पात्रासह स्वतःच्या छोट्या गोष्टी सांगतो." },
  { code: "9.7", text: "चित्र आणि संदर्भ यानुसार अपरिचित शब्दांच्या अर्थाचा अंदाज बांधतो." },
  { code: "10.1.1", text: "अक्षरांच्या ध्वनीमधून स्वर व व्यंजनांचे ध्वनी वेगळे करतो." },
  { code: "10.1.2", text: "शब्दांतून अक्षरांचे ध्वनी वेगळे करतो." },
  { code: "10.2.1", text: "साधी विरामचिन्हे ओळखतो (पूर्णविराम, प्रश्नचिन्ह)" },
  { code: "10.3.1", text: "वर्णमालेतील सर्व अक्षरे (ज्ञा, क्ष या संयुक्त अक्षरांसह) व स्वरचिन्हे वाचतो." },
  { code: "10.3.2", text: "सर्व अक्षरे व सर्व स्वरचिन्हे आणि नेहमी वापरत असलेली जोडाक्षरे यांसह बहुवर्णिय शब्द वाचतो." },
  { code: "10.3.3", text: "वर्णमालेतील सर्व अक्षरे आणि स्वरचिन्हे वापरून स्वतः शब्द लिहितो आणि त्यावरून वाक्य सांगतो." },
  { code: "10.3.4", text: "शिकलेली अक्षरे आणि स्वरचिन्हे वापरून स्वतः वाक्य लिहितो." },
  { code: "10.4", text: "योग्य उच्चार आणि ध्वनी विरामसह लहान परिच्छेद अचूकपणे वाचतो." },
  { code: "10.5", text: "दृक् आशय आणि समान मजकूर असणाऱ्या पुस्तकांचे स्वतंत्रपणे वाचन करण्यास सुरुवात करतो." },
  { code: "10.5.2", text: "गोष्टींची अपरिचित पुस्तके वाचतो आणि शिक्षकांच्या मार्गदर्शनाखाली ती समजावून घेतो. गोष्टीतील कथानक व पात्र ओळखतो." },
  { code: "10.6", text: "छोट्या कविता वाचतो आणि त्याचा शाब्दिक अर्थ सांगतो." },
  { code: "10.7", text: "खेळ खेळण्याकरिता सोप्या सूचना वाचतो आणि त्याप्रमाणे गटात खेळतो." },
  { code: "10.8.1", text: "चित्रांचा क्रम तयार करतो आणि त्यासोबत छोटी वाक्ये पारंपारिक लिपीत वर्णमालेतील अक्षरे व स्वरचिन्हे वापरून लिहितो. शब्द आणि छोटी वाक्ये लिहून चित्रपट्ट्यांचे वर्णन करतो." },
  { code: "10.8.2", text: "तीन किंवा चार वर्णाक्षरांच्या शब्दांचे श्रुतलेखन करतो." },
  { code: "10.8.3", text: "वर्णमालेतील अक्षरे व स्वरचिन्हे यांचा वापर करून दोन-तीन वाक्यांचे लेखन स्वतः करतो. उदा. स्वतःचा अनुभव, चित्र अथवा वस्तूंचे वर्णन, स्वतःच्या दोन-तीन वाक्यांत लिहितो." },
  { code: "10.9", text: "पुस्तकांच्या आवडीबद्दल सांगतो. छोट्या पुस्तकांचे नियमित वाचन करतो." }
];

const ENGLISH_OUTCOMES_1ST = [
  { code: "9.1.1.1", text: "Listens to longer (4-8 sentences) songs/poems (unfamiliar) with attention and have conversations about them and asks questions." },
  { code: "9.1.2.1", text: "Sings/recites longer (10 sentences) songs/ poems." },
  { code: "9.2.1.1", text: "Extends/Creates short poems/ rhymes with the help of the teacher." },
  { code: "9.3.1.1", text: "Engages in conversations, wait for his/her turn to speak and allow other to speak." },
  { code: "9.3.2.1", text: "Engages with non-fictional content read aloud or discussed in class, links knowledge from his/her own experiences and talks about it." },
  { code: "9.4.1.1", text: "Follows instructions comprising of several steps. (8 to 9 instructions at a time)" },
  { code: "9.4.2.1", text: "Gives clear instructions comprising of several steps. (8 to 9 instructions at a time)" },
  { code: "9.5.1.1", text: "Interprets the intent of the plot and emotions of the characters in a story and tells the story with dialogue." },
  { code: "9.6.1.1", text: "Narrates his/her own short stories with simple plots and characters." },
  { code: "9.7.1.1", text: "Predicts meaning of unknown words in texts using pictures and context clues." },
  { code: "11.1.1.1", text: "Identifies rhyming words and alliterations." },
  { code: "11.1.2.1", text: "Identifies the beginning and end syllables in words." },
  { code: "11.1.3.1", text: "Combines 2-3 syllables to form simple words." },
  { code: "11.2.1.1", text: "Begins to visually recognise and connect letters to corresponding sounds." },
  { code: "11.2.2.1", text: "Produces familiar words from familiar letters." },
  { code: "11.2.3.1", text: "Recognises sight words, their names and labels of objects in his/her environment." },
  { code: "11.2.4.1", text: "Writes down short words on dictation." }
];

const MATHS_OUTCOMES_1ST = [
  { code: "1.LO.1.1", text: "गुणधर्मानुसार वस्तू वेगळ्या करतो आणि त्यामागील नियमांचे वर्णन करतो. (उदाहरणार्थ, समान बदलांनुसार रंगाच्या प्राण्यांचे गट करतात.)" },
  { code: "1.LO.2.1", text: "मोजण्याच्या मदतीने सोप्या आकृतिबंधातील हरवलेला घटक ओळखतो/शोधतो. (उदाहरणार्थ, लाल-निळा, लाल-निळा, लाल-.....)" },
  { code: "1.LO.3.1", text: "२०पेक्षा जास्त वस्तू ९९पर्यंतच्या संख्यानामांनी मोजतो आणि १०-१०च्या टप्प्याने ९९पर्यंत संख्या मोजतो." },
  { code: "1.LO.3.2", text: "विशिष्ट अंकापासून पुढे व मागे अशी मोजणी करतो. (० ते ९९)" },
  { code: "1.LO.3.3", text: "दोनच्या गटातील संख्या/राशी ओळखतो. (उदाहरणार्थ, १० चे दोन गट म्हणजे २० करतो.)" },
  { code: "1.LO.4.1", text: "एकाच गटातील वस्तूंची त्यांच्या विविध गुणधर्मानुसार मांडणी करतो. (उदाहरणार्थ, आकार, माप, लांबी, वजन)" },
  { code: "1.LO.4.2", text: "दिलेल्या संख्यांची चढत्या आणि उतरत्या क्रमाने मांडणी करतो. (१ ते ९)" },
  { code: "1.LO.5.1", text: "वस्तू/बाबींची अनुपस्थिती दाखवण्यासाठी शून्याचे चिन्ह ओळखतो/वापरतो." },
  { code: "1.LO.5.2", text: "२०पर्यंतच्या संख्या ओळखतो व लिहितो आणि ९९पर्यंत संख्यानामे लिहितो." },
  { code: "1.LO.5.3", text: "२०पर्यंतच्या दोन संख्यांची तुलना करतो व पेक्षा मोठा, पेक्षा लहान असा शब्दसंग्रह वापरतो." },
  { code: "1.LO.6.1", text: "दैनंदिन परिस्थितीत आणि मूर्त वस्तूंचा वापर करून ९पर्यंत उत्तर येईल, अशी उदाहरणे बेरजेची तथ्ये वापरून गणितीय मांडणी करून सोडवतो." },
  { code: "1.LO.6.2", text: "वजाबाकीवर आधारित व ९पर्यंत उत्तरे येणारी उदाहरणे सोडवण्यासाठी आणि त्यांची गणितीय मांडणी करण्यासाठी दैनंदिन जीवनातील परिस्थितींचा आणि मूर्त वस्तूंचा उपयोग करतो." },
  { code: "1.LO.6.3", text: "संख्यांची बेरीज आणि वजाबाकी यांच्यातील संबंध विकसित करतो." },
  { code: "1.LO.6.4", text: "बेरीज/वजाबाकी या क्रियांसाठी +/- चिन्हे ओळखतो." },
  { code: "1.LO.7.1", text: "गट करून लहान संख्येची गुणाकारची उदाहरणे सोडवतो." },
  { code: "1.LO.7.2", text: "गुणाकाराचे चिन्ह ओळखतो." },
  { code: "1.LO.7.3", text: "भागाकाराची उदाहरणे सोडवण्यासाठी गटात विभागणी करतो व प्रयत्न-प्रमाद (trial and error) पद्धतींचा वापर करतो." },
  { code: "1.LO.7.4", text: "भागाकाराचे चिन्ह ओळखतो." },
  { code: "1.LO.8.1", text: "अवकाशीय संबंध वापरतो व शब्दसंग्रह विकसित करतो. (उदाहरणार्थ, वर, खाली, आत, बाहेर, जवळ, दूर, आधी आणि नंतर)" },
  { code: "1.LO.8.2", text: "आजूबाजूच्या परिसरातून विविध आकार आणि मापांच्या वस्तू गोळा करतो. (उदाहरणार्थ, खडू, ब्लॉक, चेंडू, शंकू, पाईप)" },
  { code: "1.LO.8.3", text: "विविध आकार आणि इतर निरीक्षणीय गुणधर्मांच्या आधारे वस्तू वेगळ्या करतो आणि वर्गीकृत करतो." },
  { code: "1.LO.8.4", text: "स्वतःच्या भाषेत विविध आकारांच्या भौतिक वैशिष्ट्यांचे निरीक्षण आणि वर्णन करतो. (उदाहरणार्थ, बॉल घरंगळतो, बॉक्स घसरतो आणि त्याला कोपरे असतात.)" },
  { code: "1.LO.8.5", text: "विविध गुणधर्मांवर आधारित आकारांची तुलना करतो. (उदाहरणार्थ, लांबी, क्षेत्रफळ, आकारमान)" },
  { code: "1.LO.9.1", text: "जवळ-दूर, बारीक/पातळ-जाड, आखूड-लांब, वर-खाली, यांतील फरक ओळखतो." },
  { code: "1.LO.9.2", text: "अप्रमाणित एककांच्या साहाय्याने लांबी मोजतो. (उदाहरणार्थ, खेळाच्या संदर्भात विटी-दांडू, गोट्या)" },
  { code: "1.LO.9.3", text: "हाताची वीत, हाताची बोट, हात, पाऊल यांसारख्या अप्रमाणित लांबीच्या एककाने कमी अंतराचा व लांबीचा अंदाज बांधतो व पडताळा घेतो." },
  { code: "1.LO.9.4", text: "तुलना करून हलक्या ते जड वस्तू किंवा उलट क्रमाने क्रमवारी लावतो." },
  { code: "1.LO.9.5", text: "कप, चमचा, मग यांसारख्या अप्रमाणित एककाच्या साहाय्याने आकारमानाचा अंदाज करतो व प्रत्यक्ष मोजतो." },
  { code: "1.LO.10.1", text: "अगोदर, नंतर यांसारख्या संज्ञांचा वापर करून घडलेल्या घटनांमध्ये फरक करतो." },
  { code: "1.LO.10.2", text: "सुट्टीचा आणि शाळेचा कालावधी यांतील कमी आणि अधिक कालावधीची गुणात्मक अनुभूती घेतो." },
  { code: "1.LO.10.3", text: "दिवसातील घटना/प्रसंग यांचा क्रम लावतो." },
  { code: "1.LO.11.1", text: "नाणी व नोटांची बेरीज करून/मिळवून २० रु.पर्यंतची रक्कम तयार करतो." },
  { code: "1.LO.12.1", text: "राशी, आकार, अवकाश आणि मापन यांच्याशी संबंधित गणितीय प्रश्नांचे वर्णन करण्यासाठी विधाने तयार करतो." },
  { code: "1.LO.13.1", text: "साध्या गणितीय समस्यांच्या स्वरूपात वास्तव जगातील प्रसंग ओळखतो." },
  { code: "1.LO.13.2", text: "विविध कार्यनीतींचा/पद्धतींचा वापर करून साध्या अंकगणितीय समस्या सोडवतो." }
];

// Class 2nd Outcomes
const MARATHI_OUTCOMES_2ND = [
  { code: "2.1.1", text: "वाचलेल्या साहित्यातील नवीन शब्द ओळखतो व त्यांचा अर्थ विचारतो." },
  { code: "2.1.2", text: "चित्रे व मजकूर पाहून स्वतःच्या कल्पनेने गोष्टी सांगतो." },
  { code: "2.2.1", text: "विविध विषयांवर स्वतःच्या बोलीभाषेत मत व्यक्त करतो." },
  { code: "2.3.1", text: "कविता व गाणी लयामध्ये व सुरात गायन करतो." },
  { code: "2.4.1", text: "योग्य गतीने व विरामचिन्हांचा विचार करून वाचन करतो." },
  { code: "2.5.1", text: "ऐकलेल्या गोष्टींवर आधारित सोपे प्रश्न विचारतो." }
];

const ENGLISH_OUTCOMES_2ND = [
  { code: "2.1.1", text: "Recites poems and rhymes with proper rhythm and action." },
  { code: "2.2.1", text: "Responds to simple English instructions in classroom." },
  { code: "2.3.1", text: "Reads simple words and 3-4 letter sentences accurately." },
  { code: "2.4.1", text: "Writes simple words correctly on dictation." }
];

const MATHS_OUTCOMES_2ND = [
  { code: "2.LO.1", text: "दोन अंकी संख्यांची बेरीज व वजाबाकी दैनंदिन प्रसंगात करतो." },
  { code: "2.LO.2", text: "९९ पर्यंतच्या संख्यांचा स्थानिक मान ओळखतो." },
  { code: "2.LO.3", text: "आकृत्या व भौमितिक आकार (त्रिकोण, चौकोन, वर्तुळ) ओळखतो." },
  { code: "2.LO.4", text: "नाणी व चलनी नोटांची मोजणी करून सोपे व्यवहार करतो." }
];

// Dynamic Class Outcomes Resolver
const getClassOutcomes = (classValue, subjectKey) => {
  const norm = String(classValue || "1st").toLowerCase().replace(/[^0-9]/g, "") || "1";
  
  if (subjectKey === "marathi") {
    if (norm === "2") return MARATHI_OUTCOMES_2ND;
    return MARATHI_OUTCOMES_1ST;
  }
  if (subjectKey === "english") {
    if (norm === "2") return ENGLISH_OUTCOMES_2ND;
    return ENGLISH_OUTCOMES_1ST;
  }
  if (subjectKey === "maths") {
    if (norm === "2") return MATHS_OUTCOMES_2ND;
    return MATHS_OUTCOMES_1ST;
  }
  return [];
};

const SubjectWiseResult = ({ initialClass = "1st", initialYear = "2025-26", onBack }) => {
  const [selectedClass, setSelectedClass] = useState(initialClass || "1st");
  const [academicYear, setAcademicYear] = useState(initialYear || "2025-26");
  const [division, setDivision] = useState("1");
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  const [schoolData, setSchoolData] = useState({
    schoolName: "",
    udise: "",
    teacherName: "",
    headmasterName: "",
  });

  const [students, setStudents] = useState([]);
  const [marksData, setMarksData] = useState({});
  const [levelsData, setLevelsData] = useState({});

  const printRef = useRef(null);

  useEffect(() => {
    loadData();
  }, [selectedClass, academicYear]);

  const loadData = async () => {
    setLoading(true);
    try {
      const docId = `${selectedClass}_${academicYear}`;

      // 1. Fetch Global / Class School Settings
      try {
        let globalSettings = null;
        try {
          const cachedGen = localStorage.getItem("cce_general_school_settings");
          if (cachedGen) globalSettings = JSON.parse(cachedGen);
        } catch (e) {}

        if (!globalSettings) {
          try {
            const { fetchJsonFromBunny } = await import("@/lib/bunnyStorage");
            globalSettings = await fetchJsonFromBunny("cce_results/general_school_settings.json");
          } catch (e) {}
        }

        const settingsSnap = await getDoc(doc(db, "cce_settings", docId));
        const classSettings = settingsSnap.exists() ? settingsSnap.data() : {};
        const mergedSettings = { ...(globalSettings || {}), ...classSettings };

        if (mergedSettings.schoolName || mergedSettings.udiseCode || mergedSettings.teacherName) {
          setSchoolData({
            schoolName: mergedSettings.schoolName ? `${mergedSettings.schoolName}${mergedSettings.address ? ` (${mergedSettings.address})` : ""}` : "",
            udise: mergedSettings.udiseCode || mergedSettings.udise || "",
            teacherName: mergedSettings.teacherName || "",
            headmasterName: mergedSettings.principalName || mergedSettings.headmasterName || "",
          });
        }
      } catch (e) {}

      // 2. Fetch Students for Selected Class
      let loadedStudents = [];
      const normalizeClass = (cls) => (cls ? String(cls).trim().toLowerCase().replace(/[^0-9a-z]/g, "") : "");
      const targetClassNorm = normalizeClass(selectedClass);

      try {
        const uQuery = query(collection(db, "users"), where("role", "==", "student"));
        const uSnap = await getDocs(uQuery);
        uSnap.forEach((docSnap) => {
          const d = docSnap.data();
          const stdClassNorm = normalizeClass(d.class || d.currentClass || d.className);
          if (!stdClassNorm || stdClassNorm === targetClassNorm || d.class === selectedClass) {
            loadedStudents.push({
              id: docSnap.id,
              name: d.fullName || d.name || d.studentName || "",
              rollNo: String(d.rollNo || d.srNo || loadedStudents.length + 1),
            });
          }
        });
      } catch (e) {}

      if (loadedStudents.length === 0) {
        try {
          const studentsSnap = await getDocs(collection(db, "students"));
          studentsSnap.forEach((docSnap) => {
            const d = docSnap.data();
            const stdClassNorm = normalizeClass(d.class || d.currentClass || d.className);
            if (!stdClassNorm || stdClassNorm === targetClassNorm || d.class === selectedClass) {
              loadedStudents.push({
                id: docSnap.id,
                name: d.fullName || d.name || d.studentName || "",
                rollNo: String(d.rollNo || d.srNo || loadedStudents.length + 1),
              });
            }
          });
        } catch (e) {}
      }

      // Deduplicate students
      const uniqueMap = new Map();
      loadedStudents.forEach((s) => {
        if (s.name) {
          const key = s.rollNo ? `${s.rollNo}_${s.name}` : s.name;
          if (!uniqueMap.has(key)) uniqueMap.set(key, s);
        }
      });
      loadedStudents = Array.from(uniqueMap.values());
      loadedStudents.sort((a, b) => (parseInt(a.rollNo) || 0) - (parseInt(b.rollNo) || 0));
      setStudents(loadedStudents);

      // 3. Fetch User-Selected Student Levels (from Bunny Storage CDN or Firestore)
      try {
        const { fetchJsonFromBunny } = await import("@/lib/bunnyStorage");
        const bunnyLevels = await fetchJsonFromBunny(`cce_results/${selectedClass}_${academicYear}_levels.json`);
        if (bunnyLevels && Object.keys(bunnyLevels).length > 0) {
          setLevelsData(bunnyLevels);
        } else {
          const levelsSnap = await getDoc(doc(db, "cce_levels_v2", docId));
          if (levelsSnap.exists()) {
            setLevelsData(levelsSnap.data().levelsData || levelsSnap.data());
          } else {
            setLevelsData({});
          }
        }
      } catch (e) {}

      // 4. Fetch Marks Data
      try {
        const { fetchJsonFromBunny } = await import("@/lib/bunnyStorage");
        const bunnyMarks = await fetchJsonFromBunny(`cce_results/${selectedClass}_${academicYear}_marks_second.json`)
          || await fetchJsonFromBunny(`cce_results/${selectedClass}_${academicYear}_marks_first.json`);
        
        if (bunnyMarks && Object.keys(bunnyMarks).length > 0) {
          setMarksData(bunnyMarks);
        } else {
          const marksSnap = await getDoc(doc(db, "cce_marks_v2", docId));
          if (marksSnap.exists()) {
            const mData = marksSnap.data();
            setMarksData(mData.semester2 || mData.semester1 || mData.marksData || mData.data || mData);
          }
        }
      } catch (e) {}

    } catch (err) {
      console.error("Error loading learning outcomes data:", err);
    }
    setLoading(false);
  };

  const handleDownloadPdf = async () => {
    if (!printRef.current) return;
    setDownloading(true);
    toast.info("PDF निर्मिती सुरू आहे, कृपया वाट पाहा...");
    try {
      const { default: html2pdf } = await import("html2pdf.js");
      const element = printRef.current;
      const opt = {
        margin: [0, 0, 0, 0],
        filename: `अध्ययन_निष्पत्ती_प्रगतीदर्शक_${selectedClass}_${academicYear}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        pagebreak: { mode: ["css"] },
      };
      await html2pdf().set(opt).from(element).save();
      toast.success("PDF यशस्वीरित्या डाऊनलोड झाली!");
    } catch (err) {
      console.error("PDF generation error:", err);
      toast.error("PDF निर्मितीत अडचण आली: " + err.message);
    }
    setDownloading(false);
  };

  const handlePrint = () => {
    window.print();
  };

  /**
   * Resolves the EXACT level (1, 2, 3, or 4) entered by the user for a specific student and outcome code.
   * Returns null if no level has been explicitly selected by the user (NO automatic fill!).
   */
  const getUserSelectedLevel = (student, outcomeCode, subjectName) => {
    const stdId = student.id || student.rollNo || student.name;
    const stdLevels = levelsData[stdId] || levelsData[student.name] || {};
    const stdMarks = marksData[stdId] || marksData[student.name] || {};

    // 1. Direct user-selected level for this outcome code
    const explicitLevel = stdLevels[outcomeCode] || stdLevels[subjectName]?.[outcomeCode];
    if (explicitLevel) {
      const parsed = parseInt(explicitLevel);
      if (parsed >= 1 && parsed <= 4) return parsed;
    }

    // 2. Derive level from student's entered subject marks if user filled marks
    const subMarks = stdMarks[subjectName] || {};
    const obtTotal = (Number(subMarks.oral) || 0) + (Number(subMarks.activity) || 0) + (Number(subMarks.test) || 0) + (Number(subMarks.semesterWritten) || 0);
    const maxTotal = 100;

    if (obtTotal > 0) {
      const pct = (obtTotal / maxTotal) * 100;
      if (pct >= 81) return 4;
      if (pct >= 61) return 3;
      if (pct >= 41) return 2;
      return 1;
    }

    // 3. No level selected yet by user -> Return null (Keep columns BLANK!)
    return null;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-500 font-sans">
        <Loader2 className="size-10 text-blue-600 animate-spin mb-3" />
        <p className="text-sm font-bold text-slate-700">माहिती लोड होत आहे, कृपया वाट पाहा...</p>
      </div>
    );
  }

  // Fetch Class-Specific Outcomes
  const marathiOutcomes = getClassOutcomes(selectedClass, "marathi");
  const englishOutcomes = getClassOutcomes(selectedClass, "english");
  const mathsOutcomes = getClassOutcomes(selectedClass, "maths");

  return (
    <div className="font-sans text-slate-800">
      {/* Top Action Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mb-6 flex flex-wrap items-center justify-between gap-4 no-print">
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition-colors cursor-pointer text-slate-600">
              <ArrowLeft className="size-5" />
            </button>
          )}
          <div>
            <h2 className="text-base font-black text-slate-800">अध्ययन निष्पत्तीनिहाय संपादणूक प्रगतीदर्शक नोंदतक्ता</h2>
            <p className="text-xs text-blue-600 font-bold uppercase tracking-wider">{selectedClass} • {academicYear}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleDownloadPdf}
            disabled={downloading || students.length === 0}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-extrabold rounded-xl transition-all cursor-pointer shadow-md shadow-blue-200 flex items-center gap-2 disabled:opacity-50"
          >
            {downloading ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
            <span>{downloading ? "डाउनलोड होत आहे..." : "PDF डाऊनलोड करा"}</span>
          </button>
          <button
            onClick={handlePrint}
            disabled={students.length === 0}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 active:scale-95 text-white text-xs font-extrabold rounded-xl transition-all cursor-pointer shadow-md shadow-slate-300 flex items-center gap-2 disabled:opacity-50"
          >
            <Printer className="size-4" />
            <span>प्रिंट करा</span>
          </button>
        </div>
      </div>

      {students.length === 0 && (
        <div className="p-6 bg-amber-50 rounded-2xl border border-amber-200 mb-6 text-center max-w-xl mx-auto no-print">
          <AlertCircle className="size-8 text-amber-600 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-amber-800 mb-1">या वर्गामध्ये अद्याप कोणतेही विद्यार्थी जोडलेले नाहीत</h3>
          <p className="text-xs text-amber-700">कृपया डॅशबोर्डवरील <b>'विद्यार्थी'</b> विभागात जाऊन या वर्गासाठी विद्यार्थी जोडा.</p>
        </div>
      )}

      {/* -------------------- PRINT CONTAINER (CLASS-SPECIFIC OUTCOMES & USER SELECTED LEVELS) -------------------- */}
      <div ref={printRef} className="cce-pdf-container max-w-4xl mx-auto">
        
        {students.map((student) => (
          <div key={student.id} className="pdf-page bg-white p-6 border border-slate-200 rounded-3xl shadow-sm flex flex-col justify-between mb-4" style={{ pageBreakAfter: "always", breakAfter: "page" }}>
            <div>
              {/* Header Title */}
              <h1 className="text-xl font-black text-blue-900 text-center mb-4 border-b-2 border-blue-900 pb-2 tracking-tight">
                अध्ययन निष्पत्तीनिहाय संपादणूक प्रगतीदर्शक नोंदतक्ता
              </h1>

              {/* Student Metadata Bar */}
              <div className="flex items-center justify-between text-xs font-extrabold text-slate-800 bg-blue-50/70 p-3 rounded-xl border border-blue-100 mb-6">
                <span>विद्यार्थ्याचे नाव - <b className="text-blue-700">{student.name}</b></span>
                <span>इयत्ता - <b>{selectedClass}</b></span>
                <span>तुकडी - <b>{division}</b></span>
                <span>हजेरी क्र. <b>{student.rollNo}</b></span>
                <span>द्वितीय सत्र</span>
              </div>

              {/* 1. प्रथम भाषा: मराठी Section */}
              {marathiOutcomes.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-base font-black text-blue-800 mb-3 text-center">प्रथम भाषा: मराठी</h3>
                  <table className="w-full border-collapse border border-blue-400 text-xs font-medium">
                    <thead>
                      <tr className="bg-blue-100 text-blue-950 font-bold text-center">
                        <th className="border border-blue-400 p-2 w-28">अध्ययन निष्पत्ती क्र.</th>
                        <th className="border border-blue-400 p-2 text-left">अध्ययन निष्पत्ती</th>
                        <th colSpan={4} className="border border-blue-400 p-1 w-32">स्तर</th>
                      </tr>
                      <tr className="bg-blue-50 text-blue-950 font-bold text-center text-[11px]">
                        <th colSpan={2} className="border border-blue-400 p-1"></th>
                        <th className="border border-blue-400 p-1 w-8">1</th>
                        <th className="border border-blue-400 p-1 w-8">2</th>
                        <th className="border border-blue-400 p-1 w-8">3</th>
                        <th className="border border-blue-400 p-1 w-8">4</th>
                      </tr>
                    </thead>
                    <tbody>
                      {marathiOutcomes.map((item) => {
                        const level = getUserSelectedLevel(student, item.code, "मराठी");
                        return (
                          <tr key={item.code} className="border-b border-blue-300 hover:bg-slate-50">
                            <td className="border border-blue-400 p-2 text-center font-bold text-slate-900">{item.code}</td>
                            <td className="border border-blue-400 p-2 text-slate-800 leading-snug">{item.text}</td>
                            <td className="border border-blue-400 p-1 text-center font-black text-blue-700">{level === 1 ? "✓" : ""}</td>
                            <td className="border border-blue-400 p-1 text-center font-black text-blue-700">{level === 2 ? "✓" : ""}</td>
                            <td className="border border-blue-400 p-1 text-center font-black text-blue-700">{level === 3 ? "✓" : ""}</td>
                            <td className="border border-blue-400 p-1 text-center font-black text-blue-700">{level === 4 ? "✓" : ""}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* 2. तृतीय भाषा: इंग्रजी Section */}
              {englishOutcomes.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-base font-black text-blue-800 mb-3 text-center">तृतीय भाषा: इंग्रजी</h3>
                  <table className="w-full border-collapse border border-blue-400 text-xs font-medium">
                    <thead>
                      <tr className="bg-blue-100 text-blue-950 font-bold text-center">
                        <th className="border border-blue-400 p-2 w-28">अध्ययन निष्पत्ती क्र.</th>
                        <th className="border border-blue-400 p-2 text-left">अध्ययन निष्पत्ती</th>
                        <th colSpan={4} className="border border-blue-400 p-1 w-32">स्तर</th>
                      </tr>
                      <tr className="bg-blue-50 text-blue-950 font-bold text-center text-[11px]">
                        <th colSpan={2} className="border border-blue-400 p-1"></th>
                        <th className="border border-blue-400 p-1 w-8">1</th>
                        <th className="border border-blue-400 p-1 w-8">2</th>
                        <th className="border border-blue-400 p-1 w-8">3</th>
                        <th className="border border-blue-400 p-1 w-8">4</th>
                      </tr>
                    </thead>
                    <tbody>
                      {englishOutcomes.map((item) => {
                        const level = getUserSelectedLevel(student, item.code, "इंग्रजी");
                        return (
                          <tr key={item.code} className="border-b border-blue-300 hover:bg-slate-50">
                            <td className="border border-blue-400 p-2 text-center font-bold text-slate-900">{item.code}</td>
                            <td className="border border-blue-400 p-2 text-slate-800 leading-snug">{item.text}</td>
                            <td className="border border-blue-400 p-1 text-center font-black text-blue-700">{level === 1 ? "✓" : ""}</td>
                            <td className="border border-blue-400 p-1 text-center font-black text-blue-700">{level === 2 ? "✓" : ""}</td>
                            <td className="border border-blue-400 p-1 text-center font-black text-blue-700">{level === 3 ? "✓" : ""}</td>
                            <td className="border border-blue-400 p-1 text-center font-black text-blue-700">{level === 4 ? "✓" : ""}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* 3. गणित Section */}
              {mathsOutcomes.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-base font-black text-blue-800 mb-3 text-center">गणित</h3>
                  <table className="w-full border-collapse border border-blue-400 text-xs font-medium">
                    <thead>
                      <tr className="bg-blue-100 text-blue-950 font-bold text-center">
                        <th className="border border-blue-400 p-2 w-28">अध्ययन निष्पत्ती क्र.</th>
                        <th className="border border-blue-400 p-2 text-left">अध्ययन निष्पत्ती</th>
                        <th colSpan={4} className="border border-blue-400 p-1 w-32">स्तर</th>
                      </tr>
                      <tr className="bg-blue-50 text-blue-950 font-bold text-center text-[11px]">
                        <th colSpan={2} className="border border-blue-400 p-1"></th>
                        <th className="border border-blue-400 p-1 w-8">1</th>
                        <th className="border border-blue-400 p-1 w-8">2</th>
                        <th className="border border-blue-400 p-1 w-8">3</th>
                        <th className="border border-blue-400 p-1 w-8">4</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mathsOutcomes.map((item) => {
                        const level = getUserSelectedLevel(student, item.code, "गणित");
                        return (
                          <tr key={item.code} className="border-b border-blue-300 hover:bg-slate-50">
                            <td className="border border-blue-400 p-2 text-center font-bold text-slate-900">{item.code}</td>
                            <td className="border border-blue-400 p-2 text-slate-800 leading-snug">{item.text}</td>
                            <td className="border border-blue-400 p-1 text-center font-black text-blue-700">{level === 1 ? "✓" : ""}</td>
                            <td className="border border-blue-400 p-1 text-center font-black text-blue-700">{level === 2 ? "✓" : ""}</td>
                            <td className="border border-blue-400 p-1 text-center font-black text-blue-700">{level === 3 ? "✓" : ""}</td>
                            <td className="border border-blue-400 p-1 text-center font-black text-blue-700">{level === 4 ? "✓" : ""}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Signatures */}
            <div className="flex items-center justify-between pt-6 border-t border-slate-200 mt-6 text-xs font-bold text-slate-800">
              <div className="text-center">
                <p className="font-extrabold">{schoolData.teacherName || "वर्गशिक्षक"}</p>
                <p className="text-[11px] text-slate-500 font-medium">वर्गशिक्षक</p>
              </div>
              <div className="text-center">
                <p className="font-extrabold">{schoolData.headmasterName || "मुख्याध्यापक"}</p>
                <p className="text-[11px] text-slate-500 font-medium">मुख्याध्यापक</p>
              </div>
            </div>
          </div>
        ))}

      </div>
    </div>
  );
};

export default SubjectWiseResult;
