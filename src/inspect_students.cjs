const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs } = require("firebase/firestore");

const firebaseConfig = {
  apiKey: "AIzaSyCfVSQggxj-kZ2yJAW2xB0BcupzfCJsowU",
  authDomain: "education-89c54.firebaseapp.com",
  projectId: "education-89c54",
  storageBucket: "education-89c54.appspot.com",
  messagingSenderId: "292663641725",
  appId: "1:292663641725:web:076b161074bb891513d314",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function inspect() {
  const usersSnap = await getDocs(collection(db, "users"));
  console.log("=== ALL STUDENTS IN USERS COLLECTION ===");
  usersSnap.docs.forEach((doc) => {
    const data = doc.data();
    if (data.role === "student") {
      console.log({
        docId: doc.id,
        name: data.name || data.fullName,
        class: data.class || data.currentClass,
        academicYear: data.academicYear,
        medium: data.medium,
        isSemiEnglish: data.isSemiEnglish,
        teacherId: data.teacherId,
        createdById: data.createdById
      });
    }
  });
}

inspect().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
