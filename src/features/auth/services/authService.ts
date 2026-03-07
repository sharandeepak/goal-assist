import { createClient } from "@/common/lib/supabase/client";
import { AppError } from "@/common/errors/AppError";
import { supabaseAuthRepository } from "../repository/supabaseAuthRepository";
import type { SupabaseCompany, SupabaseEmployee } from "@/common/types";

const authRepo = supabaseAuthRepository;

export async function signUpWithEmail(
  email: string,
  password: string,
  firstName: string,
  lastName: string
) {
  if (!email || !password) {
    throw AppError.badRequest(
      "AUTH_MISSING_FIELDS",
      "Email and password are required."
    );
  }
  if (password.length < 8) {
    throw AppError.badRequest(
      "AUTH_WEAK_PASSWORD",
      "Password must be at least 8 characters."
    );
  }

  const supabase = createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        first_name: firstName,
        last_name: lastName,
        full_name: `${firstName} ${lastName}`.trim(),
      },
    },
  });

  if (error) {
    throw AppError.badRequest("AUTH_SIGNUP_ERROR", error.message);
  }

  return data;
}

export async function signInWithEmail(email: string, password: string) {
  if (!email || !password) {
    throw AppError.badRequest(
      "AUTH_MISSING_FIELDS",
      "Email and password are required."
    );
  }

  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw AppError.badRequest("AUTH_SIGNIN_ERROR", error.message);
  }

  return data;
}

export async function signInWithGoogle() {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });

  if (error) {
    throw AppError.badRequest("AUTH_GOOGLE_ERROR", error.message);
  }

  return data;
}

export async function signOut() {
  const supabase = createClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw AppError.internal("AUTH_SIGNOUT_ERROR", error.message);
  }
}

export async function createCompanyAndEmployee(
  companyName: string,
  userId: string,
  email: string,
  firstName: string,
  lastName: string
): Promise<{ company: SupabaseCompany; employee: SupabaseEmployee }> {
  if (!companyName.trim()) {
    throw AppError.badRequest(
      "COMPANY_NAME_REQUIRED",
      "Company name is required."
    );
  }

  const company = await authRepo.createCompany({
    name: companyName.trim(),
    creator_id: userId,
  });

  const employee = await authRepo.createEmployee({
    company_id: company.id,
    user_id: userId,
    first_name: firstName,
    last_name: lastName || null,
    email,
    role: "admin",
    status: "active",
  });

  return { company, employee };
}

export async function inviteEmployees(
  companyId: string,
  employees: { firstName: string; lastName: string; email: string }[]
): Promise<SupabaseEmployee[]> {
  const validEmployees = employees.filter(
    (e) => e.email.trim() && e.firstName.trim()
  );

  if (validEmployees.length === 0) return [];

  const insertData = validEmployees.map((e) => ({
    company_id: companyId,
    first_name: e.firstName.trim(),
    last_name: e.lastName.trim() || null,
    email: e.email.trim().toLowerCase(),
    role: "member" as const,
    status: "invited" as const,
  }));

  return authRepo.createEmployeesBatch(insertData);
}

export async function getEmployeeProfile(userId: string) {
  return authRepo.getEmployeeByUserId(userId);
}
