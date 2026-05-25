import { createTwilioSmsProvider } from "./providers/twilio-provider";
import type {
  NotificationProviderAdapter,
  NotificationSendResult,
  OwnerSmsNotificationInput,
} from "./types";

export type NotificationService = {
  sendOwnerSms(input: OwnerSmsNotificationInput): Promise<NotificationSendResult>;
};

export const createNotificationService = ({
  smsProvider = createTwilioSmsProvider(),
}: {
  smsProvider?: NotificationProviderAdapter;
} = {}): NotificationService => ({
  async sendOwnerSms({ phone, petName, message, link }: OwnerSmsNotificationInput) {
    const siteUrl = link || process.env.NEXT_PUBLIC_SITE_URL || "https://mypawlink.com";

    if (!phone || !petName || !message) {
      return { status: "failed", provider: smsProvider.providerKey, reason: "missing-fields" };
    }

    return smsProvider.sendSms({
      phone,
      message: `MyPawLink update for ${petName}: ${message} View visit: ${siteUrl}`,
    });
  },
});

export const notificationService = createNotificationService();
