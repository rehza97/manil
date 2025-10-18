import React, { useState } from "react";
import { useAuth } from "@/modules/auth";
import { Link } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Shield,
  Key,
  Smartphone,
  History,
  Lock,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { TwoFactorSetup } from "@/modules/auth/components";
import { useToast } from "@/shared/hooks/use-toast";

const SecurityPage: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [show2FASetup, setShow2FASetup] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords do not match",
        variant: "destructive",
      });
      return;
    }

    try {
      // TODO: Implement password change API call
      toast({
        title: "Password Updated",
        description: "Your password has been successfully changed.",
      });
      setShowPasswordChange(false);
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to change password. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Security Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your account security and authentication methods
        </p>
      </div>

      {/* Security Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Security Status</CardTitle>
          <CardDescription>
            Quick overview of your account security
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-start space-x-3 p-4 border rounded-lg">
              <div
                className={`p-2 rounded-full ${
                  user.is_2fa_enabled
                    ? "bg-green-100 text-green-600"
                    : "bg-yellow-100 text-yellow-600"
                }`}
              >
                <Smartphone className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="font-medium">Two-Factor Auth</p>
                <p className="text-sm text-muted-foreground">
                  {user.is_2fa_enabled ? "Enabled" : "Not enabled"}
                </p>
              </div>
              {user.is_2fa_enabled ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-yellow-600" />
              )}
            </div>

            <div className="flex items-start space-x-3 p-4 border rounded-lg">
              <div className="p-2 rounded-full bg-green-100 text-green-600">
                <Lock className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="font-medium">Password</p>
                <p className="text-sm text-muted-foreground">Strong & secure</p>
              </div>
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>

            <div className="flex items-start space-x-3 p-4 border rounded-lg">
              <div className="p-2 rounded-full bg-green-100 text-green-600">
                <Shield className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="font-medium">Email Verified</p>
                <p className="text-sm text-muted-foreground">
                  {user.email}
                </p>
              </div>
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Password Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Key className="h-5 w-5 mr-2" />
            Password
          </CardTitle>
          <CardDescription>Change your account password</CardDescription>
        </CardHeader>
        <CardContent>
          {!showPasswordChange ? (
            <Button onClick={() => setShowPasswordChange(true)}>
              Change Password
            </Button>
          ) : (
            <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) =>
                    setPasswordData((prev) => ({
                      ...prev,
                      currentPassword: e.target.value,
                    }))
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) =>
                    setPasswordData((prev) => ({
                      ...prev,
                      newPassword: e.target.value,
                    }))
                  }
                  required
                  minLength={8}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) =>
                    setPasswordData((prev) => ({
                      ...prev,
                      confirmPassword: e.target.value,
                    }))
                  }
                  required
                  minLength={8}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Button type="submit">Update Password</Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowPasswordChange(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Two-Factor Authentication */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Smartphone className="h-5 w-5 mr-2" />
            Two-Factor Authentication
          </CardTitle>
          <CardDescription>
            Add an extra layer of security to your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">
                Status:{" "}
                <Badge variant={user.is_2fa_enabled ? "default" : "secondary"}>
                  {user.is_2fa_enabled ? "Enabled" : "Disabled"}
                </Badge>
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {user.is_2fa_enabled
                  ? "Your account is protected with 2FA"
                  : "Protect your account with two-factor authentication"}
              </p>
            </div>
            {!user.is_2fa_enabled && (
              <Button onClick={() => setShow2FASetup(true)}>
                Enable 2FA
              </Button>
            )}
          </div>

          {show2FASetup && (
            <div className="mt-6 p-6 border rounded-lg bg-slate-50">
              <TwoFactorSetup onComplete={() => setShow2FASetup(false)} />
            </div>
          )}

          {user.is_2fa_enabled && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> Two-factor authentication is currently
                enabled. You'll need your authenticator app to log in.
              </p>
              <Button
                variant="destructive"
                size="sm"
                className="mt-3"
                onClick={() => {
                  // TODO: Implement disable 2FA
                  toast({
                    title: "Feature Coming Soon",
                    description: "Disable 2FA will be available soon.",
                  });
                }}
              >
                Disable 2FA
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Login History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <History className="h-5 w-5 mr-2" />
            Login History
          </CardTitle>
          <CardDescription>
            View your recent login activity and sessions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <Link to="/dashboard/security/login-history">
              View Login History
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default SecurityPage;
