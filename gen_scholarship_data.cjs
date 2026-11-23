const fs = require('fs');

const questionsData = [
  // भाग 1 : मराठी (1 - 10)
  {
    id: "sch4_m_1",
    question: "'सूर्य' या शब्दाचा समानार्थी शब्द कोणता?",
    options: ["चंद्र", "रवी", "तारा", "शशी"],
    correctIndex: 1,
    explanation: "'सूर्य' या शब्दाचा समानार्थी शब्द 'रवी' आहे.",
    marks: 1
  },
  {
    id: "sch4_m_2",
    question: "'उंच' या शब्दाचा विरुद्धार्थी शब्द कोणता?",
    options: ["लांब", "मोठा", "ठेंगणा", "रुंद"],
    correctIndex: 2,
    explanation: "'उंच' या शब्दाचा विरुद्धार्थी शब्द 'ठेंगणा' आहे.",
    marks: 1
  },
  {
    id: "sch4_m_3",
    question: "खालीलपैकी अचूक लिहिलेला शब्द ओळखा.",
    options: ["विद्यार्थि", "विद्यार्थी", "वीद्यार्थी", "विदयार्थी"],
    correctIndex: 1,
    explanation: "'विद्यार्थी' हा शुद्ध शब्द आहे.",
    marks: 1
  },
  {
    id: "sch4_m_4",
    question: "'मुलगा शाळेत जातो.' या वाक्यातील क्रियापद कोणते?",
    options: ["मुलगा", "शाळेत", "जातो", "शाळा"],
    correctIndex: 2,
    explanation: "वाक्याचा अर्थ पूर्ण करणारा क्रियावाचक शब्द 'जातो' हे क्रियापद आहे.",
    marks: 1
  },
  {
    id: "sch4_m_5",
    question: "'डोळ्यांत तेल घालून राहणे' या वाक्प्रचाराचा अर्थ कोणता?",
    options: ["डोळे दुखणे", "अतिशय सावधपणे लक्ष ठेवणे", "रडू येणे", "झोप लागणे"],
    correctIndex: 1,
    explanation: "'डोळ्यांत तेल घालून राहणे' म्हणजे अतिशय सतर्क व सावधपणे लक्ष ठेवणे.",
    marks: 1
  },
  {
    id: "sch4_m_6",
    question: "'घोडा' या शब्दाचे स्त्रीलिंगी रूप कोणते?",
    options: ["घोडी", "घोडे", "घोडीण", "घोड्या"],
    correctIndex: 0,
    explanation: "'घोडा' या शब्दाचे स्त्रीलिंगी रूप 'घोडी' आहे.",
    marks: 1
  },
  {
    id: "sch4_m_7",
    question: "'नदी' या शब्दाचे अनेकवचन कोणते?",
    options: ["नदी", "नद्या", "नदीया", "नद्यां"],
    correctIndex: 1,
    explanation: "'नदी' या नामाचे अनेकवचन 'नद्या' होते.",
    marks: 1
  },
  {
    id: "sch4_m_8",
    question: "वर्णमालेनुसार (शब्दकोशक्रमानुसार) सर्वांत आधी येणारा शब्द कोणता?",
    options: ["कमळ", "अननस", "घर", "इमारत"],
    correctIndex: 1,
    explanation: "मराठी स्वरमालेत 'अ' सर्वांत आधी येतो, म्हणून 'अननस' प्रथम येईल.",
    marks: 1
  },
  {
    id: "sch4_m_9",
    question: "'नाचता येईना अंगण वाकडे' या म्हणीचा अर्थ कोणता?",
    options: ["अंगण वाकडे असणे", "स्वतःचा दोष दुसऱ्यावर ढकलणे", "नाचायला शिकणे", "अंगण स्वच्छ करणे"],
    correctIndex: 1,
    explanation: "आपल्याला काम करता न आल्यास स्वतःचा दोष परिस्थितीवर किंवा दुसऱ्यावर ढकलणे.",
    marks: 1
  },
  {
    id: "sch4_m_10",
    question: "'हिरवे पान खाली पडले.' या वाक्यातील विशेषण ओळखा.",
    options: ["हिरवे", "पान", "खाली", "पडले"],
    correctIndex: 0,
    explanation: "पानाचे वैशिष्ट्य सांगणारा 'हिरवे' हा गुणविशेषण शब्द आहे.",
    marks: 1
  },

  // भाग 2 : गणित (11 - 20)
  {
    id: "sch4_g_1",
    question: "3,742 या संख्येतील 7 ची स्थानिक किंमत किती?",
    options: ["7", "70", "700", "7000"],
    correctIndex: 2,
    explanation: "7 हा शतक स्थानी असल्याने त्याची स्थानिक किंमत 7 × 100 = 700 आहे.",
    marks: 1
  },
  {
    id: "sch4_g_2",
    question: "25 × 4 = ?",
    options: ["90", "100", "110", "125"],
    correctIndex: 1,
    explanation: "25 × 4 = 100.",
    marks: 1
  },
  {
    id: "sch4_g_3",
    question: "456 + 278 = ?",
    options: ["724", "734", "744", "634"],
    correctIndex: 1,
    explanation: "456 + 278 = 734.",
    marks: 1
  },
  {
    id: "sch4_g_4",
    question: "1000 − 367 = ?",
    options: ["633", "743", "643", "733"],
    correctIndex: 0,
    explanation: "1000 − 367 = 633.",
    marks: 1
  },
  {
    id: "sch4_g_5",
    question: "96 ÷ 8 = ?",
    options: ["11", "12", "13", "14"],
    correctIndex: 1,
    explanation: "96 ÷ 8 = 12.",
    marks: 1
  },
  {
    id: "sch4_g_6",
    question: "1 मीटर = किती सेंटिमीटर?",
    options: ["10", "100", "1000", "50"],
    correctIndex: 1,
    explanation: "1 मीटर = 100 सेंटिमीटर.",
    marks: 1
  },
  {
    id: "sch4_g_7",
    question: "एका आयताची लांबी 8 सेमी व रुंदी 5 सेमी आहे. तर त्याची परिमिती किती?",
    options: ["13 सेमी", "40 सेमी", "26 सेमी", "30 सेमी"],
    correctIndex: 2,
    explanation: "आयताची परिमिती = 2 × (लांबी + रुंदी) = 2 × (8 + 5) = 2 × 13 = 26 सेमी.",
    marks: 1
  },
  {
    id: "sch4_g_8",
    question: "खालीलपैकी 3/4 पेक्षा मोठा अपूर्णांक कोणता?",
    options: ["1/2", "2/4", "5/8", "7/8"],
    correctIndex: 3,
    explanation: "3/4 = 0.75, तर 7/8 = 0.875, जो 3/4 पेक्षा मोठा आहे.",
    marks: 1
  },
  {
    id: "sch4_g_9",
    question: "XIV ही रोमन संख्या म्हणजे कोणती संख्या?",
    options: ["16", "14", "9", "11"],
    correctIndex: 1,
    explanation: "X (10) + IV (4) = 14.",
    marks: 1
  },
  {
    id: "sch4_g_10",
    question: "सकाळी 9:30 वाजता भरलेली शाळा 4 तास 45 मिनिटांनी सुटली. तर शाळा किती वाजता सुटली?",
    options: ["दुपारी 1:15", "दुपारी 2:15", "दुपारी 2:45", "दुपारी 1:45"],
    correctIndex: 1,
    explanation: "9:30 + 4 तास = 1:30; 1:30 + 45 मिनिटे = दुपारी 2:15.",
    marks: 1
  },

  // भाग 3 : इंग्रजी (21 - 30)
  {
    id: "sch4_e_1",
    question: "Choose the correct plural of 'child'.",
    options: ["children", "childs", "childes", "child's"],
    correctIndex: 0,
    explanation: "The plural form of 'child' is 'children'.",
    marks: 1
  },
  {
    id: "sch4_e_2",
    question: "What is the opposite of 'hot'?",
    options: ["warm", "cold", "sunny", "big"],
    correctIndex: 1,
    explanation: "The antonym (opposite) of 'hot' is 'cold'.",
    marks: 1
  },
  {
    id: "sch4_e_3",
    question: "Fill in the blank: She ______ to school every day.",
    options: ["go", "goes", "going", "gone"],
    correctIndex: 1,
    explanation: "Simple present tense with third-person singular (She) takes 'goes'.",
    marks: 1
  },
  {
    id: "sch4_e_4",
    question: "Which of these letters is a vowel?",
    options: ["b", "k", "e", "t"],
    correctIndex: 2,
    explanation: "Vowels in English are a, e, i, o, u. Here 'e' is a vowel.",
    marks: 1
  },
  {
    id: "sch4_e_5",
    question: "Choose the correct spelling.",
    options: ["beutiful", "beautiful", "beautifull", "beatiful"],
    correctIndex: 1,
    explanation: "The correct spelling is 'beautiful'.",
    marks: 1
  },
  {
    id: "sch4_e_6",
    question: "Which of these words is a noun?",
    options: ["run", "happy", "table", "quickly"],
    correctIndex: 2,
    explanation: "'table' is a name of a thing, hence it is a noun.",
    marks: 1
  },
  {
    id: "sch4_e_7",
    question: "A baby cow is called a ______.",
    options: ["puppy", "kitten", "calf", "lamb"],
    correctIndex: 2,
    explanation: "A young/baby cow is called a 'calf'.",
    marks: 1
  },
  {
    id: "sch4_e_8",
    question: "Fill in the blank: I have ______ apple.",
    options: ["a", "an", "these", "many"],
    correctIndex: 1,
    explanation: "Words beginning with a vowel sound take the article 'an'.",
    marks: 1
  },
  {
    id: "sch4_e_9",
    question: "Which word comes first in alphabetical order?",
    options: ["mango", "apple", "grapes", "banana"],
    correctIndex: 1,
    explanation: "'apple' begins with 'a', so it comes first alphabetically.",
    marks: 1
  },
  {
    id: "sch4_e_10",
    question: "What is the past tense of 'eat'?",
    options: ["eated", "ate", "eating", "eats"],
    correctIndex: 1,
    explanation: "The simple past tense of 'eat' is 'ate'.",
    marks: 1
  },

  // भाग 4 : बुद्धिमत्ता (31 - 40)
  {
    id: "sch4_b_1",
    question: "संख्यामालिका पूर्ण करा : 2, 4, 8, 16, ?",
    options: ["20", "24", "32", "30"],
    correctIndex: 2,
    explanation: "प्रत्येक संख्या मागील संख्येची दुप्पट आहे: 16 × 2 = 32.",
    marks: 1
  },
  {
    id: "sch4_b_2",
    question: "गटात न बसणारे पद ओळखा.",
    options: ["सफरचंद", "केळे", "आंबा", "बटाटा"],
    correctIndex: 3,
    explanation: "सफरचंद, केळे, आंबा ही फळे आहेत; बटाटा ही भाजी/कंदमुळे आहे.",
    marks: 1
  },
  {
    id: "sch4_b_3",
    question: "अक्षरमालिका पूर्ण करा : A, C, E, G, ?",
    options: ["H", "I", "J", "K"],
    correctIndex: 1,
    explanation: "प्रत्येक अक्षरामध्ये एक अक्षर सोडून (A +2 C +2 E +2 G +2 I) क्रम येतो.",
    marks: 1
  },
  {
    id: "sch4_b_4",
    question: "एका सांकेतिक भाषेत 'MAT' हा शब्द 'NBU' असा लिहितात. तर त्याच भाषेत 'CAT' कसा लिहाल?",
    options: ["DBU", "DAU", "CBU", "DBT"],
    correctIndex: 0,
    explanation: "प्रत्येक अक्षर पुढील अक्षराने बदलले आहे: C->D, A->B, T->U म्हणजेच 'DBU'.",
    marks: 1
  },
  {
    id: "sch4_b_5",
    question: "संख्यामालिका पूर्ण करा : 5, 10, 15, ?, 25",
    options: ["18", "20", "22", "30"],
    correctIndex: 1,
    explanation: "पाचच्या पटीतील मालिका: 5, 10, 15, 20, 25.",
    marks: 1
  },
  {
    id: "sch4_b_6",
    question: "आजपासून 3 दिवसांनी रविवार असेल, तर आज कोणता वार आहे?",
    options: ["बुधवार", "गुरुवार", "शुक्रवार", "शनिवार"],
    correctIndex: 1,
    explanation: "रविवारच्या मागे 3 दिवस: शनिवार, शुक्रवार, गुरुवार. म्हणून आज गुरुवार आहे.",
    marks: 1
  },
  {
    id: "sch4_b_7",
    question: "आई : मुलगी :: वडील : ?",
    options: ["मुलगा", "भाऊ", "आजोबा", "काका"],
    correctIndex: 0,
    explanation: "आईचा मुलीशी जो नातेसंबंध आहे, तोच वडिलांचा मुलाशी आहे.",
    marks: 1
  },
  {
    id: "sch4_b_8",
    question: "एका रांगेत राजू पुढून 5 वा आणि मागून 6 वा आहे. तर रांगेत एकूण किती मुले आहेत?",
    options: ["10", "11", "12", "9"],
    correctIndex: 0,
    explanation: "एकूण मुले = (5 + 6) − 1 = 10.",
    marks: 1
  },
  {
    id: "sch4_b_9",
    question: "गटात न बसणारी संख्या ओळखा : 4, 8, 12, 15",
    options: ["4", "8", "12", "15"],
    correctIndex: 3,
    explanation: "4, 8, 12 या 4 च्या पटीतील सम संख्या आहेत; 15 ही विषम संख्या आहे.",
    marks: 1
  },
  {
    id: "sch4_b_10",
    question: "A = 1, B = 2, C = 3, D = 4 असे असल्यास 'BAD' हा शब्द कसा लिहाल?",
    options: ["214", "241", "124", "412"],
    correctIndex: 0,
    explanation: "B = 2, A = 1, D = 4 म्हणून '214'.",
    marks: 1
  }
];

fs.writeFileSync('generated_scholarship_quiz.json', JSON.stringify(questionsData, null, 2));
console.log('Generated 40 questions JSON successfully!');
