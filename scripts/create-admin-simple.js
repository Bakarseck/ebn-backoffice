/**
 * Script simple pour créer un utilisateur admin dans Firestore
 * Ce script utilise le SDK Firebase client pour créer le document Firestore
 * 
 * Utilisation: node scripts/create-admin-simple.js
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc, serverTimestamp } = require('firebase/firestore');

// Configuration Firebase
const firebaseConfig = {
  apiKey: "AIzaSyB09j-wLtU7KY14lGLR9qJMKYyzT54N5mI",
  authDomain: "ebn-express.firebaseapp.com",
  projectId: "ebn-express",
  storageBucket: "ebn-express.firebasestorage.app",
  messagingSenderId: "1089123320592",
  appId: "1:1089123320592:web:f7bd8f547f6ea094b81b95",
  measurementId: "G-P0Q2LN48FV",
};

// Données de l'utilisateur admin
const adminUser = {
  email: "seck@gmail.com",
  password: "ababacar",
  name: "Bakar SECK",
  phone: "762773266",
  role: "admin"
};

async function createAdmin() {
  try {
    console.log('Initialisation de Firebase...');
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    console.log('Création du document Firestore...');
    
    // Créer le document dans Firestore avec email comme ID
    // Quand l'utilisateur se connectera, le système mettra à jour automatiquement avec l'UID Firebase Auth
    await setDoc(doc(db, 'users', adminUser.email), {
      email: adminUser.email,
      name: adminUser.name,
      phone: adminUser.phone,
      role: adminUser.role,
      _tempPassword: adminUser.password, // Stocké temporairement pour référence
      _needsAuthAccount: true, // Indique que le compte Firebase Auth doit être créé
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    console.log('✅ Document Firestore créé avec succès!');
    console.log(`\n📋 Informations de l'utilisateur:`);
    console.log(`   Email: ${adminUser.email}`);
    console.log(`   Nom: ${adminUser.name}`);
    console.log(`   Téléphone: ${adminUser.phone}`);
    console.log(`   Rôle: ${adminUser.role}`);
    console.log(`   Mot de passe: ${adminUser.password}`);
    
    console.log('\n📝 ÉTAPES SUIVANTES pour créer le compte Firebase Auth:');
    console.log('1. Allez dans Firebase Console: https://console.firebase.google.com/');
    console.log('2. Sélectionnez le projet "ebn-express"');
    console.log('3. Allez dans "Authentication" > "Users"');
    console.log('4. Cliquez sur "Add user"');
    console.log(`5. Entrez l'email: ${adminUser.email}`);
    console.log(`6. Entrez le mot de passe: ${adminUser.password}`);
    console.log('7. Cochez "Email verified"');
    console.log('8. Cliquez sur "Add user"');
    console.log('\n✅ Une fois le compte Firebase Auth créé, vous pourrez vous connecter au backoffice!');
    console.log('   Le système mettra automatiquement à jour le document Firestore avec l\'UID Firebase Auth lors de la première connexion.');

  } catch (error) {
    console.error('❌ Erreur lors de la création du document:', error);
    if (error.code === 'permission-denied') {
      console.log('\n⚠️  Erreur de permissions. Assurez-vous que les règles Firestore permettent la création de documents.');
    }
    process.exit(1);
  }
}

createAdmin();

