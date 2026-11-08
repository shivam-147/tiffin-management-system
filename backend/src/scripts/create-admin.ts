import "../config/env";

import database from "../config/database";
import authRepository from "../modules/auth/auth.repository";
import { hashPassword } from "../utils/password.util";
import { logger } from "../utils/logger.util";

const createAdmin = async () => {
  try {
    const name = process.env.ADMIN_NAME;
    const email = process.env.ADMIN_EMAIL?.toLowerCase();
    const password = process.env.ADMIN_PASSWORD;

    if (!name || !email || !password) {
      throw new Error("ADMIN_NAME, ADMIN_EMAIL and ADMIN_PASSWORD are required");
    }

    if (password.length < 8) {
      throw new Error("Admin password must contain at least 8 characters");
    }

    await database.connect();

    const existingAdmin = await authRepository.existsByEmail(email);

    if (existingAdmin) {
      logger.warn("Admin with this email already exists");
      return;
    }

    const hashedPassword = await hashPassword(password);

    await authRepository.create({
      name,
      email,
      password: hashedPassword,
    });

    logger.info("Admin created successfully");
  } catch (error) {
    logger.error("Admin creation failed:", error);
    process.exitCode = 1;
  } finally {
    const mongoose = await import("mongoose");
    await mongoose.default.disconnect();
    process.exit(process.exitCode || 0);
  }
};

createAdmin();
