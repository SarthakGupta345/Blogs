import { Request, Response } from "express";
import jwt from "jsonwebtoken"
import { prisma } from "../config/prisma";
import bcrypt from "bcryptjs"
import { User } from "../types/express";
import { emailSchema, loginDataSchema, SignupSchema, verifyOTPSchema } from "../Schema/auth.schema";
import { redis } from "../config/redis";

const sendOTPToEmail = async (otp: string, to: string) => {
    try {
        console.log("email sent", otp, to)
    } catch (error) {
        console.log("error in sending email", error)
    }
}

export const check = async (req: Request, res: Response) => {
    const { id } = req.params
    const blockedUser = await prisma.blockedUser.findMany({ where: { userID: id } })
    res.json(blockedUser)
}

export const validateEmail = async (req: Request, res: Response) => {
    try {
        const parsed = emailSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                success: false,
                message: parsed.error.issues[0].message,
            });
        }
        const { email } = parsed.data;
        console.log(email)

        const user = await prisma.user.findUnique({
            where: { email },
            select: { id: true },
        });
        if (user) {
            return res.status(400).json({
                success: false,
                message: "Email already exists",
            });
        }

        // 2. Generate a 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Redis Keys
        const otpKey = `signupOTP:${email}`;
        const attemptsKey = `signupAttempts:${email}`;

        // 3. Check attempts
        const attempts = await redis.get(attemptsKey);
        const attemptCount = attempts ? parseInt(attempts) : 0;

        if (attemptCount >= 6) {
            return res.status(400).json({
                success: false,
                message: "Too many attempts",
            });
        }

        // 4. Store/Update OTP in Redis

        await redis.set(
            otpKey,
            JSON.stringify({
                otp,
                expiresAt: Date.now() + 5 * 60 * 1000
            }),
            "EX",
            60 * 5
        );


        // 5. Increment attempts (expire in 1 hour)
        await redis.set(
            attemptsKey,
            (attemptCount + 1).toString(),
            "EX",
            3600
        );


        // 6. Send OTP
        await sendOTPToEmail(otp, email);

        return res.status(200).json({
            success: true,
            message: "OTP sent successfully",
            otp, // remove in production
        });

    } catch (error) {
        console.error("validateEmail Error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
};

export const validateEmailLogin = async (req: Request, res: Response) => {
    try {
        const parsed = emailSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                success: false,
                message: parsed.error.issues[0].message
            })
        }
        const { email } = parsed.data
        const user = await prisma.user.findUnique({
            where: { email },
            select: { id: true }
        })

        if (!user) {
            return res.status(400).json({
                success: false,
                message: "User doesn't exist"
            })
        }
        return res.status(200).json({
            success: true,
            message: "User exists"
        })

    } catch (error) {
        console.error("validateEmailLogin Error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
}

export const verifyOTP = async (req: Request, res: Response) => {
    try {
        const parsed = verifyOTPSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                success: false,
                message: parsed.error.issues[0].message,
            });
        }

        const { email, otp } = parsed.data;

        // Get OTP data from Redis
        const otpData = await redis.get(`signupOTP:${email}`);

        if (!otpData) {
            return res.status(400).json({
                success: false,
                message: "Invalid or expired OTP",
            });
        }

        const { otp: storedOtp, expiresAt } = JSON.parse(otpData);

        // Verify OTP
        if (storedOtp !== otp) {
            return res.status(400).json({
                success: false,
                message: "Invalid OTP",
            });
        }

        // Verify expiration
        if (Date.now() > expiresAt) {
            return res.status(400).json({
                success: false,
                message: "OTP has expired",
            });
        }

        // OTP is valid → delete it
        await redis.del(`otp:${email}`);

        return res.status(200).json({
            success: true,
            message: "OTP verified successfully",
            isOnboarding: true,
        });

    } catch (error) {
        console.error("Error in verifyOTP controller:", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
};


export const Signup = async (req: Request, res: Response) => {
    try {
        const validDetails = SignupSchema.safeParse(req.body);
        if (!validDetails.success) {
            return res.status(400).json({
                success: false,
                message: validDetails.error.issues[0].message
            })
        }
        const { About, Experience, Field, Interest, Name, email, Password } = validDetails.data
        if (!About || !Experience || !Field || !Interest || !Name || !email) {
            return res.status(400).json({
                success: false,
                message: "Please fill all the details"
            })
        }

        const userExists = await prisma.user.findUnique({ where: { email } });
        if (userExists) {
            return res.status(400).json({
                success: false,
                message: "User already exists"
            })
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(Password, salt);
        const user = await prisma.user.create({
            data: {
                name: Name,
                email,
                about: About,
                experience: Experience,
                field: Field,
                interests: Interest,
                password: hashedPassword
            },
            select: {
                id: true
            }
        })

        if (!user) {
            return res.status(400).json({
                success: false,
                message: "User not created"
            })
        }

        if (!req.user) {
            req.user = {} as User;
        }

        req.user.email = email;
        req.user.userID = user.id;


        const accessToken = tokenGenerator(email, user.id, "access")
        const refreshToken = tokenGenerator(email, user.id, "refresh")

        await redis.set(
            `refreshToken:${email}`,
            JSON.stringify({ refreshToken }),
            "EX",
            60 * 60 * 24 * 30 // 30 days
        );

        await redis.set(
            `session:${email}`,
            JSON.stringify({ accessToken }),
            "EX",
            15 * 60
        )

        res.cookie("accessToken", accessToken, {
            httpOnly: true,
            secure: true,
            sameSite: "none",
            maxAge: 15 * 60 * 1000
        })

        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: true,
            sameSite: "none",
            maxAge: 30 * 24 * 60 * 60 * 1000
        })

        return res.status(200).json({
            success: true,
            message: "User created successfully",
            accessToken,
            user: user,
            refreshToken
        })

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        })
    }
}

export const tokenGenerator = (email: string, userID: string, type: "access" | "refresh"): string => {
    try {
        const token = jwt.sign({
            userID,
        }, process.env.JWT_SECRET_KEY as string,
            {
                expiresIn: type === "access" ? "15m" : "1d"
            }
        )
        return token
    } catch (error) {
        console.error("Error in tokenGenerator:", error);
        throw new Error("Token generation failed");
    }
}

export const Logout = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.userID; // coming from auth middleware

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }

        await redis.del(`refreshToken:${userId}`);

        res.clearCookie("refreshToken", {
            httpOnly: true,
            secure: true,
            sameSite: "strict",
            path: "/",
        });

        return res.status(200).json({
            success: true,
            message: "Logged out successfully",
        });

    } catch (error) {
        console.error("Logout error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
};


export const loginWithEmail = async (req: Request, res: Response) => {
    try {
        const parsed = loginDataSchema.safeParse(req.body);

        if (!parsed.success) {
            return res.status(400).json({
                success: false,
                message: parsed.error.issues[0]?.message || "Invalid input",
            });
        }

        const { email, Password } = parsed.data;

        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user || !user.password) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password",
            });
        }

        const isPasswordMatch = await bcrypt.compare(Password, user.password);

        if (!isPasswordMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password",
            });
        }

        req.user = {
            userID: user.id,
            email: user.email,
        } as User;

        const accessToken = tokenGenerator(user.email, user.id, "access");
        const refreshToken = tokenGenerator(user.email, user.id, "refresh");

        await Promise.all([
            redis.set(
                `refreshToken:${user.id}`,
                refreshToken,
                "EX",
                60 * 60 * 24 * 30 // 30 days
            ),
            redis.set(
                `session:${user.id}`,
                accessToken,
                "EX",
                15 * 60 // 15 minutes
            ),
        ]);

        const isProd = process.env.NODE_ENV === "production";

        res.cookie("accessToken", accessToken, {
            httpOnly: true,
            secure: isProd,
            sameSite: isProd ? "none" : "lax",
            maxAge: 15 * 60 * 1000,
        });

        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: isProd,
            sameSite: isProd ? "none" : "lax",
            maxAge: 30 * 24 * 60 * 60 * 1000,
        });

        return res.status(200).json({
            success: true,
            message: "User logged in successfully",
            user: {
                id: user.id,
                email: user.email,
                name: user.name, // optional
            },
        });
    } catch (error) {
        console.error("Login error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

