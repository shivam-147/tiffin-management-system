import authRepository from "./auth.repository";
import {
  LoginInput,
  LoginResult,
  AuthTokens,
  ChangePasswordInput,
} from "./auth.types";

import { comparePassword, hashPassword } from "../../utils/password.util";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  hashToken,
} from "../../utils/jwt.util";
import { AppError } from "../../errors/app-error";

import { HTTP_STATUS } from "../../constants/http-status.constants";
import { ERROR_CODES } from "../../constants/error-code.constants";

const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

class AuthService {
  async login(data: LoginInput): Promise<LoginResult> {
    const admin = await authRepository.findByEmail(data.email);

    if (!admin) {
      throw new AppError(
        "Invalid email or password",
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_CODES.UNAUTHORIZED
      );
    }

    if (!admin.isActive) {
      throw new AppError(
        "Your account is inactive",
        HTTP_STATUS.FORBIDDEN,
        ERROR_CODES.FORBIDDEN
      );
    }

    const isPasswordValid = await comparePassword(
      data.password,
      admin.password
    );

    if (!isPasswordValid) {
      throw new AppError(
        "Invalid email or password",
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_CODES.UNAUTHORIZED
      );
    }

    const adminId = admin._id.toString();
    const accessToken = generateAccessToken(adminId);
    const refreshToken = generateRefreshToken(adminId);

    // Store hashed refresh token
    const tokenHash = hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

    await authRepository.saveRefreshToken({
      admin: adminId,
      tokenHash,
      expiresAt,
    });

    return {
      admin: {
        id: adminId,
        name: admin.name,
        email: admin.email,
      },
      accessToken,
      refreshToken,
      token: accessToken, // Alias for backward compatibility
    };
  }

  async refreshToken(rawRefreshToken: string): Promise<AuthTokens> {
    let payload;
    try {
      payload = verifyRefreshToken(rawRefreshToken);
    } catch {
      throw new AppError(
        "Invalid or expired refresh token",
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_CODES.UNAUTHORIZED
      );
    }

    const tokenHash = hashToken(rawRefreshToken);
    const storedSession = await authRepository.findRefreshToken(tokenHash);

    if (!storedSession) {
      throw new AppError(
        "Invalid refresh token",
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_CODES.UNAUTHORIZED
      );
    }

    // Reuse detection: if a revoked refresh token is presented, revoke all active sessions for security!
    if (storedSession.isRevoked) {
      await authRepository.revokeAllTokensForAdmin(payload.adminId);
      throw new AppError(
        "Revoked refresh token reused. All sessions terminated for security",
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_CODES.UNAUTHORIZED
      );
    }

    if (new Date() > storedSession.expiresAt) {
      throw new AppError(
        "Refresh token has expired",
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_CODES.UNAUTHORIZED
      );
    }

    // Verify admin is still active
    const admin = await authRepository.findById(payload.adminId);
    if (!admin || !admin.isActive) {
      throw new AppError(
        "Admin account is invalid or inactive",
        HTTP_STATUS.FORBIDDEN,
        ERROR_CODES.FORBIDDEN
      );
    }

    // Rotate tokens
    const newAccessToken = generateAccessToken(admin._id.toString());
    const newRefreshToken = generateRefreshToken(admin._id.toString());
    const newTokenHash = hashToken(newRefreshToken);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

    // Revoke old token and point to replacement
    await authRepository.revokeRefreshToken(tokenHash, newTokenHash);

    // Save new refresh token
    await authRepository.saveRefreshToken({
      admin: admin._id.toString(),
      tokenHash: newTokenHash,
      expiresAt,
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      token: newAccessToken,
    };
  }

  async logout(rawRefreshToken: string): Promise<void> {
    try {
      const tokenHash = hashToken(rawRefreshToken);
      await authRepository.revokeRefreshToken(tokenHash);
    } catch {
      // Safe no-op if token invalid
    }
  }

  async logoutAll(adminId: string): Promise<void> {
    await authRepository.revokeAllTokensForAdmin(adminId);
  }

  async changePassword(adminId: string, data: ChangePasswordInput): Promise<void> {
    const admin = await authRepository.findByIdWithPassword(adminId);

    if (!admin || !admin.isActive) {
      throw new AppError(
        "Admin not found",
        HTTP_STATUS.NOT_FOUND,
        ERROR_CODES.NOT_FOUND
      );
    }

    const isMatch = await comparePassword(data.currentPassword, admin.password);
    if (!isMatch) {
      throw new AppError(
        "Current password is incorrect",
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.BAD_REQUEST
      );
    }

    const newHashedPassword = await hashPassword(data.newPassword);
    await authRepository.updatePassword(adminId, newHashedPassword);

    // Revoke all existing sessions so admin must re-authenticate
    await authRepository.revokeAllTokensForAdmin(adminId);
  }

  async getProfile(adminId: string) {
    const admin = await authRepository.findById(adminId);

    if (!admin || !admin.isActive) {
      throw new AppError(
        "Admin not found",
        HTTP_STATUS.NOT_FOUND,
        ERROR_CODES.NOT_FOUND
      );
    }

    return {
      id: admin._id.toString(),
      name: admin.name,
      email: admin.email,
      businessName: (admin as any).businessName || "Tiffin Distribution Services",
      phone: (admin as any).phone || "",
      address: (admin as any).address || "",
      upiId: (admin as any).upiId || "",
    };
  }

  async updateProfile(adminId: string, data: Record<string, any>) {
    const admin = await authRepository.findById(adminId);
    if (!admin || !admin.isActive) {
      throw new AppError(
        "Admin not found",
        HTTP_STATUS.NOT_FOUND,
        ERROR_CODES.NOT_FOUND
      );
    }

    const updated = await authRepository.updateProfile(adminId, data);
    return {
      id: updated!._id.toString(),
      name: updated!.name,
      email: updated!.email,
      businessName: (updated as any).businessName || "Tiffin Distribution Services",
      phone: (updated as any).phone || "",
      address: (updated as any).address || "",
      upiId: (updated as any).upiId || "",
    };
  }
}

export default new AuthService();
