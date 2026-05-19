import { NextResponse } from "next/server";

export const runtime = "nodejs";

const normalizePhone = (phone: string) => {
  const trimmed = phone.trim();
  if (trimmed.startsWith("+")) return trimmed;

  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;

  return "";
};

export async function POST(request: Request) {
  const {
    phone,
    petName,
    message,
    link,
  }: {
    phone?: string;
    petName?: string;
    message?: string;
    link?: string;
  } = await request.json();

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || link || "https://mypawlink.com";
  const toNumber = normalizePhone(phone || "");

  if (!toNumber || !petName || !message) {
    return NextResponse.json(
      { error: "Missing phone, pet name, or message." },
      { status: 400 }
    );
  }

  if (!accountSid || !authToken || !fromNumber) {
    console.info("SMS skipped because Twilio environment variables are not configured.");
    return NextResponse.json({ sent: false, configured: false });
  }

  const body = `MyPawLink update for ${petName}: ${message} View updates: ${siteUrl}`;
  const twilioResponse = await fetch(
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

  if (!twilioResponse.ok) {
    const errorText = await twilioResponse.text();
    console.error("Twilio SMS failed:", errorText);
    return NextResponse.json(
      { error: "Unable to send SMS." },
      { status: 502 }
    );
  }

  return NextResponse.json({ sent: true, configured: true });
}
