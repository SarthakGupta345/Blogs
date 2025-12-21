import { Request, Response } from "express";
import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../config/prisma";
import { logger } from "../config/Logger/logger";
import { idSchema } from "../Schema/auth.schema";


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

export const deleteComment = async (req: Request, res: Response) => {
    try {

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
        await prisma.comment.deleteMany({

        })
    } catch (error) {

    }
};

export const toggleLike = async (req: Request, res: Response) => {
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

        try {
            // Try to like
            await prisma.blogLike.create({
                data: {
                    userID: currentUserID,
                    blogID,
                },
            });

            // Notify only if not self-like
            if (blog.userID !== currentUserID) {
                await prisma.likeNotification.create({
                    data: {
                        userID: blog.userID,
                        blogLikedId: blogID,
                        isSeen: false,
                    },
                });
            }

            return res.status(200).json({
                success: true,
                message: "Blog liked successfully",
            });
        } catch (error) {
            // Already liked → unlike
            if (
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === "P2002"
            ) {
                await prisma.blogLike.delete({
                    where: {
                        userID_blogID: {
                            userID: currentUserID,
                            blogID,
                        },
                    },
                });

                return res.status(200).json({
                    success: true,
                    message: "Blog unliked successfully",
                });
            }

            throw error;
        }
    } catch (error) {
        logger.error("Error toggling like", {
            error,
            userID: currentUserID,
            blogID,
        });

        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
};

export const toggleDislike = async (req: Request, res: Response) => {
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

        try {
            // Try to dislike
            await prisma.blogDisLike.create({
                data: {
                    userID: currentUserID,
                    blogID,
                },
            });


            return res.status(200).json({
                success: true,
                message: "Blog disliked successfully",
            });
        } catch (error) {
            // Already disliked → remove dislike
            if (
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === "P2002"
            ) {
                await prisma.blogDisLike.delete({
                    where: {
                        userID_blogID: {
                            userID: currentUserID,
                            blogID,
                        },
                    },
                });

                return res.status(200).json({
                    success: true,
                    message: "Blog undisliked successfully",
                });
            }

            throw error;
        }
    } catch (error) {
        logger.error("Error toggling dislike", {
            error,
            userID: currentUserID,
            blogID,
        });

        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
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

export const getTrendingBlog = async (req: Request, res: Response) => {
    const currentUserID = req.user?.userID;

    if (!currentUserID) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized",
        });
    }

    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 20);
    const skip = (page - 1) * limit;

    try {
        const last7Days = new Date();
        last7Days.setDate(last7Days.getDate() - 7);

        const [blogs, totalCount] = await Promise.all([
            prisma.blog.findMany({
                where: {
                    isPublished: true,
                    createdAt: { gte: last7Days },
                },
                skip,
                take: limit,
                orderBy: [
                    { viewCount: "desc" },
                    { createdAt: "desc" },
                ],
                select: {
                    id: true,
                    title: true,
                    createdAt: true,
                    thumbnail: true,
                    isMemberOnly: true,
                    viewCount: true,
                    user: {
                        select: {
                            id: true,
                            name: true,
                            profilePhoto: true,
                        },
                    },
                    _count: {
                        select: {
                            likes: true,
                            comments: true,
                            dislikes: true,
                        },
                    },
                },
            }),
            prisma.blog.count({
                where: {
                    isPublished: true,
                    createdAt: { gte: last7Days },
                },
            }),
        ]);

        // User interactions
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

        const likedSet = new Set(likes.map((l) => l.blogID));
        const dislikedSet = new Set(dislikes.map((d) => d.blogID));
        const savedSet = new Set(saves.map((s) => s.blogID));

        const data = blogs.map((blog) => ({
            ...blog,
            trendingScore:
                blog._count.likes * 3 +
                blog._count.comments * 2 +
                blog.viewCount * 0.5,
            isLiked: likedSet.has(blog.id),
            isDisliked: dislikedSet.has(blog.id),
            isSaved: savedSet.has(blog.id),
        }));

        return res.status(200).json({
            success: true,
            message: "Trending blogs fetched successfully",
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
        logger.error("Error fetching trending blogs", {
            error,
            currentUserID,
        });

        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
};

export const getBlog = async (req: Request, res: Response) => {
    const currentUserID = req.user?.userID;

    if (!currentUserID) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized",
        });
    }

    const parsed = idSchema.safeParse(req.params);
    if (!parsed.success) {
        return res.status(400).json({
            success: false,
            message: "Invalid blog id",
        });
    }

    const blogID = parsed.data.Id;

    try {
        // Fetch blog
        const blog = await prisma.blog.findUnique({
            where: { id: blogID },
            select: {
                id: true,
                title: true,
                content: true, // ✅ blog page should return content
                createdAt: true,
                thumbnail: true,
                isMemberOnly: true,
                viewCount: true,
                userID: true,
                user: {
                    select: {
                        id: true,
                        name: true,
                        profilePhoto: true,
                    },
                },
                _count: {
                    select: {
                        likes: true,
                        comments: true,
                        dislikes: true,
                    },
                },
            },
        });

        if (!blog) {
            return res.status(404).json({
                success: false,
                message: "Blog not found",
            });
        }

        // 🔒 Member-only access control
        if (
            blog.isMemberOnly &&
            blog.userID !== currentUserID
        ) {
            const isUserMember = await isMember(currentUserID);
            if (!isUserMember) {
                return res.status(403).json({
                    success: false,
                    message: "Membership required to view this blog",
                });
            }
        }

        // 🔁 Increment view count (fire-and-forget)
        prisma.blog.update({
            where: { id: blogID },
            data: { viewCount: { increment: 1 } },
        }).catch(() => { });

        // Fetch user interactions (optimized)
        const [isLiked, isDisliked, isSaved] = await Promise.all([
            prisma.blogLike.findUnique({
                where: {
                    userID_blogID: {
                        userID: currentUserID,
                        blogID,
                    },
                },
                select: { blogID: true },
            }),
            prisma.blogDisLike.findUnique({
                where: {
                    userID_blogID: {
                        userID: currentUserID,
                        blogID,
                    },
                },
                select: { blogID: true },
            }),
            prisma.savedBlog.findUnique({
                where: {
                    userID_blogID: {
                        userID: currentUserID,
                        blogID,
                    },
                },
                select: { blogID: true },
            }),
        ]);

        return res.status(200).json({
            success: true,
            message: "Blog fetched successfully",
            data: {
                ...blog,
                isLiked: Boolean(isLiked),
                isDisliked: Boolean(isDisliked),
                isSaved: Boolean(isSaved),
            },
        });
    } catch (error) {
        logger.error("Error fetching blog", {
            error,
            blogID,
            currentUserID,
        });

        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
};

export const getAllCommentsFromBlog = async ({
    blogID,
    currentUserID,
    cursor,
    limit = 10,
}: {
    blogID: string;
    currentUserID: string;
    cursor?: string;
    limit?: number;
}) => {
    try {
        const comments = await prisma.comment.findMany({
            where: {
                blogId: blogID,
            },
            take: limit + 1,
            ...(cursor && {
                cursor: { id: cursor },
                skip: 1,
            }),
            orderBy: {
                createdAt: "desc",
            },
            select: {
                id: true,
                message: true,
                createdAt: true,
                user: {
                    select: {
                        id: true,
                        name: true,
                        profilePhoto: true,
                    },
                },
                _count: {
                    select: {
                        replies: true,
                        likeComments: true,
                        disLikeComments: true,
                    },
                },
            },
        });

        let nextCursor: string | null = null;
        if (comments.length > limit) {
            nextCursor = comments.pop()!.id;
        }

        const commentIds = comments.map((c) => c.id);

        // Fetch user reactions ONLY for these comments
        const [likes, dislikes] = await Promise.all([
            prisma.likeComment.findMany({
                where: {
                    userID: currentUserID,
                    commentID: { in: commentIds },
                },
                select: { commentID: true },
            }),
            prisma.disLikeComment.findMany({
                where: {
                    userID: currentUserID,
                    commentID: { in: commentIds },
                },
                select: { commentID: true },
            }),
        ]);

        const likedSet = new Set(likes.map((l) => l.commentID));
        const dislikedSet = new Set(dislikes.map((d) => d.commentID));

        const data = comments.map((comment) => ({
            ...comment,
            isLiked: likedSet.has(comment.id),
            isDisliked: dislikedSet.has(comment.id),
        }));

        return {
            data,
            nextCursor,
            hasMore: Boolean(nextCursor),
        };
    } catch (error) {
        logger.error("Error fetching comments", {
            error,
            blogID,
            currentUserID,
        });

        return {
            data: [],
            nextCursor: null,
            hasMore: false,
        };
    }
};


export const replyComment = async(req:Request,res:Response)=>{
}


export const AllBlogFromFollowing = async (req: Request, res: Response) => {}