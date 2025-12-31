// import { Request, Response } from "express"
// import { prisma } from "../config/prisma"
// import { logger } from "../config/Logger/logger"
// import { idSchema } from "../schemas/auth.schema"
// import { subtle } from "node:crypto"


// export const AllNotifications = async (req: Request, res: Response) => {
//     try {

//         const currentUserID = req.user?.userID;
//         if (!currentUserID) {
//             return res.status(401).json({
//                 success: false,
//                 message: "Unauthorized User",
//             });
//         }

//         const notification = await prisma.notification.findMany({
//             where: {
//                 userID: currentUserID
//             },
//             include: {
//                 commentNotifications: {
//                     select: {
//                         id: true,
//                         isSeen: true,
//                     },
//                     include: {
//                         comment: {
//                             select: {
//                                 createdAt: true,
//                                 id: true,
//                                 message: true
//                             },
//                             include: {
//                                 user: {
//                                     select: {
//                                         id: true,
//                                         username: true,
//                                         profilePhoto: true
//                                     }
//                                 },
//                                 story: {
//                                     select: {
//                                         id: true,
//                                         title: true,
//                                         subTitle: true
//                                     }
//                                 }
//                             }
//                         }
//                     }
//                 },

//                 reactNotifications: {
//                     select: {
//                         id: true,
//                         isSeen: true,
//                     },
//                     include: {
//                         story: {
//                             select: {
//                                 id: true,
//                                 title: true,
//                                 subTitle: true
//                             }
//                         }
//                     }
//                 }
//             }
//         })

//         if (!notification) {
//             return res.status(404).json({
//                 success: false,
//                 message: "Notification not found"
//             })
//         }
//         const formattedResponse = notification.map((n: any) => {
//             return {
//                 id: n.id,
//                 createdAt: n.createdAt,
//                 commentNotifications: {
//                     id: n.commentNotifications.id,
//                     isSeen: n.commentNotifications.isSeen,
//                     comment: {
//                         id: n.commentNotifications.comment.id,
//                         message: n.commentNotifications.comment.message,
//                         createdAt: n.commentNotifications.comment.createdAt,
//                         user: {
//                             id: n.commentNotifications.comment.user.id,
//                             username: n.commentNotifications.comment.user.username,
//                             profilePhoto: n.commentNotifications.comment.user.profilePhoto
//                         },
//                         story: {
//                             id: n.commentNotifications.comment.story.id,
//                             title: n.commentNotifications.comment.story.title,
//                             subTitle: n.commentNotifications.comment.story.subTitle
//                         }
//                     }
//                 },
//                 reactNotifications: {
//                     id: n.reactNotifications.id,
//                     isSeen: n.reactNotifications.isSeen,
//                     story: {
//                         id: n.reactNotifications.story.id,
//                         title: n.reactNotifications.story.title,
//                         subTitle: n.reactNotifications.story.subTitle
//                     },

//                 }
//             }
//         })

//         return res.status(200).json({
//             success: true,
//             message: "Notification fetched successfully",
//             data: formattedResponse
//         })
//     } catch (error) {

//     }
// }

// export const UnreadNotification = async (req: Request, res: Response) => {

//     try {

//         const currentUserID = req.user?.userID
//         if (!currentUserID) {
//             return res.status(401).json({
//                 success: false,
//                 message: "Unauthorized User"
//             })
//         }

//         let count = 0
//         let ALLNotifications = []

//         const Notification = await prisma.notification.findMany({
//             where: {
//                 userID: currentUserID
//             },
//             orderBy: {
//                 createdAt: 'desc'
//             },
//             include: {
//                 commentNotifications: {
//                     select: {
//                         id: true,
//                         isSeen: true,
//                     },
//                     include: {
//                         comment: {
//                             select: {
//                                 createdAt: true,
//                                 id: true,
//                                 message: true
//                             },
//                             include: {
//                                 user: {
//                                     select: {
//                                         id: true,
//                                         username: true,
//                                         profilePhoto: true
//                                     }
//                                 },
//                                 story: {
//                                     select: {
//                                         id: true,
//                                         title: true,
//                                         subTitle: true
//                                     }
//                                 }
//                             }
//                         }
//                     }
//                 },
//             }
//         }
//         )

//         if (!Notification) {
//             return res.status(404).json({
//                 success: false,
//                 message: "Notification not found"
//             })
//         }

//         ALLNotifications = Notification.map((n: any) => {
//             return {
//                 id: n.id,
//                 createdAt: n.createdAt,
//                 commentNotifications: {
//                     id: n.commentNotifications.id,
//                     isSeen: n.commentNotifications.isSeen,
//                     comment: {
//                         id: n.commentNotifications.comment.id,
//                         message: n.commentNotifications.comment.message,
//                         createdAt: n.commentNotifications.comment.createdAt,
//                         user: {
//                             id: n.commentNotifications.comment.user.id,
//                             username: n.commentNotifications.comment.user.username,
//                             profilePhoto: n.commentNotifications.comment.user.profilePhoto
//                         },
//                         story: {
//                             id: n.commentNotifications.comment.story.id,
//                             title: n.commentNotifications.comment.story.title,
//                             subTitle: n.commentNotifications.comment.story.subTitle
//                         }
//                     }
//                 }
//             }
//         })

//         ALLNotifications.forEach((n: any) => {
//             if (!n.commentNotifications.isSeen) {
//                 count++
//             }
//         })

//         return res.status(200).json({
//             success: true,
//             message: "Notification fetched successfully",
//             count: count,
//             data: ALLNotifications

//         })

//     } catch (error) {
//         logger.error("Error: Failed to fetch notification", { error });
//         return res.status(500).json({
//             success: false,
//             message: "Internal Server Error"
//         })
//     }
// }


// export const ConnectNotification = async (req: Request, res: Response) => {
//     try {
//         const currentUserID = req.user?.userID;

//         if (!currentUserID) {
//             return res.status(401).json({
//                 success: false,
//                 message: "Unauthorized User",
//             });
//         }

//         const notifications = await prisma.dMNotification.findMany({
//             where: { userID: currentUserID },
//             orderBy: { createdAt: "desc" },
//             select: {
//                 id: true,
//                 senderID: true,
//                 createdAt: true,
//                 message: true,
//                 isSeen: true,
//             },
//         });

//         if (notifications.length === 0) {
//             return res.status(404).json({
//                 success: false,
//                 message: "No notifications found",
//             });
//         }

//         // ----- Get unique sender IDs -----
//         const senderIDs = Array.from(
//             new Set<string>(notifications.map((n: any) => n.senderID))
//         );

//         // ----- Fetch senders -----
//         const senders = await prisma.user.findMany({
//             where: { id: { in: senderIDs } },
//             select: { id: true, name: true, profilePhoto: true },
//         });

//         // Map userID → user object for fast lookup
//         const senderMap: Map<string, typeof senders[number]> = new Map(
//             senders.map((u) => [u.id, u])
//         );

//         // ----- Build Response Safely -----
//         const formattedResponse = notifications.map((n: any) => {
//             const sender = senderMap.get(n.senderID);

//             return {
//                 id: n.id,
//                 senderID: n.senderID,
//                 senderName: sender?.name ?? "Unknown User",
//                 senderPhoto: sender?.profilePhoto ?? "",
//                 createdAt: n.createdAt,
//                 message: n.message,
//                 isSeen: n.isSeen,
//             };
//         });

//         return res.status(200).json({
//             success: true,
//             message: "Notifications found",
//             data: formattedResponse,
//         });
//     } catch (error) {
//         logger.error("Error: Failed to get notification", { error });
//         return res.status(500).json({
//             success: false,
//             message: "Internal Server Error",
//         });
//     }
// };


// export const ReadNotification = async (req: Request, res: Response) => {
//     try {
//         const currentUserID = req.user?.userID
//         if (!currentUserID) {
//             return res.status(401).json({
//                 success: false,
//                 message: "Unauthorized User"
//             })
//         }

//         const messageNotification = await prisma.commentNotification.findMany({
//             where:{
//                 isSeen:true
//             }
//         })

//     } catch (error) {

//     }
// }

// export const deleteMessage = async (req: Request, res: Response) => {
//     try {
//         const currentUserID = req.user?.userID;

//         if (!currentUserID) {
//             logger.warn(`Unauthorized attempt to delete message.`);
//             return res.status(401).json({
//                 success: false,
//                 message: "Unauthorized user",
//             });
//         }

//         const userID = idSchema.safeParse(req.params.id);
//         if (!userID.success) {
//             logger.warn("Invalid User ID for deleteMessage");
//             return res.status(400).json({
//                 success: false,
//                 message: "Invalid User ID",
//             });
//         }

//         const targetID = userID.data.Id;

//         if(currentUserID === targetID) {
//             logger.warn(`Unauthorized attempt to delete message between ${currentUserID} & ${targetID}.`);
//             return res.status(401).json({
//                 success: false,
//                 message: "Unauthorized user",
//             });
//         }

//         const isUserExists = await prisma.user.findUnique({
//             where: {
//                 id: targetID,
//             },
//         });

//         if (!isUserExists) {
//             logger.warn(`User ${targetID} not found`);
//             return res.status(404).json({
//                 success: false,
//                 message: "User not found",
//             });
//         }
        
//         const isInInbox = await prisma.inbox.findFirst({
//             where: {
//                 OR: [
//                     { senderID: currentUserID, receiverID: targetID },
//                     { senderID: targetID, receiverID: currentUserID },
//                 ],
//             },
//         });

//         if (!isInInbox) {
//             logger.warn(`Inbox not found between ${currentUserID} & ${targetID}`);
//             return res.status(404).json({
//                 success: false,
//                 message: "No messages exist between these users",
//             });
//         }

//         await prisma.inbox.deleteMany({
//             where: {
//                 OR: [
//                     { senderID: currentUserID, receiverID: targetID },
//                     { senderID: targetID, receiverID: currentUserID },
//                 ],
//             },
//         });

//         logger.info(`Messages deleted between ${currentUserID} and ${targetID}`);

//         return res.status(200).json({
//             success: true,
//             message: "Messages deleted successfully",
//         });

//     } catch (error) {
//         logger.error("Error deleting messages", { error });
//         return res.status(500).json({
//             success: false,
//             message: "Internal Server Error",
//         });
//     }
// };


// export const sendMessage = async(req:Request,res:Response)=>{
//     try {
//         const currentUserID = req.user?.userID;
//         const userID = idSchema.safeParse(req.params.id);
//         const { message } = req.body


//         if (!currentUserID) {
//             logger.warn(`Unauthorized attempt to send message.`);
//             return res.status(401).json({
//                 success: false,
//                 message: "Unauthorized user",
//             });
//         }

//         if (!userID.success) {
//             logger.warn("Invalid User ID for sendMessage");
//             return res.status(400).json({
//                 success: false,
//                 message: "Invalid User ID",
//             });
//         }

//         if(!message || message.trim().length === 0){
//             return res.status(400).json({
//                 success: false,
//                 message: "Message cannot be empty"
//             })
//         }
        
//         const isUserExists = await prisma.user.findUnique({
//             where: {
//                 id: userID.data.Id
//             }
//         })
//         if(!isUserExists){
//             return res.status(404).json({
//                 success: false,
//                 message: "User not found"
//             })
//         }

//         const isFollowing = await prisma.follow.findFirst({
//             where: {
//                 followerID: currentUserID,
//                 followingID: userID.data.Id
//             }
//         })

//         if(!isFollowing){
//             return res.status(400).json({
//                 success: false,
//                 message: "You are not following this user"
//             })
//         }


//         await prisma.inbox.create({
//             data: {
//                 senderID: currentUserID,
//                 receiverID: userID.data.Id,
//                 message: message
//             }
//         })

//         return res.status(200).json({
//             success: true,
//             message: "Message sent successfully"
//         })
        
//     } catch (error) {
//         logger.error("Error sending message", { error });
//         return res.status(500).json({
//             success: false,
//             message: "Internal Server Error",
//         });  
//     }
// }


