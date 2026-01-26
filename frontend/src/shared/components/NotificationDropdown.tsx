import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Bell, Check, Loader2 } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/ui/popover";
import { Button } from "@/shared/components/ui/button";
import { ScrollArea } from "@/shared/components/ui/scroll-area";
import {
  useNotifications,
  useUnreadNotificationCount,
  useMarkNotificationRead,
  useNotificationStream,
} from "@/shared/hooks/useNotifications";
import { useAuth } from "@/modules/auth";

interface NotificationDropdownProps {
  className?: string;
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  className,
}) => {
  const { user } = useAuth();
  const location = useLocation();
  
  // Determine base path based on current route
  const isCorporate = location.pathname.startsWith("/corporate");
  const isAdmin = location.pathname.startsWith("/admin");
  const notificationsPath = isAdmin 
    ? "/admin/notifications" 
    : isCorporate 
    ? "/corporate/notifications" 
    : "/dashboard/notifications";
  const { data: notificationsData, isLoading } = useNotifications({
    page: 1,
    pageSize: 10,
    unreadOnly: false,
  });
  const { data: unreadCount = 0 } = useUnreadNotificationCount();
  const markReadMutation = useMarkNotificationRead();

  // Enable SSE stream when user is authenticated
  useNotificationStream(!!user);

  const notifications = notificationsData?.data || [];
  const unreadNotifications = notifications.filter((n) => !n.read_at);

  const handleMarkAsRead = async (notificationId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    markReadMutation.mutate(notificationId);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
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

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className={`relative ${className}`}>
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 bg-white border-gray-200 shadow-lg" align="end">
        <div className="p-4 border-b bg-white">
          <h4 className="font-semibold text-sm text-gray-900">Notifications</h4>
          <p className="text-xs text-gray-500">
            {unreadCount > 0
              ? `${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}`
              : "No unread notifications"}
          </p>
        </div>
        <ScrollArea className="max-h-96">
          {isLoading ? (
            <div className="p-8 text-center">
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-gray-400" />
              <p className="text-sm text-gray-500 mt-2">Loading notifications...</p>
            </div>
          ) : notifications.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {notifications.map((notification) => {
                const isUnread = !notification.read_at;
                return (
                  <div
                    key={notification.id}
                    className={`p-4 hover:bg-gray-50 transition-colors ${
                      isUnread ? "bg-blue-50" : "bg-white"
                    }`}
                  >
                    <Link
                      to={notification.link || "#"}
                      className="block"
                      onClick={() => {
                        if (isUnread) {
                          markReadMutation.mutate(notification.id);
                        }
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5 text-lg">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p
                              className={`text-sm font-medium ${
                                isUnread ? "text-gray-900" : "text-gray-700"
                              }`}
                            >
                              {notification.title}
                            </p>
                            {isUnread && (
                              <button
                                onClick={(e) => handleMarkAsRead(notification.id, e)}
                                className="flex-shrink-0 p-1 hover:bg-gray-200 rounded"
                                title="Mark as read"
                              >
                                <Check className="h-3 w-3 text-gray-500" />
                              </button>
                            )}
                          </div>
                          {notification.body && (
                            <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                              {notification.body}
                            </p>
                          )}
                          <p className="text-xs text-gray-400 mt-1">
                            {formatDate(notification.created_at)}
                          </p>
                        </div>
                      </div>
                    </Link>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center text-sm text-gray-500 bg-white">
              <Bell className="h-8 w-8 mx-auto text-gray-300 mb-2" />
              <p>No notifications</p>
            </div>
          )}
        </ScrollArea>
        {notifications.length > 0 && (
          <div className="p-2 border-t bg-white">
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              asChild
            >
              <Link to={notificationsPath}>View all notifications</Link>
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};
