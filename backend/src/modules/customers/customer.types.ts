export interface CreateCustomerInput {
  name: string;
  phone: string;
  address: string;
  email?: string;
  notes?: string;
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
