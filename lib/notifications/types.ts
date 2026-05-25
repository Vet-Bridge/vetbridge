export type NotificationChannel = "sms" | "email" | "in_app";

export type NotificationStatus = "pending" | "sent" | "skipped" | "failed";

export type NotificationSendResult = {
  status: NotificationStatus;
  provider: string;
  providerMessageId?: string;
  reason?: string;
  error?: string;
};

export type SmsSendInput = {
  phone: string;
  message: string;
};

export type NotificationProviderAdapter = {
  providerKey: string;
  sendSms(input: SmsSendInput): Promise<NotificationSendResult>;
};

export type OwnerSmsNotificationInput = {
  phone: string;
  petName: string;
  message: string;
  link?: string;
};
