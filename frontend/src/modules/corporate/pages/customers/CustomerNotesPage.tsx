/**
 * Customer Notes Page (Corporate View)
 *
 * Corporate page for managing customer notes
 */

import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Edit, Trash2, Pin, FileText, Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customersApi } from "@/shared/api/customers";
import { useCustomer } from "@/modules/customers/hooks";
import { toast } from "sonner";
import { format } from "date-fns";

interface CustomerNote {
  id: string;
  customer_id: string;
  note_type: string;
  title: string;
  content: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by?: string;
}

export const CustomerNotesPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: customer, isLoading: customerLoading } = useCustomer(id || "");
  const [isCreating, setIsCreating] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState("");
  const [newNoteContent, setNewNoteContent] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editNoteTitle, setEditNoteTitle] = useState("");
  const [editNoteContent, setEditNoteContent] = useState("");

  const { data: notes, isLoading: notesLoading } = useQuery<CustomerNote[]>({
    queryKey: ["customer-notes", id],
    queryFn: () => customersApi.getNotes(id || ""),
    enabled: !!id,
  });

  const createNoteMutation = useMutation({
    mutationFn: (data: { note_type: string; title: string; content: string; is_pinned?: boolean }) =>
      customersApi.createNote(id || "", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-notes", id] });
      setIsCreating(false);
      setNewNoteTitle("");
      setNewNoteContent("");
      toast.success("Note created successfully");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Failed to create note");
    },
  });

  const updateNoteMutation = useMutation({
    mutationFn: ({ noteId, data }: { noteId: string; data: { title?: string; content?: string; is_pinned?: boolean } }) =>
      customersApi.updateNote(id || "", noteId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-notes", id] });
      setEditingNoteId(null);
      setEditNoteTitle("");
      setEditNoteContent("");
      toast.success("Note updated successfully");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Failed to update note");
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: (noteId: string) => customersApi.deleteNote(id || "", noteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-notes", id] });
      toast.success("Note deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Failed to delete note");
    },
  });

  const handleCreateNote = () => {
    if (!newNoteTitle.trim() || !newNoteContent.trim()) {
      toast.error("Please fill in both title and content");
      return;
    }
    createNoteMutation.mutate({
      note_type: "general",
      title: newNoteTitle,
      content: newNoteContent,
      is_pinned: false,
    });
  };

  const handleUpdateNote = (noteId: string) => {
    if (!editNoteTitle.trim() || !editNoteContent.trim()) {
      toast.error("Please fill in both title and content");
      return;
    }
    updateNoteMutation.mutate({
      noteId,
      data: {
        title: editNoteTitle,
        content: editNoteContent,
      },
    });
  };

  const handleStartEdit = (note: CustomerNote) => {
    setEditingNoteId(note.id);
    setEditNoteTitle(note.title);
    setEditNoteContent(note.content);
  };

  const handleCancelEdit = () => {
    setEditingNoteId(null);
    setEditNoteTitle("");
    setEditNoteContent("");
  };

  const handleDeleteNote = (noteId: string) => {
    if (window.confirm("Are you sure you want to delete this note?")) {
      deleteNoteMutation.mutate(noteId);
    }
  };

  if (customerLoading || notesLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-600">Customer not found</p>
        <Button
          variant="outline"
          onClick={() => navigate("/corporate/customers")}
          className="mt-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Customers
        </Button>
      </div>
    );
  }

  const sortedNotes = notes
    ? [...notes].sort((a, b) => {
        if (a.is_pinned && !b.is_pinned) return -1;
        if (!a.is_pinned && b.is_pinned) return 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      })
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/corporate/customers/${id}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Customer
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <FileText className="h-8 w-8" />
              Customer Notes
            </h1>
            <p className="text-slate-600 mt-2">
              Manage notes and comments for {customer.name || customer.email}
            </p>
          </div>
        </div>
        {!isCreating && (
          <Button onClick={() => setIsCreating(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Note
          </Button>
        )}
      </div>

      {/* Create Note Form */}
      {isCreating && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Note</CardTitle>
            <CardDescription>Add a note about this customer</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Title</label>
              <input
                type="text"
                value={newNoteTitle}
                onChange={(e) => setNewNoteTitle(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
                placeholder="Note title"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Content</label>
              <textarea
                value={newNoteContent}
                onChange={(e) => setNewNoteContent(e.target.value)}
                className="w-full px-3 py-2 border rounded-md min-h-[100px]"
                placeholder="Note content"
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleCreateNote}
                disabled={createNoteMutation.isPending}
              >
                {createNoteMutation.isPending ? "Creating..." : "Create Note"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsCreating(false);
                  setNewNoteTitle("");
                  setNewNoteContent("");
                }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notes List */}
      <Card>
        <CardHeader>
          <CardTitle>Notes ({sortedNotes.length})</CardTitle>
          <CardDescription>All notes for this customer</CardDescription>
        </CardHeader>
        <CardContent>
          {sortedNotes.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <FileText className="h-12 w-12 mx-auto mb-4 text-slate-300" />
              <p>No notes found. Create your first note above.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedNotes.map((note) => (
                <div
                  key={note.id}
                  className="border rounded-lg p-4 hover:bg-gray-50"
                >
                  {editingNoteId === note.id ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Title</label>
                        <input
                          type="text"
                          value={editNoteTitle}
                          onChange={(e) => setEditNoteTitle(e.target.value)}
                          className="w-full px-3 py-2 border rounded-md"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Content</label>
                        <textarea
                          value={editNoteContent}
                          onChange={(e) => setEditNoteContent(e.target.value)}
                          className="w-full px-3 py-2 border rounded-md min-h-[100px]"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleUpdateNote(note.id)}
                          disabled={updateNoteMutation.isPending}
                        >
                          {updateNoteMutation.isPending ? "Saving..." : "Save"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleCancelEdit}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold">{note.title}</h3>
                            {note.is_pinned && (
                              <Badge variant="outline" className="text-xs">
                                <Pin className="h-3 w-3 mr-1" />
                                Pinned
                              </Badge>
                            )}
                            <Badge variant="secondary" className="text-xs">
                              {note.note_type}
                            </Badge>
                          </div>
                          <p className="text-sm text-slate-600 whitespace-pre-wrap">
                            {note.content}
                          </p>
                          <p className="text-xs text-slate-400 mt-2">
                            Created {format(new Date(note.created_at), "PPP")}
                            {note.updated_at !== note.created_at && (
                              <span> • Updated {format(new Date(note.updated_at), "PPP")}</span>
                            )}
                          </p>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleStartEdit(note)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteNote(note.id)}
                            disabled={deleteNoteMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
