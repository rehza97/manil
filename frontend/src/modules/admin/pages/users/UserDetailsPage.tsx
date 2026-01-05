/**
 * User Details Page
 *
 * Admin page for viewing user details and statistics
 */

import React from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { PageHeader } from "../../components/shared";
import { UserRoleBadge, UserStatusBadge, AccountLockBadge, TwoFactorBadge } from "../../components/shared";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Separator } from "@/shared/components/ui/separator";
import { useUser, useUserStats, useUserActivity } from "../../hooks/useUsers";
import {
  ArrowLeft,
  Edit,
  Shield,
  Mail,
  Calendar,
  Clock,
  Activity,
  LogIn,
  XCircle,
  CheckCircle,
  Loader2,
  AlertCircle,
  Key,
  History,
} from "lucide-react";

export const UserDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: user, isLoading: userLoading } = useUser(id!);
  const { data: stats, isLoading: statsLoading } = useUserStats(id!);
  const { data: activityData, isLoading: activityLoading } = useUserActivity(id!, 1, 5);

  const isLoading = userLoading || statsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-500">Loading user details...</span>
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

  const isLocked = user.locked_until && new Date(user.locked_until) > new Date();

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleDateString("fr-DZ", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title={user.full_name}
        description={user.email}
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Users", href: "/admin/users" },
          { label: user.full_name },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => navigate("/admin/users")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Button onClick={() => navigate(`/admin/users/${id}/edit`)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit User
            </Button>
          </div>
        }
      />

      {/* Status Badges */}
      <div className="flex items-center gap-2">
        <UserRoleBadge role={user.role} />
        <UserStatusBadge isActive={user.is_active} />
        <TwoFactorBadge enabled={user.is_2fa_enabled} />
        {isLocked && <AccountLockBadge lockedUntil={user.locked_until} />}
      </div>

      {/* Account Locked Warning */}
      {isLocked && (
        <Card className="p-4 bg-red-50 border-red-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
            <div>
              <h4 className="font-semibold text-red-900">Account Locked</h4>
              <p className="text-sm text-red-700 mt-1">
                This account is locked due to multiple failed login attempts.
                Lock expires on {formatDate(user.locked_until)}.
              </p>
              <p className="text-sm text-red-700 mt-1">
                Failed login attempts: {user.failed_login_attempts}
              </p>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium">{user.email}</p>
                </div>
              </div>
              <Separator />
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-gray-500">Role</p>
                  <p className="font-medium capitalize">{user.role}</p>
                </div>
              </div>
              <Separator />
              <div className="flex items-start gap-3">
                <Key className="h-5 w-5 text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-gray-500">Two-Factor Authentication</p>
                  <p className="font-medium">
                    {user.is_2fa_enabled ? "Enabled" : "Disabled"}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Account Activity */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Account Activity</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <LogIn className="h-5 w-5 text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-gray-500">Last Login</p>
                  <p className="font-medium">{formatDate(user.last_login_at)}</p>
                </div>
              </div>
              <Separator />
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-gray-500">Account Created</p>
                  <p className="font-medium">{formatDate(user.created_at)}</p>
                </div>
              </div>
              <Separator />
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-gray-500">Last Updated</p>
                  <p className="font-medium">{formatDate(user.updated_at)}</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Recent Activity */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Recent Activity</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/admin/users/${id}/activity`)}
              >
                <History className="h-4 w-4 mr-2" />
                View All
              </Button>
            </div>
            {activityLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : activityData && activityData.data.length > 0 ? (
              <div className="space-y-3">
                {activityData.data.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
                  >
                    {activity.success ? (
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {activity.description}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatDate(activity.created_at)} • {activity.ip_address}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-8">
                No recent activity
              </p>
            )}
          </Card>
        </div>

        {/* Statistics Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => navigate(`/admin/users/${id}/edit`)}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit User
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => navigate(`/admin/users/${id}/roles`)}
              >
                <Shield className="h-4 w-4 mr-2" />
                Manage Roles
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => navigate(`/admin/users/${id}/sessions`)}
              >
                <Activity className="h-4 w-4 mr-2" />
                View Sessions
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => navigate(`/admin/users/${id}/activity`)}
              >
                <History className="h-4 w-4 mr-2" />
                Activity Logs
              </Button>
            </div>
          </Card>

          {/* Statistics */}
          {stats && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Statistics</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500">Total Logins</p>
                  <p className="text-2xl font-bold">{stats.total_logins}</p>
                </div>
                <Separator />
                <div>
                  <p className="text-sm text-gray-500">Failed Logins</p>
                  <p className="text-2xl font-bold text-red-600">
                    {stats.failed_logins}
                  </p>
                </div>
                <Separator />
                <div>
                  <p className="text-sm text-gray-500">Active Sessions</p>
                  <p className="text-2xl font-bold">{stats.active_sessions}</p>
                </div>
                <Separator />
                <div>
                  <p className="text-sm text-gray-500">Total Actions</p>
                  <p className="text-2xl font-bold">{stats.total_actions}</p>
                </div>
                <Separator />
                <div>
                  <p className="text-sm text-gray-500">Account Age</p>
                  <p className="text-2xl font-bold">
                    {stats.account_age_days} days
                  </p>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
