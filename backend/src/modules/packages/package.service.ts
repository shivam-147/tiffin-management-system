import packageRepository from "./package.repository";
import { AppError } from "../../errors/app-error";
import { HTTP_STATUS } from "../../constants/http-status.constants";
import { ERROR_CODES } from "../../constants/error-code.constants";

class PackageService {
  async createPackage(data: {
    name: string;
    description?: string;
    totalTiffins: number;
    pricePerTiffin: number;
    mealsPerDay?: 1 | 2 | 3;
    mealTypes?: string[];
    isActive?: boolean;
  }) {
    const totalAmount = data.totalTiffins * data.pricePerTiffin;
    const mealsPerDay = data.mealsPerDay || 1;
    const defaultMealTypes =
      data.mealTypes && data.mealTypes.length > 0
        ? data.mealTypes
        : mealsPerDay === 1
        ? ["LUNCH"]
        : mealsPerDay === 2
        ? ["LUNCH", "DINNER"]
        : ["BREAKFAST", "LUNCH", "DINNER"];

    return packageRepository.create({
      ...data,
      totalAmount,
      mealsPerDay,
      mealTypes: defaultMealTypes,
      isActive: data.isActive !== undefined ? data.isActive : true,
    });
  }

  async getAllPackages(activeOnly = false) {
    return packageRepository.findAll(activeOnly);
  }

  async getPackageById(id: string) {
    const pkg = await packageRepository.findById(id);
    if (!pkg) {
      throw new AppError("Package plan not found", HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
    }
    return pkg;
  }

  async updatePackage(id: string, data: any) {
    const existing = await packageRepository.findById(id);
    if (!existing) {
      throw new AppError("Package plan not found", HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
    }

    const price = data.pricePerTiffin !== undefined ? data.pricePerTiffin : existing.pricePerTiffin;
    const tiffins = data.totalTiffins !== undefined ? data.totalTiffins : existing.totalTiffins;
    const totalAmount = price * tiffins;

    return packageRepository.update(id, {
      ...data,
      totalAmount,
    });
  }

  async deactivatePackage(id: string) {
    const pkg = await packageRepository.delete(id);
    if (!pkg) {
      throw new AppError("Package plan not found", HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
    }
    return pkg;
  }
}

export default new PackageService();
