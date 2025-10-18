import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Loader2, Shield, Key } from "lucide-react";
import { useState } from "react";
import { authService } from "../services";

interface TwoFactorVerifyProps {
  onSuccess: () => void;
  onCancel?: () => void;
  email?: string;
}

export const TwoFactorVerify = ({
  onSuccess,
  onCancel,
  email,
}: TwoFactorVerifyProps) => {
  const [verificationCode, setVerificationCode] = useState("");
  const [backupCode, setBackupCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useBackupCode, setUseBackupCode] = useState(false);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();

    const code = useBackupCode ? backupCode : verificationCode;

    if (!code || (useBackupCode ? code.length < 8 : code.length !== 6)) {
      setError(
        useBackupCode
          ? "Please enter a valid backup code"
          : "Please enter a valid 6-digit code"
      );
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await authService.verify2FA(code);
      onSuccess();
    } catch (err) {
      setError(
        useBackupCode
          ? "Invalid backup code"
          : "Invalid verification code. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (value: string) => {
    if (useBackupCode) {
      setBackupCode(value);
    } else {
      setVerificationCode(value.replace(/\D/g, "").slice(0, 6));
    }
    setError(null);
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
          <Shield className="w-6 h-6 text-blue-600" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900">
          Two-Factor Authentication
        </h3>
        <p className="text-slate-600">
          {email
            ? `Enter the verification code for ${email}`
            : "Enter your verification code to continue"}
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleVerify} className="space-y-4">
        {!useBackupCode ? (
          <div className="space-y-2">
            <Label htmlFor="verificationCode" className="text-sm font-medium">
              Verification Code <span className="text-red-500">*</span>
            </Label>
            <Input
              id="verificationCode"
              name="verificationCode"
              type="text"
              placeholder="000000"
              value={verificationCode}
              onChange={(e) => handleInputChange(e.target.value)}
              disabled={isLoading}
              required
              className="text-center text-lg tracking-widest"
            />
            <p className="text-xs text-slate-500">
              Enter the 6-digit code from your authenticator app
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="backupCode" className="text-sm font-medium">
              Backup Code <span className="text-red-500">*</span>
            </Label>
            <Input
              id="backupCode"
              name="backupCode"
              type="text"
              placeholder="Enter backup code"
              value={backupCode}
              onChange={(e) => handleInputChange(e.target.value)}
              disabled={isLoading}
              required
              className="text-center"
            />
            <p className="text-xs text-slate-500">
              Enter one of your backup codes
            </p>
          </div>
        )}

        <Button
          type="submit"
          className="w-full"
          size="lg"
          disabled={
            isLoading ||
            (!useBackupCode
              ? verificationCode.length !== 6
              : backupCode.length < 8)
          }
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Verifying...
            </>
          ) : (
            "Verify"
          )}
        </Button>

        <div className="text-center">
          <button
            type="button"
            onClick={() => {
              setUseBackupCode(!useBackupCode);
              setVerificationCode("");
              setBackupCode("");
              setError(null);
            }}
            className="text-sm text-blue-600 hover:text-blue-700 flex items-center justify-center mx-auto"
          >
            <Key className="w-4 h-4 mr-1" />
            {useBackupCode
              ? "Use authenticator app instead"
              : "Use backup code instead"}
          </button>
        </div>

        {onCancel && (
          <div className="text-center">
            <button
              type="button"
              onClick={onCancel}
              className="text-sm text-slate-600 hover:text-slate-700"
            >
              Cancel
            </button>
          </div>
        )}
      </form>

      {!useBackupCode && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <Shield className="w-5 h-5 text-blue-600 mt-0.5 mr-3" />
            <div className="text-sm">
              <p className="font-medium text-blue-800">
                Having trouble with your authenticator app?
              </p>
              <p className="text-blue-700 mt-1">
                Make sure your device's time is synchronized correctly. If
                you're still having issues, you can use a backup code instead.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
