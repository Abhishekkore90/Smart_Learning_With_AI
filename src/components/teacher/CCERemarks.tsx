import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { ArrowLeft, ChevronDown, ChevronUp, X } from "lucide-react";
import { toast } from "sonner";

interface Student { id: string; fullName?: string; name?: string; rollNo?: string; [key: string]: any; }
type Semester = "sem1" | "sem2";

const adjustRemarkGender = (remark: string, gender?: string): string => {
  if (!gender || gender.toLowerCase() !== "female") return remark;
  return remark.replace(/तो(?=[.\s,!]|$)/g, "ते");
};

// Subjects and preset remark suggestions
const REMARK_SUBJECTS = [
  {
    key: "prathambhasha",
    label: "प्रथम भाषा : मराठी",
    suggestions: [
      "प्रकटवाचन प्रभावीपणे करतो.",
      "प्रकटवाचन प्रभावीपणे करत नाही.",
      "अचूक अनुलेखन करतो.",
      "अचूक अनुलेखन करत नाही.",
      "स्वाध्याय अचूक सोडवितो.",
      "स्वाध्याय अचूक सोडवित नाही.",
      "लेखनात विरामचिन्हांचा योग्य वापर करतो.",
      "लेखनात विरामचिन्हांचा योग्य वापर करत नाही.",
      "वाक्यप्रचार व म्हणीचा अर्थ सांगून वाक्यात उपयोग करतो.",
      "वाक्यप्रचार व म्हणीचा अर्थ सांगून वाक्यात उपयोग करत नाही.",
      "दिलेल्या वेळेत प्रकटवाचन, मुकवाचन करतो.",
      "दिलेल्या वेळेत प्रकटवाचन, मुकवाचन करत नाही.",
      "शब्दलेखन लिहितो.",
      "शब्दलेखन लिहीत नाही.",
      "स्वतःहून प्रश्न विचारतो.",
      "स्वतःहून प्रश्न विचारत नाही.",
      "उत्साही असतो.",
      "उत्साही नसतो.",
      "स्वयंअध्ययन करतो.",
      "स्वयंअध्ययन करत नाही.",
      "विचार, अनुभव, भावना स्पष्ट शब्दात व्यक्त करतो.",
      "विचार, अनुभव, भावना स्पष्ट शब्दात व्यक्त करत नाही.",
      "अचूक उत्तरे देतो.",
      "अचूक उत्तरे देत नाही.",
      "व्याकरणानुसार भाषेचा वापर करतो.",
      "व्याकरणानुसार भाषेचा वापर करत नाही.",
      "ऐकलेल्या मजकुरातील आशय स्वतःच्या शब्दात सांगतो.",
      "ऐकलेल्या मजकुरातील आशय स्वतःच्या शब्दात सांगत नाही.",
      "बोलताना शब्दाचा स्पष्ट उच्चार करतो.",
      "बोलताना शब्दाचा स्पष्ट उच्चार करत नाही.",
      "कोणतीही गोष्ट लक्षपूर्वक ऐकतो.",
      "कोणतीही गोष्ट लक्षपूर्वक ऐकत नाही.",
      "बोलीभाषा व प्रमाणभाषा यातील फरक जाणतो.",
      "बोलीभाषा व प्रमाणभाषा यातील फरक जाणत नाही.",
      "भाषण, संभाषण, संवाद, चर्चा एकाग्रतेने ऐकतो.",
      "भाषण, संभाषण, संवाद, चर्चा एकाग्रतेने ऐकत नाही.",
      "बोधकथा, वर्तमानपत्रे, मासिके वाचतो व इतरांना माहिती सांगतो.",
      "बोधकथा, वर्तमानपत्रे, मासिके वाचत नाही किंवा इतरांना माहिती सांगत नाही.",
      "ऐकलेल्या, वाचलेल्या गोष्टीबाबत निष्कर्ष काढतो.",
      "ऐकलेल्या, वाचलेल्या गोष्टीबाबत निष्कर्ष काढत नाही.",
      "मजकूर वाचून प्रश्नाची योग्य उत्तरे देतो.",
      "मजकूर वाचून प्रश्नाची योग्य उत्तरे देत नाही.",
      "अडचणी, समस्या शिक्षकाकडे मांडतो.",
      "अडचणी, समस्या शिक्षकाकडे मांडत नाही.",
      "संग्रहवृत्ती जोपासतो.",
      "संग्रहवृत्ती जोपासत नाही.",
      "नियम, सूचना, शिस्त यांचे पालन करतो.",
      "नियम, सूचना, शिस्त यांचे पालन करत नाही.",
      "भाषेतील सौंदर्य लक्षात घेतो.",
      "भाषेतील सौंदर्य लक्षात घेत नाही.",
      "दिलेल्या विषयावर मुद्देसूद बोलतो.",
      "दिलेल्या विषयावर मुद्देसूद बोलत नाही.",
      "लक्षपूर्वक, एकाग्रतेने व समजपूर्वक मुकवाचन करतो.",
      "लक्षपूर्वक, एकाग्रतेने व समजपूर्वक मुकवाचन करत नाही.",
      "योग्य गतीने व आरोह अवरोहाने वाचन करतो.",
      "योग्य गतीने व आरोह अवरोहाने वाचन करत नाही.",
      "विविध विषयावरील चर्चेत भाग घेतो.",
      "विविध विषयावरील चर्चेत भाग घेत नाही.",
      "नाट्यभिनय प्रसंगानुरूप व व्यक्तिनुरूप करतो.",
      "नाट्यभिनय प्रसंगानुरूप व व्यक्तिनुरूप करत नाही.",
      "आत्मविश्वासापूर्वक बोलतो.",
      "आत्मविश्वासापूर्वक बोलत नाही.",
      "पाठातील शंका विचारतो.",
      "पाठातील शंका विचारत नाही.",
      "नाट्यातील संवाद साभिनय व व्यक्तिनुरूप करतो.",
      "नाट्यातील संवाद साभिनय व व्यक्तिनुरूप करत नाही.",
      "दैनंदिन व्यवहारात प्रमाणभाषेचा वापर करतो.",
      "दैनंदिन व्यवहारात प्रमाणभाषेचा वापर करत नाही.",
      "विविध बोलीभाषेतील नवीन शब्द समजून घेतो.",
      "विविध बोलीभाषेतील नवीन शब्द समजून घेत नाही.",
      "निबंध लेखनात आपल्या भाषेत विचार मांडतो.",
      "निबंध लेखनात आपल्या भाषेत विचार मांडत नाही.",
      "शब्द, वाक्यप्रचार, म्हणी, बोधवाक्ये यांचा लेखनात वापर करतो.",
      "शब्द, वाक्यप्रचार, म्हणी, बोधवाक्ये यांचा लेखनात वापर करत नाही.",
      "अवांतर वाचन करतो.",
      "अवांतर वाचन करत नाही.",
      "गोष्टी, कविता, लेख, वर्णन यांच्या स्वरूपाने लेखन करतो.",
      "गोष्टी, कविता, लेख, वर्णन यांच्या स्वरूपाने लेखन करत नाही.",
      "हस्ताक्षर सुंदर व वळणदार आहे.",
      "हस्ताक्षर सुंदर व वळणदार नाही.",
      "गृहपाठ व स्वाध्याय वेळेवर करतो.",
      "गृहपाठ व स्वाध्याय वेळेवर करत नाही.",
      "वाचनाची आवड दाखवतो.",
      "वाचनाची आवड दाखवत नाही.",
      "सुविचाराचा संग्रह करतो.",
      "सुविचाराचा संग्रह करत नाही.",
    ],
  },
  {
    key: "dvitiybhasha",
    label: "द्वितीय भाषा : इंग्रजी",
    suggestions: [
      "Reads effectively.",
      "Does not read effectively.",
      "Completes homework on time.",
      "Does not complete homework on time.",
      "Writes in English correctly and cleanly.",
      "Does not write in English correctly and cleanly.",
      "Writes correctly on one line.",
      "Cannot write correctly on one line.",
      "Reads poems with rhythm.",
      "Does not read poems with rhythm.",
      "Listens with concentration.",
      "Does not listen with concentration.",
      "Asks doubts independently.",
      "Does not ask doubts independently.",
      "Shows enthusiasm for English.",
      "Lacks enthusiasm for English.",
      "Engages in self-study.",
      "Does not engage in self-study.",
      "Speaks English fluently.",
      "Cannot speak English fluently.",
      "Understands English well.",
      "Does not understand English well.",
      "Answers questions correctly.",
      "Does not answer questions correctly.",
      "Reads aloud from the textbook clearly.",
      "Does not read aloud from the textbook clearly.",
      "Rearranges story events accurately.",
      "Cannot rearrange story events accurately.",
      "Enjoys and understands the rhythm of poems.",
      "Does not enjoy or understand the rhythm of poems.",
      "Responds appropriately in various contexts.",
      "Does not respond appropriately in various contexts.",
      "Identifies commonly used words.",
      "Cannot identify commonly used words.",
      "Reads and acts according to instructions.",
      "Does not follow instructions while reading.",
      "Reads dialogues with understanding.",
      "Does not read dialogues with understanding.",
      "Reads silently with comprehension.",
      "Does not read silently with comprehension.",
      "Recites poems and songs with enjoyment.",
      "Does not recite poems and songs with enjoyment.",
      "Solves activities with confidence.",
      "Lacks confidence in solving activities.",
      "Takes dictation of familiar words accurately.",
      "Does not take dictation of familiar words accurately.",
      "Reads English daily newspapers.",
      "Does not read English daily newspapers.",
      "Writes accurate answers to questions.",
      "Does not write accurate answers to questions.",
      "Participates actively in language games.",
      "Does not participate actively in language games.",
      "Copies letters and words correctly.",
      "Does not copy letters and words correctly.",
      "Builds a story using a given outline.",
      "Cannot build a story using a given outline.",
      "Understands and copies various writing formats.",
      "Does not understand or copy writing formats.",
      "Collects and writes idioms.",
      "Does not collect or write idioms.",
      "Creates and collects slogans.",
      "Does not create or collect slogans.",
      "Writes a diary about daily routines.",
      "Does not write a diary about daily routines.",
      "Describes objects and personalities in writing.",
      "Cannot describe objects and personalities in writing.",
      "Completes gapped dialogues accurately.",
      "Does not complete gapped dialogues accurately.",
      "Writes natural and meaningful dialogues.",
      "Does not write natural and meaningful dialogues.",
      "Frames questions for an interview.",
      "Does not frame questions for an interview.",
      "Writes precise compositions.",
      "Does not write precise compositions.",
      "Writes bio-data accurately.",
      "Does not write bio-data accurately.",
      "Listens to announcements and follows them.",
      "Does not listen to or follow announcements.",
      "Listens and responds appropriately.",
      "Does not listen or respond appropriately.",
      "Identifies stress, intonation, and question-tags while listening.",
      "Cannot identify stress, intonation, or question-tags while listening.",
      "Listens and writes words, phrases, and sentences accurately.",
      "Does not write words, phrases, or sentences accurately while listening.",
      "Listens and interprets poems effectively.",
      "Does not interpret poems effectively while listening.",
      "Listens attentively to gather specific information.",
      "Does not listen attentively to gather specific information.",
      "Listens and understands commentaries.",
      "Does not understand commentaries while listening.",
      "Listens and takes accurate notes.",
      "Does not take accurate notes while listening.",
      "Guesses appropriate pronunciation.",
      "Cannot guess appropriate pronunciation.",
      "Writes personal views on given problems.",
      "Does not write personal views on given problems.",
      "Translates sentences accurately between languages.",
      "Cannot translate sentences accurately.",
      "Uses one-word substitutes for longer expressions.",
      "Does not use one-word substitutes for longer expressions.",
      "Writes formal and informal letters in proper formats.",
      "Does not write letters in proper formats.",
      "Forms words using various word-building processes.",
      "Does not form words using various word-building processes.",
      "Listens to recorded speeches and identifies them.",
      "Cannot identify recorded speeches.",
      "Participates in role play, skits, and miming.",
      "Does not participate in role play, skits, or miming.",
      "Uses polite expressions, greetings, and farewells.",
      "Does not use polite expressions, greetings, or farewells.",
      "Frames sentences and writes speeches independently.",
      "Does not frame sentences or write speeches independently.",
      "Enjoys presenting jokes, riddles, and puzzles.",
      "Does not enjoy presenting jokes, riddles, or puzzles.",
      "Describes objects, pictures, and processes accurately.",
      "Cannot describe objects, pictures, or processes accurately.",
      "Frames questions to gather information.",
      "Does not frame questions to gather information.",
      "Reads silently to complete tasks.",
      "Does not read silently to complete tasks.",
      "Reads and performs roles in acting.",
      "Does not read or perform roles in acting.",
      "Reads dialogues according to assigned roles.",
      "Does not read dialogues according to assigned roles.",
      "Reads and answers questions accurately.",
      "Does not answer questions accurately after reading.",
      "Reads fluently and accurately during competitions.",
      "Does not read fluently or accurately during competitions.",
      "Reads famous speeches aloud with proper speed.",
      "Does not read famous speeches with proper speed.",
      "Gives clear directions for performing roles.",
      "Does not give clear directions for performing roles.",
      "Discusses problems and offers suggestions.",
      "Does not discuss problems or offer suggestions.",
    ],
  },
  {
    key: "ganit",
    label: "गणित",
    suggestions: [
      "संख्या वाचन अचूक करतो.",
      "संख्या वाचन अचूक करत नाही.",
      "गणितीय कोडी कुशलतेने सोडवितो.",
      "गणितीय कोडी सोडवित नाही.",
      "दैनंदिन जीवनात गणिताचा व्यावहारिक वापर करतो.",
      "दैनंदिन जीवनात गणिताचा व्यावहारिक वापर करत नाही.",
      "उदाहरणे गतीने व अचूक सोडवितो.",
      "उदाहरणे गतीने सोडवित नाही.",
      "तोंडी उदाहरणाचे अचूक उत्तर देतो.",
      "तोंडी उदाहरणाचे अचूक उत्तर देत नाही.",
      "स्वाध्याय पूर्ण व अचूक करतो.",
      "स्वाध्याय पूर्ण करत नाही.",
      "गणिताच्या अभ्यासात लक्षपूर्वक भाग घेतो.",
      "गणिताच्या अभ्यासात लक्ष देत नाही.",
      "स्वतःहून गणितीय प्रश्न विचारतो.",
      "स्वतःहून गणितीय प्रश्न विचारत नाही.",
      "गणिताच्या अभ्यासात उत्साही असतो.",
      "गणिताच्या अभ्यासात उत्साही नसतो.",
      "स्वयंअध्ययनाद्वारे गणित शिकतो.",
      "स्वयंअध्ययन करत नाही.",
      "गणितीय क्रिया अचूक व जलद करतो.",
      "गणितीय क्रिया अचूक करत नाही.",
      "विविध गणितीय संकल्पनांचे अर्थ अचूक सांगतो.",
      "विविध गणितीय संकल्पनांचे अर्थ अचूक सांगत नाही.",
      "लहान-मोठ्या संख्या व त्यांचा क्रम ओळखतो.",
      "लहान-मोठ्या संख्या व त्यांचा क्रम ओळखत नाही.",
      "संख्या अक्षरी व अंकी रूपात लिहितो.",
      "संख्या अक्षरी व अंकी रूपात लिहीत नाही.",
      "बेरीज, वजाबाकी, गुणाकार, भागाकार क्रिया समजून घेतो.",
      "बेरीज, वजाबाकी, गुणाकार, भागाकार क्रिया समजून घेत नाही.",
      "संख्यारेषेवरील अंकाची किंमत अचूक सांगतो.",
      "संख्यारेषेवरील अंकाची किंमत अचूक सांगत नाही.",
      "विविध भौमितिक आकृत्या व संबोध समजून घेतो.",
      "विविध भौमितिक आकृत्या व संबोध समजून घेत नाही.",
      "पाढे पटकावून पाठांतर करतो.",
      "पाढे पटकावून पाठांतर करत नाही.",
      "सूत्रे वापरून उदाहरणे सोडवितो.",
      "सूत्रे वापरून उदाहरणे सोडवित नाही.",
      "भौमितिक आकृत्याची परिमिती व क्षेत्रफळ अचूक काढतो.",
      "भौमितिक आकृत्याची परिमिती व क्षेत्रफळ अचूक काढत नाही.",
      "विविध भौमितिक रचना प्रमाणबद्ध काढतो.",
      "विविध भौमितिक रचना प्रमाणबद्ध काढत नाही.",
      "भौमितिक आकृत्याचे गुणधर्म अचूक सांगतो.",
      "भौमितिक आकृत्याचे गुणधर्म अचूक सांगत नाही.",
      "गणितीय चिन्हे व सूत्रे ओळखतो.",
      "गणितीय चिन्हे व सूत्रे ओळखत नाही.",
      "सांख्यिकीय माहितीचे अर्थविवेचन करतो.",
      "सांख्यिकीय माहितीचे अर्थविवेचन करत नाही.",
      "आलेख व सारणीचे वाचन व विश्लेषण करतो.",
      "आलेख व सारणीचे वाचन व विश्लेषण करत नाही.",
      "विविध परिमाणे व एकके समजून घेतो.",
      "विविध परिमाणे व एकके समजून घेत नाही.",
      "परिमाण रूपांतर अचूक करतो.",
      "परिमाण रूपांतर अचूक करत नाही.",
      "संख्यातील अंकाची स्थानिक किंमत सांगतो.",
      "संख्यातील अंकाची स्थानिक किंमत सांगत नाही.",
      "सोपी समीकरणे सोडवितो.",
      "सोपी समीकरणे सोडवित नाही.",
      "थोर गणितज्ञांची माहिती मिळवितो.",
      "थोर गणितज्ञांची माहिती मिळवित नाही.",
    ],
  },
  {
    key: "kala",
    label: "कला",
    suggestions: [
      "चित्रकलेत प्रमाणबद्ध आणि अचूक रेखाटन करतो.",
      "चित्रकलेत प्रमाणबद्ध आणि अचूक रेखाटन करत नाही.",
      "विविध रंगमाध्यमे (जसे की जलरंग, तैलरंग, पेन्सिल शेडिंग) प्रभावीपणे वापरतो.",
      "विविध रंगमाध्यमांचा प्रभावीपणे वापर करत नाही.",
      "रंगसंगती आणि छटा यांचा सुसंवादी वापर करतो.",
      "रंगसंगती आणि छटा यांचा सुसंवादी वापर करत नाही.",
      "वेगवेगळ्या ब्रश तंत्रांचा वापर करून वैविध्य दाखवतो.",
      "वेगवेगळ्या ब्रश तंत्रांचा वापर करून वैविध्य दाखवत नाही.",
      "भौमितिक आणि मुक्तहस्त रेखाटनात निपुणता दाखवतो.",
      "भौमितिक आणि मुक्तहस्त रेखाटनात निपुणता दाखवत नाही.",
      "तपशीलांकडे लक्ष देऊन अचूक आणि सुबक चित्रे काढतो.",
      "तपशीलांकडे लक्ष न देता अचूक आणि सुबक चित्रे काढत नाही.",
      "मौलिक आणि सर्जनशील कल्पना चित्रांमध्ये व्यक्त करतो.",
      "मौलिक आणि सर्जनशील कल्पना चित्रांमध्ये व्यक्त करत नाही.",
      "कलाकृतीत वैयक्तिक शैली आणि दृष्टीकोण दाखवतो.",
      "कलाकृतीत वैयक्तिक शैली आणि दृष्टीकोण दाखवत नाही.",
      "दैनंदिन जीवनातील प्रेरणांचा उपयोग चित्रकलेत करतो.",
      "दैनंदिन जीवनातील प्रेरणांचा उपयोग चित्रकलेत करत नाही.",
      "नावीन्यपूर्ण रचना आणि थीम्सचा वापर करतो.",
      "नावीन्यपूर्ण रचना आणि थीम्सचा वापर करत नाही.",
      "प्रयोगशील दृष्टिकोन ठेवून नवीन चित्रकला तंत्रे शिकतो.",
      "प्रयोगशील दृष्टिकोन ठेवत नाही किंवा नवीन चित्रकला तंत्रे शिकत नाही.",
      "कल्पनाशक्तीचा वापर करून कथात्मक चित्रे रेखाटतो.",
      "कल्पनाशक्तीचा वापर करून कथात्मक चित्रे रेखाटत नाही.",
      "चित्रांमधून भावना आणि संवेदना प्रभावीपणे व्यक्त करतो.",
      "चित्रांमधून भावना आणि संवेदना प्रभावीपणे व्यक्त करत नाही.",
      "सांस्कृतिक आणि सामाजिक मुद्द्यांवर आधारित चित्रे तयार करतो.",
      "सांस्कृतिक आणि सामाजिक मुद्द्यांवर आधारित चित्रे तयार करत नाही.",
      "निसर्ग आणि पर्यावरणाविषयी संवेदनशीलता चित्रांमधून दाखवतो.",
      "निसर्ग आणि पर्यावरणाविषयी संवेदनशीलता चित्रांमधून दाखवत नाही.",
      "चित्रांमधून वैयक्तिक अनुभव आणि विचार मांडतो.",
      "चित्रांमधून वैयक्तिक अनुभव आणि विचार मांडत नाही.",
      "परंपरागत आणि आधुनिक चित्रकलेतील फरक समजून घेतो.",
      "परंपरागत आणि आधुनिक चित्रकलेतील फरक समजून घेत नाही.",
      "स्वतःच्या चित्रांचे विश्लेषण करून सुधारणा करतो.",
      "स्वतःच्या चित्रांचे विश्लेषण करत नाही किंवा सुधारणा करत नाही.",
      "इतरांच्या चित्रांची प्रशंसा करतो आणि रचनात्मक अभिप्राय देतो.",
      "इतरांच्या चित्रांची प्रशंसा करत नाही किंवा रचनात्मक अभिप्राय देत नाही.",
      "चित्रकलेतील इतिहासातील विविध शैली आणि चळवळी समजून घेतो.",
      "चित्रकलेतील इतिहासातील विविध शैली आणि चळवळी समजून घेत नाही.",
      "चित्रांच्या मागील संदर्भ आणि अर्थ शोधतो.",
      "चित्रांच्या मागील संदर्भ आणि अर्थ शोधत नाही.",
      "आपल्या चित्रकला प्रक्रियेबद्दल विचारमंथन करतो.",
      "आपल्या चित्रकला प्रक्रियेबद्दल विचारमंथन करत नाही.",
      "गटातील चित्रकला प्रकल्पांमध्ये सक्रिय सहभाग घेतो.",
      "गटातील चित्रकला प्रकल्पांमध्ये सक्रिय सहभाग घेत नाही.",
      "इतर विद्यार्थ्यांसोबत चित्रकलेच्या कल्पना सामायिक करतो.",
      "इतर विद्यार्थ्यांसोबत चित्रकलेच्या कल्पना सामायिक करत नाही.",
      "शालेय चित्रप्रदर्शन आणि स्पर्धांमध्ये उत्साहाने सहभाग घेतो.",
      "शालेय चित्रप्रदर्शन आणि स्पर्धांमध्ये सहभाग घेत नाही.",
      "वर्ग सजावटीसाठी चित्रकलेच्या माध्यमातून योगदान देतो.",
      "वर्ग सजावटीसाठी चित्रकलेच्या माध्यमातून योगदान देत नाही.",
      "चित्रकलेच्या माध्यमातून सामाजिक एकता दाखवतो.",
      "चित्रकलेच्या माध्यमातून सामाजिक एकता दाखवत नाही.",
      "चित्रकले विषयी उत्साह आणि प्रेम दाखवतो.",
      "चित्रकले विषयी उत्साह आणि प्रेम दाखवत नाही.",
      "नवीन चित्रकला प्रकार आणि तंत्रे शिकण्याची उत्सुकता ठेवतो.",
      "नवीन चित्रकला प्रकार आणि तंत्रे शिकण्याची उत्सुकता ठेवत नाही.",
      "चित्रे तयार करताना संयम आणि चिकाटी दाखवतो.",
      "चित्रे तयार करताना संयम आणि चिकाटी दाखवत नाही.",
      "चित्रकलेच्या माध्यमातून आत्मविश्वास व्यक्त करतो.",
      "चित्रकलेच्या माध्यमातून आत्मविश्वास व्यक्त करत नाही.",
      "इतर चित्रकारांच्या कामातून प्रेरणा घेतो.",
      "इतर चित्रकारांच्या कामातून प्रेरणा घेत नाही.",
      "चित्रकलेला गणित, विज्ञान, इतिहास यांसारख्या विषयांशी जोडतो.",
      "चित्रकलेला गणित, विज्ञान, इतिहास यांसारख्या विषयांशी जोडत नाही.",
      "तंत्रज्ञानाचा उपयोग करून डिजिटल चित्रकला तयार करतो.",
      "तंत्रज्ञानाचा उपयोग करून डिजिटल चित्रकला तयार करत नाही.",
      "चित्रकलेचा उपयोग सामाजिक संदेश प्रसारासाठी करतो.",
      "चित्रकलेचा उपयोग सामाजिक संदेश प्रसारासाठी करत नाही.",
      "दैनंदिन जीवनात चित्रकलेला व्यावहारिक उपयोगात आणतो.",
      "दैनंदिन जीवनात चित्रकलेला व्यावहारिक उपयोगात आणत नाही.",
    ],
  },
  {
    key: "karyanubhav",
    label: "कार्यानुभव",
    suggestions: [
      "विविध साधने आणि साहित्याचा कुशलतेने वापर करतो.",
      "विविध साधने आणि साहित्याचा कुशलतेने वापर करत नाही.",
      "वस्तू तयार करताना अचूकता आणि सुबकपणा दाखवतो.",
      "वस्तू तयार करताना अचूकता आणि सुबकपणा दाखवत नाही.",
      "कागद, लाकूड, माती यांसारख्या विविध साहित्यांसह तंत्रात निपुणता दाखवतो.",
      "कागद, लाकूड, माती यांसारख्या विविध साहित्यांसह तंत्रात निपुणता दाखवत नाही.",
      "साहित्य जोडण्यासाठी, आकार देण्यासाठी योग्य पद्धती वापरतो.",
      "साहित्य जोडण्यासाठी, आकार देण्यासाठी योग्य पद्धती वापरत नाही.",
      "साधने आणि उपकरणे वापरताना सुरक्षितता राखतो.",
      "साधने आणि उपकरणे वापरताना सुरक्षितता राखत नाही.",
      "मौलिक आणि नावीन्यपूर्ण हस्तकला डिझाइन्स तयार करतो.",
      "मौलिक आणि नावीन्यपूर्ण हस्तकला डिझाइन्स तयार करत नाही.",
      "हस्तकलेत वैयक्तिक शैली समाविष्ट करतो.",
      "हस्तकलेत वैयक्तिक शैली समाविष्ट करत नाही.",
      "दैनंदिन जीवन किंवा सांस्कृतिक परंपरांमधून प्रेरणा घेऊन हस्तकला तयार करतो.",
      "दैनंदिन जीवन किंवा सांस्कृतिक परंपरांमधून प्रेरणा घेऊन हस्तकला तयार करत नाही.",
      "नवीन साहित्य किंवा तंत्रांचा प्रयोग करून हस्तकला प्रकल्प सुधारतो.",
      "नवीन साहित्य किंवा तंत्रांचा प्रयोग करून हस्तकला प्रकल्प सुधारत नाही.",
      "उपयुक्त आणि सौंदर्यपूर्ण हस्तकला वस्तू डिझाइन करतो.",
      "उपयुक्त आणि सौंदर्यपूर्ण हस्तकला वस्तू डिझाइन करत नाही.",
      "हस्तकला प्रक्रियेदरम्यान आव्हाने ओळखून निराकरण करतो.",
      "हस्तकला प्रक्रियेदरम्यान आव्हाने ओळखत नाही किंवा निराकरण करत नाही.",
      "मर्यादांवर मात करण्यासाठी तंत्र किंवा साहित्य सर्जनशीलपणे बदलतो.",
      "मर्यादांवर मात करण्यासाठी तंत्र किंवा साहित्य सर्जनशीलपणे बदलत नाही.",
      "हस्तकला वस्तूंची कार्यक्षमता and डिझाइन सुधारण्यासाठी विश्लेषण करतो.",
      "हस्तकला वस्तूंची कार्यक्षमता and डिझाइन सुधारण्यासाठी विश्लेषण करत नाही.",
      "हस्तकला प्रकल्पाची आखणी आणि नियोजन प्रभावीपणे करतो.",
      "हस्तकला प्रकल्पाची आखणी आणि नियोजन प्रभावीपणे करत नाही.",
      "पुढील काम सुधारण्यासाठी हस्तकला प्रक्रियेचा विचार करतो.",
      "पुढील काम सुधारण्यासाठी हस्तकला प्रक्रियेचा विचार करत नाही.",
      "गटातील हस्तकला प्रकल्पांमध्ये सक्रिय सहभाग घेतो.",
      "गटातील हस्तकला प्रकल्पांमध्ये सक्रिय सहभाग घेत नाही.",
      "हस्तकला उपक्रमांदरम्यान सहपाठ्यांसोबत कल्पना, साधने आणि साहित्य सामायिक करतो.",
      "हस्तकला उपक्रमांदरम्यान सहपाठ्यांसोबत कल्पना, साधने आणि साहित्य सामायिक करत नाही.",
      "शालेय कार्यक्रम किंवा प्रदर्शनांमध्ये हस्तकला वस्तूंचे प्रदर्शन करतो.",
      "शालेय कार्यक्रम किंवा प्रदर्शनांमध्ये हस्तकला वस्तूंचे प्रदर्शन करत नाही.",
      "हस्तकला-संबंधित कार्यात सहकार्य आणि परस्पर सहाय्य दाखवतो.",
      "हस्तकला-संबंधित कार्यात सहकार्य आणि परस्पर सहाय्य दाखवत नाही.",
      "हस्तकलेतून सामाजिक किंवा पर्यावरणीय संदेश व्यक्त करतो.",
      "हस्तकलेतून सामाजिक किंवा पर्यावरणीय संदेश व्यक्त करत नाही.",
      "हस्तकला उपक्रमांबाबत उत्साह आणि प्रेम दाखवतो.",
      "हस्तकला उपक्रमांबाबत उत्साह आणि प्रेम दाखवत नाही.",
      "तपशीलपूर्ण हस्तकलेत संयम आणि चिकाटी दाखवतो.",
      "तपशीलपूर्ण हस्तकलेत संयम आणि चिकाटी दाखवत नाही.",
      "हस्तकला प्रकल्पांदरम्यान सकारात्मक आणि आदरपूर्ण वृत्ती ठेवतो.",
      "हस्तकला प्रकल्पांदरम्यान सकारात्मक आणि आदरपूर्ण वृत्ती ठेवत नाही.",
      "नवीन हस्तकला तंत्रे किंवा कौशल्ये शिकण्याचा पुढाकार घेतो.",
      "नवीन हस्तकला तंत्रे किंवा कौशल्ये शिकण्याचा पुढाकार घेत नाही.",
      "हस्तकला वस्तूंचे सादरीकरण करताना आत्मविश्वास दाखवतो.",
      "हस्तकला वस्तूंचे सादरीकरण करताना आत्मविश्वास दाखवत नाही.",
      "पर्यावरणपूरक किंवा पुनर्वापर साहित्याचा हस्तकलेत उपयोग करतो.",
      "पर्यावरणपूरक किंवा पुनर्वापर साहित्याचा हस्तकलेत उपयोग करत नाही.",
      "हस्तकला डिझाइन्समध्ये सांस्कृतिक किंवा पारंपरिक घटक समाविष्ट करतो.",
      "हस्तकला डिझाइन्समध्ये सांस्कृतिक किंवा पारंपरिक घटक समाविष्ट करत नाही.",
      "हस्तकला उपक्रमांदरम्यान स्वच्छ आणि व्यवस्थित कार्यक्षेत्र ठेवतो.",
      "हस्तकला उपक्रमांदरम्यान स्वच्छ आणि व्यवस्थित कार्यक्षेत्र ठेवत नाही.",
    ],
  },
  {
    key: "sharirik",
    label: "शारीरिक शिक्षण",
    suggestions: [
      "शारीरिक तंदुरुस्त आहे.",
      "खेळात सक्रिय सहभाग.",
      "संघ भावनेने खेळतो.",
      "क्रीडा स्पर्धेत यश मिळवतो.",
    ],
  },
  {
    key: "visheshpragati",
    label: "विशेष प्रगती",
    suggestions: [
      "सर्वांगीण विकास होत आहे.",
      "प्रगती समाधानकारक आहे.",
      "अभ्यासात सातत्य ठेवतो.",
    ],
  },
  {
    key: "aavad",
    label: "आवड / छंद",
    suggestions: [
      "वाचनाची आवड आहे.",
      "चित्रकला आवडते.",
      "गाणे म्हणण्याची आवड.",
      "खेळांमध्ये रस आहे.",
    ],
  },
  {
    key: "sudharna",
    label: "सुधारणा आवश्यक",
    suggestions: [
      "नियमित अभ्यास आवश्यक.",
      "लेखनात सुधारणा हवी.",
      "लक्ष केंद्रित करणे आवश्यक.",
      "गृहपाठ वेळेत पूर्ण करावा.",
    ],
  },
  {
    key: "vyaktimatva",
    label: "व्यक्तिमत्व गुणविशेष",
    suggestions: [
      "शिस्तप्रिय विद्यार्थी.",
      "मिलनसार स्वभाव.",
      "नेतृत्वगुण दिसतात.",
      "आत्मविश्वासपूर्ण आहे.",
      "इतरांना मदत करतो.",
    ],
  },
];

// Student remarks data structure: { [subjectKey]: string[] }
type StudentRemarks = Record<string, string[]>;

export function CCERemarks({ selectedClass, academicYear, onBack }: { selectedClass: string; academicYear: string; onBack: () => void }) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSemester, setActiveSemester] = useState<Semester>("sem1");
  const [allRemarks, setAllRemarks] = useState<Record<string, StudentRemarks>>({});
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  // Per-student editor state
  const [studentRemarks, setStudentRemarks] = useState<StudentRemarks>({});
  const [expandedSubject, setExpandedSubject] = useState<string | null>(REMARK_SUBJECTS[0].key);
  const [writeMode, setWriteMode] = useState<string | null>(null); // subjectKey for custom write
  const [writeText, setWriteText] = useState("");

  useEffect(() => {
    const q = query(collection(db, "users"), where("role", "==", "student"), where("class", "==", selectedClass));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Student[];
      setStudents(data.sort((a, b) => parseInt(a.rollNo || "999") - parseInt(b.rollNo || "999")));
    });
    return () => unsub();
  }, [selectedClass]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const ref = doc(db, "cce_remarks_v2", `${selectedClass}_${academicYear}_${activeSemester}`);
        const snap = await getDoc(ref);
        setAllRemarks(snap.exists() ? snap.data().records || {} : {});
      } catch { /* ignore */ }
      setLoading(false);
    };
    load();
  }, [selectedClass, academicYear, activeSemester]);

  const openStudent = async (student: Student) => {
    setEditingStudent(student);
    setStudentRemarks(allRemarks[student.id] || {});
    setExpandedSubject(REMARK_SUBJECTS[0].key);
    setWriteMode(null);
    setWriteText("");
  };

  const removeRemark = (subKey: string, text: string) => {
    setStudentRemarks(prev => ({
      ...prev,
      [subKey]: (prev[subKey] || []).filter(r => r !== text),
    }));
  };

  const addRemark = (subKey: string, text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setStudentRemarks(prev => ({
      ...prev,
      [subKey]: [...new Set([...(prev[subKey] || []), trimmed])],
    }));
  };

  const toggleSuggestion = (subKey: string, text: string) => {
    const existing = studentRemarks[subKey] || [];
    if (existing.includes(text)) {
      removeRemark(subKey, text);
    } else {
      addRemark(subKey, text);
    }
  };

  const saveStudentRemarks = async () => {
    if (!editingStudent) return;
    setSaving(true);
    try {
      const updated = { ...allRemarks, [editingStudent.id]: studentRemarks };
      const ref = doc(db, "cce_remarks_v2", `${selectedClass}_${academicYear}_${activeSemester}`);
      await setDoc(ref, {
        class: selectedClass, academicYear, semester: activeSemester,
        records: updated, updatedAt: new Date().toISOString(),
      }, { merge: true });
      setAllRemarks(updated);
      toast.success("नोंदी जतन झाल्या!");
      setEditingStudent(null);
    } catch (err: any) {
      toast.error("जतन अयशस्वी: " + err.message);
    }
    setSaving(false);
  };

  // ── STUDENT REMARK EDITOR ──
  if (editingStudent) {
    return (
      <div
        className="text-slate-800 rounded-[2.5rem] border shadow-xl min-h-[600px] flex flex-col relative select-none overflow-hidden bg-white border-slate-200"
        style={{
          fontFamily: "'Inter', 'Noto Sans Devanagari', sans-serif",
        }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 flex-shrink-0 border-b border-slate-100">
          <button
            onClick={() => setEditingStudent(null)}
            className="transition-colors cursor-pointer text-slate-850 hover:text-slate-600"
          >
            <ArrowLeft className="size-5" />
          </button>
          <h2 className="text-base font-bold text-slate-800">वर्णनात्मक नोंदी</h2>
        </div>

        {/* Student Information Banner */}
        <div className="flex items-center gap-3 px-5 py-3 flex-shrink-0 border-b border-slate-100 bg-slate-50/50">
          <div className="w-8 h-8 rounded-full font-bold text-sm flex items-center justify-center border border-blue-100 bg-blue-50 text-blue-600 flex-shrink-0">
            {editingStudent.rollNo || students.indexOf(editingStudent) + 1}
          </div>
          <span className="text-[14px] font-semibold text-slate-800 flex-1">
            {editingStudent.fullName || editingStudent.name || "-"}
          </span>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto pb-24 px-4 py-3 space-y-1">
          {REMARK_SUBJECTS.map((sub) => {
            const remarks = studentRemarks[sub.key] || [];
            const isExpanded = expandedSubject === sub.key;

            return (
              <div key={sub.key} className="border-b border-slate-100">
                {/* Subject accordion header */}
                <button
                  onClick={() => { setExpandedSubject(isExpanded ? null : sub.key); setWriteMode(null); setWriteText(""); }}
                  className="w-full flex items-center justify-between py-4 px-1 cursor-pointer"
                >
                  <span
                    className={`text-[15px] font-bold ${isExpanded ? "text-blue-600" : "text-slate-700 hover:text-blue-600"}`}
                  >
                    {sub.label}
                  </span>
                  <div className="flex items-center gap-2">
                    {remarks.length > 0 && (
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center bg-blue-50 border border-blue-100"
                      >
                        <span className="text-xs font-bold text-blue-600">
                          {remarks.length}
                        </span>
                      </div>
                    )}
                    {isExpanded
                      ? <ChevronUp className="size-4 text-slate-400" />
                      : <ChevronDown className="size-4 text-slate-400" />
                    }
                  </div>
                </button>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="pb-4 space-y-3">
                    {/* Selected remarks as chips */}
                    {remarks.map((remark) => (
                      <div
                        key={remark}
                        className="flex items-center justify-between rounded-xl px-4 py-3 bg-slate-50 border border-slate-150 text-slate-800 shadow-sm"
                      >
                        <span className="text-sm font-medium flex-1 pr-2 text-slate-800">
                          {remark}
                        </span>
                        <button
                          onClick={() => removeRemark(sub.key, remark)}
                          className="transition-colors cursor-pointer flex-shrink-0 text-slate-400 hover:text-slate-650"
                        >
                          <X className="size-4" />
                        </button>
                      </div>
                    ))}

                    {/* Write mode: custom text input */}
                    {writeMode === sub.key && (
                      <div className="space-y-2">
                        <textarea
                          value={writeText}
                          onChange={(e) => setWriteText(e.target.value)}
                          placeholder="नोंद लिहा..."
                          rows={3}
                          className="w-full px-4 py-3 rounded-xl text-sm font-medium resize-none outline-none transition-all bg-slate-50 border border-slate-200 text-slate-850 focus:border-blue-500 focus:bg-white"
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => { addRemark(sub.key, writeText); setWriteText(""); setWriteMode(null); }}
                            className="flex-1 py-2.5 font-bold text-xs rounded-xl cursor-pointer transition-colors bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            जोडा
                          </button>
                          <button
                            onClick={() => { setWriteMode(null); setWriteText(""); }}
                            className="flex-1 py-2.5 font-bold text-xs rounded-xl cursor-pointer transition-colors bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
                          >
                            रद्द करा
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Suggestions list */}
                    {writeMode !== sub.key && (
                      <div className="space-y-1">
                        {sub.suggestions.map((s) => {
                          const adjustedS = adjustRemarkGender(s, editingStudent?.gender);
                          const selected = (studentRemarks[sub.key] || []).includes(adjustedS);
                          return (
                            <button
                              key={s}
                              onClick={() => toggleSuggestion(sub.key, adjustedS)}
                              className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer border ${
                                selected 
                                  ? "bg-blue-50 border-blue-200 text-blue-600 font-bold" 
                                  : "bg-transparent border-slate-150 text-slate-600 hover:bg-slate-50"
                              }`}
                            >
                              {adjustedS}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* निवडा / लिहा buttons */}
                    {writeMode !== sub.key && (
                      <div className="flex gap-3 pt-1">
                        <button
                          onClick={() => setExpandedSubject(sub.key)}
                          className="flex-1 py-3 font-bold text-sm rounded-2xl cursor-pointer transition-colors bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
                        >
                          निवडा
                        </button>
                        <button
                          onClick={() => { setWriteMode(sub.key); setWriteText(""); }}
                          className="flex-1 py-3 font-bold text-sm rounded-2xl cursor-pointer transition-colors bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
                        >
                          लिहा
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Fixed Save button */}
        <div
          className="absolute bottom-0 left-0 right-0 px-5 pb-5 pt-3 bg-gradient-to-t from-white via-white to-transparent"
        >
          <button
            onClick={saveStudentRemarks}
            disabled={saving}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-extrabold text-sm rounded-2xl transition-all cursor-pointer shadow-lg disabled:opacity-50"
          >
            {saving ? "जतन होत आहे..." : "Save"}
          </button>
        </div>
      </div>
    );
  }

  // ── LIST VIEW ──
  return (
    <div
      className="text-slate-800 rounded-[2.5rem] border shadow-xl min-h-[600px] flex flex-col relative select-none bg-white border-slate-200"
      style={{
        fontFamily: "'Inter', 'Noto Sans Devanagari', sans-serif",
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-4 px-5 py-4 border-b border-slate-100">
        <button
          onClick={onBack}
          className="p-1.5 rounded-full transition-colors cursor-pointer flex items-center justify-center text-slate-850 hover:bg-slate-100"
        >
          <ArrowLeft className="size-5" />
        </button>
        <h2 className="text-lg font-bold tracking-tight text-slate-800">
          वर्णनात्मक नोंदी
        </h2>
      </div>

      {/* Semester Tabs */}
      <div className="px-5 py-3 border-b border-slate-100">
        <div className="flex bg-slate-100 border border-slate-200 rounded-xl p-1">
          {(["sem1", "sem2"] as Semester[]).map((sem) => (
            <button
              key={sem}
              onClick={() => setActiveSemester(sem)}
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

      {/* Student List */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            <span className="text-xs font-bold text-slate-400">लोड होत आहे...</span>
          </div>
        ) : students.length === 0 ? (
          <div className="flex justify-center py-20 text-sm text-slate-400">
            विद्यार्थी सापडले नाहीत
          </div>
        ) : (
          <div className="space-y-0.5">
            {students.map((student, idx) => {
              const sr = allRemarks[student.id] || {};
              const totalCount = Object.values(sr).reduce((s, arr) => s + arr.length, 0);
              return (
                <div key={student.id}
                  onClick={() => openStudent(student)}
                  className="flex items-center justify-between px-2 py-3.5 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100 cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 border border-blue-100 font-bold text-sm flex items-center justify-center">{idx + 1}</div>
                    <span className="text-[15px] font-medium text-slate-800">{student.fullName || student.name || "-"}</span>
                  </div>
                  <div
                    className={`w-9 h-9 rounded-full border-2 flex items-center justify-center transition-all ${
                      totalCount > 0 
                        ? "border-emerald-500 bg-emerald-500 text-white" 
                        : "border-slate-300 bg-transparent"
                    }`}>
                    {totalCount > 0 && (
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
