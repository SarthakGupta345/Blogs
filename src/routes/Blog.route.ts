import express from "express"
import { upload } from "../config/multer"
import { loginMiddleware } from "../middlewares/loginMiddleware"
import { AllBlogFromFollowing, commentOnBlog, getAllBlogFromUser, getBlog, getTrendingBlog, replyComment, toggleDislike, toggleLike } from "../Controllers/blog.controller"
import { createBlog } from "../Controllers/person.controller"
const router = express.Router()

router.get("/getStoryFromFollowing", loginMiddleware, AllBlogFromFollowing)
router.get("/getTrendingStory", getTrendingBlog)
router.get("/getFullBlog", getBlog)
router.put("/replyComment/:id", loginMiddleware, replyComment)
router.post("/CommentOnBlog",loginMiddleware, commentOnBlog)
router.put("/toggleLike/:id",loginMiddleware, toggleLike)
router.put("/toggleDislike", loginMiddleware, toggleDislike)
router.post("/createStory", upload.single("thumbnail"), createBlog)
router.get("/AllFromUser/:id", getAllBlogFromUser)


export default router