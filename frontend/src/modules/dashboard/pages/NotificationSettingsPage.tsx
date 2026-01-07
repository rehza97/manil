import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Label } from "@/shared/components/ui/label";
import { Switch } from "@/shared/components/ui/switch";
import { ArrowLeft, Save, Bell } from "lucide-react";
import { useToast } from "@/shared/hooks/use-toast";

export const NotificationSettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState({
    email: {
      orderUpdates: true,
      ticketUpdates: true,
      invoiceUpdates: true,
      marketing: false,
    },
    push: {
      orderUpdates: true,
      ticketUpdates: true,
      invoiceUpdates: false,
    },
    sms: {
      orderUpdates: false,
      ticketUpdates: false,
      invoiceUpdates: false,
    },
  });

  const handleSave = () => {
    // TODO: Implement API call to save notification preferences
    toast({
      title: "Settings Saved",
      description: "Your notification preferences have been updated.",
    });
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/dashboard/settings")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Settings
        </Button>
      </div>

      <div>
        <h1 className="text-3xl font-bold text-slate-900">
          Notification Preferences
        </h1>
        <p className="text-muted-foreground mt-1">
          Configure how and when you receive notifications
        </p>
      </div>

      {/* Email Notifications */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Bell className="h-5 w-5 text-blue-600" />
            <CardTitle>Email Notifications</CardTitle>
          </div>
          <CardDescription>
            Receive notifications via email
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="email-orders">Order Updates</Label>
              <p className="text-sm text-muted-foreground">
                Get notified about order status changes
              </p>
            </div>
            <Switch
              id="email-orders"
              checked={notifications.email.orderUpdates}
              onCheckedChange={(checked) =>
                setNotifications({
                  ...notifications,
                  email: { ...notifications.email, orderUpdates: checked },
                })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="email-tickets">Ticket Updates</Label>
              <p className="text-sm text-muted-foreground">
                Get notified about support ticket updates
              </p>
            </div>
            <Switch
              id="email-tickets"
              checked={notifications.email.ticketUpdates}
              onCheckedChange={(checked) =>
                setNotifications({
                  ...notifications,
                  email: { ...notifications.email, ticketUpdates: checked },
                })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="email-invoices">Invoice Updates</Label>
              <p className="text-sm text-muted-foreground">
                Get notified about invoice status changes
              </p>
            </div>
            <Switch
              id="email-invoices"
              checked={notifications.email.invoiceUpdates}
              onCheckedChange={(checked) =>
                setNotifications({
                  ...notifications,
                  email: { ...notifications.email, invoiceUpdates: checked },
                })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="email-marketing">Marketing Emails</Label>
              <p className="text-sm text-muted-foreground">
                Receive promotional emails and newsletters
              </p>
            </div>
            <Switch
              id="email-marketing"
              checked={notifications.email.marketing}
              onCheckedChange={(checked) =>
                setNotifications({
                  ...notifications,
                  email: { ...notifications.email, marketing: checked },
                })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Push Notifications */}
      <Card>
        <CardHeader>
          <CardTitle>Push Notifications</CardTitle>
          <CardDescription>
            Receive browser push notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="push-orders">Order Updates</Label>
              <p className="text-sm text-muted-foreground">
                Get push notifications for order changes
              </p>
            </div>
            <Switch
              id="push-orders"
              checked={notifications.push.orderUpdates}
              onCheckedChange={(checked) =>
                setNotifications({
                  ...notifications,
                  push: { ...notifications.push, orderUpdates: checked },
                })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="push-tickets">Ticket Updates</Label>
              <p className="text-sm text-muted-foreground">
                Get push notifications for ticket updates
              </p>
            </div>
            <Switch
              id="push-tickets"
              checked={notifications.push.ticketUpdates}
              onCheckedChange={(checked) =>
                setNotifications({
                  ...notifications,
                  push: { ...notifications.push, ticketUpdates: checked },
                })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="push-invoices">Invoice Updates</Label>
              <p className="text-sm text-muted-foreground">
                Get push notifications for invoice changes
              </p>
            </div>
            <Switch
              id="push-invoices"
              checked={notifications.push.invoiceUpdates}
              onCheckedChange={(checked) =>
                setNotifications({
                  ...notifications,
                  push: { ...notifications.push, invoiceUpdates: checked },
                })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* SMS Notifications */}
      <Card>
        <CardHeader>
          <CardTitle>SMS Notifications</CardTitle>
          <CardDescription>
            Receive text message notifications (requires phone number)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="sms-orders">Order Updates</Label>
              <p className="text-sm text-muted-foreground">
                Get SMS for important order updates
              </p>
            </div>
            <Switch
              id="sms-orders"
              checked={notifications.sms.orderUpdates}
              onCheckedChange={(checked) =>
                setNotifications({
                  ...notifications,
                  sms: { ...notifications.sms, orderUpdates: checked },
                })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="sms-tickets">Ticket Updates</Label>
              <p className="text-sm text-muted-foreground">
                Get SMS for urgent ticket updates
              </p>
            </div>
            <Switch
              id="sms-tickets"
              checked={notifications.sms.ticketUpdates}
              onCheckedChange={(checked) =>
                setNotifications({
                  ...notifications,
                  sms: { ...notifications.sms, ticketUpdates: checked },
                })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="sms-invoices">Invoice Updates</Label>
              <p className="text-sm text-muted-foreground">
                Get SMS for invoice payment reminders
              </p>
            </div>
            <Switch
              id="sms-invoices"
              checked={notifications.sms.invoiceUpdates}
              onCheckedChange={(checked) =>
                setNotifications({
                  ...notifications,
                  sms: { ...notifications.sms, invoiceUpdates: checked },
                })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave}>
          <Save className="h-4 w-4 mr-2" />
          Save Changes
        </Button>
      </div>
    </div>
  );
};











