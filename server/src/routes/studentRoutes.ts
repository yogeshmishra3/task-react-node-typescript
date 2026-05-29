import { Router } from 'express';
import {
  createStudent,
  getStudents,
  updateStudent,
  deleteStudent,
  loginStudent,
} from '../controllers/studentController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.post('/register', createStudent);
router.post('/login', loginStudent);
router.get('/students', authMiddleware, getStudents);
router.put('/student/:id', authMiddleware, updateStudent);
router.delete('/student/:id', authMiddleware, deleteStudent);

export default router;
