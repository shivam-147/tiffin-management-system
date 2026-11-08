import PackageCatalog, { IPackageCatalog } from "./package.model";

class PackageRepository {
  async create(data: Partial<IPackageCatalog>): Promise<IPackageCatalog> {
    return PackageCatalog.create(data);
  }

  async findById(id: string): Promise<IPackageCatalog | null> {
    return PackageCatalog.findById(id);
  }

  async findAll(activeOnly = false): Promise<IPackageCatalog[]> {
    const filter = activeOnly ? { isActive: true } : {};
    return PackageCatalog.find(filter).sort({ createdAt: -1 });
  }

  async update(id: string, data: Partial<IPackageCatalog>): Promise<IPackageCatalog | null> {
    return PackageCatalog.findByIdAndUpdate(id, data, { returnDocument: "after", runValidators: true });
  }

  async delete(id: string): Promise<IPackageCatalog | null> {
    return PackageCatalog.findByIdAndUpdate(id, { isActive: false }, { returnDocument: "after" });
  }
}

export default new PackageRepository();
