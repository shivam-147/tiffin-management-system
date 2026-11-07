import Admin from "./admin.model";
import RefreshToken from "./refresh-token.model";

class AuthRepository {
  async findByEmail(email: string) {
    return Admin.findOne({ email }).select("+password");
  }

  async findById(adminId: string) {
    return Admin.findById(adminId);
  }

  async findByIdWithPassword(adminId: string) {
    return Admin.findById(adminId).select("+password");
  }

  async create(data: {
    name: string;
    email: string;
    password: string;
  }) {
    return Admin.create(data);
  }

  async existsByEmail(email: string) {
    return Admin.exists({ email });
  }

  async updatePassword(adminId: string, passwordHash: string) {
    return Admin.findByIdAndUpdate(adminId, { password: passwordHash }, { new: true });
  }

  async saveRefreshToken(data: {
    admin: string;
    tokenHash: string;
    expiresAt: Date;
    replacedByTokenHash?: string;
  }) {
    return RefreshToken.create(data);
  }

  async findRefreshToken(tokenHash: string) {
    return RefreshToken.findOne({ tokenHash });
  }

  async revokeRefreshToken(tokenHash: string, replacedByTokenHash?: string) {
    return RefreshToken.findOneAndUpdate(
      { tokenHash },
      { isRevoked: true, ...(replacedByTokenHash ? { replacedByTokenHash } : {}) },
      { new: true }
    );
  }

  async revokeAllTokensForAdmin(adminId: string) {
    return RefreshToken.updateMany(
      { admin: adminId, isRevoked: false },
      { isRevoked: true }
    );
  }
}

export default new AuthRepository();
