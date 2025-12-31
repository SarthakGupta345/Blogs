import express from "express";
import dotenv from "dotenv"
import cors from "cors"
import cookieParser from "cookie-parser"
import helmet from "helmet";
import blogRoutes from "./routes/Blog.route";
import userRoutes from "./routes/User.route";
dotenv.config()

const PORT = process.env.PORT
const app = express();


app.use(express.json({
    limit: "50mb"
}));

app.use(express.urlencoded({
    limit: "50mb",
    extended: true
}))

app.use(cookieParser());


app.use(cors({
    origin: "http://localhost:3000",
    methods: ["GET", "POST", "DELETE", "UPDATE", "PUT", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
    maxAge: 3600
}));

app.listen(PORT, async () => {
    console.log(`Server is running on port ${PORT}`);
});

app.get("/", (req, res) => {
    res.send("User Service is running");
});


app.use("/api/v1/useRoutes",userRoutes);
app.use("/api/v1/blogRoutes", blogRoutes);
