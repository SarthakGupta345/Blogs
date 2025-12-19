import { NextFunction, Request, Response } from "express";
import jwt, { JwtPayload, TokenExpiredError } from "jsonwebtoken";
import { redis } from "../config/redis";
import { tokenGenerator } from "../Controllers/Signup.controller";

interface DecodedToken extends JwtPayload {
    userID: string;
    email: string;
}

export const loginMiddleware = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { accessToken, refreshToken } = req.cookies;

        if (!accessToken && !refreshToken) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }

        // 1. Validate access token
        const accessCheck = verifyToken(accessToken, "access");

        if (accessCheck.valid) {
            const email = accessCheck.decoded!.email;

            const session = await redis.get(`session:${email}`);
            if (!session) {
                return res.status(401).json({
                    success: false,
                    message: "Session expired",
                });
            }

            req.user = {
                email: accessCheck.decoded!.email,
                userID: accessCheck.decoded!.userID,
            };

            return next();
        }

        // 2. Access token expired, try refresh
        if (accessCheck.expired && refreshToken) {
            const refreshCheck = verifyToken(refreshToken, "refresh");

            if (!refreshCheck.valid) {
                return res.status(401).json({
                    success: false,
                    message: "Invalid refresh token",
                });
            }

            const email = refreshCheck.decoded!.email;
            const userID = refreshCheck.decoded!.userID;

            const session = await redis.get(`session:${email}`);
            if (!session) {
                return res.status(401).json({
                    success: false,
                    message: "Session expired",
                });
            }

            // Generate new access token
            const newAccessToken = tokenGenerator(email, userID, "access");

            res.cookie("accessToken", newAccessToken, {
                httpOnly: true,
                secure: true,
                sameSite: "none",
                maxAge: 15 * 60 * 1000,
            });

            req.user = { email, userID };
            return next();
        }

        return res.status(401).json({
            success: false,
            message: "Invalid token",
        });
    } catch (error) {
        console.error("Error in login middleware:", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
};


const verifyToken = (token: string, type: "access" | "refresh") => {
    try {
        const secret =
            type === "access"
                ? process.env.ACCESS_TOKEN_SECRET!
                : process.env.REFRESH_TOKEN_SECRET!;
        const decoded = jwt.verify(token, secret) as DecodedToken;
        return { valid: true, expired: false, decoded };
    } catch (error) {
        if (error instanceof TokenExpiredError) {
            return { valid: false, expired: true, decoded: null };
        }
        return { valid: false, expired: false, decoded: null };
    }
};
