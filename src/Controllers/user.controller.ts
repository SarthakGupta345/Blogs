import { Request, Response } from "express";
import { deleteFromS3 } from "../config/aws/s3/deleteObject";
import { uploadToS3 } from "../config/aws/s3/putObject";
import { success } from "zod";
import { prisma } from "../config/prisma";
import { idSchema } from "../Schema/auth.schema";
import { logger } from "../config/logger/logger";

export const changeProfilePic = async (req: Request, res: Response) => {
    try {
        const currentUserID = req.user?.userID;

        if (!currentUserID) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized User",
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "Image is required",
            });
        }

        const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp"];
        if (!allowedMimeTypes.includes(req.file.mimetype)) {
            return res.status(400).json({
                success: false,
                message: "Invalid file format. Only JPEG, PNG, and WEBP allowed",
            });
        }

        const existingUser = await prisma.user.findUnique({
            where: { id: currentUserID },
            select: { profilePhoto: true },
        });

        if (!existingUser) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        // Generate new file name (unique+safe)
        const fileExtension = req.file.originalname.split(".").pop();
        const newFileKey = `profile/${currentUserID}-${Date.now()}.${fileExtension}`;

        // Upload new image to S3
        const uploadedUrl = await uploadToS3(
            req.file.buffer,
            newFileKey,
            req.file.mimetype
        );

        // Delete old image from S3 (only after new upload successful)
        if (existingUser.profilePhoto) {
            const oldKey = existingUser.profilePhoto.split("/").pop(); // extract key
            await deleteFromS3(`profile/${oldKey}`).catch(() => { });
        }

        await prisma.user.update({
            where: { id: currentUserID },
            data: { profilePhoto: uploadedUrl },
        });

        return res.status(200).json({
            success: true,
            message: "Profile picture updated successfully",
            profilePhoto: uploadedUrl,
        });
    } catch (error) {
        console.error("Error Updating Profile Photo:", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
};


export const deleteProfilePic = async (req: Request, res: Response) => {
    try {
        const currentUserID = req.user?.userID;

        if (!currentUserID) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized user",
            });
        }

        // Fetch user including profile photo URL
        const userData = await prisma.user.findUnique({
            where: { id: currentUserID },
            select: { profilePhoto: true },
        });

        if (!userData) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        if (!userData.profilePhoto) {
            return res.status(400).json({
                success: false,
                message: "No profile picture to delete",
            });
        }

        // Extract file key from full S3 URL
        const s3Key = userData.profilePhoto.split("/").pop(); // "id-timestamp.jpg"
        if (!s3Key) {
            return res.status(400).json({
                success: false,
                message: "Invalid image key",
            });
        }

        // Attempt to delete from S3 (silent handling for non-existing)
        try {
            await deleteFromS3(`profile/${s3Key}`);
        } catch (err) {
            console.warn("Failed to delete from S3 (ignored):", err);
        }

        await prisma.user.update({
            where: { id: currentUserID },
            data: { profilePhoto: null },
        });

        return res.status(200).json({
            success: true,
            message: "Profile picture deleted successfully",
        });
    } catch (error) {
        console.error("Error deleting profile picture:", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
};


export const changeDetails = async (req: Request, res: Response) => {
    try {

    } catch (error) {

    }

}


export const FollowAndUnfollow = async (req: Request, res: Response) => {
    try {
        const currentUserID = req.user?.userID;

        if (!currentUserID) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized user"
            });
        }

        const parsed = idSchema.safeParse(req.params);

        if (!parsed.success) {
            return res.status(400).json({
                success: false,
                message: parsed.error.issues[0].message
            });
        }

        const targetUserID = parsed.data.Id;

        if (targetUserID === currentUserID) {
            return res.status(400).json({
                success: false,
                message: "You cannot follow yourself"
            });
        }

        const targetUser = await prisma.user.findUnique({
            where: { id: targetUserID }
        });

        if (!targetUser) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        const existingFollow = await prisma.follow.findUnique({
            where: {
                followerID_followingID: {
                    followerID: currentUserID,
                    followingID: targetUserID
                }
            }
        });

        if (existingFollow) {
            await prisma.follow.delete({
                where: {
                    followerID_followingID: {
                        followerID: currentUserID,
                        followingID: targetUserID
                    }
                }
            });

            return res.status(200).json({
                success: true,
                message: "Unfollowed successfully"
            });
        }

        await prisma.follow.create({
            data: {
                followerID: currentUserID,
                followingID: targetUserID
            }
        });

        return res.status(200).json({
            success: true,
            message: "Followed successfully"
        });

    } catch (error) {
        logger.error(`Error following/unfollowing user: ${error}`);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
};



export const deleteBlog = async (req: Request, res: Response) => {
    try {
        const validId = idSchema.safeParse(req.params.id);
        const currentUserID = req.user?.userID
        if (!validId.success) {
            return res.status(400).json({
                success: false,
                message: validId.error.issues[0].message
            })
        }

        const blog = await prisma.blog.findFirst({
            where: {
                id: validId.data.Id
            }
        })
        if (!blog) {
            return res.status(404).json({
                success: false,
                message: "Story not found"
            })
        }
        if (blog.userID !== currentUserID) {
            logger.warn(`Unauthorized attempt to delete story ${validId.data.Id} by user ${currentUserID}`);
            return res.status(401).json({
                success: false,
                message: "Unauthorized User"
            })
        }

        await prisma.blog.delete({
            where: {
                id: validId.data.Id
            }
        })
        return res.status(200).json({
            success: true,
            message: "Story deleted successfully"
        })
    } catch (error) {
        logger.error(`Error deleting story: ${error}`);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
}


export const getAllStoryFromUser = async (req: Request, res: Response) => {
    try {
        const currentUserID = req.user?.userID;

        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 10;

        const skip = (page - 1) * limit;

        const blog = await prisma.blog.findMany({
            where: {
                userID: currentUserID,
            },
            skip,
            take: limit,
            orderBy: {
                createdAt: "desc",
            },
        });

        const totalCount = await prisma.blog.count({
            where: {
                userID: currentUserID,
            },
        });

        if (!stories || stories.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No stories found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Stories fetched successfully",
            data: stories,
            pagination: {
                total: totalCount,
                page,
                limit,
                totalPages: Math.ceil(totalCount / limit),
                hasNextPage: page < Math.ceil(totalCount / limit),
                hasPreviousPage: page > 1,
            },
        });

    } catch (error) {
        logger.error(`Error getting stories: ${error}`);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
};


export const getPrivateAndPublicStories = async (req: Request, res: Response) => {
    try {
        const currentUserID = req.user?.userID;
        const { isPrivate } = req.query;
        if (!isPrivate) return res.status(400).json({ success: false, message: "isPrivate is required" })

        if (isPrivate !== "true" && isPrivate !== "false") return res.status(400).json({ success: false, message: "isPrivate must be true or false" })

        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 10;

        const skip = (page - 1) * limit;

        const stories = await prisma.blog.findMany({
            where: {
                userID: currentUserID,
                isPublish: isPrivate === "true"
            },
            skip,
            take: limit,
            orderBy: {
                createdAt: "desc",
            },
        });

        const totalCount = await prisma.stories.count({
            where: {
                userID: currentUserID,
            },
        });

        if (!stories || stories.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No stories found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Stories fetched successfully",
            data: stories,
            pagination: {
                total: totalCount,
                page,
                limit,
                totalPages: Math.ceil(totalCount / limit),
                hasNextPage: page < Math.ceil(totalCount / limit),
                hasPreviousPage: page > 1,
            },
        });

    } catch (error) {
        logger.error(`Error getting stories: ${error}`);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
}


export const SavedStory = async (req: Request, res: Response) => {
    try {
        const currentUserID = req.user?.userID;

        const validStory = idSchema.safeParse(req.params.id);
        if (!validStory.success) {
            return res.status(400).json({
                success: false,
                message: validStory.error.issues[0].message,
            });
        }

        if (!currentUserID) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized User",
            });
        }

        const storyID = validStory.data.Id;

        // check if already saved
        const existing = await prisma.savedStory.findUnique({
            where: {
                userID_storyID: {
                    userID: currentUserID,
                    storyID,
                },
            },
        });

        if (existing) {
            return res.status(400).json({
                success: false,
                message: "Story Already Saved"
            })
        }
        // ✔ Not saved → create it
        await prisma.savedStory.create({
            data: {
                userID: currentUserID,
                storyID,
            },
        });

        return res.status(200).json({
            success: true,
            message: "Story saved successfully",
        });

    } catch (error: any) {
        logger.error(`Error saving story: ${error}`);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
};


export const UnsaveStory = async (req: Request, res: Response) => {
    try {

        const currentUserID = req.user?.userID;
        const validStory = idSchema.safeParse(req.params.id);
        if (!validStory.success) {
            return res.status(400).json({
                success: false,
                message: validStory.error.issues[0].message,
            });
        }

        if (!currentUserID) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized User",
            });
        }

        const storyID = validStory.data.Id;

        // check if already saved
        const existing = await prisma.savedStory.findUnique({
            where: {
                userID_storyID: {
                    userID: currentUserID,
                    storyID,
                },
            },
        });

        if (!existing) {
            return res.status(400).json({
                success: false,
                message: "Story Not saved "
            })
        }
        // ✔ Not saved → create it
        await prisma.savedStory.delete({
            data: {
                userID: currentUserID,
                storyID,
            },
        });

        return res.status(200).json({
            success: true,
            message: "Story Unsaved successfully",
        });

    } catch (error: any) {
        logger.error(`Error Unsaving story: ${error}`);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
}


