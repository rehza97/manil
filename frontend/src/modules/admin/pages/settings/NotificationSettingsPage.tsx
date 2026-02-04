/**
 * Notification Settings Page
 *
 * Admin page for managing notification system settings
 * Includes global toggles, event-level controls, and quiet hours
 */

import React, { useState, useEffect } from "react";
import { Save, Loader2, RefreshCw, Bell, TestTube, Mail, MessageSquare, Clock, AlertTriangle } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Switch } from "@/shared/components/ui/switch";
import { Label } from "@/shared/components/ui/label";
import { Input } from "@/shared/components/ui/input";
import { Separator } from "@/shared/components/ui/separator";
import {
  useSettingsByCategory,
  useBatchUpdateSettings,
  useResetSetting,
} from "../../hooks/useSettings";
import { settingsService } from "../../services/settingsService";
import { toast } from "sonner";

interface EventToggle {
  key: string;
  label: string;
  enabled: boolean;
}

interface QuietHours {
  enabled: boolean;
  start: number;
  end: number;
}

export const NotificationSettingsPage: React.FC = () => {
  const { data: settings, isLoading, refetch } = useSettingsByCategory("notification");
  const updateMutation = useBatchUpdateSettings();

  const [testing, setTesting] = useState(false);

  // Global toggles
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);

  // Event toggles
  const [ticketEvents, setTicketEvents] = useState<Record<string, boolean>>({
    created: true,
    replied: true,
    assigned: true,
    status_changed: true,
    closed: true,
  });

  const [orderEvents, setOrderEvents] = useState<Record<string, boolean>>({
    created: true,
    approved: true,
    shipped: true,
    delivered: true,
    cancelled: true,
  });

  const [invoiceEvents, setInvoiceEvents] = useState<Record<string, boolean>>({
    issued: true,
    sent: true,
    payment_received: true,
    overdue: true,
  });

  // Quiet hours
  const [quietHours, setQuietHours] = useState<QuietHours>({
    enabled: false,
    start: 22,
    end: 7,
  });

  // Digest
  const [digestEnabled, setDigestEnabled] = useState(false);
  const [digestTime, setDigestTime] = useState("09:00");

  // Load settings
  useEffect(() => {
    if (settings) {
      settings.forEach((setting) => {
        const value = setting.value?.value ?? setting.value;

        switch (setting.key) {
          case "notification.email_enabled":
            setEmailEnabled(Boolean(value));
            break;
          case "notification.sms_enabled":
            setSmsEnabled(Boolean(value));
            break;
          case "notification.push_enabled":
            setPushEnabled(Boolean(value));
            break;
          case "notification.ticket_events":
            if (typeof value === "object") {
              setTicketEvents((prev) => ({ ...prev, ...value }));
            }
            break;
          case "notification.order_events":
            if (typeof value === "object") {
              setOrderEvents((prev) => ({ ...prev, ...value }));
            }
            break;
          case "notification.invoice_events":
            if (typeof value === "object") {
              setInvoiceEvents((prev) => ({ ...prev, ...value }));
            }
            break;
          case "notification.quiet_hours":
            if (typeof value === "object") {
              setQuietHours((prev) => ({ ...prev, ...value }));
            }
            break;
          case "notification.digest_enabled":
            setDigestEnabled(Boolean(value));
            break;
          case "notification.digest_time":
            if (typeof value === "string") {
              setDigestTime(value);
            }
            break;
        }
      });
    }
  }, [settings]);

  const handleSave = async () => {
    const updates = [
      { key: "notification.email_enabled", value: { value: emailEnabled, type: "boolean" } },
      { key: "notification.sms_enabled", value: { value: smsEnabled, type: "boolean" } },
      { key: "notification.push_enabled", value: { value: pushEnabled, type: "boolean" } },
      { key: "notification.ticket_events", value: { value: ticketEvents, type: "object" } },
      { key: "notification.order_events", value: { value: orderEvents, type: "object" } },
      { key: "notification.invoice_events", value: { value: invoiceEvents, type: "object" } },
      { key: "notification.quiet_hours", value: { value: quietHours, type: "object" } },
      { key: "notification.digest_enabled", value: { value: digestEnabled, type: "boolean" } },
      { key: "notification.digest_time", value: { value: digestTime, type: "string" } },
    ];

    try {
      await updateMutation.mutateAsync(updates);
      toast.success("Notification settings saved successfully!");
      refetch();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || "Failed to save settings");
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const result = await settingsService.testNotificationConfig();
      if (result.success) {
        toast.success("Notification configuration test successful!", {
          description: result.message,
        });
      } else {
        toast.error(result.message || "Notification test failed");
      }
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Failed to test notification configuration"
      );
    } finally {
      setTesting(false);
    }
  };

  const EventToggleGroup: React.FC<{
    title: string;
    events: Record<string, boolean>;
    setEvents: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
    labels: Record<string, string>;
  }> = ({ title, events, setEvents, labels }) => (
    <div className="space-y-3">
      <h4 className="font-medium text-sm">{title}</h4>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {Object.entries(events).map(([key, enabled]) => (
          <div key={key} className="flex items-center space-x-2">
            <Switch
              id={`${title}-${key}`}
              checked={enabled}
              onCheckedChange={(checked) =>
                setEvents((prev) => ({ ...prev, [key]: checked }))
              }
            />
            <Label htmlFor={`${title}-${key}`} className="text-sm">
              {labels[key] || key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
            </Label>
          </div>
        ))}
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Bell className="h-8 w-8" />
          Notification Settings
        </h1>
        <p className="text-slate-600 mt-2">
          Configure system-wide notification settings, channels, and event triggers.
        </p>
      </div>

      {/* Global Channel Toggles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Notification Channels
          </CardTitle>
          <CardDescription>
            Enable or disable notification channels globally
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="font-medium">Notifications e-mail</Label>
              <p className="text-sm text-muted-foreground">
                Envoyer les notifications par e-mail
              </p>
            </div>
            <Switch
              checked={emailEnabled}
              onCheckedChange={setEmailEnabled}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="font-medium">Notifications SMS</Label>
              <p className="text-sm text-muted-foreground">
                Envoyer les notifications par SMS (nécessite la configuration du fournisseur SMS)
              </p>
            </div>
            <Switch
              checked={smsEnabled}
              onCheckedChange={setSmsEnabled}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="font-medium">Notifications push</Label>
              <p className="text-sm text-muted-foreground">
                Envoyer les notifications push navigateur/mobile
              </p>
            </div>
            <Switch
              checked={pushEnabled}
              onCheckedChange={setPushEnabled}
            />
          </div>
        </CardContent>
      </Card>

      {/* Event-Level Toggles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Notifications par événement
          </CardTitle>
          <CardDescription>
            Choisir quels événements déclenchent des notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <EventToggleGroup
            title="Événements ticket"
            events={ticketEvents}
            setEvents={setTicketEvents}
            labels={{
              created: "Ticket créé",
              replied: "Nouvelle réponse",
              assigned: "Assigné",
              status_changed: "Statut modifié",
              closed: "Fermé",
            }}
          />
          <Separator />
          <EventToggleGroup
            title="Événements commande"
            events={orderEvents}
            setEvents={setOrderEvents}
            labels={{
              created: "Commande créée",
              approved: "Approuvée",
              shipped: "Expédiée",
              delivered: "Livrée",
              cancelled: "Annulée",
            }}
          />
          <Separator />
          <EventToggleGroup
            title="Événements facture"
            events={invoiceEvents}
            setEvents={setInvoiceEvents}
            labels={{
              issued: "Facture émise",
              sent: "Envoyée au client",
              payment_received: "Paiement reçu",
              overdue: "Alerte impayé",
            }}
          />
        </CardContent>
      </Card>

      {/* Quiet Hours */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Heures calmes
          </CardTitle>
          <CardDescription>
            Suspendre les notifications non urgentes pendant certaines plages horaires
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="font-medium">Activer les heures calmes</Label>
              <p className="text-sm text-muted-foreground">
                Aucune notification ne sera envoyée pendant les heures calmes
              </p>
            </div>
            <Switch
              checked={quietHours.enabled}
              onCheckedChange={(checked) =>
                setQuietHours((prev) => ({ ...prev, enabled: checked }))
              }
            />
          </div>
          {quietHours.enabled && (
            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="space-y-2">
                <Label>Heure de début (24h)</Label>
                <Input
                  type="number"
                  min={0}
                  max={23}
                  value={quietHours.start}
                  onChange={(e) =>
                    setQuietHours((prev) => ({
                      ...prev,
                      start: parseInt(e.target.value) || 0,
                    }))
                  }
                  placeholder="22"
                />
                <p className="text-xs text-muted-foreground">
                  E.g., 22 for 10:00 PM
                </p>
              </div>
              <div className="space-y-2">
                <Label>End Hour (24h)</Label>
                <Input
                  type="number"
                  min={0}
                  max={23}
                  value={quietHours.end}
                  onChange={(e) =>
                    setQuietHours((prev) => ({
                      ...prev,
                      end: parseInt(e.target.value) || 0,
                    }))
                  }
                  placeholder="7"
                />
                <p className="text-xs text-muted-foreground">
                  Ex. 7 pour 7h
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Digest Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Résumé quotidien
          </CardTitle>
          <CardDescription>
            Envoyer un résumé des notifications une fois par jour au lieu de chaque notification
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="font-medium">Activer le résumé quotidien</Label>
              <p className="text-sm text-muted-foreground">
                Regrouper les notifications dans un seul e-mail quotidien
              </p>
            </div>
            <Switch
              checked={digestEnabled}
              onCheckedChange={setDigestEnabled}
            />
          </div>
          {digestEnabled && (
            <div className="space-y-2 pt-4">
              <Label>Heure d'envoi</Label>
              <Input
                type="time"
                value={digestTime}
                onChange={(e) => setDigestTime(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Heure d'envoi de l'e-mail de résumé quotidien
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-end gap-4">
        <Button variant="outline" onClick={handleTest} disabled={testing}>
          {testing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Test en cours…
            </>
          ) : (
            <>
              <TestTube className="mr-2 h-4 w-4" />
              Tester la configuration
            </>
          )}
        </Button>
        <Button
          onClick={handleSave}
          disabled={updateMutation.isPending}
          className="min-w-[120px]"
        >
          {updateMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Enregistrement…
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Enregistrer les modifications
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
