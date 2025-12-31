import express, { Request, Response } from "express"
import { loginMiddleware } from "../middlewares/loginMiddleware"
import { loginWithEmail, Logout, Signup, validateEmail, validateEmailLogin, verifyOTP } from "../Controllers/Signup.controller"
import { prisma } from "../config/prisma"
const router = express.Router()


router.post("/signup", Signup)
router.put("/validateEmail", validateEmail)
router.put("/verifyOTP", verifyOTP)
router.post("/logout", loginMiddleware, Logout)
router.post("/loginWithEmail",loginWithEmail)
router.put("/verifyLoginEmail",validateEmailLogin)


export default router