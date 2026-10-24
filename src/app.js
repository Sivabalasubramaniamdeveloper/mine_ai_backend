import express from "express";
import supabase from "./config/supabase.js";
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import apiKeyRoutes from "./routes/apiKey.routes.js";
import aiRoutes from "./routes/ai.routes.js";
import weatherRoutes from "./routes/weather.routes.js";
import priceRoutes from "./routes/price.routes.js";
import ottRoutes from "./routes/ott.routes.js";
import productSearchRoutes from "./routes/productSearch.routes.js";
import emailHelperRoutes from "./routes/emailHelper.routes.js";
import taskRoutes from "./routes/task.routes.js";
import newsRoutes from "./routes/news.routes.js";
import ticketRoutes from "./routes/ticket.routes.js";
import { errorMiddleware } from "./middleware/error.middleware.js";

const app = express();

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "MineAI backend is running",
  });
});

// Provides a branded browser landing page when an email confirmation opens outside the app.
app.get("/auth/verified", (_req, res) => {
  res.type("html").send(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Email verified · MineAI</title><style>body{margin:0;background:#f4f7ff;color:#202124;font:16px Arial,sans-serif;min-height:100vh;display:grid;place-items:center}.card{max-width:440px;margin:24px;padding:36px;background:white;border-radius:20px;text-align:center;box-shadow:0 12px 40px #17255418}h1{color:#2357d8}p{line-height:1.6;color:#4b5563}.mark{font-size:52px}.button{display:inline-block;margin-top:12px;padding:13px 20px;border-radius:12px;background:#2357d8;color:white;text-decoration:none}</style></head><body><main class="card"><div class="mark" aria-hidden="true">✓</div><h1>Email verified</h1><p>Your MineAI account is ready. Return to the MineAI app and sign in to continue.</p><a class="button" href="mineai://auth-callback/email-confirmed">Open MineAI</a></main></body></html>`);
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

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/user", userRoutes);
app.use("/api/v1/users/api-keys", apiKeyRoutes);
app.use("/api/v1/ai", aiRoutes);
app.use("/api/v1/weather", weatherRoutes);
app.use("/api/v1/prices", priceRoutes);
app.use("/api/v1/products", productSearchRoutes);
app.use("/api/v1/ott", ottRoutes);
app.use("/api/v1/email-helper", emailHelperRoutes);
app.use("/api/v1/tasks", taskRoutes);
app.use("/api/v1/news", newsRoutes);
app.use("/api/v1/tickets", ticketRoutes);

app.use(errorMiddleware);

export default app;
