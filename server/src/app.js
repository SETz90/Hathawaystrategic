import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { env } from "./config/env.js";
import authRoutes from "./modules/auth/auth.routes.js";
import projectRoutes from "./modules/projects/projects.routes.js";
import fileRoutes from "./modules/files/files.routes.js";
import messageRoutes from "./modules/messages/messages.routes.js";
import clientRoutes from "./modules/clients/clients.routes.js";
import adminRoutes from "./modules/admin/admin.routes.js";
import notificationRoutes from "./modules/notifications/notifications.routes.js";
import {
  notFoundHandler,
  errorHandler,
} from "./middleware/error.middleware.js";

const app = express();

app.set("trust proxy", 1); // needed for correct req.ip behind a proxy/load balancer

app.use(helmet());
app.use(
  cors({
    origin: env.clientUrl,
    credentials: true, // required so the refresh-token cookie is sent/received
  }),
);
app.use(express.json({ limit: "10kb" }));
app.use(cookieParser());

app.get("/health", (req, res) => res.json({ status: "ok" }));

app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/notifications", notificationRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
