export interface UserSettings {
  id: string;
  userId: string;
  theme: "light" | "dark" | "system";
  language: string;
  notifications: NotificationSettings;
  preferences: Record<string, unknown>;
}

export interface NotificationSettings {
  email: boolean;
  sms: boolean;
  push: boolean;
  ticketUpdates: boolean;
  orderUpdates: boolean;
}

/** User notification preferences (nested channels). Matches backend DEFAULT_NOTIFICATION_PREFERENCES. */
export interface NotificationPrefs {
  email: {
    orderUpdates: boolean;
    ticketUpdates: boolean;
    invoiceUpdates: boolean;
    marketing?: boolean;
  };
  push: {
    orderUpdates: boolean;
    ticketUpdates: boolean;
    invoiceUpdates: boolean;
  };
  sms: {
    orderUpdates: boolean;
    ticketUpdates: boolean;
    invoiceUpdates: boolean;
  };
}

export interface UpdateUserSettingsDTO {
  theme?: "light" | "dark" | "system";
  language?: string;
  notifications?: Partial<NotificationSettings>;
  preferences?: Record<string, unknown>;
}

export interface SystemSettings {
  id: string;
  key: string;
  value: string;
  description: string;
}
