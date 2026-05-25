# Student Registration System with 2-Level Encryption

A full-stack application featuring Login & Student Registration with CRUD operations, secured with 2-level AES encryption.

## Tech Stack

| Layer      | Technology                  |
| ---------- | --------------------------- |
| Frontend   | React + TypeScript          |
| Backend    | Node.js + Express + TypeScript |
| Database   | MongoDB                     |
| Encryption | AES (crypto-js) + bcrypt    |

## How Encryption Works

This application implements **2-level AES encryption** to ensure data security at every stage:

### Encryption Flow (Create/Update)

```
[User Input] → Level 1 AES Encrypt (Frontend) → Send to Backend → Level 2 AES Encrypt (Backend) → Store in MongoDB
```

1. **Level 1 (Frontend - `client/src/utils/crypto.ts`):** Before sending data to the backend, the frontend encrypts all sensitive fields using AES encryption with a frontend secret key.

2. **Level 2 (Backend - `server/src/utils/crypto.ts`):** The backend receives the already-encrypted data and applies a second layer of AES encryption using a different backend secret key before storing in MongoDB.

### Decryption Flow (Read/Fetch)

```
[MongoDB] → Level 2 AES Decrypt (Backend) → Send to Frontend → Level 1 AES Decrypt (Frontend) → Display to User
```

1. **Backend** fetches the doubly-encrypted data from MongoDB and removes Level 2 encryption.
2. **Frontend** receives Level 1 encrypted data and decrypts it for display.

### Login Flow

- Login sends **plaintext** email & password (no Level 1 encryption needed for login).
- Backend **fully decrypts** stored emails (Level 2 → Level 1 → plaintext) to find the matching student.
- Password is validated with `bcrypt.compare()` against the stored hash.
- This is necessary because AES uses a random salt — the same plaintext produces different ciphertext each time, so encrypted values can't be compared directly.

### Password Handling

- Passwords are **hashed** using bcrypt (not encrypted) — they cannot be reversed.
- Login validation uses `bcrypt.compare()` against the stored hash.

### Validations

**Frontend (React):**
- Full Name: required, 2–100 chars, letters/spaces only
- Email: required, valid email format
- Phone: required, 7–15 digits (optional `+` prefix)
- Date of Birth: required, must be in the past
- Gender: required, must be Male/Female/Other
- Address: required, 5–300 chars
- Course: required, min 2 chars
- Password: min 6 chars, at least 1 uppercase letter, at least 1 number

**Backend (Express):**
- All required fields validated for presence (non-empty strings)
- Duplicate email detection (full decrypt + case-insensitive compare)
- MongoDB ObjectId validation for `:id` params
- Proper HTTP error codes (400, 401, 404, 500)

## Setup Instructions

### Prerequisites

- Node.js (v16+)
- MongoDB running locally (or MongoDB Atlas URI)
- npm or yarn

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd task-react-node-typescript
```

### 2. Backend Setup

```bash
cd server
npm install
```

Create a `.env` file in `server/` (or modify the existing one):

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/student_registration
BACKEND_ENCRYPTION_KEY=your-backend-secret-key-32-chars!!
FRONTEND_ENCRYPTION_KEY=your-frontend-secret-key-32-chars!!
```

Start the backend:

```bash
npm run dev
```

### 3. Frontend Setup

```bash
cd client
npm install
npm start
```

The app will open at `http://localhost:3000`.

### 4. MongoDB

Make sure MongoDB is running locally on port 27017, or update `MONGODB_URI` in the `.env` file to point to your MongoDB Atlas cluster.

## API Routes

| Method | Route              | Description         |
| ------ | ------------------ | ------------------- |
| POST   | `/api/register`    | Create new student  |
| POST   | `/api/login`       | Student login       |
| GET    | `/api/students`    | Get all students    |
| PUT    | `/api/student/:id` | Update a student    |
| DELETE | `/api/student/:id` | Delete a student    |

## Features

- Login form with email & password validation
- Student registration with 8 fields
- Full CRUD operations (Create, Read, Update, Delete)
- 2-level AES encryption for all sensitive data
- Password hashing with bcrypt
- Responsive UI with clean design
- Error handling and form validation

## Folder Structure

```
task-react-node-typescript/
 ┣ client/                    (React frontend)
 ┃ ┣ src/
 ┃ ┃ ┣ components/
 ┃ ┃ ┃ ┣ LoginForm.tsx
 ┃ ┃ ┃ ┣ StudentForm.tsx
 ┃ ┃ ┃ ┣ StudentList.tsx
 ┃ ┃ ┣ utils/
 ┃ ┃ ┃ ┗ crypto.ts            (Level 1 - Frontend encryption)
 ┃ ┃ ┣ App.tsx
 ┃ ┃ ┣ App.css
 ┃ ┃ ┣ index.tsx
 ┣ server/                    (Node + Express backend)
 ┃ ┣ src/
 ┃ ┃ ┣ routes/
 ┃ ┃ ┃ ┗ studentRoutes.ts
 ┃ ┃ ┣ controllers/
 ┃ ┃ ┃ ┗ studentController.ts
 ┃ ┃ ┣ models/
 ┃ ┃ ┃ ┗ Student.ts
 ┃ ┃ ┣ utils/
 ┃ ┃ ┃ ┗ crypto.ts            (Level 2 - Backend encryption)
 ┃ ┃ ┣ app.ts
 ┃ ┃ ┣ server.ts
 ┣ README.md
```

## Security Note

> In production, replace the encryption keys in `.env` with strong, randomly generated keys and never commit `.env` files to version control. Add `.env` to your `.gitignore`.
