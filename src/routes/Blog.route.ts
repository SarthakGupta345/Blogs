import express from "express"
import { AllStory, AllStoryFromFollowing, commentOnStory, createStory, DisLikeStory, FullStory, LikeStory, replyComment, ReportStory, TrendingStory } from "../controllers/blog.controller"
import { upload } from "../config/multer"
import { loginMiddleware } from "../middleware/LoginMiddleware"
const router = express.Router()

router.get("/getAllStory/:Page/:limit",AllStory)
router.get("/getStoryFromFollowing",loginMiddleware,AllStoryFromFollowing)
router.get("/getTrendingStory",TrendingStory)
router.get("/getFullStory",FullStory)
router.put("/replyComment/:id",loginMiddleware,replyComment)
router.post("/CommentOnStory",loginMiddleware,commentOnStory)
router.put("/LikeStory/:id",loginMiddleware,LikeStory)
router.put("/DisLikeStory",loginMiddleware,DisLikeStory)
router.put("/ReportStory/:id",ReportStory)
router.post("/createStory",upload.single("thumbnail"),createStory)

export default router