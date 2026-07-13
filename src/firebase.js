// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCfVSQggxj-kZ2yJAW2xB0BcupzfCJsowU",
  authDomain: "education-89c54.firebaseapp.com",
  projectId: "education-89c54",
  storageBucket: "education-89c54.firebasestorage.app",
  messagingSenderId: "292663641725",
  appId: "1:292663641725:web:076b161074bb891513d314",
  measurementId: "G-S4WJTJZ4XC",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
