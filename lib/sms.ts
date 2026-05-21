const normalizePhone = (phone: string) => {
  const trimmed = phone.trim();
  if (trimmed.startsWith("+")) return trimmed;

  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;

  return "";
};

type SmsNotificationResult = {
  sent: boolean;
  reason?: string;
  providerMessageId?: string;
  error?: string;
};

export const sendSmsNotification = async ({
  phone,
  petName,
  message,
  link,
}: {
  phone: string;
  petName: string;
  message: string;
  link?: string;
}): Promise<SmsNotificationResult> => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;
  const siteUrl = link || process.env.NEXT_PUBLIC_SITE_URL || "https://mypawlink.com";
  const toNumber = normalizePhone(phone);

  if (!toNumber || !petName || !message) {
    return { sent: false, reason: "missing-fields" };
  }

  if (!accountSid || !authToken || !fromNumber) {
    console.info("SMS skipped because Twilio environment variables are not configured.");
    return { sent: false, reason: "not-configured" };
  }

  const body = `MyPawLink update for ${petName}: ${message} View visit: ${siteUrl}`;
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
        Body: body,
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Twilio SMS failed:", errorText);
    return { sent: false, reason: "twilio-error", error: errorText };
  }

  const result = (await response.json().catch(() => null)) as { sid?: string } | null;
  return { sent: true, providerMessageId: result?.sid || "" };
};
