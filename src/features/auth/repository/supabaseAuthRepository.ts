import { createClient } from "@/common/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/common/types/database.types";
import type {
  SupabaseCompany,
  SupabaseCompanyInsert,
  SupabaseEmployee,
  SupabaseEmployeeInsert,
} from "@/common/types";
import type { AuthRepository } from "./authRepository";
import { AppError } from "@/common/errors/AppError";

let clientInstance: SupabaseClient<Database> | null = null;

function getClient(): SupabaseClient<Database> {
  if (!clientInstance) {
    clientInstance = createClient();
  }
  return clientInstance;
}

export class SupabaseAuthRepository implements AuthRepository {
  async createCompany(data: SupabaseCompanyInsert): Promise<SupabaseCompany> {
    try {
      const { data: company, error } = await getClient()
        .from("companies")
        .insert(data)
        .select()
        .single();

      if (error)
        throw AppError.internal("COMPANY_CREATE_ERROR", error.message);
      if (!company)
        throw AppError.internal(
          "COMPANY_CREATE_ERROR",
          "No data returned on insert."
        );
      return company as SupabaseCompany;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw AppError.internal("COMPANY_CREATE_ERROR", "Failed to create company.");
    }
  }

  async createEmployee(
    data: SupabaseEmployeeInsert
  ): Promise<SupabaseEmployee> {
    try {
      const { data: employee, error } = await getClient()
        .from("employees")
        .insert(data)
        .select()
        .single();

      if (error)
        throw AppError.internal("EMPLOYEE_CREATE_ERROR", error.message);
      if (!employee)
        throw AppError.internal(
          "EMPLOYEE_CREATE_ERROR",
          "No data returned on insert."
        );
      return employee as SupabaseEmployee;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw AppError.internal(
        "EMPLOYEE_CREATE_ERROR",
        "Failed to create employee."
      );
    }
  }

  async createEmployeesBatch(
    employees: SupabaseEmployeeInsert[]
  ): Promise<SupabaseEmployee[]> {
    try {
      if (employees.length === 0) return [];

      const { data, error } = await getClient()
        .from("employees")
        .insert(employees)
        .select();

      if (error)
        throw AppError.internal("EMPLOYEES_BATCH_ERROR", error.message);
      return (data ?? []) as SupabaseEmployee[];
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw AppError.internal(
        "EMPLOYEES_BATCH_ERROR",
        "Failed to create employees."
      );
    }
  }

  async getEmployeeByUserId(
    userId: string
  ): Promise<SupabaseEmployee | null> {
    try {
      const { data, error } = await getClient()
        .from("employees")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "active")
        .limit(1)
        .single();

      if (error && error.code !== "PGRST116") {
        throw AppError.internal("EMPLOYEE_FETCH_ERROR", error.message);
      }
      return (data as SupabaseEmployee) ?? null;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw AppError.internal(
        "EMPLOYEE_FETCH_ERROR",
        "Failed to fetch employee."
      );
    }
  }

  async getCompanyById(companyId: string): Promise<SupabaseCompany | null> {
    try {
      const { data, error } = await getClient()
        .from("companies")
        .select("*")
        .eq("id", companyId)
        .single();

      if (error && error.code !== "PGRST116") {
        throw AppError.internal("COMPANY_FETCH_ERROR", error.message);
      }
      return (data as SupabaseCompany) ?? null;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw AppError.internal(
        "COMPANY_FETCH_ERROR",
        "Failed to fetch company."
      );
    }
  }

  async activateEmployee(employeeId: string, userId: string): Promise<void> {
    try {
      const { error } = await getClient()
        .from("employees")
        .update({ user_id: userId, status: "active" as const })
        .eq("id", employeeId);

      if (error)
        throw AppError.internal("EMPLOYEE_ACTIVATE_ERROR", error.message);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw AppError.internal(
        "EMPLOYEE_ACTIVATE_ERROR",
        "Failed to activate employee."
      );
    }
  }
}

export const supabaseAuthRepository = new SupabaseAuthRepository();
