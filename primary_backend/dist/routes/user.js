"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.userRouter = void 0;
const express_1 = require("express");
const zod_1 = __importDefault(require("zod"));
const prisma_1 = require("../lib/prisma");
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const dotenv_1 = __importDefault(require("dotenv"));
const Authenticate_1 = require("../middleware/Authenticate");
exports.userRouter = (0, express_1.Router)();
dotenv_1.default.config();
const JWT_SECRET = process.env.JWT_SECRET;
const UserSignup_SignInSchema = zod_1.default.object({
    username: zod_1.default.email('Invalid email format'),
    password: zod_1.default.string().min(4, "Password must be at least 4 characters ").max(10, 'Password must be at most 10 characters')
});
exports.userRouter.post('/signup', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { username, password } = req.body;
    const { success } = UserSignup_SignInSchema.safeParse({ username, password });
    if (!success) {
        return res.json({ message: 'Error while validating user input' }).status(400);
    }
    try {
        const existingUser = yield prisma_1.prisma.user.findUnique({
            where: { username: username }
        });
        if (existingUser)
            return res.json({ message: 'user already exist' }).status(409);
        //hashing password
        const hashedPassword = yield bcrypt_1.default.hash(password, 10);
        const user = yield prisma_1.prisma.user.create({
            data: { username, password: hashedPassword, usd_balance: 5000 },
            select: { id: true, username: true }
        });
        const token = jsonwebtoken_1.default.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '1h' });
        return res.json({ message: 'user Created successfully', token: token }).status(200);
    }
    catch (error) {
        console.log('Error while Signing Up ', error);
        return res.json({ message: 'Error while Signing Up' });
    }
}));
exports.userRouter.post('/signin', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { username, password } = req.body;
    // 1. Validate input
    const { success } = UserSignup_SignInSchema.safeParse({ username, password });
    if (!success) {
        return res.status(400).json({ message: 'Error while validating user input' });
    }
    try {
        // 2. Check if user exists
        const existingUser = yield prisma_1.prisma.user.findUnique({
            where: { username: username },
        });
        if (!existingUser) {
            return res.status(404).json({ message: 'User not found' });
        }
        // 3. Compare password with hashed password
        const isMatch = yield bcrypt_1.default.compare(password, existingUser.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        // 4. Generate token
        const token = jsonwebtoken_1.default.sign({ id: existingUser.id, username: existingUser.username }, JWT_SECRET, { expiresIn: '1h' });
        return res.status(200).json({ message: 'Signin successful', token });
    }
    catch (error) {
        console.log('Error while Signing In', error);
        return res.status(500).json({ message: 'Error while Signing In' });
    }
}));
exports.userRouter.get('/balance', Authenticate_1.authenticate, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    //getting user id 
    const userID = Number(req.userId);
    if (!userID)
        return res.status(411).json({ message: 'userID required' });
    const user = yield prisma_1.prisma.user.findUnique({ where: { id: userID }, select: { usd_balance: true } });
    if (!user)
        return res.status(404).json({ message: "User not found" });
    return res.json({ usd_balance: user === null || user === void 0 ? void 0 : user.usd_balance });
}));
