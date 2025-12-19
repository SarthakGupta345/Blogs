import { Request, Response } from "express";
import { prisma } from "../config/prisma";
import { deleteFromS3 } from "../config/aws/s3/deleteObject";
import { uploadToS3 } from "../config/aws/s3/putObject";
import { success } from "zod";
import { idSchema } from "../Schema/auth.schema";
import { logger } from "../config/Logger/logger";
import { Prisma } from "../../generated/prisma/client";


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
  } catch (error) { }
};

export const toggleFollow = async (req: Request, res: Response) => {
  const currentUserID = req.user?.userID;

  if (!currentUserID) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized",
    });
  }

  const parsed = idSchema.safeParse(req.params);
  if (!parsed.success) {
    logger.warn("Invalid target user id", {
      issues: parsed.error.issues,
      userID: currentUserID,
    });

    return res.status(400).json({
      success: false,
      message: "Invalid user id",
    });
  }

  const targetUserID = parsed.data.Id;

  if (targetUserID === currentUserID) {
    return res.status(400).json({
      success: false,
      message: "You cannot follow yourself",
    });
  }

  try {

    const exists = await prisma.user.findUnique({
      where: { id: targetUserID },
      select: { id: true },
    });

    if (!exists) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    try {
      await prisma.follow.create({
        data: {
          followerID: currentUserID,
          followingID: targetUserID,
        },
      });

      return res.status(200).json({
        success: true,
        message: "Followed successfully",
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {

        await prisma.follow.delete({
          where: {
            followerID_followingID: {
              followerID: currentUserID,
              followingID: targetUserID,
            },
          },
        });

        return res.status(200).json({
          success: true,
          message: "Unfollowed successfully",
        });
      }

      throw error;
    }
  } catch (error) {
    logger.error("Error toggling follow", {
      error,
      userID: currentUserID,
      targetUserID,
    });

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const deleteBlog = async (req: Request, res: Response) => {
  const currentUserID = req.user?.userID;

  if (!currentUserID) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized",
    });
  }

  const parsed = idSchema.safeParse(req.params);
  if (!parsed.success) {
    logger.warn("Invalid blog id", {
      issues: parsed.error.issues,
      userID: currentUserID,
    });

    return res.status(400).json({
      success: false,
      message: "Invalid blog id",
    });
  }

  const blogID = parsed.data.Id;

  try {

    await prisma.blog.delete({
      where: {
        id_UserID: {
          id: blogID,
          userID: currentUserID
        }
      },
    });

    return res.status(200).json({
      success: true,
      message: "Story deleted successfully",
    });
  } catch (error) {

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return res.status(404).json({
        success: false,
        message: "Story not found or access denied",
      });
    }

    logger.error("Error deleting story", {
      error,
      userID: currentUserID,
      blogID,
    });

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const getAllBlogFromUser = async (req: Request, res: Response) => {
  const currentUserID = req.user?.userID;

  if (!currentUserID) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized",
    });
  }

  // Validate user id param
  const parsed = idSchema.safeParse(req.params);
  if (!parsed.success) {
    logger.warn("Invalid user id", {
      issues: parsed.error.issues,
      userID: currentUserID,
    });

    return res.status(400).json({
      success: false,
      message: "Invalid user id",
    });
  }

  const userID = parsed.data.Id;

  // Safe pagination
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 20);
  const skip = (page - 1) * limit;

  try {
    // Ensure target user exists
    const userExists = await prisma.user.findUnique({
      where: { id: userID },
      select: { id: true },
    });

    if (!userExists) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Fetch blogs + total count in parallel
    const [blogs, totalCount] = await Promise.all([
      prisma.blog.findMany({
        where: {
          userID,
          isPublished: true,
        },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          content: true,
          createdAt: true,
          thumbnail: true,
          isMemberOnly: true,
          viewCount: true,
          _count: {
            select: {
              likes: true,
              dislikes: true,
              comments: true,
            },
          },
        },
      }),
      prisma.blog.count({
        where: {
          userID,
          isPublished: true,
        },
      }),
    ]);

    // Fetch user interactions ONLY if blogs exist
    let likedSet = new Set<string>();
    let dislikedSet = new Set<string>();
    let savedSet = new Set<string>();

    if (blogs.length > 0) {
      const blogIds = blogs.map((b) => b.id);

      const [likes, dislikes, saves] = await Promise.all([
        prisma.blogLike.findMany({
          where: { userID: currentUserID, blogID: { in: blogIds } },
          select: { blogID: true },
        }),
        prisma.blogDisLike.findMany({
          where: { userID: currentUserID, blogID: { in: blogIds } },
          select: { blogID: true },
        }),
        prisma.savedBlog.findMany({
          where: { userID: currentUserID, blogID: { in: blogIds } },
          select: { blogID: true },
        }),
      ]);

      likedSet = new Set(likes.map((l) => l.blogID));
      dislikedSet = new Set(dislikes.map((d) => d.blogID));
      savedSet = new Set(saves.map((s) => s.blogID));
    }

    const data = blogs.map((blog) => ({
      ...blog,
      isLiked: likedSet.has(blog.id),
      isDisliked: dislikedSet.has(blog.id),
      isSaved: savedSet.has(blog.id),
    }));

    return res.status(200).json({
      success: true,
      message: "Stories fetched successfully",
      data,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
        hasNextPage: page * limit < totalCount,
        hasPreviousPage: page > 1,
      },
    });
  } catch (error) {
    logger.error("Error getting stories", {
      error,
      userID,
      currentUserID,
    });

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

export const saveBlog = async (req: Request, res: Response) => {
  const currentUserID = req.user?.userID;

  if (!currentUserID) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized",
    });
  }

  const parsed = idSchema.safeParse(req.params);
  if (!parsed.success) {
    logger.warn("Invalid blog id", {
      issues: parsed.error.issues,
      userID: currentUserID,
    });

    return res.status(400).json({
      success: false,
      message: "Invalid blog id",
    });
  }

  const blogID = parsed.data.Id;

  try {
    await prisma.savedBlog.create({
      data: {
        userID: currentUserID,
        blogID,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Blog saved successfully",
    });
  } catch (error) {

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return res.status(409).json({
        success: false,
        message: "Blog already saved",
      });
    }

    logger.error("Error saving blog", {
      error,
      userID: currentUserID,
      blogID,
    });

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};


export const unsaveBlog = async (req: Request, res: Response) => {
  const currentUserID = req.user?.userID;

  if (!currentUserID) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized",
    });
  }

  const parsed = idSchema.safeParse(req.params);
  if (!parsed.success) {
    logger.warn("Invalid blog id", {
      issues: parsed.error.issues,
      userID: currentUserID,
    });

    return res.status(400).json({
      success: false,
      message: "Invalid blog id",
    });
  }

  const blogID = parsed.data.Id;

  try {
    await prisma.savedBlog.delete({
      where: {
        userID_blogID: {
          userID: currentUserID,
          blogID,
        },
      },
    });

    return res.status(200).json({
      success: true,
      message: "Story unsaved successfully",
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return res.status(404).json({
        success: false,
        message: "Story is not saved",
      });
    }

    // 5️⃣ Log unexpected errors
    logger.error("Error unsaving story", {
      error,
      userID: currentUserID,
      blogID,
    });

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const isMember = async (userID: string): Promise<boolean> => {
  try {
    const now = new Date();
    const membershipExists = await prisma.membership.findFirst({
      where: {
        userID,
        expiresAt: {
          gte: now,
        },
      },
      select: {
        id: true,
      },
    });
    return Boolean(membershipExists);
  } catch (error) {
    logger.error("Error checking membership status", {
      error,
      userID,
    });
    return false;
  }
};


export const commentOnBlog = async (req: Request, res: Response) => {
  const currentUserID = req.user?.userID;

  if (!currentUserID) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized",
    });
  }

  const parsed = idSchema.safeParse(req.params);
  if (!parsed.success) {
    logger.warn("Invalid blog id", {
      issues: parsed.error.issues,
      userID: currentUserID,
    });

    return res.status(400).json({
      success: false,
      message: "Invalid blog id",
    });
  }

  const blogID = parsed.data.Id;
  const message = req.body?.message?.trim();

  // Validate message
  if (!message) {
    return res.status(400).json({
      success: false,
      message: "Message is required",
    });
  }

  if (message.length > 500) {
    return res.status(400).json({
      success: false,
      message: "Message is too long",
    });
  }

  try {
    // Ensure blog exists
    const blog = await prisma.blog.findUnique({
      where: { id: blogID },
      select: { id: true, userID: true },
    });

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found",
      });
    }

    const comment = await prisma.comment.create({
      data: {
        userID: currentUserID,
        blogId: blogID,
        message,
      },
      select: { id: true },
    });

    await prisma.commentNotification.create({
      data: {
        userID: blog.userID,
        commentID: comment.id,
        isSeen: false,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Comment created successfully",
      comment,
    });
  } catch (error) {
    logger.error("Error creating comment", {
      error,
      userID: currentUserID,
      blogID,
    });

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return res.status(404).json({
        success: false,
        message: "Blog not found",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};



