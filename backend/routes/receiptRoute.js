import express from 'express';
import {verifyReceipt} from '../controllers/receipt.controller.js';

const router = express.Router();

router.get('/verify/:receiptNumber', verifyReceipt);

export default router;