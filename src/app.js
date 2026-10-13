import express from "express";
import supabase from "./config/supabase.js";
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import apiKeyRoutes from "./routes/apiKey.routes.js";
import aiRoutes from "./routes/ai.routes.js";
import { errorMiddleware } from "./middleware/error.middleware.js";

const app = express();

app.use(express.json());

app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "MineAI backend is running",
  });
});

app.get("/health/database", async (req, res) => {
  try {
    const { error } = await supabase.from("profile").select("id").limit(1);

    if (error) {
      return res.status(500).json({
        success: false,
        message: "Database connection failed",
        error: error.message,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Database connection successful",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Database connection failed",
      error: error.message,
    });
  }
});

app.use("auth", authRoutes);
app.use("users", userRoutes);
app.use("/api/v1/users/api-keys", apiKeyRoutes);
app.use("/api/v1/ai", aiRoutes);

app.use(errorMiddleware);

export default app;
