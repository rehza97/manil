import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Loader2, Smartphone, Shield, Download } from "lucide-react";
import { useState, useEffect } from "react";
import { authService } from "../services";
import type { TwoFactorSetup } from "../types";

export const TwoFactorSetup = () => {
  const [setup, setSetup] = useState<TwoFactorSetup | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    const initialize2FA = async () => {
      setIsLoading(true);
      try {
        const setupData = await authService.setup2FA();
        setSetup(setupData);
      } catch (err) {
        setError("Failed to initialize 2FA setup");
      } finally {
        setIsLoading(false);
      }
    };

    initialize2FA();
  }, []);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!verificationCode || verificationCode.length !== 6) {
      setError("Please enter a valid 6-digit code");
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      await authService.verify2FA(verificationCode);
      setIsVerified(true);
    } catch (err) {
      setError("Invalid verification code. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  const downloadBackupCodes = () => {
    if (!setup?.backupCodes) return;

    const codesText = setup.backupCodes.join("\n");
    const blob = new Blob([codesText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "cloudmanager-2fa-backup-codes.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2 text-slate-600">Setting up 2FA...</span>
      </div>
    );
  }

  if (isVerified) {
    return (
      <div className="space-y-6 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <Shield className="w-8 h-8 text-green-600" />
        </div>

        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-slate-900">
            Two-Factor Authentication Enabled
          </h3>
          <p className="text-slate-600">
            Your account is now protected with 2FA. You'll need to enter a code
            from your authenticator app when signing in.
          </p>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start">
            <Download className="w-5 h-5 text-yellow-600 mt-0.5 mr-3" />
            <div className="text-left">
              <p className="text-sm font-medium text-yellow-800">
                Save your backup codes
              </p>
              <p className="text-sm text-yellow-700 mt-1">
                Download and store these backup codes in a safe place. You can
                use them to access your account if you lose your authenticator
                device.
              </p>
              <Button
                onClick={downloadBackupCodes}
                variant="outline"
                size="sm"
                className="mt-2"
              >
                <Download className="w-4 h-4 mr-2" />
                Download Backup Codes
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!setup) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Failed to initialize 2FA setup. Please try again.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-slate-900">
          Set up Two-Factor Authentication
        </h3>
        <p className="text-slate-600">
          Add an extra layer of security to your account with 2FA.
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Smartphone className="w-5 h-5 mr-2" />
              Step 1: Install Authenticator App
            </CardTitle>
            <CardDescription>
              Download and install an authenticator app on your mobile device.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm text-slate-600">Recommended apps:</p>
              <ul className="text-sm space-y-1">
                <li>• Google Authenticator</li>
                <li>• Microsoft Authenticator</li>
                <li>• Authy</li>
                <li>• 1Password</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Step 2: Scan QR Code</CardTitle>
            <CardDescription>
              Open your authenticator app and scan this QR code.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center">
              <img
                src={`data:image/png;base64,${setup.qrCode}`}
                alt="2FA QR Code"
                className="w-48 h-48 border rounded-lg"
              />
            </div>
            <div className="mt-4 p-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-600 mb-2">
                Or enter this code manually:
              </p>
              <code className="text-sm font-mono bg-white px-2 py-1 rounded border">
                {setup.secret}
              </code>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Step 3: Verify Setup</CardTitle>
            <CardDescription>
              Enter the 6-digit code from your authenticator app to complete
              setup.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleVerify} className="space-y-4">
              <div className="space-y-2">
                <Label
                  htmlFor="verificationCode"
                  className="text-sm font-medium"
                >
                  Verification Code <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="verificationCode"
                  name="verificationCode"
                  type="text"
                  placeholder="000000"
                  value={verificationCode}
                  onChange={(e) =>
                    setVerificationCode(
                      e.target.value.replace(/\D/g, "").slice(0, 6)
                    )
                  }
                  disabled={isVerifying}
                  required
                  className="text-center text-lg tracking-widest"
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={isVerifying || verificationCode.length !== 6}
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify and Enable 2FA"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
