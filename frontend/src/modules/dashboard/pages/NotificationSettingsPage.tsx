import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
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
import { ArrowLeft, Save, Bell, Loader2 } from "lucide-react";
import { useToast } from "@/shared/hooks/use-toast";
import { clientSettingsApi } from "@/shared/api/dashboard/client/settings";
import { corporateSettingsApi } from "@/shared/api/dashboard/corporate/settings";
import type { NotificationPrefs } from "@/modules/settings/types";

const DEFAULT_PREFERENCES: NotificationPrefs = {
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
};

export const NotificationSettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<NotificationPrefs>(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isCorporate = location.pathname.startsWith("/corporate");
  const api = isCorporate ? corporateSettingsApi : clientSettingsApi;

  const fetchPreferences = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getNotificationSettings();
      if (data && typeof data === "object") {
        setNotifications({
          email: { ...DEFAULT_PREFERENCES.email, ...(data.email ?? {}) },
          push: { ...DEFAULT_PREFERENCES.push, ...(data.push ?? {}) },
          sms: { ...DEFAULT_PREFERENCES.sms, ...(data.sms ?? {}) },
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible de charger les préférences de notification.");
      toast({ title: "Erreur", description: "Impossible de charger les paramètres de notification.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [api, toast]);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await api.updateNotificationSettings(notifications);
      toast({ title: "Settings Saved", description: "Your notification preferences have been updated." });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to save.";
      setError(msg);
      toast({ title: "Error", description: "Could not save notification settings.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const backPath = isCorporate ? "/corporate/settings" : "/dashboard/settings";

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(backPath)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour aux paramètres
        </Button>
      </div>

      <div>
        <h1 className="text-3xl font-bold text-slate-900">
          Préférences de notification
        </h1>
        <p className="text-muted-foreground mt-1">
          Configurer la réception des notifications
        </p>
        {error && (
          <p className="mt-2 text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
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
              <Label htmlFor="email-tickets">Mises à jour des tickets</Label>
              <p className="text-sm text-muted-foreground">
                Être notifié des mises à jour des tickets support
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
              <Label htmlFor="email-marketing">E-mails marketing</Label>
              <p className="text-sm text-muted-foreground">
                Recevoir les offres et newsletters
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
              <Label htmlFor="push-tickets">Mises à jour des tickets</Label>
              <p className="text-sm text-muted-foreground">
                Notifications push pour les mises à jour des tickets
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
          <CardTitle>Notifications SMS</CardTitle>
          <CardDescription>
            Recevoir les notifications par SMS (numéro requis)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="sms-orders">Mises à jour des commandes</Label>
              <p className="text-sm text-muted-foreground">
                SMS pour les mises à jour importantes des commandes
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
              <Label htmlFor="sms-invoices">Mises à jour des factures</Label>
              <p className="text-sm text-muted-foreground">
                SMS pour les rappels de paiement des factures
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
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Enregistrer
        </Button>
      </div>
    </div>
  );
};











