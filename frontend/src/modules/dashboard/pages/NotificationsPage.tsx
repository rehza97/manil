import React, { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { ArrowLeft, Check, CheckCheck, Loader2, Bell } from "lucide-react";
import { useToast } from "@/shared/hooks/use-toast";
import {
  useNotifications,
  useUnreadNotificationCount,
  useMarkNotificationRead,
  useNotificationStream,
} from "@/shared/hooks/useNotifications";
import { useAuth } from "@/modules/auth";

export const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"all" | "unread">("all");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const isCorporate = location.pathname.startsWith("/corporate");
  const isAdmin = location.pathname.startsWith("/admin");
  const basePath = isAdmin ? "/admin" : isCorporate ? "/corporate" : "/dashboard";

  // Enable SSE stream
  useNotificationStream(!!user);

  const { data: notificationsData, isLoading, refetch } = useNotifications({
    page,
    pageSize,
    unreadOnly: activeTab === "unread",
  });
  const { data: unreadCount = 0 } = useUnreadNotificationCount();
  const markReadMutation = useMarkNotificationRead();

  const notifications = notificationsData?.data || [];
  const totalPages = notificationsData?.total_pages || 0;

  const handleMarkAsRead = async (notificationId: string) => {
    markReadMutation.mutate(notificationId, {
      onSuccess: () => {
        refetch();
      },
    });
  };

  const handleMarkAllAsRead = async () => {
    const unreadNotifications = notifications.filter((n) => !n.read_at);
    const promises = unreadNotifications.map((n) =>
      markReadMutation.mutateAsync(n.id)
    );
    try {
      await Promise.all(promises);
      toast({
        title: "Success",
        description: "All notifications marked as read",
      });
      refetch();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to mark all as read",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "ticket_reply":
      case "ticket_status_change":
      case "ticket_assigned":
        return "🎫";
      case "order_status":
        return "📦";
      case "invoice":
        return "💰";
      default:
        return "🔔";
    }
  };

  const backPath = `${basePath}/settings`;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(backPath)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Notifications</h1>
            <p className="text-muted-foreground mt-1">
              View and manage your notifications
            </p>
          </div>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllAsRead}
            disabled={markReadMutation.isPending}
          >
            {markReadMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CheckCheck className="h-4 w-4 mr-2" />
            )}
            Mark all as read
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Notifications</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{notificationsData?.total || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Unread</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{unreadCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Read</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {(notificationsData?.total || 0) - unreadCount}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notifications List */}
      <Card>
        <CardHeader>
          <CardTitle>Your Notifications</CardTitle>
          <CardDescription>
            {activeTab === "unread"
              ? "Showing only unread notifications"
              : "Showing all notifications"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "all" | "unread")}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">All ({notificationsData?.total || 0})</TabsTrigger>
              <TabsTrigger value="unread">Unread ({unreadCount})</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : notifications.length > 0 ? (
                <div className="space-y-2">
                  {notifications.map((notification) => {
                    const isUnread = !notification.read_at;
                    return (
                      <div
                        key={notification.id}
                        className={`p-4 border rounded-lg transition-colors ${
                          isUnread
                            ? "bg-blue-50 border-blue-200"
                            : "bg-white border-gray-200"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 mt-0.5 text-2xl">
                            {getNotificationIcon(notification.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h3
                                    className={`text-sm font-medium ${
                                      isUnread ? "text-gray-900" : "text-gray-700"
                                    }`}
                                  >
                                    {notification.title}
                                  </h3>
                                  {isUnread && (
                                    <Badge variant="destructive" className="text-xs">
                                      New
                                    </Badge>
                                  )}
                                </div>
                                {notification.body && (
                                  <p className="text-sm text-gray-600 mt-1">
                                    {notification.body}
                                  </p>
                                )}
                                <p className="text-xs text-gray-400 mt-2">
                                  {formatDate(notification.created_at)}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                {isUnread && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleMarkAsRead(notification.id)}
                                    disabled={markReadMutation.isPending}
                                    title="Mark as read"
                                  >
                                    <Check className="h-4 w-4" />
                                  </Button>
                                )}
                                {notification.link && (
                                  <Button variant="outline" size="sm" asChild>
                                    <Link to={notification.link}>View</Link>
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Bell className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">
                    {activeTab === "unread"
                      ? "No unread notifications"
                      : "No notifications yet"}
                  </p>
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1 || isLoading}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-gray-500">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages || isLoading}
                  >
                    Next
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
