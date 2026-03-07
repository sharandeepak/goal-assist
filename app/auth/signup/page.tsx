"use client";

import { useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBullseye,
  faEye,
  faEyeSlash,
  faPlus,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";
import { faGoogle } from "@fortawesome/free-brands-svg-icons";
import { Button } from "@/common/ui/button";
import { Input } from "@/common/ui/input";
import { Label } from "@/common/ui/label";
import {
  signUpWithEmail,
  signInWithGoogle,
  createCompanyAndEmployee,
  inviteEmployees,
} from "@/features/auth/services/authService";
import { createClient } from "@/common/lib/supabase/client";

interface EmployeeRow {
  firstName: string;
  lastName: string;
  email: string;
}

const EMPTY_ROW: EmployeeRow = { firstName: "", lastName: "", email: "" };

function SignUpPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialStep = searchParams.get("step") === "company" ? 2 : 1;

  const [step, setStep] = useState(initialStep);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");

  const [companyId, setCompanyId] = useState<string | null>(null);

  const [employeeRows, setEmployeeRows] = useState<EmployeeRow[]>([
    { ...EMPTY_ROW },
    { ...EMPTY_ROW },
    { ...EMPTY_ROW },
  ]);

  const handleAddRow = useCallback(() => {
    setEmployeeRows((prev) => [...prev, { ...EMPTY_ROW }]);
  }, []);

  const handleRemoveRow = useCallback((index: number) => {
    setEmployeeRows((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleEmployeeChange = useCallback(
    (index: number, field: keyof EmployeeRow, value: string) => {
      setEmployeeRows((prev) =>
        prev.map((row, i) => (i === index ? { ...row, [field]: value } : row))
      );
    },
    []
  );

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const { user } = await signUpWithEmail(
        email,
        password,
        firstName,
        lastName
      );

      if (!user) {
        setError("Sign up failed. Please try again.");
        return;
      }

      const { company } = await createCompanyAndEmployee(
        companyName,
        user.id,
        email,
        firstName,
        lastName
      );

      setCompanyId(company.id);
      setStep(2);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompanySetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/auth/signin");
        return;
      }

      let currentCompanyId = companyId;

      if (!currentCompanyId) {
        if (!companyName.trim()) {
          setError("Company name is required.");
          return;
        }
        const { company } = await createCompanyAndEmployee(
          companyName,
          user.id,
          user.email ?? email,
          firstName || user.user_metadata?.first_name || "",
          lastName || user.user_metadata?.last_name || ""
        );
        currentCompanyId = company.id;
        setCompanyId(currentCompanyId);
      }

      setStep(2);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (companyId) {
        const validRows = employeeRows.filter((r) => r.email.trim());
        if (validRows.length > 0) {
          await inviteEmployees(companyId, validRows);
        }
      }
      router.push("/");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    router.push("/");
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setIsLoading(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Google sign in failed."
      );
      setIsLoading(false);
    }
  };

  const steps = [
    { number: 1, label: "Sign up your account" },
    { number: 2, label: "Add your team" },
  ];

  return (
    <div className="flex min-h-screen w-full">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[520px] flex-col relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-950 via-purple-900 to-fuchsia-950" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(167,139,250,0.3),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(192,132,252,0.15),transparent_60%)]" />

        <div className="absolute top-0 left-0 right-0 h-64 opacity-40">
          <div className="absolute top-8 left-12 w-48 h-48 bg-purple-500/30 rounded-full blur-3xl" />
          <div className="absolute top-20 right-8 w-32 h-32 bg-fuchsia-500/20 rounded-full blur-2xl" />
        </div>

        <div className="relative z-10 flex flex-col h-full p-10">
          <div className="flex items-center gap-3 mb-auto">
            <div className="flex items-center justify-center w-10 h-10 bg-white/10 backdrop-blur-sm rounded-xl border border-white/10">
              <FontAwesomeIcon
                icon={faBullseye}
                className="text-white text-lg"
              />
            </div>
            <span className="font-display font-bold text-xl text-white tracking-tight">
              Goal Assist
            </span>
          </div>

          <div className="flex flex-col items-center text-center my-auto">
            <h2 className="font-display font-bold text-3xl text-white mb-3 leading-tight">
              Get Started with Us
            </h2>
            <p className="text-white/60 text-base max-w-[280px] leading-relaxed">
              Complete these easy steps to set up your workspace.
            </p>

            <div className="mt-10 w-full max-w-[320px] space-y-3">
              {steps.map((s) => {
                const isActive = step === s.number;
                const isDone = step > s.number;
                return (
                  <div
                    key={s.number}
                    className={`flex items-center gap-4 px-5 py-3.5 rounded-2xl transition-all duration-300 ${
                      isActive
                        ? "bg-white/15 backdrop-blur-sm border border-white/20 shadow-lg shadow-purple-500/10"
                        : isDone
                          ? "bg-white/5 border border-white/5"
                          : "bg-transparent border border-transparent"
                    }`}
                  >
                    <div
                      className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold shrink-0 transition-all duration-300 ${
                        isActive
                          ? "bg-white text-purple-900"
                          : isDone
                            ? "bg-green-400/80 text-white"
                            : "bg-white/10 text-white/40 border border-white/10"
                      }`}
                    >
                      {isDone ? (
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2.5}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      ) : (
                        s.number
                      )}
                    </div>
                    <span
                      className={`text-sm font-medium transition-colors duration-300 ${
                        isActive
                          ? "text-white"
                          : isDone
                            ? "text-white/50"
                            : "text-white/30"
                      }`}
                    >
                      {s.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-auto" />
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 overflow-y-auto">
        <div className="w-full max-w-[440px]">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              {error}
            </div>
          )}

          {step === 1 && (
            <>
              <div className="mb-8">
                <h1 className="font-display font-bold text-2xl text-foreground mb-2">
                  Sign Up Account
                </h1>
                <p className="text-muted-foreground text-sm">
                  Enter your personal data to create your account.
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full h-12 rounded-xl text-sm font-medium mb-6"
                onClick={handleGoogleSignIn}
                disabled={isLoading}
              >
                <FontAwesomeIcon icon={faGoogle} className="mr-2.5 text-base" />
                Google
              </Button>

              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-3 text-muted-foreground">
                    Or
                  </span>
                </div>
              </div>

              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" className="text-sm font-medium">
                      First Name
                    </Label>
                    <Input
                      id="firstName"
                      placeholder="eg. John"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                      className="h-11 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName" className="text-sm font-medium">
                      Last Name
                    </Label>
                    <Input
                      id="lastName"
                      placeholder="eg. Francisco"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="h-11 rounded-xl"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="eg. johnfrans@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-11 rounded-xl"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium">
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={8}
                      className="h-11 rounded-xl pr-11"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <FontAwesomeIcon
                        icon={showPassword ? faEye : faEyeSlash}
                        className="text-sm"
                      />
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Must be at least 8 characters.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="companyName" className="text-sm font-medium">
                    Company Name
                  </Label>
                  <Input
                    id="companyName"
                    placeholder="eg. Acme Inc."
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    required
                    className="h-11 rounded-xl"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 rounded-xl text-sm font-semibold mt-2"
                  disabled={isLoading}
                >
                  {isLoading ? "Creating Account..." : "Sign Up"}
                </Button>
              </form>

              <p className="text-center text-sm text-muted-foreground mt-6">
                Already have an account?{" "}
                <Link
                  href="/auth/signin"
                  className="text-primary font-semibold hover:underline"
                >
                  Log in
                </Link>
              </p>
            </>
          )}

          {step === 2 && (
            <>
              <div className="mb-8">
                <h1 className="font-display font-bold text-2xl text-foreground mb-2">
                  Add Your Team
                </h1>
                <p className="text-muted-foreground text-sm">
                  Invite your team members to collaborate on Goal Assist.
                </p>
              </div>

              <form onSubmit={handleInvite} className="space-y-4">
                <div className="space-y-3">
                  {employeeRows.map((row, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 group"
                    >
                      <div className="flex-1 grid grid-cols-5 gap-2">
                        <div className="col-span-2">
                          {index === 0 && (
                            <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                              First Name
                            </Label>
                          )}
                          <Input
                            placeholder="First name"
                            value={row.firstName}
                            onChange={(e) =>
                              handleEmployeeChange(
                                index,
                                "firstName",
                                e.target.value
                              )
                            }
                            className="h-10 rounded-lg text-sm"
                          />
                        </div>
                        <div className="col-span-3">
                          {index === 0 && (
                            <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                              Email
                            </Label>
                          )}
                          <div className="flex gap-2">
                            <Input
                              type="email"
                              placeholder="email@company.com"
                              value={row.email}
                              onChange={(e) =>
                                handleEmployeeChange(
                                  index,
                                  "email",
                                  e.target.value
                                )
                              }
                              className="h-10 rounded-lg text-sm flex-1"
                            />
                            {employeeRows.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveRow(index)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive shrink-0 w-8 h-10 flex items-center justify-center"
                              >
                                <FontAwesomeIcon
                                  icon={faTrash}
                                  className="text-xs"
                                />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleAddRow}
                  className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 font-medium transition-colors"
                >
                  <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10">
                    <FontAwesomeIcon icon={faPlus} className="text-xs" />
                  </div>
                  Add another member
                </button>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 h-12 rounded-xl text-sm font-medium"
                    onClick={handleSkip}
                    disabled={isLoading}
                  >
                    Skip for now
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 h-12 rounded-xl text-sm font-semibold"
                    disabled={isLoading}
                  >
                    {isLoading ? "Inviting..." : "Continue"}
                  </Button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SignUpPage() {
  return (
    <Suspense fallback={null}>
      <SignUpPageContent />
    </Suspense>
  );
}
