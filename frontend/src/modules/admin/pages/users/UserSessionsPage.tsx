/**
 * User Sessions Page
 *
 * Admin page for viewing and managing user sessions
 */

import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { PageHeader, DataTable } from "../../components/shared";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/shared/components/ui/alert-dialog";
import {
  useUser,
  useUserSessions,
  useRevokeSession,
  useRevokeAllSessions,
} from "../../hooks/useUsers";
import { useToast } from "@/shared/components/ui/use-toast";
import {
  ArrowLeft,
  Monitor,
  Smartphone,
  Tablet,
  MapPin,
  Clock,
  XCircle,
  AlertCircle,
  Loader2,
  Chrome,
  Globe,
} from "lucide-react";
import type { DataTableColumn, DataTableAction } from "../../types";
import type { UserSession } from "../../types";

export const UserSessionsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: user, isLoading: userLoading } = useUser(id!);
  const { data: sessionsData, isLoading: sessionsLoading } = useUserSessions(id!);
  const revokeSession = useRevokeSession();
  const revokeAllSessions = useRevokeAllSessions();

  const handleRevokeSession = async (sessionId: string) => {
    try {
      await revokeSession.mutateAsync({ userId: id!, sessionId });
      toast({
        title: "Success",
        description: "Session revoked successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.detail || "Failed to revoke session",
        variant: "destructive",
      });
    }
  };

  const handleRevokeAllSessions = async () => {
    try {
      await revokeAllSessions.mutateAsync(id!);
      toast({
        title: "Success",
        description: "All sessions revoked successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.detail || "Failed to revoke sessions",
        variant: "destructive",
      });
    }
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType.toLowerCase()) {
      case "mobile":
        return <Smartphone className="h-4 w-4" />;
      case "tablet":
        return <Tablet className="h-4 w-4" />;
      default:
        return <Monitor className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-DZ", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const columns: DataTableColumn<UserSession>[] = [
    {
      key: "device_type",
      label: "Device",
      render: (value, row) => (
        <div className="flex items-center gap-2">
          {getDeviceIcon(row.device_type)}
          <div>
            <p className="font-medium">{row.device_type}</p>
            <p className="text-xs text-gray-500">
              {row.browser} on {row.os}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "ip_address",
      label: "IP Address",
      render: (value, row) => (
        <div className="flex items-start gap-2">
          <Globe className="h-4 w-4 text-gray-400 mt-0.5" />
          <div>
            <p className="font-mono text-sm">{row.ip_address}</p>
            {row.location && (
              <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                <MapPin className="h-3 w-3" />
                {row.location}
              </p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "created_at",
      label: "Started",
      render: (value) => (
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-gray-400" />
          <span className="text-sm">{formatDate(value)}</span>
        </div>
      ),
    },
    {
      key: "last_activity",
      label: "Last Activity",
      render: (value) => <span className="text-sm">{formatDate(value)}</span>,
    },
    {
      key: "is_current",
      label: "Status",
      render: (value) =>
        value ? (
          <Badge className="bg-green-100 text-green-800">Current</Badge>
        ) : (
          <Badge variant="secondary">Active</Badge>
        ),
    },
  ];

  const actions: DataTableAction<UserSession>[] = [
    {
      label: "Revoke Session",
      icon: XCircle,
      onClick: (session) => handleRevokeSession(session.id),
      variant: "destructive",
      disabled: (session) => session.is_current,
    },
  ];

  if (userLoading || sessionsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-500">Loading sessions...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <AlertCircle className="h-12 w-12 text-gray-400 mb-4" />
        <p className="text-gray-500">User not found</p>
        <Button
          variant="outline"
          onClick={() => navigate("/admin/users")}
          className="mt-4"
        >
          Back to Users
        </Button>
      </div>
    );
  }

  const sessions = sessionsData?.data || [];
  const activeSessions = sessions.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="User Sessions"
        description={`Managing sessions for ${user.full_name}`}
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Users", href: "/admin/users" },
          { label: user.full_name, href: `/admin/users/${id}` },
          { label: "Sessions" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => navigate(`/admin/users/${id}`)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to User
            </Button>
            {activeSessions > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">
                    <XCircle className="h-4 w-4 mr-2" />
                    Revoke All Sessions
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Revoke All Sessions</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will revoke all active sessions for this user. They will be
                      logged out from all devices and required to log in again.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleRevokeAllSessions}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Revoke All
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        }
      />

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Monitor className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Active Sessions</p>
              <p className="text-2xl font-bold">{activeSessions}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-lg">
              <Monitor className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Desktop Sessions</p>
              <p className="text-2xl font-bold">
                {sessions.filter((s) => s.device_type === "desktop").length}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Smartphone className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Mobile Sessions</p>
              <p className="text-2xl font-bold">
                {sessions.filter((s) => s.device_type === "mobile").length}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Sessions Table */}
      <Card className="p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold">Active Sessions</h3>
          <p className="text-sm text-gray-500 mt-1">
            All currently active sessions for this user
          </p>
        </div>

        <DataTable
          columns={columns}
          data={sessions}
          actions={actions}
          loading={sessionsLoading}
          emptyMessage="No active sessions found"
        />

        {sessions.length > 0 && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-900">
                <p className="font-semibold">Session Management</p>
                <p className="mt-1">
                  Current sessions are marked with a green badge and cannot be revoked
                  from this page. Other sessions can be individually revoked or you can
                  revoke all sessions at once.
                </p>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};
