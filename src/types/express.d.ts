export type User = {
    userID: string;
    email: string;
};

declare global {
    namespace Express {
        interface Request {
            user?: User;
        }
    }
}

declare module "express-serve-static-core" {
    interface Request {
        user?: User;
    }
}

export { };
