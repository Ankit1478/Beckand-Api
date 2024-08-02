// firebaseConfig.js
const { initializeApp } = require("firebase/app");
const { getStorage } = require("firebase/storage");
const { getDatabase } = require("firebase/database");

const firebaseConfig = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: "",
  measurementId: ""
};
const app = initializeApp(firebaseConfig);
const storage = getStorage(app);
const database = getDatabase(app);

module.exports = { storage, database };
