import Redis from "ioredis";
import "dotenv/config";

export const redis = new Redis(process.env.REDIS_URL as string, {
    retryStrategy(times) {
        console.log(`🔄 Redis reconnect attempt #${times}`);
        return Math.min(times * 50, 2000); // cap at 2s
    },

    reconnectOnError(err) {
        if (err.message.includes("READONLY")) {
            console.log("⚠️ Redis READONLY Error – Reconnecting...");
            return true;
        }
        return false;   
    },

    maxRetriesPerRequest: null, // prevent unhandled promise rejections
    enableReadyCheck: true,     // ensure Redis is ready before accepting commands
    tls: process.env.REDIS_TLS === "true" ? {} : undefined, // Upstash/AWS need TLS
});

// Event listeners
redis.on("connect", () => console.log("🟢 Redis Client Connected"));
redis.on("ready", () => console.log("🚀 Redis Client Ready"));
redis.on("reconnecting", () => console.log("🟡 Redis Client Reconnecting"));
redis.on("error", (err) => console.error("🔴 Redis Error:", err));
redis.on("end", () => console.log("🔌 Redis Client Disconnected"));
redis.on("close", () => console.log("🔒 Redis Client Closed"));
