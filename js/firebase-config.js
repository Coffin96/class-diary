// ============================================================
// КОНФІГУРАЦІЯ FIREBASE
// Замініть значення нижче на свої дані з Firebase Console
// https://console.firebase.google.com/
// ============================================================

// --- ШАБЛОН (замініть значення на свої з Firebase Console) ---
// const firebaseConfig = {
//     apiKey: "ВАШ_API_KEY",
//     authDomain: "ваш-проект.firebaseapp.com",
//     databaseURL: "https://ваш-проект-default-rtdb.europe-west1.firebasedatabase.app",
//     projectId: "ваш-проект",
//     storageBucket: "ваш-проект.firebasestorage.app",
//     messagingSenderId: "000000000000",
//     appId: "1:000000000000:web:0000000000000000"
// };

const firebaseConfig = {
    apiKey: "AIzaSyBPkx3qZTfSPKT3Tsv4Kn46mUid7FwzJvk",
    authDomain: "class-diary-ad68c.firebaseapp.com",
    databaseURL: "https://class-diary-ad68c-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "class-diary-ad68c",
    storageBucket: "class-diary-ad68c.firebasestorage.app",
    messagingSenderId: "380929228361",
    appId: "1:380929228361:web:39dcf42438d341fe170998",
    measurementId: "G-SZFM4VE73F"
};

// --- Ініціалізація Firebase ---
let db = null;
let firebaseInitialized = false;

try {
    firebase.initializeApp(firebaseConfig);
    db = firebase.database();
    firebaseInitialized = true;
    console.log('✓ Firebase підключено');
} catch (error) {
    console.error('✗ Помилка Firebase:', error);
}
