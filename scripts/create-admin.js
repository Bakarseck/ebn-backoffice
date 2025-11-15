/**
 * Script pour créer un utilisateur admin
 * 
 * Utilisation:
 * 1. Avec Firebase Admin SDK (recommandé):
 *    - Installez firebase-admin: npm install firebase-admin
 *    - Téléchargez votre clé de service Firebase depuis Firebase Console
 *    - Placez le fichier de clé dans le répertoire du projet
 *    - Modifiez le chemin vers la clé de service ci-dessous
 *    - Exécutez: node scripts/create-admin.js
 * 
 * 2. Sans Firebase Admin SDK:
 *    - Ce script créera seulement le document Firestore
 *    - Vous devrez créer le compte Firebase Auth manuellement dans la console Firebase
 *    - Exécutez: node scripts/create-admin.js --firestore-only
 */

const admin = require('firebase-admin');
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc, serverTimestamp } = require('firebase/firestore');

// Configuration Firebase (depuis lib/firebase.ts)
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

async function createAdminWithAdminSDK() {
  try {
    // Initialiser Firebase Admin SDK
    // Remplacez le chemin vers votre clé de service Firebase
    const serviceAccount = require('../path/to/your/serviceAccountKey.json');
    
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: firebaseConfig.projectId,
      });
    }

    console.log('Création de l\'utilisateur Firebase Auth...');
    
    // Créer l'utilisateur dans Firebase Auth
    const userRecord = await admin.auth().createUser({
      email: adminUser.email,
      password: adminUser.password,
      displayName: adminUser.name,
      emailVerified: true,
    });

    console.log('Utilisateur Firebase Auth créé avec succès:', userRecord.uid);

    // Créer le document dans Firestore
    const db = admin.firestore();
    await db.collection('users').doc(userRecord.uid).set({
      email: adminUser.email,
      name: adminUser.name,
      phone: adminUser.phone,
      role: adminUser.role,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log('Document Firestore créé avec succès!');
    console.log('\n✅ Utilisateur admin créé avec succès!');
    console.log(`Email: ${adminUser.email}`);
    console.log(`Mot de passe: ${adminUser.password}`);
    console.log(`UID: ${userRecord.uid}`);
    console.log('\nVous pouvez maintenant vous connecter au backoffice.');

  } catch (error) {
    console.error('Erreur lors de la création de l\'utilisateur:', error);
    if (error.code === 'auth/email-already-exists') {
      console.log('\n⚠️  L\'utilisateur existe déjà dans Firebase Auth.');
      console.log('Vérifiez si le document Firestore existe également.');
    }
    process.exit(1);
  }
}

async function createAdminFirestoreOnly() {
  try {
    console.log('Création du document Firestore uniquement...');
    
    // Initialiser Firebase (client SDK)
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    // Créer le document dans Firestore avec email comme ID temporaire
    await setDoc(doc(db, 'users', adminUser.email), {
      email: adminUser.email,
      name: adminUser.name,
      phone: adminUser.phone,
      role: adminUser.role,
      _tempPassword: adminUser.password,
      _needsAuthAccount: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    console.log('Document Firestore créé avec succès!');
    console.log('\n📝 ÉTAPES SUIVANTES:');
    console.log('1. Allez dans Firebase Console > Authentication > Users');
    console.log(`2. Cliquez sur "Add user" et créez un utilisateur avec:`);
    console.log(`   - Email: ${adminUser.email}`);
    console.log(`   - Mot de passe: ${adminUser.password}`);
    console.log(`   - Cochez "Email verified"`);
    console.log('3. Copiez l\'UID de l\'utilisateur créé');
    console.log(`4. Dans Firestore, mettez à jour le document "users/${adminUser.email}"`);
    console.log('   - Remplacez l\'ID du document par l\'UID Firebase Auth');
    console.log('   - Supprimez les champs "_tempPassword" et "_needsAuthAccount"');
    console.log('\nOU');
    console.log('Connectez-vous avec cet email/mot de passe - le système mettra à jour automatiquement le document.');

  } catch (error) {
    console.error('Erreur lors de la création du document Firestore:', error);
    process.exit(1);
  }
}

// Vérifier les arguments de la ligne de commande
const args = process.argv.slice(2);
const firestoreOnly = args.includes('--firestore-only');

if (firestoreOnly) {
  createAdminFirestoreOnly();
} else {
  // Essayer d'utiliser Firebase Admin SDK
  try {
    createAdminWithAdminSDK();
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      console.log('⚠️  Firebase Admin SDK non trouvé. Création du document Firestore uniquement...');
      console.log('Pour créer aussi le compte Firebase Auth, installez firebase-admin et configurez la clé de service.\n');
      createAdminFirestoreOnly();
    } else {
      throw error;
    }
  }
}

