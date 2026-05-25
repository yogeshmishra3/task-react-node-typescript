import CryptoJS from 'crypto-js';
import dotenv from 'dotenv';

dotenv.config();

const BACKEND_KEY = process.env.BACKEND_ENCRYPTION_KEY || 'default-backend-key-32characters!!';

// Level 2 Encryption: Applied by backend before storing in MongoDB
export const encryptLevel2 = (data: string): string => {
  return CryptoJS.AES.encrypt(data, BACKEND_KEY).toString();
};

// Level 2 Decryption: Applied by backend when fetching from MongoDB
export const decryptLevel2 = (encryptedData: string): string => {
  const bytes = CryptoJS.AES.decrypt(encryptedData, BACKEND_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
};
