/**
 * Notification Groups Management Page
 *
 * Admin page for managing notification groups and targeting
 */

import React, { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Send, TestTube, Loader2, CheckCircle, XCircle } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { Badge } from "@/shared/components/ui/badge";
import { Switch } from "@/shared/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { toast } from "sonner";
import { apiClient } from "@/shared/api";

interface NotificationGroup {
  id: string;
  name: string;
  description: string | null;
  target_type: string;
  target_criteria: Record<string, any> | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface GroupListResponse {
  items: NotificationGroup[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

interface TestResponse {
  group_id: string;
  member_count: number;
}

export const NotificationGroupsPage: React.FC = () => {
  const [groups, setGroups] = useState<GroupListResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<NotificationGroup | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [testingGroupId, setTestingGroupId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    target_type: "all",
    target_criteria: {} as Record<string, any>,
    is_active: true,
  });
  const [sendFormData, setSendFormData] = useState({
    type: "general",
    title: "",
    body: "",
    link: "",
  });

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get("/api/v1/notifications/groups?page_size=100");
      setGroups(response.data);
    } catch (error: any) {
      toast.error("Failed to load notification groups", {
        description: error.response?.data?.detail || error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setFormData({
      name: "",
      description: "",
      target_type: "all",
      target_criteria: {},
      is_active: true,
    });
    setSelectedGroup(null);
    setIsCreateModalOpen(true);
  };

  const handleEdit = (group: NotificationGroup) => {
    setSelectedGroup(group);
    setFormData({
      name: group.name,
      description: group.description || "",
      target_type: group.target_type,
      target_criteria: group.target_criteria || {},
      is_active: group.is_active,
    });
    setIsEditModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const payload = {
        name: formData.name,
        description: formData.description || null,
        target_type: formData.target_type,
        target_criteria: formData.target_criteria,
        is_active: formData.is_active,
      };

      if (selectedGroup) {
        await apiClient.put(`/api/v1/notifications/groups/${selectedGroup.id}`, payload);
        toast.success("Notification group updated");
      } else {
        await apiClient.post("/api/v1/notifications/groups", payload);
        toast.success("Notification group created");
      }

      setIsCreateModalOpen(false);
      setIsEditModalOpen(false);
      setSelectedGroup(null);
      loadGroups();
    } catch (error: any) {
      toast.error("Failed to save notification group", {
        description: error.response?.data?.detail || error.message,
      });
    }
  };

  const handleDelete = async (group: NotificationGroup) => {
    if (!confirm(`Delete notification group "${group.name}"?`)) return;

    try {
      await apiClient.delete(`/api/v1/notifications/groups/${group.id}`);
      toast.success("Notification group deleted");
      loadGroups();
    } catch (error: any) {
      toast.error("Failed to delete notification group", {
        description: error.response?.data?.detail || error.message,
      });
    }
  };

  const handleTest = async (group: NotificationGroup) => {
    try {
      setTestingGroupId(group.id);
      const response = await apiClient.post(`/api/v1/notifications/groups/${group.id}/test`);
      setTestResult(response.data.member_count);
      toast.success(`Group targets ${response.data.member_count} users`);
    } catch (error: any) {
      toast.error("Failed to test targeting", {
        description: error.response?.data?.detail || error.message,
      });
    } finally {
      setTestingGroupId(null);
    }
  };

  const handleSend = (group: NotificationGroup) => {
    setSelectedGroup(group);
    setSendFormData({
      type: "general",
      title: "",
      body: "",
      link: "",
    });
    setIsSendModalOpen(true);
  };

  const handleSendNotification = async () => {
    if (!selectedGroup) return;

    try {
      const response = await apiClient.post("/api/v1/notifications/groups/send", {
        group_id: selectedGroup.id,
        type: sendFormData.type,
        title: sendFormData.title,
        body: sendFormData.body || null,
        link: sendFormData.link || null,
      });
      toast.success("Notification sent to group members");
      setIsSendModalOpen(false);
      setSelectedGroup(null);
      setSendFormData({ type: "general", title: "", body: "", link: "" });
    } catch (error: any) {
      toast.error("Failed to send notification", {
        description: error.response?.data?.detail || error.message,
      });
    }
  };

  const handleToggleActive = async (group: NotificationGroup) => {
    try {
      await apiClient.put(`/api/v1/notifications/groups/${group.id}`, {
        is_active: !group.is_active,
      });
      toast.success(`Group ${!group.is_active ? "activated" : "deactivated"}`);
      loadGroups();
    } catch (error: any) {
      toast.error("Failed to update group", {
        description: error.response?.data?.detail || error.message,
      });
    }
  };

  const updateCriteria = (key: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      target_criteria: {
        ...prev.target_criteria,
        [key]: value,
      },
    }));
  };

  if (loading && !groups) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Notification Groups</h1>
          <p className="text-slate-600 mt-2">
            Create and manage notification groups for targeting notifications to specific user sets
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Create Group
        </Button>
      </div>

      {groups && (
        <Card>
          <CardHeader>
            <CardTitle>Groups</CardTitle>
            <CardDescription>
              {groups.total} notification group{groups.total !== 1 ? "s" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Target Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groups.items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        No notification groups found
                      </TableCell>
                    </TableRow>
                  ) : (
                    groups.items.map((group) => (
                      <TableRow key={group.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{group.name}</div>
                            {group.description && (
                              <div className="text-sm text-muted-foreground">
                                {group.description}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {group.target_type.replace(/_/g, " ").toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={group.is_active}
                              onCheckedChange={() => handleToggleActive(group)}
                            />
                            {group.is_active ? (
                              <span className="text-sm text-green-600">Active</span>
                            ) : (
                              <span className="text-sm text-gray-500">Inactive</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleTest(group)}
                              disabled={testingGroupId === group.id}
                            >
                              {testingGroupId === group.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <TestTube className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSend(group)}
                            >
                              <Send className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(group)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(group)}
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
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Modal */}
      <Dialog open={isCreateModalOpen || isEditModalOpen} onOpenChange={(open) => {
        if (!open) {
          setIsCreateModalOpen(false);
          setIsEditModalOpen(false);
          setSelectedGroup(null);
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedGroup ? "Edit Notification Group" : "Create Notification Group"}
            </DialogTitle>
            <DialogDescription>
              Configure targeting criteria for the notification group
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Corporate Customers"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description"
                rows={2}
              />
            </div>
            <div>
              <Label htmlFor="target_type">Target Type *</Label>
              <Select
                value={formData.target_type}
                onValueChange={(value) => setFormData({ ...formData, target_type: value, target_criteria: {} })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  <SelectItem value="customer_type">By Customer Type</SelectItem>
                  <SelectItem value="category">By Ticket Category</SelectItem>
                  <SelectItem value="custom">Custom Criteria</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Dynamic criteria form based on target_type */}
            {formData.target_type === "customer_type" && (
              <div>
                <Label htmlFor="customer_type">Customer Type *</Label>
                <Select
                  value={formData.target_criteria?.customer_type || ""}
                  onValueChange={(value) => updateCriteria("customer_type", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">Individual</SelectItem>
                    <SelectItem value="corporate">Corporate</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {formData.target_type === "category" && (
              <div>
                <Label htmlFor="category_id">Ticket Category ID *</Label>
                <Input
                  id="category_id"
                  value={formData.target_criteria?.category_id || ""}
                  onChange={(e) => updateCriteria("category_id", e.target.value)}
                  placeholder="Enter category ID"
                />
              </div>
            )}

            {formData.target_type === "custom" && (
              <div>
                <Label htmlFor="custom_criteria">Custom Criteria (JSON) *</Label>
                <Textarea
                  id="custom_criteria"
                  value={JSON.stringify(formData.target_criteria, null, 2)}
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value);
                      setFormData({ ...formData, target_criteria: parsed });
                    } catch {
                      // Invalid JSON, keep as is
                    }
                  }}
                  placeholder='{"role": "admin"}'
                  rows={4}
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Enter valid JSON criteria (e.g., {"{"}"role": "admin"{"}"})
                </p>
              </div>
            )}

            <div className="flex items-center gap-2">
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsCreateModalOpen(false);
              setIsEditModalOpen(false);
              setSelectedGroup(null);
            }}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Notification Modal */}
      <Dialog open={isSendModalOpen} onOpenChange={setIsSendModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Notification to Group</DialogTitle>
            <DialogDescription>
              Send a notification to all members of "{selectedGroup?.name}"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="send_type">Type</Label>
              <Input
                id="send_type"
                value={sendFormData.type}
                onChange={(e) => setSendFormData({ ...sendFormData, type: e.target.value })}
                placeholder="e.g., general, ticket_update"
              />
            </div>
            <div>
              <Label htmlFor="send_title">Title *</Label>
              <Input
                id="send_title"
                value={sendFormData.title}
                onChange={(e) => setSendFormData({ ...sendFormData, title: e.target.value })}
                placeholder="Notification title"
              />
            </div>
            <div>
              <Label htmlFor="send_body">Body</Label>
              <Textarea
                id="send_body"
                value={sendFormData.body}
                onChange={(e) => setSendFormData({ ...sendFormData, body: e.target.value })}
                placeholder="Notification body"
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="send_link">Link</Label>
              <Input
                id="send_link"
                value={sendFormData.link}
                onChange={(e) => setSendFormData({ ...sendFormData, link: e.target.value })}
                placeholder="/path/to/resource"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSendModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendNotification} disabled={!sendFormData.title}>
              Send Notification
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
