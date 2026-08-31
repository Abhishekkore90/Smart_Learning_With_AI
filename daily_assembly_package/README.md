# Daily Assembly (दैनिक परिपाठ) - Full System Codebase

या झिप (Zip) फाईलमध्ये 'दैनिक परिपाठ' (Daily Assembly) या मॉड्यूलचे सर्व कोड सेक्शन्स समाविष्ट आहेत.

## 📁 फोल्डर रचना (Folder Structure)

```
daily_assembly_package/
├── admin/
│   ├── admin.assembly.tsx         (Super Admin - परिपाठ डेटा अपलोड, संपादक, chunking, HTML/PDF जनरेटर)
│   └── admin.module-payments.tsx  (परिपाठ मॉड्यूलचे पेमेंट व ॲक्सेस कंट्रोल व्यवस्थापन)
├── lib/
│   └── assemblyTranslations.ts    (परिपाठातील सर्व घटकांची सूची, डिफॉल्ट मजकूर व त्रिभाषिक भाषांतर - मराठी, हिंदी, इंग्रजी)
├── teacher/
│   ├── teacher.modules.$moduleId.tsx (शिक्षकांसाठी परिपाठ व्ह्यूअर, दैनिक परिपाठ, मासिक रजिस्टर, PDF डाउनलोड, व्हाट्सएप शेअर)
│   └── teacher.record-book.tsx    (शिक्षकांची मासिक परिपाठ नोंदवही)
└── README.md
```

---

## 📖 दैनिक परिपाठातील मुख्य १० घटक (Daily Assembly All 10 Sections):

1. **परिपाठ सुरुवात (Assembly Start)**:
   - 🇮🇳 **राष्ट्रगीत** (National Anthem)
   - 🚩 **राज्यगीत** (State Anthem - जय जय महाराष्ट्र माझा)
   - 🇮🇳 **प्रतिज्ञा** (Pledge)
   - 📜 **संविधान उद्देशिका** (Preamble of Constitution)
   - 🙏🏻 **प्रार्थना** (Prayer)
   - ✨ **पसायदान** (Pasayadan)

2. **आजचे पंचांग (Panchang / Calendar Details)**:
   - वार (Day), मास (Month), पक्ष (Paksha), तिथी (Tithi), नक्षत्र (Nakshatra), योग (Yog), सूर्योदय (Sunrise), सूर्यास्त (Sunset).

3. **सुविचार, श्लोक व म्हण (Thought, Shlok & Proverb)**:
   - **आजचा सुविचार** (Thought of the day)
   - **श्लोक** (Sanskrit Shlok)
   - **म्हण व अर्थ** (Proverb and its Meaning)

4. **दिनविशेष (Special Day & Historical Events)**:
   - **महत्त्वाच्या घटना** (Key Events in history on this date)
   - **जन्मदिवस / जयंती** (Birthdays / Anniversaries)
   - **स्मृतीदिन / पुण्यतिथी** (Deaths / Commemorations)

5. **बोधकथा (Moral Story)**:
   - कथेचे नाव, बोधप्रद कथा, तात्पर्य (Moral).

6. **मूल्यशिक्षण व बातमीपत्र (Value News & Updates)**:
   - मूल्यशिक्षण बातम्या (Value education & general news).

7. **सामान्य ज्ञान (General Knowledge / Quiz)**:
   - ४ वस्तुनिष्ठ प्रश्न आणि उत्तरे (GK Questions & Answers).

8. **समूहगीत / देशभक्तीपर गीत (Patriotic Song)**:
   - गीताचे शीर्षक व संपूर्ण काव्य.

9. **थोर व्यक्ती परिचय (Personality Profile)**:
   - थोर व्यक्तींचे जीवनचरित्र आणि कार्य.

10. **निर्मिती व क्रेडिट्स (Creator Info)**:
    - निर्मिती नाव व वर्ष.

---

## 🛠️ तंत्रज्ञान व वैशिष्ट्ये (Tech Stack & Features)

- **Frontend**: React (TanStack Router, Tailwind CSS, Lucide Icons)
- **Database**: Firebase Firestore (`admin_assembly_books`, `admin_assembly_chunks`)
- **Chunking Algorithm**: मोठ्या परिपाठ पुस्तकांसाठी JSON Automatic Chunking तंत्रज्ञान
- **Multilingual Support**: मराठी (mr), हिंदी (hi), इंग्रजी (en)
- **Export & Utility**: 
  - Direct HTML/PDF Printing & Download
  - Single Click WhatsApp Sharing Link
  - Audio / Speech Features
