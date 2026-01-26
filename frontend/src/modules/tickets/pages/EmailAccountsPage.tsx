/**
 * Email Accounts Page (Admin)
 * Manage email-to-ticket IMAP accounts: list, create, edit, delete, test, sync.
 */

import React, { useState } from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/shared/components/ui/breadcrumb";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { Badge } from "@/shared/components/ui/badge";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import { Plus, Loader2, RefreshCw, Wrench, Trash2, Pencil } from "lucide-react";
import { useEmailAccounts, useCreateEmailAccount, useUpdateEmailAccount, useDeleteEmailAccount, useTestEmailConnection, useSyncEmailAccount, type EmailAccount, type CreateEmailAccountInput, type UpdateEmailAccountInput } from "../hooks/useEmailAccounts";
import { format } from "date-fns";

const defaultForm: CreateEmailAccountInput = {
  email_address: "",
  imap_server: "",
  imap_port: 993,
  imap_username: "",
  imap_password: "",
  use_tls: true,
  polling_interval_minutes: 5,
};

export const EmailAccountsPage: React.FC = () => {
  const { data: accounts = [], isLoading } = useEmailAccounts();
  const createMutation = useCreateEmailAccount();
  const updateMutation = useUpdateEmailAccount();
  const deleteMutation = useDeleteEmailAccount();
  const testMutation = useTestEmailConnection();
  const syncMutation = useSyncEmailAccount();

  const [createOpen, setCreateOpen] = useState(false);
  const [editAccount, setEditAccount] = useState<EmailAccount | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<CreateEmailAccountInput & { password?: string }>(defaultForm);

  const resetForm = () => {
    setForm({ ...defaultForm, password: "" });
    setEditAccount(null);
  };

  const handleCreate = async () => {
    await createMutation.mutateAsync({
      ...form,
      imap_port: form.imap_port ?? 993,
      use_tls: form.use_tls ?? true,
      polling_interval_minutes: form.polling_interval_minutes ?? 5,
    });
    setCreateOpen(false);
    resetForm();
  };

  const handleUpdate = async () => {
    if (!editAccount) return;
    const payload: UpdateEmailAccountInput = {
      imap_server: form.imap_server || undefined,
      imap_port: form.imap_port || undefined,
      imap_username: form.imap_username || undefined,
      use_tls: form.use_tls,
      polling_interval_minutes: form.polling_interval_minutes || undefined,
    };
    const pw = form.imap_password || (form as { password?: string }).password;
    if (pw) payload.imap_password = pw;
    await updateMutation.mutateAsync({ accountId: editAccount.id, data: payload });
    setEditAccount(null);
    resetForm();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteMutation.mutateAsync(deleteId);
    setDeleteId(null);
  };

  const openEdit = (a: EmailAccount) => {
    setEditAccount(a);
    setForm({
      email_address: a.email_address,
      imap_server: a.imap_server,
      imap_port: a.imap_port,
      imap_username: "",
      imap_password: "",
      use_tls: a.use_tls,
      polling_interval_minutes: a.polling_interval_minutes,
      password: "",
    });
  };

  return (
    <div className="space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/admin">Admin</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/admin/tickets">Tickets</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>Email accounts</BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Email accounts</h1>
          <p className="text-gray-600 mt-1">
            IMAP accounts for email-to-ticket. Add accounts, test connection, and sync now.
          </p>
        </div>
        <Button onClick={() => { resetForm(); setForm(defaultForm); setCreateOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Add account
        </Button>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>IMAP server</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last checked</TableHead>
                <TableHead>Last error</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    Loading…
                  </TableCell>
                </TableRow>
              ) : accounts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    No email accounts. Add one to enable email-to-ticket.
                  </TableCell>
                </TableRow>
              ) : (
                (accounts as EmailAccount[]).map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      <span className="font-medium">{a.email_address}</span>
                    </TableCell>
                    <TableCell>{a.imap_server}:{a.imap_port}</TableCell>
                    <TableCell>
                      <Badge variant={a.is_active ? "default" : "secondary"}>
                        {a.is_active ? "Active" : "Inactive"}
                      </Badge>
                      {a.error_count > 0 && (
                        <span className="ml-1 text-amber-600 text-sm">({a.error_count} errors)</span>
                      )}
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {a.last_checked_at
                        ? format(new Date(a.last_checked_at), "MMM d, HH:mm")
                        : "—"}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-gray-600" title={a.last_error ?? undefined}>
                      {a.last_error || "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={testMutation.isPending}
                          onClick={() => testMutation.mutate(a.id)}
                          title="Test connection"
                        >
                          {testMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Wrench className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={syncMutation.isPending}
                          onClick={() => syncMutation.mutate(a.id)}
                          title="Sync now"
                        >
                          {syncMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCw className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(a)}
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteId(a.id)}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add email account</DialogTitle>
            <DialogDescription>
              IMAP account used for email-to-ticket. Incoming emails will create tickets or replies.
            </DialogDescription>
          </DialogHeader>
          <EmailAccountForm form={form} setForm={setForm} isEdit={false} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button
              onClick={handleCreate}
              disabled={
                !form.email_address || !form.imap_server || !form.imap_username || !form.imap_password || createMutation.isPending
              }
            >
              {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editAccount} onOpenChange={(o) => { if (!o) { setEditAccount(null); resetForm(); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit email account</DialogTitle>
            <DialogDescription>
              Update IMAP settings. Leave password blank to keep current.
            </DialogDescription>
          </DialogHeader>
          <EmailAccountForm form={form} setForm={setForm} isEdit={true} />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditAccount(null); resetForm(); }}>Cancel</Button>
            <Button
              onClick={handleUpdate}
              disabled={!form.imap_server || updateMutation.isPending}
            >
              {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => { if (!o) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete email account?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the IMAP account. Email-to-ticket will no longer use it. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

function EmailAccountForm({
  form,
  setForm,
  isEdit,
}: {
  form: CreateEmailAccountInput & { password?: string };
  setForm: React.Dispatch<React.SetStateAction<CreateEmailAccountInput & { password?: string }>>;
  isEdit: boolean;
}) {
  return (
    <div className="grid gap-4 py-4">
      <div className="grid gap-2">
        <Label>Email address</Label>
        <Input
          placeholder="support@example.com"
          value={form.email_address}
          onChange={(e) => setForm((f) => ({ ...f, email_address: e.target.value }))}
          disabled={isEdit}
        />
      </div>
      <div className="grid gap-2">
        <Label>IMAP server</Label>
        <Input
          placeholder="imap.example.com"
          value={form.imap_server}
          onChange={(e) => setForm((f) => ({ ...f, imap_server: e.target.value }))}
        />
      </div>
      <div className="grid gap-2">
        <Label>IMAP port</Label>
        <Input
          type="number"
          value={form.imap_port ?? 993}
          onChange={(e) => setForm((f) => ({ ...f, imap_port: parseInt(e.target.value, 10) || 993 }))}
        />
      </div>
      <div className="grid gap-2">
        <Label>{isEdit ? "IMAP username (leave blank to keep)" : "IMAP username"}</Label>
        <Input
          placeholder="user@example.com"
          value={form.imap_username}
          onChange={(e) => setForm((f) => ({ ...f, imap_username: e.target.value }))}
        />
      </div>
      <div className="grid gap-2">
        <Label>{isEdit ? "Password (leave blank to keep)" : "IMAP password"}</Label>
        <Input
          type="password"
          placeholder={isEdit ? "••••••••" : ""}
          value={isEdit ? (form.password ?? "") : (form.imap_password ?? "")}
          onChange={(e) =>
            setForm((f) =>
              isEdit ? { ...f, password: e.target.value } : { ...f, imap_password: e.target.value }
            )
          }
        />
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="use_tls"
          title="Use TLS"
          checked={form.use_tls ?? true}
          onChange={(e) => setForm((f) => ({ ...f, use_tls: e.target.checked }))}
          className="rounded"
        />
        <Label htmlFor="use_tls">Use TLS</Label>
      </div>
      <div className="grid gap-2">
        <Label>Polling interval (minutes)</Label>
        <Input
          type="number"
          min={1}
          value={form.polling_interval_minutes ?? 5}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              polling_interval_minutes: parseInt(e.target.value, 10) || 5,
            }))
          }
        />
      </div>
    </div>
  );
}

export default EmailAccountsPage;
