/**
 * SMS Queue Page
 *
 * Admin page to view the SMS queue and send SMS manually.
 */

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  MessageSquare,
  Loader2,
  RefreshCw,
  Inbox,
  CheckCircle,
  XCircle,
  Clock,
  Send,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { settingsService, type SMSQueueItem } from "../../services/settingsService";
import { format } from "date-fns";
import { toast } from "sonner";

const statusIcon = (status: string) => {
  switch (status) {
    case "pending":
      return <Clock className="h-4 w-4 text-amber-500" />;
    case "sent":
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    case "failed":
      return <XCircle className="h-4 w-4 text-red-600" />;
    default:
      return <Inbox className="h-4 w-4 text-gray-500" />;
  }
};

export const SMSQueuePage: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sendOpen, setSendOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ["sms-queue", statusFilter],
    queryFn: () =>
      settingsService.getSMSQueue({
        skip: 0,
        limit: 100,
        status:
          statusFilter === "all"
            ? undefined
            : (statusFilter as "pending" | "sent" | "failed"),
      }),
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const errorMessage =
    (error as any)?.response?.data?.detail ||
    (error as any)?.response?.data?.message ||
    (error as any)?.message ||
    "Échec du chargement de la file SMS.";

  const handleSendSMS = async () => {
    const trimmedPhone = phone.trim();
    const trimmedMessage = message.trim();
    if (!trimmedPhone) {
      toast.error("Le numéro de téléphone est requis.");
      return;
    }
    if (!trimmedMessage) {
      toast.error("Le message est requis.");
      return;
    }
    setSending(true);
    try {
      const result = await settingsService.sendSMS(trimmedPhone, trimmedMessage);
      if (result.success) {
        toast.success(result.message);
        setSendOpen(false);
        setPhone("");
        setMessage("");
        refetch();
      } else {
        toast.error(result.message || "Failed to send SMS.");
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string; message?: string } }; message?: string })
          ?.response?.data?.detail ||
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err as { message?: string })?.message ||
        "Failed to send SMS.";
      toast.error(msg);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <MessageSquare className="h-8 w-8" />
          File SMS
        </h1>
        <p className="text-gray-600 mt-1">
          Consulter les SMS en file pour vérifier que le système crée bien la file (en attente, envoyé, échec).
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <CardTitle>Messages SMS</CardTitle>
              <CardDescription>
                {total} message(s) affiché(s). En attente = en attente de la passerelle ; Envoyé = livré ; Échec = erreur de livraison.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Dialog open={sendOpen} onOpenChange={setSendOpen}>
                <DialogTrigger asChild>
                  <Button variant="default" size="sm">
                    <Send className="h-4 w-4 mr-2" />
                    Envoyer un SMS
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Envoyer un SMS</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="sms-phone">Numéro de téléphone</Label>
                      <Input
                        id="sms-phone"
                        placeholder="+213..."
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        disabled={sending}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="sms-message">Message</Label>
                      <Textarea
                        id="sms-message"
                        placeholder="Saisissez votre message…"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        rows={4}
                        disabled={sending}
                        className="resize-none"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setSendOpen(false)}
                      disabled={sending}
                    >
                      Annuler
                    </Button>
                    <Button onClick={handleSendSMS} disabled={sending}>
                      {sending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Send className="h-4 w-4 mr-2" />
                      )}
                      Envoyer
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Select
                value={statusFilter}
                onValueChange={setStatusFilter}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="pending">En attente</SelectItem>
                  <SelectItem value="sent">Envoyé</SelectItem>
                  <SelectItem value="failed">Échec</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                onClick={() => refetch()}
                disabled={isRefetching}
              >
                <RefreshCw
                  className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`}
                />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : isError ? (
            <div className="text-center py-12 text-red-600">
              <XCircle className="h-12 w-12 mx-auto mb-2" />
              <p className="font-medium">Impossible de charger la file SMS</p>
              <p className="text-sm mt-1 text-red-600/80">{errorMessage}</p>
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Inbox className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Aucun message SMS en file pour ce filtre.</p>
              <p className="text-sm mt-1">
                Déclenchez une réponse ticket ou une notification avec SMS activé pour voir les entrées en file.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Statut</TableHead>
                  <TableHead>Téléphone</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Créé</TableHead>
                  <TableHead>Envoyé</TableHead>
                  <TableHead>Appareil / Erreur</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((row: SMSQueueItem) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <Badge
                        variant={
                          row.status === "sent"
                            ? "default"
                            : row.status === "failed"
                              ? "destructive"
                              : "secondary"
                        }
                        className="flex items-center gap-1 w-fit"
                      >
                        {statusIcon(row.status)}
                        {row.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {row.phone_number}
                    </TableCell>
                    <TableCell className="max-w-[240px] truncate text-sm">
                      {row.message}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {row.created_at
                        ? format(
                            new Date(row.created_at),
                            "yyyy-MM-dd HH:mm"
                          )
                        : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {row.sent_at
                        ? format(new Date(row.sent_at), "yyyy-MM-dd HH:mm")
                        : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600 max-w-[160px] truncate">
                      {row.error_message ?? row.device_id ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
