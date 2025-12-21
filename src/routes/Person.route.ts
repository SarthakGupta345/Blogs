import express from "express"
import { changeDetails, changeProfilePic, deleteBlog, deleteProfilePic, getMe, saveBlog, toggleFollow, unsaveBlog } from "../Controllers/person.controller"
import { loginMiddleware } from "../middlewares/loginMiddleware"

const router = express.Router()


router.use(loginMiddleware)

router.put("/changeProfilePic", changeProfilePic)
router.delete("/deleteProfilePic", deleteProfilePic)
router.post("/changeDetails", changeDetails)
router.get("/getMe", getMe)
router.delete("/deleteBlog/:id", deleteBlog)
router.put("/savedBlog/:id", saveBlog)
router.put("/unsavedBlog/:id", unsaveBlog)
router.put("/toggleFollow/:id", toggleFollow)



export default router