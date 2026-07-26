import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { env } from "./config/env.js";
import authRoutes from "./modules/auth/auth.routes.js";
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

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
