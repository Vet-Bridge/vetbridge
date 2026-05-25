import { NextResponse } from "next/server";
import { sendSmsNotification } from "../../../lib/sms";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const internalSecret = process.env.SMS_INTERNAL_SECRET;
  const providedSecret = request.headers.get("x-mypawlink-internal-secret");

  if (!internalSecret || providedSecret !== internalSecret) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

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

  if (!phone || !petName || !message) {
    return NextResponse.json(
      { error: "Missing phone, pet name, or message." },
      { status: 400 }
    );
  }

  const result = await sendSmsNotification({
    phone,
    petName,
    message,
    link,
  });

  if (!result.sent && result.reason !== "not-configured") {
    return NextResponse.json(
      { error: result.error || "Unable to send SMS.", provider: result.provider || "" },
      { status: 502 }
    );
  }

  return NextResponse.json({
    sent: result.sent,
    configured: result.reason !== "not-configured",
    provider: result.provider || "",
    providerMessageId: result.providerMessageId || "",
  });
}
