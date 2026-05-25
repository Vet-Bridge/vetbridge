export type RuntimeEnvironment = "development" | "staging" | "production" | "test";

export type EnvironmentCheck = {
  name: string;
  configured: boolean;
  required: boolean;
};

export type EnvironmentStatus = {
  runtimeEnvironment: RuntimeEnvironment;
  checks: EnvironmentCheck[];
  missingRequired: string[];
};

const runtimeEnvironmentValues: RuntimeEnvironment[] = [
  "development",
  "staging",
  "production",
  "test",
];

const requiredServerEnv = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
];

const optionalIntegrationEnv = [
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_SITE_URL",
  "TWILIO_ACCOUNT_SID",
  "TWILIO_AUTH_TOKEN",
  "TWILIO_PHONE_NUMBER",
  "RESEND_API_KEY",
  "MYPAWLINK_EMAIL_FROM",
  "EZYVET_CLIENT_ID",
  "EZYVET_CLIENT_SECRET",
  "EZYVET_API_BASE_URL",
  "SMARTFLOW_API_KEY",
  "SMARTFLOW_API_BASE_URL",
];

export const getRuntimeEnvironment = (): RuntimeEnvironment => {
  const value = process.env.MYPAWLINK_ENV || process.env.VERCEL_ENV || process.env.NODE_ENV || "development";
  return runtimeEnvironmentValues.includes(value as RuntimeEnvironment)
    ? (value as RuntimeEnvironment)
    : "development";
};

export const getEnvironmentStatus = (): EnvironmentStatus => {
  const requiredChecks = requiredServerEnv.map((name) => ({
    name,
    configured: Boolean(process.env[name]),
    required: true,
  }));
  const optionalChecks = optionalIntegrationEnv.map((name) => ({
    name,
    configured: Boolean(process.env[name]),
    required: false,
  }));
  const checks = [...requiredChecks, ...optionalChecks];

  return {
    runtimeEnvironment: getRuntimeEnvironment(),
    checks,
    missingRequired: checks
      .filter((check) => check.required && !check.configured)
      .map((check) => check.name),
  };
};

export const assertRequiredServerEnv = () => {
  const status = getEnvironmentStatus();

  if (status.missingRequired.length) {
    throw new Error(
      "Missing required MyPawLink environment variables: " +
        status.missingRequired.join(", ")
    );
  }

  return status;
};
