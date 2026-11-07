import express from "express";
import cors from "cors";
import helmet from "helmet";

import { API_PREFIX } from "./constants/app.constants";
import healthRoutes from "./modules/health/health.routes";

import { notFoundMiddleware } from "./middlewares/not-found.middleware";
import { errorMiddleware } from "./middlewares/error.middleware";

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "1mb" }));

// API Routes
app.use(`${API_PREFIX}/health`, healthRoutes);

// Error handling
app.use(notFoundMiddleware);
app.use(errorMiddleware);

export default app;
