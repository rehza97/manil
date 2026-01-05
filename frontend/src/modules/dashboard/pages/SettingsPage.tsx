import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/modules/auth";
import { useQuery } from "@tanstack/react-query";
import { customerService } from "@/modules/customers/services";
import { KYCPanel } from "@/modules/customers/components/KYCPanel";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import {
  Settings,
  Bell,
  User,
  Shield,
  Mail,
  Globe,
  FileCheck,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();

  // Fetch current user's customer profile
  const { data: customer, isLoading: isLoadingCustomer } = useQuery({
    queryKey: ["customers", "me"],
    queryFn: () => customerService.getMyCustomer(),
    enabled: !!user,
  });

  const customerId = customer?.id;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Account Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your account preferences and settings
        </p>
      </div>

      {/* Settings Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <User className="h-5 w-5 text-blue-600" />
              <CardTitle>Profile Settings</CardTitle>
            </div>
            <CardDescription>
              Update your personal information and contact details
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link to="/dashboard/profile/edit">Edit Profile</Link>
            </Button>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-green-600" />
              <CardTitle>Security Settings</CardTitle>
            </div>
            <CardDescription>
              Manage your password and two-factor authentication
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link to="/dashboard/security">Security Settings</Link>
            </Button>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Bell className="h-5 w-5 text-yellow-600" />
              <CardTitle>Notification Preferences</CardTitle>
            </div>
            <CardDescription>
              Configure how and when you receive notifications
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link to="/dashboard/settings/notifications">
                Manage Notifications
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Email Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Mail className="h-5 w-5 text-purple-600" />
              <CardTitle>Email Preferences</CardTitle>
            </div>
            <CardDescription>
              Manage your email communication preferences
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link to="/dashboard/settings/notifications">
                Email Settings
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Language & Region */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Globe className="h-5 w-5 text-indigo-600" />
              <CardTitle>Language & Region</CardTitle>
            </div>
            <CardDescription>
              Set your preferred language and regional settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" disabled>
              Coming Soon
            </Button>
          </CardContent>
        </Card>

        {/* Privacy Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Settings className="h-5 w-5 text-gray-600" />
              <CardTitle>Privacy Settings</CardTitle>
            </div>
            <CardDescription>
              Control your privacy and data sharing preferences
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" disabled>
              Coming Soon
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* KYC Documents Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <FileCheck className="h-5 w-5 text-blue-600" />
            <CardTitle>KYC Documents</CardTitle>
          </div>
          <CardDescription>
            Upload and manage your Know Your Customer (KYC) verification documents
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingCustomer ? (
            <div className="flex items-center justify-center p-6">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : !customerId ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Customer profile not found. Please contact support to set up your customer account.
              </AlertDescription>
            </Alert>
          ) : (
            <KYCPanel customerId={customerId} showVerificationControls={false} />
          )}
        </CardContent>
      </Card>
    </div>
  );
};









