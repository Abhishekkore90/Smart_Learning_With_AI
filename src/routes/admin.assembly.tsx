import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
<<<<<<< HEAD
  Calendar,
  ChevronLeft,
  Plus,
  Trash2,
  Download,
  Eye,
  FileText,
  Loader2,
  Book,
} from "lucide-react";
import { collection, addDoc, getDocs, deleteDoc, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { showToast as toast } from "@/lib/custom-toast";

export const Route = createFileRoute("/admin/assembly")({
  head: () => ({ meta: [{ title: "Daily Assembly Book Uploader — Super Admin" }] }),
  component: AssemblyBookAdmin,
});

interface AssemblyBookFile {
  id: string;
  name: string;
  size: string;
  type: string;
  date: string;
  url?: string;
  chunks?: string[];
}

function AssemblyBookAdmin() {
  const navigate = useNavigate();
  const [books, setBooks] = useState<AssemblyBookFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
=======
  ChevronLeft,
  FileText,
  Copy,
  Calendar,
  Sun,
  Moon,
  MessageSquare,
  BookOpen,
  HelpCircle,
  User,
  Music,
  Edit,
  Save,
  Keyboard,
  Globe,
  Loader2,
  Delete,
  ArrowUp,
} from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { showToast as toast } from "@/lib/custom-toast";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

export const Route = createFileRoute("/admin/assembly")({
  head: () => ({ meta: [{ title: "Daily Assembly Builder — Super Admin" }] }),
  component: AssemblyBookAdmin,
});

function AssemblyBookAdmin() {
  const navigate = useNavigate();
  const [saveLoading, setSaveLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  // Form State
  const [formData, setFormData] = useState({
    creator: "गिरीश दारूंटे, मनमाड",
    day: "गुरुवार",
    month: "ज्येष्ठ",
    paksha: "कृष्ण पक्ष",
    tithi: "नवमी",
    nakshatra: "अश्विनी",
    yog: "सुकर्मा",
    sunrise: "सकाळी ०६.०६",
    sunset: "सायंकाळी ०७.२०",
    thought: "जर मनशांती हवी असेल तर प्रसिद्धीपासून दूर राहा.",
    proverb: "उडत्या पाखराची पिसे मोजणे.",
    proverbMeaning: "अगदी सहज चालता चालता एखाद्या अवघड गोष्टीची परीक्षा करणे.",
    dateMonth: "०९ जुलै",
    yearDay: "१९०",
    events:
      "१८७३ : मुंबई शेअर बाजार एका वडाच्या झाडाखाली सुरू झाला.\n१८७५ : भारतातील पहिला stock exchange म्हणजेच मुंबई stock exchange ची स्थापना मुंबईतील दलाल स्ट्रीट येथे करण्यात आली.\n१८७७ : विंबल्डन चॅम्पियनशिप सुरु झाली.\n१८९३ : डॉ. डॅनियल हेल यांनी जगातील पहिली ’ओपन हार्ट’ शस्त्रक्रिया शिकागो येथे यशस्वी केली.\n१९४४ : ब्रिटीशांच्या राजवटीपासून भारताला स्वतंत्र करण्यासाठी नेताजी सुभाषचंद्र बोस यांनी आझाद हिंद सेनेचे नेतृत्व स्वीकारले.\n१९५१ : भारताची पहिली पंचवार्षिक योजना प्रसिद्ध करण्यात आली.\n१९६९ : वाघ हा भारताचा राष्ट्रीय प्राणी घोषित करण्यात आला.",
    birthdays:
      "१८१९ : एलियास होवे – शिवणयंत्राचा संशोधक (मृत्यू : ३ आक्टोबर १८६७)\n१८४५ : साली ब्रिटीश कालीन भारतातील सन १९०५-१९१० काळातील व्हाईसरॉय आणि भारताचे गव्हर्नर जनरल लॉर्ड मिण्टो द्वितीय यांचा जन्मदिन.\n१९२५ : वसंतकुमार शिवशंकर पदुकोण ऊर्फ ’गुरू दत्त’ - प्रसिद्ध चित्रपट दिग्दर्शक, निर्माते आणि अभिनेते. त्यांच्या ‘साहिब बिबी और गुलाम‘ या चित्रपटाला राष्ट्रपतीपदक मिळाले. (मृत्यू : १० आक्टोबर १९६४)\n१९२६ : नोबेल पारितोषिक विजेते अमेरिकन भौतिकशास्त्रज्ञ बेन मॉटलसन यांचा जन्म.\n१९३८ : हरी जरीवाला ऊर्फ ’संजीव कुमार’ - रुपेरी चित्रसृष्टी निखळ अभिनयाच्या जोरावर गाजवणारे कसदार अभिनेते. (मृत्यू : ६ नोव्हेंबर १९८५)\n१९४४ : भारतीय-इंग्रजी इतिहासकार आणि शैक्षणिक जूडिथ एम. ब्राउन यांचा जन्म.",
    deaths:
      "१९६८ : ह. भ. प. शंकर वामन तथा ’सोनोपंत’ दांडेकर - स. प. महाविद्यालयाचे माजी प्राचार्य तत्वज्ञानाचे प्राध्यापक व प्रवचनकार, महाराष्ट्रातील वारकरी संप्रदायाचे प्रणेते. (जन्म : २० एप्रिल १८९६)\n१९९३ : संगीतकार व वाद्यवृंद संयोजक या सोनिक - ओमी (काका-पुतणे) जोडीतील सोनिक यांचे निधन.\n२००५ : डॉ. रफिक झकारिया - महाराष्ट्राचे नगरविकासमंत्री आणि लोकसभा सदस्य. (जन्म : ५ एप्रिल १९२०)\n२००५ : प्रसिद्ध इराणी भाषांतरकार, संपादक, कोशकार आणि सहित्यीक समिक्षक करीम इमामी यांचे निधन.",
    songTitle: "गीत गा रहे हैं आज हम...",
    patrioticSong:
      "आ गयें यहाँ जहाँ कदम,\nजिंदगी को ढूंढते हुए\nगीत गा रहे हैं आज हम,\nरागिनी को ढूंढते हुए ॥धृ॥\nअब दिलों में ये उमंग हैं,\nये जहाँ नया बनायेंगे\nजिंदगी का दौर आज से,\nदोस्तों को हम सिखायेंगे\nफुल हम नया खिलायेंगे,\nताजगी को ढूंढते हुए ॥१॥\nदहेज का बुरा रिवाज हैं,\nआज देश के समाज में\nहुआ तबाह आज आदमी\nलुटपाट के समाज में हम\nसमाज भी बनायेंगे\nआदमी को ढूंढते हुए ॥२॥\nफिर ना डर सके कोई दुल्हन,\nजोर जुल्म का न हो निशा\nमुस्कुरा उठें धरा गगन,\nहम रचेंगे ऐसी दास्ताँ\nहम वतन को यु सजायेंगे,\nरोशनी को ढूँढते हुए ॥३॥",
    storyTitle: "प्रामाणिक लाकुडतोड्या",
    story:
      "एका गावामध्ये एक लाकूडतोड्या राहत होता. लाकूडतोडून आपला संसार चालत होता. एके दिवशी तो झाड शोधत एका नदीकाठी गेला त्याला एक मोठे झाड सापडले तो त्या झाडावर फांदी तोडण्यासाठी चढला आणि फांदी तोडू लागला.अचानक त्याच्या हातातून कुऱ्हाड खाली नदीत पडली.त्याच्याजवळ दुसरी कुराड घेणे इतपत ही पैसे नव्हते तो खूप निरास झाला आणि नदीकाठीं येऊन रडू लागला. नदी उर्फ सरिता देवी त्याचे रडणे ऐकून प्रकट झाली आणि त्याला विचारू लागली की का रे तू रडत आहेस. लाकूडतोड्या सरिता देवीला आपली कुऱ्हाड नदीत पडली असे सांगतो.\nसरिता देवी लगेच नदीत बुडी घेऊन हातात सोन्याची कुऱ्हाड घेऊन प्रकट होते आणि लाकूडतोड्याला विचारते ही आहे का तुझी कुऱ्हाड. लाकूडतोड्या नम्रपणे म्हणतो देवी ही माझी कुऱ्हाड नाही मग देवी त्याला चांदीची कुऱ्हाड दाखवते तो परत मान हलवून ही देखील नाही कुऱ्हाड माझी देवीला सांगतो.\nआता देवी पुन्हा बुडी घेऊन नदीत जाते व लोखंडाची कुऱ्हाड घेऊन प्रकट होते इतक्यात लाकूडतोड्या म्हणतो होय हीच माझी कुऱ्हाड आहे देवी.\nदेवी म्हणते तू खूप प्रामाणिक आहे या प्रामाणिकपणामुळे या तीनही कुऱ्हाडी तुलाच बक्षीस स्वरूपात देते.",
    moral: "नेहमी खरे बोलावे.",
    gkQ1: "महाराष्ट्रातील सर्वात पहिले विद्यापीठ कोणते ?",
    gkA1: "मुंबई",
    gkQ2: "महाराष्ट्रातील सर्वात पहिले कृषी विद्यापीठ कोणते ?",
    gkA2: "राहुरी",
    gkQ3: "महाराष्ट्रातील पहिला सहकारी साखर कारखाना कोणता ?",
    gkA3: "प्रवरानगर",
    gkQ4: "महाराष्ट्रातील पहिली सहकारी सुतगिरणी कोणती?",
    gkA4: "इचलकरंजी",
    personalityTitle: "नेताजी सुभाषचंद्र बोस",
    personality:
      'थोर भारतीय क्रांतिकारक\n[२३ जानेवारी १८९७ - १८ ऑगष्ट १९४५]\nआपला भारत देश १५ ऑगष्ट १९४७ रोजी स्वतंत्र झाला. त्यात अनेक क्रांतीकारक देश भक्तांचा फार मोठा वाटा आहे. नेताजी सुभाष चंद्र बोस हे त्यातलेच एक मोठे नाव देशावर प्रेम म्हणजे कोणत्या प्रकारचे आणि किती.? मना पासून देशावर प्रेम करणे, देश आपलाच मानणे, देशाचा मान तोच माझा मान, देशाचा अपमान तोच माझा अपमान. नेताजी कॉलेज मध्ये शिकत असताना एका इंग्रजी प्राध्यापकाने शिकवताना भारताची टवाळी केली. नेताजींना ते सहन झाले नाही. ते आपल्या जागेवरून उठले आणि त्यांनी त्या प्राध्यापकाच्या थोबाडीत मारली. परिणाम म्हणून सुभाष बाबूंना कॉलेज मधून काढून टाकले. मग आशुतोष मुखर्जीनी मध्यस्थी केली. आणि परत कॉलेज मध्ये घेतले. असे नेताजींचे देशावर अतिशय मनापासून प्रेम होते.\nकटक येथील नामवंत वकील बोस व प्रभावतीदेवी या सुशिक्षित व सुसंस्कृत दाम्पत्याच्या पोटी २३ जानेवारी १८९७ रोजी कटक येथे सुभाषचंद्र यांचा जन्म झाला. त्यांचे वडील प्रज्ञावान व स्वतंत्र्य विचारांचे व परखड वृत्तीचे होते. तर आई अगदी "श्यामची आई" होती. वडील रायबहाद्दूर होते. पण इंग्रजांचे उर्मट वर्तन पाहून त्यांनी नोकरी व पदवी दोन्ही सोडून दिल्या सुभाषचंद्र वडिलांच्या सामाधानासाठी आय. सी.एस. होण्यासाठी इंग्लंडला गेले व केंब्रीज विद्यापिठाचे पदवीधर होवून परत आले.\n१९२१ सालच्या जालियन हत्याकान्डाने संतप्त होवून त्यांनी आय. सी. एस. होवूनही त्यांनी इंग्रजांची नोकरी स्वीकारली नाही. मातृभूमी स्वतंत्र करण्याचा विडा उचलला. सुभाषचंद्र बोस बंगाल प्रांतिक परिषदेचे अध्यक्ष झाले. एका दहशतवाद्याचा सत्कार केल्याच्या आरोपांवरून इंग्रजांनी सुभाषचंद्र यांना मंडालेच्या तुरुंगात पाठविले. त्यांची प्रकृती बिघडल्या वरून १९२७ साली त्यांना मुक्त केले.\nसुभाषचंद्र यांचे व्यक्तिमत्व लढाऊ व वादळी होते. त्यांमुळे ब्रिटीश सरकारने त्यांची धास्तीच घेतलेली होती. त्यासाठी त्यांना ते नेहमीच तुरुंगात पाठवीत. त्यांनी भारतातले नौजवान एकत्रित केले. आणि \' आझाद हिंद सेना\' स्थापन केली. ब्रिटीश्याबरोबर युद्ध करून भारत स्वाभिमानाने स्वतंत्र करायचा असा सुभाष बाबुंचा निश्चय होता.\nते तरुणांना म्हणत " तुम मुझे खून दो मै तुम्हे आझादी दूंगा" तुम्ही मला रक्त द्या मी तुम्हाला स्वातंत्र देईन \'मजल-दर मजल, करीत आझाद हिंद सेना भारताच्या रोखाने येत होती. पण इंग्रजांच्या शक्ती पुढे तिचे चालले नाही. मग सुभाषबाबूंनी सेनेच्या सैनिकांना " इंग्रजांच्या हाती सापडू नका आज जरी आपल्याला शस्त्र ठेवावे लागत असले तरी पुन्हा तयारी करून पुन्हा सामर्थ्याने ते आपल्याला उचलायचे आहे". असे सांगितले.\n१८ ऑगष्ट १९४५ साली तैवान विमानतळा वरून प्रयाण करीत असताना भडकत्या ज्वालांच्या प्रकाश्यात त्यांची प्राणज्योत विलीन झाली.',
  });

  // Active keyboard tracking
  const [activeFieldName, setActiveFieldName] = useState<string | null>(null);
  const [showKeyboard, setShowKeyboard] = useState<boolean>(false);
  const [keyboardLang, setKeyboardLang] = useState<"mr" | "en">("mr");
  const [isShift, setIsShift] = useState<boolean>(false);
  const [editingItemIdx, setEditingItemIdx] = useState<number | null>(null);
  const [assemblyItems, setAssemblyItems] = useState([
    { emoji: "🇮🇳", label: "राष्ट्रगीत", sub: "National Anthem", content: `जनगणमन अधिनायक जय हे, भारत भाग्य विधाता\n\nपंजाब सिंधु गुजरात मराठा द्राविड उत्कल बंग\n\nविंध्य हिमाचल यमुना गंगा उच्छल जलधितरंग\n\nतव शुभ नामे जागे, तव शुभ आशिष मागे\n\nगाहे तव जय गाथा\n\nजनगणमंगलदायक जय हे, भारत भाग्यविधाता\n\nजय हे, जय हे, जय हे, जय जय जय जय हे. ||१||\n\nअहरह तव आव्हान प्रचारित सुनि, तव उदार वाणी\nहिंदू बौद्ध सिख जैन पारसिक मुसलमान ख्रिस्तानी\nपूरब पश्चिम आसे, तव सिंहासन पासे\nप्रेमहार हय गाथा\nजनगणऐक्यविधायक जय हे, भारत भाग्यविधाता\nजय हे, जय हे, जय हे, जय जय जय जय हे. ||२||\n\nपतनअभ्युदयबंधुर पंथा युगयुग धावित यात्री\nतुम चिर सारथी, तव रथचक्रे मुखरित पथ दिन रात्री\nदारुण विप्लव माजे, तव शंखध्वनि बाजे\nसंकंट दुखयात्रा\nजनगण पथ परिचायक जय हे, भारत भाग्यविधाता\nजय हे, जय हे, जय हे, जय जय जय जय हे. ||३||\n\nघोरतिमिरघननिबिड निशीथे पीडित मूर्छित देशे\nजागृत छिल तव अविचल मंगल नत नयने अनिमेषे\nदुःस्वप्ने आतंके, रक्षा करिले अंके\nस्नेहमयी तुमी माता\nजनगण दुःख त्रायक जय हे, भारत भाग्यविधाता\nजय हे, जय हे, जय हे, जय जय जय जय हे. ||४||\n\nरात्र प्रभातिल उदिल रविच्छवि पुर्व उदयगिरि भाले\nगाहे विहंगम पुण्य समीरण नवजीवन रस ढाले\nतव करुणारुण रागे, निद्रित भारत जागे\nतव चरणे नत माथा\nजय हे, जय हे, जय हे, जय जय जय जय हे. भारत भाग्यविधाता ||५||` },
    { emoji: "🚩", label: "राज्यगीत", sub: "State Anthem", content: `जय जय महाराष्ट्र माझा, गर्जा महाराष्ट्र माझा\nरेवा वरदा, कृष्ण कोयना, भद्रा गोदावरी\nएकपणाचे भरती पाणी मातीच्या घागरी\nभीमथडीच्या तट्टांना या यमुनेचे पाणी पाजा\nजय जय महाराष्ट्र माझा ...\n\nभीती न आम्हा तुझी मुळी ही गडगडणार्\u200dया नभा\nअस्मानाच्या सुलतानीला जवाब देती जीभा\nसह्याद्रीचा सिंह गर्जतो, शिवशंभू राजा\nदरीदरीतून नाद गुंजला महाराष्ट्र माझा\n\nकाळ्या छातीवरी कोरली अभिमानाची लेणी\nपोलादी मनगटे खेळती खेळ जीवघेणी\nदारिद्र्याच्या उन्हात शिजला, निढळाच्या घामाने भिजला\nदेशगौरवासाठी झिजला\nदिल्लीचेही तख्त राखितो, महाराष्ट्र माझा` },
    { emoji: "🇮🇳", label: "प्रतिज्ञा", sub: "Pledge", content: `भारत माझा देश आहे.\n\nसारे भारतीय माझे बांधव आहेत.\nमाझ्या देशावर माझे प्रेम आहे.\nमाझ्या देशातल्या समृद्ध आणि\nविविधतेने नटलेल्या परंपरांचा मला अभिमान आहे.\nत्या परंपरांचा पाईक होण्याची पात्रता\nमाझ्या अंगी यावी म्हणून मी सदैव प्रयत्न करेन. मी माझ्या पालकांचा, गुरुजनांचा\nआणि वडीलधाऱ्या माणसांचा मान ठेवीन\nआणि प्रत्येकाशी सौजन्याने वागेन.\nमाझा देश आणि माझे देशबांधव\nयांच्याशी निष्ठा राखण्याची\nमी प्रतिज्ञा करीत आहे.\nत्यांचे कल्याण आणि\nत्यांची समृद्धी ह्यांतच माझे\nसौख्य सामावले आहे.\n\nजय हिंद` },
    { emoji: "📜", label: "संविधान उद्देशिका", sub: "Preamble", content: `\"हम, भारत के लोग, भारत को एक संपूर्ण प्रभुत्व-संपन्न, समाजवादी, पंथ-निरपेक्ष, लोकतंत्रात्मक गणराज्य बनाने के लिए, तथा उसके समस्त नागरिकों को:\nसामाजिक, आर्थिक और राजनैतिक न्याय,\nविचार, अभिव्यक्ति, विश्वास, धर्म और उपासना की स्वतंत्रता,\nप्रतिष्ठा और अवसर की समता प्राप्त कराने के लिए,\nतथा उन सब में व्यक्ति की गरिमा और राष्ट्र की एकता और अखंडता सुनिश्चित करने वाली बंधुता बढ़ाने के लिए,\nदृढ़संकल्प होकर अपनी इस संविधान सभा में आज तारीख 26 नवंबर, 1949 ईस्वी को एतद्द्वारा इस संविधान को अंगीकृत, अधिनियमित और आत्मार्पित करते हैं।\"` },
    { emoji: "🙏🏻", label: "प्रार्थना", sub: "Prayer", content: `हीच अमुची प्रार्थना अन् हेच अमुचे मागणे\nमाणसाने माणसाशी माणसासम वागणे\n\nधर्म जाती प्रांत भाषा द्वेष सारे संपू दे\nएक निष्ठा एक आशा एक रंगी रंगू दे\nअन् पुन्हा पसरो मनावर शुद्धतेचे चांदणे\nमाणसाने माणसाशी माणसासम वागणे\n\nभोवताली दाटला अंधार दुःखाचा जरी\nसूर्य सत्याचा उद्या उगवेल आहे खात्री\nतोवरी देई आम्हाला काजव्यांचे जागणे\nमाणसाने माणसाशी माणसासम वागणे\n\nलाभले आयुष्य जितके ते जगावे चांगले\nपाऊले चालो पुढे, जे थांबले ते संपले\nघेतला जो श्वास आता तो पुन्हा ना लाभणे\nमाणसाने माणसाशी माणसासम वागणे` },
  ]);
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557

  useEffect(() => {
    const isAdmin = sessionStorage.getItem("is_super_admin");
    if (!isAdmin) {
      navigate({
        to: "/login",
        search: { redirect: "/admin/assembly", role: "admin" } as any,
      });
      return;
    }

<<<<<<< HEAD
    fetchBooks();
  }, [navigate]);

  const fetchBooks = async () => {
    setLoading(true);
    try {
      const q = collection(db, "admin_assembly_books");
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as AssemblyBookFile[];
      setBooks(list);
    } catch (err) {
      console.error("Error fetching assembly books:", err);
      toast.error("Failed to load assembly books.");
    } finally {
      setLoading(false);
    }
  };

  const chunkString = (str: string, size: number) => {
    const chunks = [];
    for (let i = 0; i < str.length; i += size) {
      chunks.push(str.slice(i, i + size));
    }
    return chunks;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1024 * 1024 * 10) { // Limit to 10MB
      toast.error(`File is too large (${formatSize(file.size)}). Maximum allowed size is 10MB.`);
      return;
    }

    setUploading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64 = reader.result as string;
        const formattedDate = new Date().toLocaleDateString("en-IN");
        
        // Chunk the base64 string to bypass 1MB Firestore limit
        const base64Chunks = chunkString(base64, 800000); // 800KB chunks
        
        const chunkUploadPromises = base64Chunks.map((chunk) =>
          addDoc(collection(db, "admin_assembly_chunks"), { data: chunk })
        );
        
        const chunkRefs = await Promise.all(chunkUploadPromises);
        const chunkIds = chunkRefs.map((ref) => ref.id);

        const newBook: any = {
          name: file.name,
          size: formatSize(file.size),
          type: file.type || "application/pdf",
          date: formattedDate,
          chunks: chunkIds,
        };

        const docRef = await addDoc(
          collection(db, "admin_assembly_books"),
          newBook,
        );

        setBooks((prev) => [
          ...prev,
          { id: docRef.id, ...newBook } as AssemblyBookFile,
        ]);
        
        toast.success(`"${file.name}" uploaded successfully! 🎉`);
      } catch (err: any) {
        console.error("Upload error:", err);
        toast.error(err?.message || "Failed to save file details.");
      } finally {
        setUploading(false);
        if (e.target) e.target.value = ''; // Reset input
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDelete = async (book: AssemblyBookFile) => {
    if (!confirm(`Are you sure you want to delete "${book.name}"?`)) return;

    try {
      if (book.chunks) {
        for (const chunkId of book.chunks) {
          await deleteDoc(doc(db, "admin_assembly_chunks", chunkId)).catch(() => {});
        }
      }

      await deleteDoc(doc(db, "admin_assembly_books", book.id));
      setBooks((prev) => prev.filter((d) => d.id !== book.id));
      toast.success("Assembly book deleted successfully!");
    } catch (err) {
      console.error("Delete error:", err);
      toast.error("Failed to delete assembly book.");
    }
  };

  const handleView = async (book: AssemblyBookFile) => {
    if (book.url) {
      window.open(book.url);
      return;
    }
    if (book.chunks) {
      toast.success("Loading preview, please wait...");
      try {
        let fullBase64 = "";
        for (const chunkId of book.chunks) {
          const chunkDoc = await getDoc(doc(db, "admin_assembly_chunks", chunkId));
          if (chunkDoc.exists()) fullBase64 += chunkDoc.data().data;
        }
        const newWin = window.open();
        if (newWin) {
          if (book.type.includes("pdf")) {
            newWin.document.write(`<iframe src="${fullBase64}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
          } else {
            newWin.document.write(`<img src="${fullBase64}" style="max-width:100%; margin:auto; display:block;" />`);
          }
        }
      } catch (err) {
        console.error("View error:", err);
        toast.error("Failed to load file preview.");
      }
    }
  };

  const handleDownload = async (book: AssemblyBookFile) => {
    if (book.url) {
      const a = document.createElement("a");
      a.href = book.url;
      a.download = book.name;
      a.click();
      return;
    }
    if (book.chunks) {
      toast.success("Preparing download, please wait...");
      try {
        let fullBase64 = "";
        for (const chunkId of book.chunks) {
          const chunkDoc = await getDoc(doc(db, "admin_assembly_chunks", chunkId));
          if (chunkDoc.exists()) fullBase64 += chunkDoc.data().data;
        }
        const a = document.createElement("a");
        a.href = fullBase64;
        a.download = book.name;
        a.click();
      } catch (err) {
        console.error("Download error:", err);
        toast.error("Failed to prepare download.");
      }
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="min-h-screen bg-[#F8FAFF] text-[#111827] font-sans antialiased">
=======
    loadParipath();
  }, [navigate]);

  // Load saved Paripath from Firestore
  const loadParipath = async () => {
    setPageLoading(true);
    try {
      const docRef = doc(db, "admin_settings", "current_paripath");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setFormData(data as any);
        if (data.assemblyItems) setAssemblyItems(data.assemblyItems);
      }
    } catch (error) {
      console.error("Error loading Paripath:", error);
    } finally {
      setPageLoading(false);
    }
  };

  // Save Paripath to Firestore
  const handleSave = async () => {
    setSaveLoading(true);
    try {
      const docRef = doc(db, "admin_settings", "current_paripath");
      await setDoc(docRef, { ...formData, assemblyItems });
      toast.success("Paripath changes saved successfully! 💾");
    } catch (error: any) {
      console.error("Error saving Paripath:", error);
      toast.error(error?.message || "Failed to save Paripath.");
    } finally {
      setSaveLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFocus = (name: string) => {
    setActiveFieldName(name);
  };

  const getFormattedText = () => {
    return `${assemblyItems.map((item) => `${item.emoji} *${item.label}*\n${item.content}`).join('\n┅━═▣◆★✧★◆▣═━┅\n')}
┅━═▣◆★✧★◆▣═━┅
*🪀 आजचे पंचाग* 
वार : ${formData.day}, मास : ${formData.month},
पक्ष : ${formData.paksha}, तिथि : ${formData.tithi},
nक्षत्र : ${formData.nakshatra}, योग : ${formData.yog}
सूर्योदय : ${formData.sunrise}
सूर्यास्त : ${formData.sunset}
┅━═▣◆★✧★◆▣═━┅
*🪀 सुविचार* 
${formData.thought}
┅━═▣◆★✧★◆▣═━┅
*🪀 म्हण व अर्थ*
*म्हण* : ${formData.proverb}
*अर्थ* : ${formData.proverbMeaning}
┅━═▣◆★✧★◆▣═━┅
*🪀 ${formData.dateMonth} दिनविशेष*
हा वर्षातील ${formData.yearDay} वा दिवस आहे.
*🪀 महत्त्वाच्या घटना*
${formData.events}
┅━═▣◆★✧★◆▣═━┅
*🪀 जन्मदिवस / जयंती*
${formData.birthdays}
┅━═▣◆★✧★◆▣═━┅
*🪀 मृत्यू / पुण्यतिथी / स्मृतिदिन*
${formData.deaths}
┅━═▣◆★✧★◆▣═━┅
*🪀 देशभक्ती गीत*
*${formData.songTitle}*
${formData.patrioticSong}
┅━═▣◆★✧★◆▣═━┅
*🪀 बोधकथा*
*${formData.storyTitle}*
${formData.story}
*तात्पर्य :* ${formData.moral}
┅━═▣◆★✧★◆▣═━┅
*🪀 सामान्य ज्ञान*
१) ${formData.gkQ1}
उत्तर : *${formData.gkA1}*
२) ${formData.gkQ2}
उत्तर : *${formData.gkA2}*
३) ${formData.gkQ3}
उत्तर : *${formData.gkA3}*
४) ${formData.gkQ4}
उत्तर : *${formData.gkA4}*
┅━═▣◆★✧★◆▣═━┅
*🪀 थोरव्यक्ती परिचय*
*${formData.personalityTitle}*
${formData.personality}
┅━═▣◆★✧★◆▣═━┅
     *🔹 निर्मिती 🔹*
*🥏 ${formData.creator}*
*MSP महाराष्ट्र शिक्षक पॅनल*
┅━═▣◆★✧★◆▣═━┅`;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getFormattedText());
    toast.success("Paripath template copied to clipboard! 📋");
  };

  // Keyboard helper
  const insertChar = (char: string) => {
    if (!activeFieldName) {
      toast.error("Please click on any input field first to start typing.");
      return;
    }
    const inputEl = document.getElementsByName(activeFieldName)[0] as
      | HTMLInputElement
      | HTMLTextAreaElement;
    if (!inputEl) return;

    const start = inputEl.selectionStart || 0;
    const end = inputEl.selectionEnd || 0;
    const val = formData[activeFieldName as keyof typeof formData] || "";
    const newVal = val.slice(0, start) + char + val.slice(end);

    setFormData((prev) => ({
      ...prev,
      [activeFieldName]: newVal,
    }));

    setTimeout(() => {
      inputEl.focus();
      inputEl.setSelectionRange(start + char.length, start + char.length);
    }, 0);
  };

  const handleBackspace = () => {
    if (!activeFieldName) return;
    const inputEl = document.getElementsByName(activeFieldName)[0] as
      | HTMLInputElement
      | HTMLTextAreaElement;
    if (!inputEl) return;

    const start = inputEl.selectionStart || 0;
    const end = inputEl.selectionEnd || 0;
    const val = formData[activeFieldName as keyof typeof formData] || "";

    if (start === 0 && end === 0) return;

    let newVal = "";
    let newCursorPos = start;
    if (start === end) {
      newVal = val.slice(0, start - 1) + val.slice(end);
      newCursorPos = start - 1;
    } else {
      newVal = val.slice(0, start) + val.slice(end);
      newCursorPos = start;
    }

    setFormData((prev) => ({
      ...prev,
      [activeFieldName]: newVal,
    }));

    setTimeout(() => {
      inputEl.focus();
      inputEl.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const handleSpace = () => insertChar(" ");

  // Virtual Keyboard Layout Arrays
  const marathiVowels = [
    "अ",
    "आ",
    "इ",
    "ई",
    "उ",
    "ऊ",
    "ए",
    "ऐ",
    "ओ",
    "औ",
    "अं",
    "अः",
    "ऋ",
  ];
  const marathiModifiers = [
    "ा",
    "ि",
    "ी",
    "ु",
    "ू",
    "े",
    "ै",
    "ो",
    "ौ",
    "ं",
    "ः",
    "ॅ",
    "ॉ",
    "्",
    "ऱ",
  ];
  const marathiConsonants1 = ["क", "ख", "ग", "घ", "ङ", "च", "छ", "ज", "झ", "ञ"];
  const marathiConsonants2 = ["ट", "ठ", "ड", "ढ", "ण", "त", "थ", "द", "ध", "न"];
  const marathiConsonants3 = ["प", "फ", "ब", "भ", "म", "य", "र", "ल", "व", "श"];
  const marathiConsonants4 = ["ष", "स", "ह", "ळ", "क्ष", "ज्ञ", "।", "ॐ"];

  const englishRow1 = ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"];
  const englishRow2 = ["a", "s", "d", "f", "g", "h", "j", "k", "l"];
  const englishRow3 = ["z", "x", "c", "v", "b", "n", "m"];

  if (pageLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFF] flex flex-col justify-between antialiased">
        <Header />
        <main className="flex-1 flex flex-col items-center justify-center space-y-4">
          <Loader2 className="size-12 text-[#6C63FF] animate-spin" />
          <p className="text-sm font-black uppercase tracking-widest text-slate-400">
            परिपाठ डेटा लोड होत आहे...
          </p>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFF] text-[#111827] font-sans antialiased pb-60">
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
      <Header />
      <main className="max-w-[1440px] mx-auto px-8 pt-16 pb-24">
        <div className="mb-12 space-y-6">
          <Link
            to="/admin"
            className="inline-flex items-center gap-2 text-sm font-black text-[#6B7280] hover:text-[#6C63FF] uppercase tracking-widest transition-colors"
          >
            <ChevronLeft className="size-4" /> Back to Hub
          </Link>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div className="space-y-2">
              <h1 className="text-5xl font-black tracking-tight">
<<<<<<< HEAD
                Daily Assembly Book <span className="text-[#6C63FF]">Uploader.</span>
              </h1>
              <p className="text-[#6B7280] max-w-xl text-lg font-medium leading-relaxed">
                Upload and manage Daily Assembly (Paripath) guidebooks and reference PDFs.
=======
                Daily Assembly <span className="text-[#6C63FF]">Builder.</span>
              </h1>
              <p className="text-[#6B7280] max-w-xl text-lg font-medium leading-relaxed">
                Create and format the Daily Assembly (Paripath) template
                interactively. Fill in each point to construct the daily
                bulletin.
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
              </p>
            </div>
          </div>
        </div>

<<<<<<< HEAD
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Upload Card */}
          <div className="bg-white border border-black/5 rounded-[3rem] p-8 shadow-sm space-y-6">
            <h3 className="text-xl font-black tracking-tight text-stone-900">
              Upload PDF Book
            </h3>
            
            <div className="space-y-4">
              <div className="relative group border-2 border-dashed border-slate-200 hover:border-[#6C63FF]/50 rounded-[2rem] p-8 text-center transition-all bg-slate-50/50 hover:bg-white cursor-pointer overflow-hidden">
                <input
                  type="file"
                  onChange={handleFileUpload}
                  accept=".pdf,image/*"
                  className="absolute inset-0 opacity-0 cursor-pointer z-10"
                  disabled={uploading}
                />
                {uploading ? (
                  <div className="space-y-4 py-4">
                    <Loader2 className="size-10 text-[#6C63FF] animate-spin mx-auto" />
                    <div className="text-xs font-black uppercase tracking-widest text-[#6C63FF] animate-pulse">
                      Uploading book...
=======
        <div className="max-w-4xl mx-auto">
          {/* Form Editor Card */}
          <div className="bg-white border border-black/5 rounded-[3rem] p-8 shadow-sm space-y-8">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-100 pb-4">
              <h2 className="text-2xl font-black tracking-tight text-slate-800 flex items-center gap-2">
                <FileText className="size-6 text-[#6C63FF]" /> Paripath Editor
                (परिपाठ संपादक)
              </h2>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowKeyboard(!showKeyboard)}
                  className={`px-4 py-2.5 rounded-full text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                    showKeyboard
                      ? "bg-slate-800 text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  <Keyboard className="size-4" /> Keyboard
                </button>
                <button
                  onClick={handleSave}
                  disabled={saveLoading}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-full text-xs font-black uppercase tracking-wider transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  {saveLoading ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Save className="size-3.5" />
                  )}
                  Save Changes
                </button>
                <button
                  onClick={handleCopy}
                  className="px-4 py-2.5 bg-[#6C63FF] hover:bg-[#5b52e0] text-white rounded-full text-xs font-black uppercase tracking-wider transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm shadow-[#6C63FF]/30 active:scale-95"
                >
                  <Copy className="size-3.5" /> Copy Format
                </button>
              </div>
            </div>

            {/* Header Configuration */}
            <div className="space-y-4">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Edit className="size-4 text-[#6C63FF]" /> परिपाठ निर्मिती
              </h3>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">
                  निर्मिती नाव (उदा. गिरीश दारूंटे, मनमाड)
                </label>
                <input
                  type="text"
                  name="creator"
                  value={formData.creator}
                  onChange={handleChange}
                  onFocus={() => handleFocus("creator")}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#6C63FF] outline-none text-sm font-bold text-slate-800 transition-all"
                />
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* Assembly Opening Items */}
            <div className="space-y-4">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Music className="size-4 text-orange-500" /> परिपाठ सुरुवात
              </h3>
              <div className="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200/60 rounded-2xl p-6 space-y-3">
                {assemblyItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="bg-white/80 backdrop-blur-sm rounded-xl border border-orange-100/60 shadow-sm overflow-hidden"
                  >
                    <div className="flex items-center gap-4 px-5 py-3.5">
                      <span className="text-2xl">{item.emoji}</span>
                      <div className="flex-1">
                        <p className="text-sm font-black text-slate-800">
                          {item.label}
                        </p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          {item.sub}
                        </p>
                      </div>
                      <button
                        onClick={() => setEditingItemIdx(editingItemIdx === idx ? null : idx)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                          editingItemIdx === idx
                            ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                            : "bg-orange-100 text-orange-600 hover:bg-orange-200"
                        }`}
                      >
                        {editingItemIdx === idx ? "✓ जतन करा" : "✏️ बदला"}
                      </button>
                    </div>
                    {item.content && (
                      <div className="px-5 pb-5 pt-2 border-t border-orange-100/60">
                        {editingItemIdx === idx ? (
                          <textarea
                            value={item.content}
                            onChange={(e) => {
                              const updated = [...assemblyItems];
                              updated[idx] = { ...updated[idx], content: e.target.value };
                              setAssemblyItems(updated);
                            }}
                            rows={12}
                            className="w-full px-4 py-3 bg-white border-2 border-orange-300 rounded-xl focus:border-[#6C63FF] outline-none text-sm font-bold text-slate-700 leading-relaxed transition-all resize-y"
                          />
                        ) : (
                          <pre className="text-sm font-bold text-slate-700 whitespace-pre-wrap leading-relaxed font-sans">
                            {item.content}
                          </pre>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* Panchang Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Calendar className="size-4 text-amber-500" /> आजचे पंचांग
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    वार
                  </label>
                  <input
                    type="text"
                    name="day"
                    value={formData.day}
                    onChange={handleChange}
                    onFocus={() => handleFocus("day")}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#6C63FF] outline-none text-sm font-bold text-slate-800 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    मास
                  </label>
                  <input
                    type="text"
                    name="month"
                    value={formData.month}
                    onChange={handleChange}
                    onFocus={() => handleFocus("month")}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#6C63FF] outline-none text-sm font-bold text-slate-800 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    पक्ष
                  </label>
                  <input
                    type="text"
                    name="paksha"
                    value={formData.paksha}
                    onChange={handleChange}
                    onFocus={() => handleFocus("paksha")}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#6C63FF] outline-none text-sm font-bold text-slate-800 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    तिथी
                  </label>
                  <input
                    type="text"
                    name="tithi"
                    value={formData.tithi}
                    onChange={handleChange}
                    onFocus={() => handleFocus("tithi")}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#6C63FF] outline-none text-sm font-bold text-slate-800 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    नक्षत्र
                  </label>
                  <input
                    type="text"
                    name="nakshatra"
                    value={formData.nakshatra}
                    onChange={handleChange}
                    onFocus={() => handleFocus("nakshatra")}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#6C63FF] outline-none text-sm font-bold text-slate-800 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    योग
                  </label>
                  <input
                    type="text"
                    name="yog"
                    value={formData.yog}
                    onChange={handleChange}
                    onFocus={() => handleFocus("yog")}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#6C63FF] outline-none text-sm font-bold text-slate-800 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 flex items-center gap-1">
                    <Sun className="size-3 text-amber-500" /> सूर्योदय
                  </label>
                  <input
                    type="text"
                    name="sunrise"
                    value={formData.sunrise}
                    onChange={handleChange}
                    onFocus={() => handleFocus("sunrise")}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#6C63FF] outline-none text-sm font-bold text-slate-800 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 flex items-center gap-1">
                    <Moon className="size-3 text-indigo-500" /> सूर्यास्त
                  </label>
                  <input
                    type="text"
                    name="sunset"
                    value={formData.sunset}
                    onChange={handleChange}
                    onFocus={() => handleFocus("sunset")}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#6C63FF] outline-none text-sm font-bold text-slate-800 transition-all"
                  />
                </div>
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* Thought and Proverb Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <MessageSquare className="size-4 text-emerald-500" /> सुविचार व
                म्हण
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    सुविचार (Thought)
                  </label>
                  <textarea
                    name="thought"
                    value={formData.thought}
                    onChange={handleChange}
                    onFocus={() => handleFocus("thought")}
                    rows={2}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#6C63FF] outline-none text-sm font-bold text-slate-800 transition-all resize-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    कहानी / म्हण (Proverb)
                  </label>
                  <input
                    type="text"
                    name="proverb"
                    value={formData.proverb}
                    onChange={handleChange}
                    onFocus={() => handleFocus("proverb")}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#6C63FF] outline-none text-sm font-bold text-slate-800 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    म्हणीचा अर्थ (Meaning)
                  </label>
                  <textarea
                    name="proverbMeaning"
                    value={formData.proverbMeaning}
                    onChange={handleChange}
                    onFocus={() => handleFocus("proverbMeaning")}
                    rows={2}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#6C63FF] outline-none text-sm font-bold text-slate-800 transition-all resize-none"
                  />
                </div>
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* Dinvishesh Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <BookOpen className="size-4 text-indigo-500" /> दिनविशेष माहिती
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    तारीख आणि महिना (उदा. ०९ जुलै)
                  </label>
                  <input
                    type="text"
                    name="dateMonth"
                    value={formData.dateMonth}
                    onChange={handleChange}
                    onFocus={() => handleFocus("dateMonth")}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#6C63FF] outline-none text-sm font-bold text-slate-800 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    वर्षातील कितवा दिवस (उदा. १९०)
                  </label>
                  <input
                    type="text"
                    name="yearDay"
                    value={formData.yearDay}
                    onChange={handleChange}
                    onFocus={() => handleFocus("yearDay")}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#6C63FF] outline-none text-sm font-bold text-slate-800 transition-all"
                  />
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    महत्त्वाच्या घटना
                  </label>
                  <textarea
                    name="events"
                    value={formData.events}
                    onChange={handleChange}
                    onFocus={() => handleFocus("events")}
                    rows={4}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#6C63FF] outline-none text-sm font-bold text-slate-800 transition-all resize-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    जन्मदिवस / जयंती
                  </label>
                  <textarea
                    name="birthdays"
                    value={formData.birthdays}
                    onChange={handleChange}
                    onFocus={() => handleFocus("birthdays")}
                    rows={4}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#6C63FF] outline-none text-sm font-bold text-slate-800 transition-all resize-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    मृत्यू / पुण्यतिथी / स्मृतिदिन
                  </label>
                  <textarea
                    name="deaths"
                    value={formData.deaths}
                    onChange={handleChange}
                    onFocus={() => handleFocus("deaths")}
                    rows={4}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#6C63FF] outline-none text-sm font-bold text-slate-800 transition-all resize-none"
                  />
                </div>
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* Patriotic Song Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Music className="size-4 text-rose-500" /> देशभक्ती गीत
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    गाण्याचे शीर्षक (Song Title)
                  </label>
                  <input
                    type="text"
                    name="songTitle"
                    value={formData.songTitle}
                    onChange={handleChange}
                    onFocus={() => handleFocus("songTitle")}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#6C63FF] outline-none text-sm font-bold text-slate-800 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    देशभक्ती गीत मजकूर
                  </label>
                  <textarea
                    name="patrioticSong"
                    value={formData.patrioticSong}
                    onChange={handleChange}
                    onFocus={() => handleFocus("patrioticSong")}
                    rows={6}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#6C63FF] outline-none text-sm font-bold text-slate-800 transition-all resize-none"
                  />
                </div>
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* Story Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <BookOpen className="size-4 text-emerald-500" /> बोधकथा
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    कथेचे नाव (Story Title)
                  </label>
                  <input
                    type="text"
                    name="storyTitle"
                    value={formData.storyTitle}
                    onChange={handleChange}
                    onFocus={() => handleFocus("storyTitle")}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#6C63FF] outline-none text-sm font-bold text-slate-800 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    कथेचा मजकूर
                  </label>
                  <textarea
                    name="story"
                    value={formData.story}
                    onChange={handleChange}
                    onFocus={() => handleFocus("story")}
                    rows={6}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#6C63FF] outline-none text-sm font-bold text-slate-800 transition-all resize-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    तात्पर्य (Moral)
                  </label>
                  <input
                    type="text"
                    name="moral"
                    value={formData.moral}
                    onChange={handleChange}
                    onFocus={() => handleFocus("moral")}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#6C63FF] outline-none text-sm font-bold text-slate-800 transition-all"
                  />
                </div>
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* General Knowledge Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <HelpCircle className="size-4 text-violet-500" /> सामान्य ज्ञान
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">
                      सामान्य ज्ञान प्रश्न १
                    </label>
                    <input
                      type="text"
                      name="gkQ1"
                      value={formData.gkQ1}
                      onChange={handleChange}
                      onFocus={() => handleFocus("gkQ1")}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#6C63FF] outline-none text-sm font-bold text-slate-800 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">
                      उत्तर १
                    </label>
                    <input
                      type="text"
                      name="gkA1"
                      value={formData.gkA1}
                      onChange={handleChange}
                      onFocus={() => handleFocus("gkA1")}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#6C63FF] outline-none text-sm font-bold text-slate-800 transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">
                      सामान्य ज्ञान प्रश्न २
                    </label>
                    <input
                      type="text"
                      name="gkQ2"
                      value={formData.gkQ2}
                      onChange={handleChange}
                      onFocus={() => handleFocus("gkQ2")}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#6C63FF] outline-none text-sm font-bold text-slate-800 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">
                      उत्तर २
                    </label>
                    <input
                      type="text"
                      name="gkA2"
                      value={formData.gkA2}
                      onChange={handleChange}
                      onFocus={() => handleFocus("gkA2")}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#6C63FF] outline-none text-sm font-bold text-slate-800 transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">
                      सामान्य ज्ञान प्रश्न ३
                    </label>
                    <input
                      type="text"
                      name="gkQ3"
                      value={formData.gkQ3}
                      onChange={handleChange}
                      onFocus={() => handleFocus("gkQ3")}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#6C63FF] outline-none text-sm font-bold text-slate-800 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">
                      उत्तर ३
                    </label>
                    <input
                      type="text"
                      name="gkA3"
                      value={formData.gkA3}
                      onChange={handleChange}
                      onFocus={() => handleFocus("gkA3")}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#6C63FF] outline-none text-sm font-bold text-slate-800 transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">
                      सामान्य ज्ञान प्रश्न ४
                    </label>
                    <input
                      type="text"
                      name="gkQ4"
                      value={formData.gkQ4}
                      onChange={handleChange}
                      onFocus={() => handleFocus("gkQ4")}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#6C63FF] outline-none text-sm font-bold text-slate-800 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">
                      उत्तर ४
                    </label>
                    <input
                      type="text"
                      name="gkA4"
                      value={formData.gkA4}
                      onChange={handleChange}
                      onFocus={() => handleFocus("gkA4")}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#6C63FF] outline-none text-sm font-bold text-slate-800 transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* Great Personality Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <User className="size-4 text-cyan-500" /> थोर व्यक्ती परिचय
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    थोर व्यक्तीचे नाव (उदा. नेताजी सुभाषचंद्र बोस)
                  </label>
                  <input
                    type="text"
                    name="personalityTitle"
                    value={formData.personalityTitle}
                    onChange={handleChange}
                    onFocus={() => handleFocus("personalityTitle")}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#6C63FF] outline-none text-sm font-bold text-slate-800 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    थोर व्यक्ती परिचय मजकूर
                  </label>
                  <textarea
                    name="personality"
                    value={formData.personality}
                    onChange={handleChange}
                    onFocus={() => handleFocus("personality")}
                    rows={6}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#6C63FF] outline-none text-sm font-bold text-slate-800 transition-all resize-none"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Persistent Floating On-Screen Keyboard Drawer */}
      <AnimatePresence>
        {showKeyboard && (
          <motion.div
            initial={{ y: 250, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 250, opacity: 0 }}
            transition={{ type: "spring", stiffness: 100, damping: 15 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-[#1E293B] border-t border-slate-700 shadow-2xl p-4 md:p-6"
          >
            <div className="max-w-5xl mx-auto space-y-4">
              {/* Keyboard Header Controls */}
              <div className="flex items-center justify-between border-b border-slate-700 pb-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-1">
                    <Keyboard className="size-4" /> Type Board
                  </span>
                  <div className="bg-slate-800 p-1 rounded-xl flex gap-1">
                    <button
                      onClick={() => setKeyboardLang("mr")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase transition-all ${
                        keyboardLang === "mr"
                          ? "bg-[#6C63FF] text-white"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      मराठी
                    </button>
                    <button
                      onClick={() => setKeyboardLang("en")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase transition-all ${
                        keyboardLang === "en"
                          ? "bg-[#6C63FF] text-white"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      English
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 font-bold hidden sm:inline">
                    Active Field:{" "}
                    <span className="text-[#6C63FF] font-black">
                      {activeFieldName || "None"}
                    </span>
                  </span>
                  <button
                    onClick={() => setShowKeyboard(false)}
                    className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold"
                  >
                    Hide
                  </button>
                </div>
              </div>

              {/* Keyboard Layout Grid */}
              <div className="space-y-2 max-h-[180px] overflow-y-auto no-scrollbar py-1">
                {keyboardLang === "mr" ? (
                  <div className="space-y-2">
                    {/* Vowels */}
                    <div className="flex flex-wrap gap-1 md:gap-1.5 justify-center">
                      {marathiVowels.map((char) => (
                        <button
                          key={char}
                          onClick={() => insertChar(char)}
                          className="min-w-8 h-9 px-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-white font-bold rounded-lg text-sm transition-all flex items-center justify-center cursor-pointer border border-slate-700"
                        >
                          {char}
                        </button>
                      ))}
                    </div>
                    {/* Modifiers */}
                    <div className="flex flex-wrap gap-1 md:gap-1.5 justify-center">
                      {marathiModifiers.map((char) => (
                        <button
                          key={char}
                          onClick={() => insertChar(char)}
                          className="min-w-8 h-9 px-2 bg-indigo-950 hover:bg-indigo-900 active:scale-95 text-indigo-200 font-bold rounded-lg text-sm transition-all flex items-center justify-center cursor-pointer border border-indigo-900"
                        >
                          {char}
                        </button>
                      ))}
                    </div>
                    {/* Consonants Rows */}
                    <div className="flex flex-wrap gap-1 md:gap-1.5 justify-center">
                      {marathiConsonants1.map((char) => (
                        <button
                          key={char}
                          onClick={() => insertChar(char)}
                          className="min-w-8 h-9 px-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-white font-bold rounded-lg text-sm transition-all flex items-center justify-center cursor-pointer border border-slate-700"
                        >
                          {char}
                        </button>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-1 md:gap-1.5 justify-center">
                      {marathiConsonants2.map((char) => (
                        <button
                          key={char}
                          onClick={() => insertChar(char)}
                          className="min-w-8 h-9 px-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-white font-bold rounded-lg text-sm transition-all flex items-center justify-center cursor-pointer border border-slate-700"
                        >
                          {char}
                        </button>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-1 md:gap-1.5 justify-center">
                      {marathiConsonants3.map((char) => (
                        <button
                          key={char}
                          onClick={() => insertChar(char)}
                          className="min-w-8 h-9 px-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-white font-bold rounded-lg text-sm transition-all flex items-center justify-center cursor-pointer border border-slate-700"
                        >
                          {char}
                        </button>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-1 md:gap-1.5 justify-center">
                      {marathiConsonants4.map((char) => (
                        <button
                          key={char}
                          onClick={() => insertChar(char)}
                          className="min-w-8 h-9 px-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-white font-bold rounded-lg text-sm transition-all flex items-center justify-center cursor-pointer border border-slate-700"
                        >
                          {char}
                        </button>
                      ))}
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
<<<<<<< HEAD
                    <div className="size-12 rounded-full bg-white border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-[#6C63FF] mx-auto shadow-sm transition-transform duration-500 group-hover:scale-110">
                      <Plus className="size-6" />
                    </div>
                    <div className="text-xs font-bold text-slate-700">
                      Click to choose or drag book file
                    </div>
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      PDF or Images up to 10MB
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* List of Files Card */}
          <div className="lg:col-span-2 bg-white border border-black/5 rounded-[3rem] p-8 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="text-xl font-black tracking-tight text-stone-900 flex items-center gap-2">
                <Book className="size-5 text-[#6C63FF]" /> Uploaded Assembly Books
              </h3>
              <span className="px-3.5 py-1 bg-blue-100 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-wider">
                {books.length} Files
              </span>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-4">
                <Loader2 className="size-10 text-[#6C63FF] animate-spin" />
                <p className="text-xs font-black uppercase tracking-widest text-slate-400 animate-pulse">
                  Synchronizing Books Catalog...
                </p>
              </div>
            ) : books.length === 0 ? (
              <div className="py-20 text-center border border-dashed border-slate-200 rounded-3xl space-y-4">
                <div className="size-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 mx-auto">
                  <Book className="size-8" />
                </div>
                <div>
                  <h4 className="text-slate-700 font-bold">No assembly books uploaded yet</h4>
                  <p className="text-slate-400 text-xs mt-1">
                    Upload a book PDF on the left.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 no-scrollbar">
                <AnimatePresence>
                  {books.map((book) => (
                    <motion.div
                      key={book.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="p-5 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between group hover:border-[#6C63FF]/30 transition-all shadow-sm"
                    >
                      <div className="flex items-center gap-4 overflow-hidden">
                        <div className="size-12 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-[#6C63FF] group-hover:border-[#6C63FF]/20 transition-all flex-shrink-0">
                          <FileText className="size-6" />
                        </div>
                        <div className="overflow-hidden">
                          <div className="font-bold text-slate-800 text-sm truncate max-w-[250px] sm:max-w-md" title={book.name}>
                            {book.name}
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            <span>{book.size}</span>
                            <span>{book.date}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                        <button
                          onClick={() => handleView(book)}
                          className="size-9 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-200 transition-all cursor-pointer shadow-sm"
                          title="View"
                        >
                          <Eye className="size-4.5" />
                        </button>
                        <button
                          onClick={() => handleDownload(book)}
                          className="size-9 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:border-emerald-200 transition-all cursor-pointer shadow-sm"
                          title="Download"
                        >
                          <Download className="size-4.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(book)}
                          className="size-9 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-red-600 hover:border-red-200 transition-all cursor-pointer shadow-sm"
                          title="Delete"
                        >
                          <Trash2 className="size-4.5" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </main>
=======
                    {/* English Row 1 */}
                    <div className="flex flex-wrap gap-1 md:gap-1.5 justify-center">
                      {englishRow1.map((char) => {
                        const showChar = isShift ? char.toUpperCase() : char;
                        return (
                          <button
                            key={char}
                            onClick={() => insertChar(showChar)}
                            className="min-w-8 h-9 px-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-white font-bold rounded-lg text-sm transition-all flex items-center justify-center cursor-pointer border border-slate-700"
                          >
                            {showChar}
                          </button>
                        );
                      })}
                    </div>
                    {/* English Row 2 */}
                    <div className="flex flex-wrap gap-1 md:gap-1.5 justify-center">
                      {englishRow2.map((char) => {
                        const showChar = isShift ? char.toUpperCase() : char;
                        return (
                          <button
                            key={char}
                            onClick={() => insertChar(showChar)}
                            className="min-w-8 h-9 px-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-white font-bold rounded-lg text-sm transition-all flex items-center justify-center cursor-pointer border border-slate-700"
                          >
                            {showChar}
                          </button>
                        );
                      })}
                    </div>
                    {/* English Row 3 */}
                    <div className="flex flex-wrap gap-1 md:gap-1.5 justify-center">
                      <button
                        onClick={() => setIsShift(!isShift)}
                        className={`min-w-10 h-9 px-2 active:scale-95 font-bold rounded-lg text-xs transition-all flex items-center justify-center cursor-pointer border ${
                          isShift
                            ? "bg-[#6C63FF] text-white border-[#6C63FF]"
                            : "bg-slate-700 text-slate-300 border-slate-600"
                        }`}
                      >
                        <ArrowUp className="size-4" />
                      </button>
                      {englishRow3.map((char) => {
                        const showChar = isShift ? char.toUpperCase() : char;
                        return (
                          <button
                            key={char}
                            onClick={() => insertChar(showChar)}
                            className="min-w-8 h-9 px-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-white font-bold rounded-lg text-sm transition-all flex items-center justify-center cursor-pointer border border-slate-700"
                          >
                            {showChar}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Common Utilities Row */}
                <div className="flex gap-2 justify-center max-w-lg mx-auto pt-2">
                  <button
                    onClick={handleBackspace}
                    className="flex-1 h-10 px-4 bg-rose-950 hover:bg-rose-900 active:scale-95 text-rose-300 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1 border border-rose-900"
                  >
                    <Delete className="size-4" /> Backspace
                  </button>
                  <button
                    onClick={handleSpace}
                    className="w-48 h-10 bg-slate-700 hover:bg-slate-600 active:scale-95 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center border border-slate-600"
                  >
                    Space
                  </button>
                  <button
                    onClick={() => {
                      if (activeFieldName) {
                        setFormData((prev) => ({
                          ...prev,
                          [activeFieldName]: "",
                        }));
                      }
                    }}
                    className="flex-1 h-10 px-4 bg-slate-900 hover:bg-slate-800 active:scale-95 text-slate-400 font-bold rounded-xl text-xs transition-all flex items-center justify-center border border-slate-800"
                  >
                    Clear Field
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
      <Footer />
    </div>
  );
}
