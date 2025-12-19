import express from "express"
import { loginMiddleware } from "../middlewares/loginMiddleware"
import { Logout, Signup, validateEmail, verifyOTP } from "../Controllers/Signup.controller"
const router = express.Router()


router.post("/signup", Signup)
router.put("/validateEmail", validateEmail)
router.put("/verifyOTP", verifyOTP)
router.post("/logout", loginMiddleware, Logout)


export default router