export type CustomerStatus = "prospect" | "active" | "inactive" | "churned";

export interface Customer {
  id: string;
  company_name: string;
  contact_name: string;
  email: string;
  phone: string | null;
  status: CustomerStatus;
  created_by_id: string;
  created_at: string;
  updated_at: string;
}

export interface CustomerCreatePayload {
  company_name: string;
  contact_name: string;
  email: string;
  phone?: string | null;
  status?: CustomerStatus;
}

export type CustomerUpdatePayload = Partial<CustomerCreatePayload>;

export type CustomerSortField = "company_name" | "created_at" | "status";
export type SortOrder = "asc" | "desc";

export interface CustomerListQuery {
  search?: string;
  status?: CustomerStatus;
  page?: number;
  page_size?: number;
  sort_by?: CustomerSortField;
  sort_order?: SortOrder;
}
