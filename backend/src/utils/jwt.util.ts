import crypto from "crypto";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { AuthTokenPayload } from "../modules/auth/auth.types";

const getRefreshSecret = () => env.JWT_REFRESH_SECRET || env.JWT_SECRET;

export const generateAccessToken = (adminId: string): string => {
  return jwt.sign(
    { adminId },
    env.JWT_SECRET,
    {
      expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
    }
  );
};

// Kept for backward compatibility
export const generateToken = generateAccessToken;

export const verifyAccessToken = (token: string): AuthTokenPayload => {
  return jwt.verify(token, env.JWT_SECRET) as AuthTokenPayload;
};

// Kept for backward compatibility
export const verifyToken = verifyAccessToken;

export const generateRefreshToken = (adminId: string): string => {
  return jwt.sign(
    { adminId },
    getRefreshSecret(),
    {
      expiresIn: env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions["expiresIn"],
    }
  );
};

export const verifyRefreshToken = (token: string): AuthTokenPayload => {
  return jwt.verify(token, getRefreshSecret()) as AuthTokenPayload;
};

export const hashToken = (token: string): string => {
  return crypto.createHash("sha256").update(token).digest("hex");
};
