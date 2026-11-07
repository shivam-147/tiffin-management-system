import express from "express";
import cors from "cors";
import helmet from "helmet";

import { API_PREFIX } from "./constants/app.constants";
import healthRoutes from "./modules/health/health.routes";
import authRoutes from "./modules/auth/auth.routes";
import customerRoutes from "./modules/customers/customer.routes";
import subscriptionRoutes from "./modules/subscriptions/subscription.routes";
import deliveryRoutes from "./modules/deliveries/delivery.routes";
import billingRoutes from "./modules/billing/billing.routes";
import dashboardRoutes from "./modules/dashboard/dashboard.routes";

import { notFoundMiddleware } from "./middlewares/not-found.middleware";
import { errorMiddleware } from "./middlewares/error.middleware";

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "1mb" }));

// API Routes
app.use(`${API_PREFIX}/health`, healthRoutes);
app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/customers`, customerRoutes);
app.use(`${API_PREFIX}/subscriptions`, subscriptionRoutes);
app.use(`${API_PREFIX}/deliveries`, deliveryRoutes);
app.use(`${API_PREFIX}/billing`, billingRoutes);
app.use(`${API_PREFIX}/dashboard`, dashboardRoutes);

// Error handling
app.use(notFoundMiddleware);
app.use(errorMiddleware);

export default app;
