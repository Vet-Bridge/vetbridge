import { notificationService } from "./notifications";

type SmsNotificationResult = {
  sent: boolean;
  reason?: string;
  providerMessageId?: string;
  error?: string;
  provider?: string;
};

export const sendSmsNotification = async ({
  phone,
  petName,
  message,
  link,
  messageBody,
}: {
  phone: string;
  petName: string;
  message: string;
  link?: string;
  messageBody?: string;
}): Promise<SmsNotificationResult> => {
  const result = await notificationService.sendOwnerSms({
    phone,
    petName,
    message,
    link,
    messageBody,
  });

  return {
    sent: result.status === "sent",
    reason: result.reason || result.status,
    providerMessageId: result.providerMessageId || "",
    error: result.error || "",
    provider: result.provider,
  };
};
