import { Request, Response } from "express";
import { prisma } from "../config/prisma";
import { deleteFromS3 } from "../config/aws/s3/deleteObject";
import { uploadToS3 } from "../config/aws/s3/putObject";
import { success } from "zod";
import { idSchema } from "../Schema/auth.schema";
import { Prisma } from "../../generated/prisma/client";
import { blogSchema } from "../Schema/blog.schema";
import { isMember } from "./blog.controller";
import { logger } from "../config/Logger/logger";


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

export const getMe = async (req: Request, res: Response) => {
}

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
    const blog = await prisma.blog.findUnique({
      where: { id: blogID },
      select: { userID: true },
    })

    if (!blog || blog.userID !== currentUserID) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    await prisma.blog.delete({
      where: {
        id: blogID,
        userID: currentUserID,
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
    logger.error("Error in unsaving story", {
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

export const createBlog = async (req: Request, res: Response) => {
  const currentUserID = req.user?.userID;

  if (!currentUserID) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized",
    });
  }

  const parsed = blogSchema.safeParse(req.body);
  if (!parsed.success) {
    logger.warn("Invalid blog payload", {
      issues: parsed.error.issues,
      userID: currentUserID,
    });

    return res.status(400).json({
      success: false,
      message: "Invalid blog data",
    });
  }

  const {
    title,
    content,
    isMemberOnly,
    isPublished,
    topics,
    thumbnail,
  } = parsed.data;

  // 🔒 Business rules
  if (!Array.isArray(content) || content.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Blog content cannot be empty",
    });
  }

  try {
    // Optional: check membership if member-only
    if (isMemberOnly) {
      const isUserMember = await isMember(currentUserID);
      if (!isUserMember) {
        return res.status(403).json({
          success: false,
          message: "Membership required to publish this blog",
        });
      }
    }


    // Transaction = atomic
    const blog = await prisma.$transaction(async (tx) => {
      // Validate topics exist (optional but recommended)
      if (topics?.length) {
        const topicCount = await tx.topic.count({
          where: { id: { in: topics } },
        });

        if (topicCount !== topics.length) {
          throw new Error("Invalid topics provided");
        }
      }

      return tx.blog.create({
        data: {
          title: title.trim(),
          content,
          userID: currentUserID,
          isMemberOnly,
          isPublished,
          thumbnail,
          topics: topics?.length
            ? { connect: topics.map((id) => ({ id })) }
            : undefined,
        },
        select: {
          id: true,
          title: true,
          createdAt: true,
          isPublished: true,
        },
      });
    });

    return res.status(201).json({
      success: true,
      message: "Blog created successfully",
      data: blog,
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return res.status(409).json({
        success: false,
        message: "Duplicate blog",
      });
    }

    logger.error("Error creating blog", {
      error,
      userID: currentUserID,
    });

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const uploadThumbnail = async (req: Request, res: Response) => {
  const file = req.file;

  if (!file) {
    return res.status(400).json({
      success: false,
      message: "File required",
    });
  }

  const imageUrl = await uploadToS3(
    file.buffer,
    file.originalname,
    file.mimetype
  );

  return res.status(200).json({
    success: true,
    url: imageUrl,
  });
};

