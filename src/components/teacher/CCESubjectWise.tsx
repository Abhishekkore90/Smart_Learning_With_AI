import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { ArrowLeft, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

type Semester = "sem1" | "sem2";
interface Student { id: string; fullName?: string; name?: string; rollNo?: string; [key: string]: any; }

// Learning outcomes data per subject
const OUTCOMES: Record<string, { code: string; text: string }[]> = {
  marathi: [
    { code: "9.1.1",  text: "जास्त लांबीची अपरिचित गाणी, मोठ्या वाक्यांच्या गोष्टी (४ ते ८ वाक्ये) काळजीपूर्वक ऐकतो. त्याबद्दल संभाषण करतो आणि प्रश्न विचारतो." },
    { code: "9.1.2",  text: "मोठी (१० ओळी) गाणी/कविता गातो व मोठ्याने पुन्हा म्हणून दाखवतो." },
    { code: "9.2",    text: "शिक्षकांच्या मदतीने यमक जुळवतो लहानलहान कविता तयार करतो." },
    { code: "9.3",    text: "भाषणात सहभागी होतो. बोलण्यासाठी स्वतःची वेळ घेण्याची वाट पाहतो आणि इतरांना बोलू देतो." },
    { code: "9.3.2",  text: "वर्गात वाचून दाखवलेल्या किंवा चर्चा केलेल्या माहितीपर/कथेतर आशय स्वतःच्या अनुभवांशी सक्षमपणे जोडतो आणि त्याबद्दल बोलतो." },
    { code: "9.4.1",  text: "साध्या स्वरूपाच्या अनेक कृतींचा समावेश असलेल्या सूचनांचे पालन करतो. (एकाच वेळी ६ ते ९ सूचना एकत्र दिल्यास)" },
    { code: "9.4.2",  text: "साध्या स्वरूपाच्या अनेक कृतींचा समावेश असलेल्या सूचनांचे पालन करतो. (एकाच वेळी ८ ते ९ सूचना एकत्र दिल्यास)" },
    { code: "9.5",    text: "गोष्टींची मध्यवर्ती कल्पना व पात्रांच्या भावना लक्षात घेऊन संवादासह सांगतो." },
    { code: "9.6",    text: "साधे कथानक व पात्रासह स्वतःच्या छोट्या गोष्टी सांगतो." },
    { code: "9.7",    text: "चित्र आणि संदर्भ यांनुसार अपरिचित शब्दांच्या अर्थाचा अंदाज बांधतो." },
    { code: "10.1.1", text: "अक्षरांच्या ध्वनीमधून स्वर व व्यंजनांचे ध्वनी वेगळे करतो." },
    { code: "10.1.2", text: "शब्दातून अक्षरांचे ध्वनी वेगळे करतो." },
    { code: "10.2.1", text: "साधी विरामचिन्हे ओळखतो (पूर्णविराम, प्रश्नचिन्ह)" },
    { code: "10.3.1", text: "वर्णमालेतील सर्व अक्षरे (ज्ञ, क्ष या संयुक्त अक्षरांसह) व स्वरचिन्हे वाचतो." },
    { code: "10.3.2", text: "सर्व अक्षरे व सर्व स्वरचिन्हे आणि नेहमी वापरत असलेली जोडाक्षरे यांसह बहुवर्णिय शब्द वाचतो." },
    { code: "10.3.3", text: "वर्णमालेतील सर्व अक्षरे आणि स्वरचिन्हे वापरून स्वतः शब्द लिहितो आणि त्यावरून वाक्य सांगतो." },
    { code: "10.3.4", text: "शिकलेली अक्षरे आणि स्वरचिन्हे वापरून स्वतः वाक्य लिहितो." },
    { code: "10.4", text: "योग्य उच्चार आणि ध्वनी विरामसह लहान परिच्छेद अचूकपणे वाचतो." },
    { code: "10.5", text: "दृक आशय आणि समान मजकूर असणाऱ्या पुस्तकांचे स्वतंत्रपणे वाचन करण्यास सुरुवात करतो." },
    { code: "10.5.2", text: "गोष्टींची अपरिचित पुस्तके वाचतो आणि शिक्षकांच्या मार्गदर्शनाखाली ती समजून घेतो. गोष्टीतील कथानक व पात्र ओळखतो." },
    { code: "10.6", text: "छोट्या कविता वाचतो आणि त्याचा शाब्दिक अर्थ सांगतो." },
    { code: "10.7", text: "खेळ खेळण्याकरिता सोप्या सूचना वाचतो आणि त्याप्रमाणे गटात खेळतो." },
    { code: "10.8.1", text: "चित्रांचा क्रम तयार करतो आणि त्यासोबत छोटी वाक्ये पारंपरिक लिपीत वर्णमालेतील अक्षरे व स्वरचिन्हे वापरून लिहितो." },
    { code: "10.8.2", text: "तीन किंवा चार वर्णाक्षरांच्या शब्दांचे श्रुतलेखन करतो." },
    { code: "10.8.3", text: "वर्णमालेतील अक्षरे व स्वरचिन्हे यांचा वापर करून दोन-तीन वाक्यांचे लेखन स्वतः करतो. उदा. स्वतःचा अनुभव, चित्र अथवा वस्तू यांवरून." },
    { code: "10.9", text: "पुस्तकांच्या आवडीबद्दल सांगतो. छोट्या पुस्तकांचे नियमित वाचन करतो." },
  ],
  english: [
    { code: "9.1.1.1",  text: "Listens to longer (4-8 sentences) songs/poems (unfamiliar) with attention and have conversations about them, asking and answering questions." },
    { code: "9.1.2.1",  text: "Sings/recites longer (10 sentences) songs/poems." },
    { code: "9.2.1.1",  text: "Extends/Creates short poems/rhymes with the help of the teacher." },
    { code: "9.3.1.1",  text: "Engages in conversations, wait for his/her turn to speak and allow other to speak." },
    { code: "9.3.2.1",  text: "Engages with non-fictional content read aloud or discussed in class, links knowledge from his/her own experiences and talks about it." },
    { code: "9.4.1.1",  text: "Follows instructions comprising of several steps. (8 to 9 instructions at a time)" },
    { code: "9.4.2.1",  text: "Gives clear instructions comprising of several steps. (8 to 9 instructions at a time)" },
    { code: "9.5.1.1",  text: "Interprets the intent of the plot and emotions of the characters in a story and tells the story with dialogues." },
    { code: "9.6.1.1",  text: "Narrates his/her own short stories with simple plots and characters." },
    { code: "9.7.1.1",  text: "Predicts meaning of unknown words in texts using pictures and context clues." },
    { code: "11.1.1.1", text: "Identifies rhyming words and alliterations." },
    { code: "11.1.2.1", text: "Identifies the beginning and end syllables in words." },
    { code: "11.1.3.1", text: "Combines 2-3 syllables to form simple words." },
    { code: "11.2.1.1", text: "Begins to visually recognise and connect letters to corresponding sounds." },
    { code: "11.2.2.1", text: "Produces familiar words from familiar letters." },
    { code: "11.2.3.1", text: "Recognises sight words, their names and labels of objects in his/her environment." },
    { code: "11.2.4.1", text: "Writes down short words on dictation." },
  ],
  math: [
    { code: "1.LO.1.1", text: "गुणधर्मांनुसार वस्तू वेगळ्या करतो आणि त्यामागील नियमांचे वर्णन करतो. (उदाहरणार्थ, समान बदलांनुसार रंगाच्या प्राण्यांची मांडणी)" },
    { code: "1.LO.2.1", text: "मोजण्याच्या मदतीने सोप्या आकृतिबंधातील हरवलेला घटक ओळखतो/शोधतो. (उदाहरणार्थ, लाल-निळा, लाल-निळा, लाल-निळा...)" },
    { code: "1.LO.3.1", text: "२०पेक्षा जास्त वस्तू ९९पर्यंतच्या संख्यानामांनी मोजतो आणि १०-१०च्या टप्प्याने ९९पर्यंत संख्या मोजतो." },
    { code: "1.LO.3.2", text: "विशिष्ट अंकापासून पुढे व मागे अशी मोजणी करतो. (० ते ९९)" },
    { code: "1.LO.3.3", text: "दोनच्या गटातील संख्या/राशी ओळखतो. (उदाहरणार्थ, १० चे दोन गट म्हणजे २० करतो.)" },
    { code: "1.LO.4.1", text: "एकाच गटातील वस्तूंची त्यांच्या विविध गुणधर्मांनुसार मांडणी करतो. (उदाहरणार्थ, आकार, माप, लांबी, वजन)" },
    { code: "1.LO.4.2", text: "दिलेल्या संख्यांची चढत्या आणि उतरत्या क्रमाने मांडणी करतो. (१ ते ९)" },
    { code: "1.LO.5.1", text: "वस्तू/बाबींची अनुपस्थिती दाखवण्यासाठी शून्याचे चिन्ह ओळखतो/वापरतो." },
    { code: "1.LO.5.2", text: "२०पर्यंतच्या संख्या ओळखतो व लिहितो आणि ९९पर्यंत संख्यानामे लिहितो." },
    { code: "1.LO.5.3", text: "२०पर्यंतच्या दोन संख्यांची तुलना करतो व च्यापेक्षा मोठा, च्यापेक्षा लहान असा शब्दसंग्रह वापरतो." },
    { code: "1.LO.6.1", text: "दैनंदिन परिस्थितीत आणि मूर्त वस्तूंचा वापर करून ९पर्यंत उत्तर येईल, अशी उदाहरणे बेरजेची तथ्ये वापरून गणितीय मांडणी करतो." },
    { code: "1.LO.6.2", text: "वजाबाकीवर आधारित व ९पर्यंत उत्तरे येणारी उदाहरणे सोडवण्यासाठी आणि त्यांची गणितीय मांडणी करण्यासाठी दैनंदिन परिस्थितीशी जोडतो." },
    { code: "1.LO.6.3", text: "संख्यांची बेरीज आणि वजाबाकी यांच्यातील संबंध विकसित करतो." },
    { code: "1.LO.6.4", text: "बेरीज/वजाबाकी या क्रियांसाठी +/- चिन्हे ओळखतो." },
    { code: "1.LO.7.1", text: "गट करून लहान संख्येची गुणाकाराची उदाहरणे सोडवतो." },
    { code: "1.LO.7.2", text: "गुणाकाराचे चिन्ह ओळखतो." },
    { code: "1.LO.7.3", text: "भागाकाराची उदाहरणे सोडवण्यासाठी गटात विभागणी करतो व प्रयत्न-प्रमाद (trial and error) पद्धतींचा वापर करतो." },
    { code: "1.LO.7.4", text: "भागाकाराचे चिन्ह ओळखतो." },
    { code: "1.LO.8.1", text: "अवकाशीय संबंध वापरतो व शब्दसंग्रह विकसित करतो. (उदाहरणार्थ, वर, खाली, आत, बाहेर, जवळ, दूर, आधी आणि नंतर)" },
    { code: "1.LO.8.2", text: "आजूबाजूच्या परिसरातून विविध आकार आणि मापांच्या वस्तू गोळा करतो. (उदाहरणार्थ, खडू, ब्लॉक, चेंडू, शंखू, पाईप)" },
    { code: "1.LO.8.3", text: "विविध आकार आणि इतर निरीक्षणीय गुणधर्मांच्या आधारे वस्तू वेगळ्या करतो आणि वर्गीकृत करतो." },
    { code: "1.LO.8.4", text: "स्वतःच्या भाषेत विविध आकारांच्या भौतिक वैशिष्ट्यांचे निरीक्षण आणि वर्णन करतो. (उदाहरणार्थ, बॉल घरंगळतो, बॉक्स घसरतो...)" },
    { code: "1.LO.8.5", text: "विविध गुणधर्मांवर आधारित आकारांची तुलना करतो. (उदाहरणार्थ, लांबी, क्षेत्रफळ, आकारमान)" },
    { code: "1.LO.9.1", text: "जवळ-दूर, बारीक/पातळ-जाड, आखूड-लांब, वर-खाली, यांतील फरक ओळखतो." },
    { code: "1.LO.9.2", text: "अप्रमाणित एककांच्या साहाय्याने लांबी मोजतो. (उदाहरणार्थ, खेळाच्या संदर्भात विटी-दांडू, गोट्या)" },
    { code: "1.LO.9.3", text: "हाताची वीत, हाताची बोट, हात, पाऊल यांसारख्या अप्रमाणित लांबीच्या एककाने कमी अंतराचा व लांबीचा अंदाज बांधतो आणि मोजतो." },
    { code: "1.LO.9.4", text: "तुलना करून हलक्या ते जड वस्तू किंवा उलट क्रमाने क्रमवारी लावतो." },
    { code: "1.LO.9.5", text: "कप, चमचा, मग यांसारख्या अप्रमाणित एककाच्या साहाय्याने आकारमानाचा अंदाज करतो व प्रत्यक्ष मोजतो." },
    { code: "1.LO.10.1", text: "अगोदर, नंतर यांसारख्या संज्ञांचा वापर करून घडलेल्या घटनांमध्ये फरक करतो." },
    { code: "1.LO.10.2", text: "सुट्टीचा आणि शाळेचा कालावधी यांतील कमी आणि अधिक कालावधीची गुणात्मक अनुभूती घेतो." },
    { code: "1.LO.10.3", text: "दिवसातील घटना/प्रसंग यांचा क्रम लावतो." },
    { code: "1.LO.11.1", text: "नाणी व नोटांची बेरीज करून/मिळवून २० रु.पर्यंतची रक्कम तयार करतो." },
    { code: "1.LO.12.1", text: "राशी, आकार, अवकाश आणि मापन यांच्याशी संबंधित गणितीय प्रश्नांचे वर्णन करण्यासाठी विधाने तयार करतो." },
    { code: "1.LO.13.1", text: "साध्या गणितीय समस्यांच्या स्वरूपात वास्तव जगातील प्रसंग ओळखतो." },
    { code: "1.LO.13.2", text: "विविध कार्यनीतींचा/पद्धतींचा वापर करून साध्या अंकगणितीय समस्या सोडवतो." },
  ],
  hindi: [
    { code: "H.9.1", text: "लंबी कविता/गाने ध्यान से सुनता है और उनके बारे में बातचीत करता है." },
    { code: "H.9.2", text: "शिक्षक की मदद से तुकबंदी वाली कविता बनाता है." },
    { code: "H.9.3", text: "बातचीत में भाग लेता है और बारी-बारी से बोलता है." },
    { code: "H.9.4", text: "कई चरणों वाले निर्देशों का पालन करता है." },
    { code: "H.10.1", text: "अक्षरों की ध्वनि को पहचानता है." },
    { code: "H.10.2", text: "सरल विराम चिह्न पहचानता है." },
  ],
  evs: [
    { code: "E.1.1", text: "परिसरातील वनस्पती, प्राणी यांची माहिती सांगतो." },
    { code: "E.1.2", text: "परिसरातील बदल नोंदवतो व सांगतो." },
    { code: "E.2.1", text: "हवामान व ऋतू यांच्याबद्दल माहिती सांगतो." },
    { code: "E.3.1", text: "अन्न, पाणी व हवा यांचे महत्त्व सांगतो." },
    { code: "E.4.1", text: "सामाजिक जीवनाबद्दल माहिती सांगतो." },
    { code: "E.5.1", text: "प्रयोग व निरीक्षण करतो आणि सांगतो." },
  ],
};

const SUBJECTS = [
  { key: "marathi", label: "प्रथम भाषा : मराठी" },
  { key: "english", label: "द्वितीय भाषा : इंग्रजी" },
  { key: "math",    label: "गणित" },
];

// ratings: { [subjectKey]: { [outcomeCode]: { [studentId]: 1|2|3|0 } } }
type RatingData = Record<string, Record<string, Record<string, number>>>;

export function CCESubjectWise({ selectedClass, academicYear, onBack }: {
  selectedClass: string; academicYear: string; onBack: () => void;
}) {
  const [activeSemester, setActiveSemester] = useState<Semester>("sem1");
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [ratingData, setRatingData] = useState<RatingData>({});

  // Outcome detail view state
  const [editingOutcome, setEditingOutcome] = useState<{
    subjectKey: string; subjectLabel: string; code: string; text: string;
  } | null>(null);

  // Fetch students
  useEffect(() => {
    const q = query(
      collection(db, "users"),
      where("role", "==", "student"),
      where("class", "==", selectedClass)
    );
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Student[];
      setStudents(data.sort((a, b) => parseInt(a.rollNo || "999") - parseInt(b.rollNo || "999")));
    });
    return () => unsub();
  }, [selectedClass]);

  // Load ratings
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const ref = doc(db, "cce_outcomes", `${selectedClass}_${academicYear}_${activeSemester}`);
        const snap = await getDoc(ref);
        setRatingData(snap.exists() ? snap.data().ratings || {} : {});
      } catch { /* ignore */ }
      setLoading(false);
    };
    load();
  }, [selectedClass, academicYear, activeSemester]);

  const getRating = (subKey: string, code: string, studentId: string): number =>
    ratingData[subKey]?.[code]?.[studentId] || 0;

  const setRating = (subKey: string, code: string, studentId: string, value: number) => {
    setRatingData(prev => ({
      ...prev,
      [subKey]: {
        ...(prev[subKey] || {}),
        [code]: {
          ...((prev[subKey] || {})[code] || {}),
          [studentId]: value,
        },
      },
    }));
  };

  const save = async () => {
    setSaving(true);
    try {
      await setDoc(
        doc(db, "cce_outcomes", `${selectedClass}_${academicYear}_${activeSemester}`),
        { class: selectedClass, academicYear, semester: activeSemester, ratings: ratingData, updatedAt: new Date().toISOString() },
        { merge: true }
      );
      toast.success("नोंदी जतन झाल्या!");
      setEditingOutcome(null);
    } catch (err: any) {
      toast.error("जतन अयशस्वी: " + err.message);
    }
    setSaving(false);
  };

  const hasAnyRating = (subKey: string, code: string) =>
    students.some(s => getRating(subKey, code, s.id) > 0);

  const containerStyle = {
    fontFamily: "'Inter', 'Noto Sans Devanagari', sans-serif",
  };

  // ── OUTCOME DETAIL VIEW (student ratings) ──
  if (editingOutcome) {
    const { subjectKey, subjectLabel, code, text } = editingOutcome;
    return (
      <div
        className="bg-white text-slate-800 rounded-[2.5rem] border border-slate-200 shadow-xl min-h-[600px] flex flex-col relative select-none overflow-hidden"
        style={containerStyle}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 flex-shrink-0">
          <button
            onClick={() => setEditingOutcome(null)}
            className="text-slate-800 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <ArrowLeft className="size-5" />
          </button>
          <h2 className="text-base font-bold text-slate-800">
            {selectedClass} - {activeSemester === "sem1" ? "प्रथम सत्र" : "द्वितीय सत्र"}
          </h2>
        </div>

        {/* Outcome badge + description */}
        <div className="px-5 py-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-start gap-3">
            <div
              className="flex-shrink-0 px-2.5 py-1 rounded-lg text-[12px] font-bold mt-0.5 bg-blue-50 text-blue-600 border border-blue-150"
            >
              {code}
            </div>
            <p className="text-[13px] leading-relaxed text-slate-700 font-medium">{text}</p>
          </div>
        </div>

        {/* Student list with 1 2 3 rating */}
        <div className="flex-1 overflow-y-auto pb-24 px-4 py-3 space-y-3">
          {students.length === 0 ? (
            <div className="flex justify-center py-20 text-slate-400 text-sm">विद्यार्थी सापडले नाहीत</div>
          ) : students.map((student, idx) => {
            const rating = getRating(subjectKey, code, student.id);
            return (
              <div key={student.id} className="flex items-center justify-between py-1 border-b border-slate-50 pb-2">
                {/* Student number + name */}
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 border border-blue-100 font-bold text-sm flex items-center justify-center flex-shrink-0"
                  >
                    {idx + 1}
                  </div>
                  <span className="text-[14px] font-semibold text-slate-800">
                    {student.fullName || student.name || "-"}
                  </span>
                </div>

                {/* Rating pill: [ 1 | 2 | 3 | ● ] */}
                <div
                  className="flex items-center rounded-full overflow-hidden bg-slate-50 border border-slate-200"
                >
                  {[1, 2, 3, 4].map((level) => (
                    <button
                      key={level}
                      onClick={() => setRating(subjectKey, code, student.id, rating === level ? 0 : level)}
                      className={`w-9 h-9 flex items-center justify-center text-sm font-bold transition-all cursor-pointer ${
                        level === 4 ? "" : "border-r border-slate-200"
                      } ${
                        rating === level ? "bg-blue-600 text-white" : "bg-transparent text-slate-500 hover:bg-slate-100"
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Fixed save button */}
        <div className="absolute bottom-0 left-0 right-0 px-5 pb-5 pt-3 bg-gradient-to-t from-white via-white to-transparent">
          <button
            onClick={save}
            disabled={saving}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-extrabold text-sm rounded-2xl transition-all cursor-pointer shadow-lg disabled:opacity-50"
          >
            {saving ? "जतन होत आहे..." : "जतन करा"}
          </button>
        </div>
      </div>
    );
  }

  // ── SUBJECT LIST VIEW ──
  return (
    <div
      className="bg-white text-slate-800 rounded-[2.5rem] border border-slate-200 shadow-xl min-h-[600px] flex flex-col relative select-none overflow-hidden"
      style={containerStyle}
    >
      {/* Header */}
      <div className="flex items-center gap-4 px-5 py-4 border-b border-slate-100 flex-shrink-0">
        <button
          onClick={onBack}
          className="p-1.5 hover:bg-slate-100 rounded-full transition-colors cursor-pointer text-slate-800 flex items-center justify-center"
        >
          <ArrowLeft className="size-5" />
        </button>
        <h2 className="text-base font-bold tracking-tight text-slate-800">
          अध्ययन निष्पत्तीनिहाय प्रगती
        </h2>
      </div>

      {/* Semester tabs */}
      <div className="px-5 py-3 border-b border-slate-100 flex-shrink-0">
        <div className="flex bg-slate-100 border border-slate-200 rounded-xl p-1">
          {(["sem1", "sem2"] as Semester[]).map(sem => (
            <button
              key={sem}
              onClick={() => { setActiveSemester(sem); setExpandedSubject(null); }}
              className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all cursor-pointer ${
                activeSemester === sem
                  ? "bg-white text-blue-600 shadow-sm border border-slate-200/50"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {sem === "sem1" ? "प्रथम सत्र" : "द्वितीय सत्र"}
            </button>
          ))}
        </div>
      </div>

      {/* Subject accordion list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            <span className="text-xs text-slate-400 font-bold">लोड होत आहे...</span>
          </div>
        ) : SUBJECTS.map(subject => {
          const isOpen = expandedSubject === subject.key;
          const allOutcomes = OUTCOMES[subject.key] || [];
          const outcomes = allOutcomes.filter(o => {
            if (subject.key === "marathi") {
              return activeSemester === "sem1" ? o.code.startsWith("9.") : o.code.startsWith("10.");
            }
            if (subject.key === "english") {
              return activeSemester === "sem1" ? o.code.startsWith("9.") : o.code.startsWith("11.");
            }
            if (subject.key === "hindi") {
              return activeSemester === "sem1" ? o.code.startsWith("H.9") : o.code.startsWith("H.10");
            }
            if (subject.key === "math") {
              return true;
            }
            return true;
          });
          const ratedCount = outcomes.filter(o => hasAnyRating(subject.key, o.code)).length;

          return (
            <div key={subject.key}>
              {/* Subject header */}
              <button
                onClick={() => setExpandedSubject(isOpen ? null : subject.key)}
                className="w-full flex items-center justify-between px-5 py-4 cursor-pointer transition-colors hover:bg-slate-50 border-b border-slate-100"
              >
                <span className="text-[15px] font-semibold text-slate-800">{subject.label}</span>
                <div className="flex items-center gap-2">
                  {ratedCount > 0 && (
                    <span className="text-xs font-bold text-blue-600">{ratedCount}/{outcomes.length}</span>
                  )}
                  {isOpen
                    ? <ChevronUp className="size-5 text-slate-400" />
                    : <ChevronDown className="size-5 text-slate-400" />
                  }
                </div>
              </button>

              {/* Expanded: outcome rows */}
              {isOpen && outcomes.map(outcome => {
                const rated = hasAnyRating(subject.key, outcome.code);
                return (
                  <div
                    key={outcome.code}
                    className="flex items-start gap-3 px-4 py-3.5 border-b border-slate-50"
                  >
                    {/* Code badge */}
                    <div
                      className="flex-shrink-0 px-2 py-0.5 rounded-md text-[11px] font-bold mt-0.5 bg-blue-50 text-blue-600 border border-blue-100"
                      style={{
                        minWidth: "42px", textAlign: "center",
                      }}
                    >
                      {outcome.code}
                    </div>

                    {/* Description */}
                    <p className="flex-1 text-[13px] leading-snug text-slate-700 font-medium">
                      {outcome.text}
                    </p>

                    {/* Circle → click opens student detail */}
                    <button
                      onClick={() => setEditingOutcome({
                        subjectKey: subject.key,
                        subjectLabel: subject.label,
                        code: outcome.code,
                        text: outcome.text,
                      })}
                      className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer active:scale-90 mt-0.5 ${
                        rated 
                          ? "bg-emerald-500 text-white" 
                          : "border-2 border-slate-300 bg-transparent hover:border-blue-500"
                      }`}
                    >
                      {rated && (
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
