/**
 * DNS Records Table Component
 *
 * Table for displaying DNS records with CRUD actions.
 */
import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { Button } from "@/shared/components/ui/button";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Edit, Trash2, Lock } from "lucide-react";
import { RecordTypeBadge } from "./RecordTypeBadge";
import { DNSRecordForm } from "./DNSRecordForm";
import { useUpdateDNSRecord, useDeleteDNSRecord } from "../hooks";
import type { DNSRecord } from "../types";
import { formatDistanceToNow } from "date-fns";

interface DNSRecordsTableProps {
  records: DNSRecord[];
  zoneId: string;
  isLoading?: boolean;
}

export function DNSRecordsTable({ records, zoneId, isLoading }: DNSRecordsTableProps) {
  const [editingRecord, setEditingRecord] = useState<DNSRecord | null>(null);
  const [deletingRecord, setDeletingRecord] = useState<DNSRecord | null>(null);

  const updateMutation = useUpdateDNSRecord();
  const deleteMutation = useDeleteDNSRecord();

  const handleEdit = (data: any) => {
    if (!editingRecord) return;

    updateMutation.mutate(
      {
        recordId: editingRecord.id,
        data,
      },
      {
        onSuccess: () => {
          setEditingRecord(null);
        },
      }
    );
  };

  const handleDelete = () => {
    if (!deletingRecord) return;

    deleteMutation.mutate(
      {
        recordId: deletingRecord.id,
        zoneId,
      },
      {
        onSuccess: () => {
          setDeletingRecord(null);
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Value</TableHead>
              <TableHead>TTL</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(3)].map((_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                </TableCell>
                <TableCell>
                  <div className="h-4 w-16 animate-pulse rounded bg-muted" />
                </TableCell>
                <TableCell>
                  <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                </TableCell>
                <TableCell>
                  <div className="h-4 w-16 animate-pulse rounded bg-muted" />
                </TableCell>
                <TableCell>
                  <div className="h-4 w-12 animate-pulse rounded bg-muted" />
                </TableCell>
                <TableCell>
                  <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <p className="text-sm text-muted-foreground">
          No DNS records found. Add your first record to get started.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Value</TableHead>
              <TableHead>TTL</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.map((record) => {
              const isSystem = record.is_system_record;

              return (
                <TableRow key={record.id}>
                  <TableCell className="font-mono text-sm">
                    {record.record_name}
                  </TableCell>
                  <TableCell>
                    <RecordTypeBadge type={record.record_type} />
                  </TableCell>
                  <TableCell className="max-w-md truncate font-mono text-sm">
                    {record.record_value}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {record.ttl ? `${record.ttl}s` : "Default"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {record.priority ?? "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    {isSystem ? (
                      <div className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
                        <Lock className="h-3 w-3" />
                        System
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingRecord(record)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeletingRecord(record)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingRecord} onOpenChange={() => setEditingRecord(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit DNS Record</DialogTitle>
          </DialogHeader>
          {editingRecord && (
            <DNSRecordForm
              mode="edit"
              defaultValues={editingRecord}
              onSubmit={handleEdit}
              onCancel={() => setEditingRecord(null)}
              isLoading={updateMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deletingRecord}
        onOpenChange={() => setDeletingRecord(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete DNS Record?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this DNS record? This action cannot
              be undone.
              {deletingRecord && (
                <div className="mt-4 rounded-lg bg-muted p-3">
                  <div className="flex items-center gap-2">
                    <RecordTypeBadge type={deletingRecord.record_type} />
                    <span className="font-mono text-sm">
                      {deletingRecord.record_name}
                    </span>
                  </div>
                  <div className="mt-1 font-mono text-sm text-muted-foreground">
                    {deletingRecord.record_value}
                  </div>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete Record"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
