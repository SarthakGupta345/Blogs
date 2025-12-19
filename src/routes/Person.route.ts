import express from "express"
import { changeDetails, changeProfilePic, deleteProfilePic, deleteStory, getAllStoryFromUser, getPrivateAndPublicStories } from "../controllers/person.controller"

const router = express.Router()



router.put("/changeProfilePic", changeProfilePic)
router.delete("/deleteProfilePic", deleteProfilePic)
router.post("/changeDetails", changeDetails)
router.get("/getMe", changeDetails)
router.get("/getAllStories", getAllStoryFromUser);
router.get("/getPrivateAndPublicStories", getPrivateAndPublicStories)
router.delete("/deleteStory/:id", deleteStory)

export default router