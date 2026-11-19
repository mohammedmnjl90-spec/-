/**
 * ملف إعدادات الربط السحابي (firebaseConfig.js)
 * مشروع Firebase: waled-alsh — تطبيق «قمة التحدي» (Peak of Challenge)
 */

import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

export const firebaseConfig = {
  apiKey: "AIzaSyDisDgIW4wAYFlkjic10mwdOVo-FB99yFs",
  authDomain: "waled-alsh.firebaseapp.com",
  projectId: "waled-alsh",
  storageBucket: "waled-alsh.firebasestorage.app",
  messagingSenderId: "739687298867",
  appId: "1:739687298867:web:11bf6c308d8f8e4aca3046",
  measurementId: "G-223YJZ915R"
};

export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);
