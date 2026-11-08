export interface CreateCustomerInput {
  name: string;
  phone: string;
  address: string;
  email?: string;
  notes?: string;
  packageCatalogId?: string;
  advanceAmount?: number;
  startDate?: string | Date;
}

export interface UpdateCustomerInput {
  name?: string;
  phone?: string;
  address?: string;
  email?: string;
  notes?: string;
  isActive?: boolean;
}

export interface CustomerQueryInput {
  search?: string;
  isActive?: boolean | string;
  page?: number;
  limit?: number;
}
