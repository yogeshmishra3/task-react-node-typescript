import CryptoJS from 'crypto-js';
import dotenv from 'dotenv';

dotenv.config();

const BACKEND_KEY = process.env.BACKEND_ENCRYPTION_KEY || 'default-backend-key-32characters!!';
const FRONTEND_KEY = process.env.FRONTEND_ENCRYPTION_KEY || 'default-frontend-key-32characters!';

// ── Level 2 (Backend layer) ──────────────────────────────────
export const encryptLevel2 = (data: string): string => {
  return CryptoJS.AES.encrypt(data, BACKEND_KEY).toString();
};

export const decryptLevel2 = (encryptedData: string): string => {
  const bytes = CryptoJS.AES.decrypt(encryptedData, BACKEND_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
};

// ── Level 1 (Frontend layer — needed on backend for login comparison) ─
export const decryptLevel1 = (encryptedData: string): string => {
  const bytes = CryptoJS.AES.decrypt(encryptedData, FRONTEND_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
};

// ── Helpers ──────────────────────────────────────────────────
// Fully decrypt a field: remove Level 2 then Level 1 → plaintext
export const decryptFull = (encryptedData: string): string => {
  const afterLevel2 = decryptLevel2(encryptedData); // removes backend layer
  const plaintext = decryptLevel1(afterLevel2);       // removes frontend layer
  return plaintext;
};
