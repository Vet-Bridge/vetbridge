import type {
  NotificationProviderAdapter,
  NotificationSendResult,
  SmsSendInput,
} from "../types";

export const normalizePhone = (phone: string) => {
  const trimmed = phone.trim();
  if (trimmed.startsWith("+")) return trimmed;

  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;

  return "";
};

export const createTwilioSmsProvider = (): NotificationProviderAdapter => ({
  providerKey: "twilio",
  async sendSms({ phone, message }: SmsSendInput): Promise<NotificationSendResult> {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;
    const toNumber = normalizePhone(phone);

    if (!toNumber || !message) {
      return { status: "failed", provider: "twilio", reason: "missing-fields" };
    }

    if (!accountSid || !authToken || !fromNumber) {
      console.info("SMS skipped because Twilio environment variables are not configured.");
      return { status: "skipped", provider: "twilio", reason: "not-configured" };
    }

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: toNumber,
          From: fromNumber,
          Body: message,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Twilio SMS failed:", errorText);
      return {
        status: "failed",
        provider: "twilio",
        reason: "provider-error",
        error: errorText,
      };
    }

    const result = (await response.json().catch(() => null)) as { sid?: string } | null;
    return {
      status: "sent",
      provider: "twilio",
      providerMessageId: result?.sid || "",
    };
  },
});
