import type {
  SupabaseCompany,
  SupabaseCompanyInsert,
  SupabaseEmployee,
  SupabaseEmployeeInsert,
} from "@/common/types";

export interface AuthRepository {
  createCompany(data: SupabaseCompanyInsert): Promise<SupabaseCompany>;

  createEmployee(data: SupabaseEmployeeInsert): Promise<SupabaseEmployee>;

  createEmployeesBatch(
    employees: SupabaseEmployeeInsert[]
  ): Promise<SupabaseEmployee[]>;

  getEmployeeByUserId(userId: string): Promise<SupabaseEmployee | null>;

  getCompanyById(companyId: string): Promise<SupabaseCompany | null>;

  activateEmployee(employeeId: string, userId: string): Promise<void>;
}
