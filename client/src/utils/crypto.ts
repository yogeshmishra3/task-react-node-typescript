import CryptoJS from 'crypto-js';

// Level 1 Encryption Key (loaded from environment variable)
const FRONTEND_KEY = process.env.REACT_APP_FRONTEND_ENCRYPTION_KEY || 'frontend-secret-key-change-in-production-32char!';

// Level 1 Encryption: Applied by frontend before sending to backend
export const encryptLevel1 = (data: string): string => {
  return CryptoJS.AES.encrypt(data, FRONTEND_KEY).toString();
};

// Level 1 Decryption: Applied by frontend after receiving from backend
export const decryptLevel1 = (encryptedData: string): string => {
  const bytes = CryptoJS.AES.decrypt(encryptedData, FRONTEND_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
};

// Encrypt all student fields before sending to backend
export const encryptStudentData = (data: Record<string, string>): Record<string, string> => {
  const encrypted: Record<string, string> = {};
  for (const [key, value] of Object.entries(data)) {
    if (key === 'password') {
      encrypted[key] = value; // Password will be hashed by backend
    } else {
      encrypted[key] = encryptLevel1(value);
    }
  }
  return encrypted;
};

// Decrypt all student fields received from backend
export const decryptStudentData = (data: Record<string, any>): Record<string, any> => {
  const decrypted: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (key === '_id' || key === 'createdAt' || key === 'updatedAt') {
      decrypted[key] = value;
    } else if (typeof value === 'string') {
      try {
        decrypted[key] = decryptLevel1(value);
      } catch {
        decrypted[key] = value;
      }
    } else {
      decrypted[key] = value;
    }
  }
  return decrypted;
};
