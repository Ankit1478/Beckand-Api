// firebaseConfig.js
const { initializeApp } = require("firebase/app");
const { getStorage } = require("firebase/storage");
const { getDatabase } = require("firebase/database");

const firebaseConfig = {
  apiKey: "AIzaSyBq1WKVeejEwilfUFxYj0nQBEDqndoKWY8",
  authDomain: "fir-b4325.firebaseapp.com",
  projectId: "fir-b4325",
  storageBucket: "fir-b4325.appspot.com",
  messagingSenderId: "470772458585",
  appId: "1:470772458585:web:d42152df5d32e118e9bd48",
  measurementId: "G-Y3RB3WR9GB"
};
const app = initializeApp(firebaseConfig);
const storage = getStorage(app);
const database = getDatabase(app);

module.exports = { storage, database };