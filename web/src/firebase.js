import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Configuración de la web app "OAA Analisis Empresas"
// (proyecto bbdd-activos-financieros — la apiKey de Firebase es pública por diseño;
//  el acceso real lo controlan Firebase Auth, las reglas de Firestore y la API)
const firebaseConfig = {
  apiKey: 'AIzaSyBTidBD5AIs_7RMkV8qhsQNbnhwD_U3NCg',
  authDomain: 'bbdd-activos-financieros.firebaseapp.com',
  projectId: 'bbdd-activos-financieros',
  storageBucket: 'bbdd-activos-financieros.firebasestorage.app',
  messagingSenderId: '624747123295',
  appId: '1:624747123295:web:f31311320d1dd1122ec1ea'
};

export const ALLOWED_EMAILS = ['oantiza@gmail.com', 'aceberiognosspelius@gmail.com'];

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });