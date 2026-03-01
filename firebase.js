import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  getDocs,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyB0ntUZ8pz9qlS0KDLQZ3cBlGFlagSlFp0",
  authDomain: "roguelike-1821a.firebaseapp.com",
  projectId: "roguelike-1821a",
  storageBucket: "roguelike-1821a.firebasestorage.app",
  messagingSenderId: "277847857996",
  appId: "1:277847857996:web:780c46b290308a91a00de9",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export async function saveScore(name, score) {
  if (!name) name = "Player";
  await addDoc(collection(db, "rankings"), {
    name,
    score,
    createdAt: Date.now(),
  });
}

export async function getTopRankings() {
  const q = query(
    collection(db, "rankings"),
    orderBy("score", "desc"),
    limit(10),
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => doc.data());
}
