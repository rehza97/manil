/**
 * Service Domains Panel Component
 *
 * Displays and manages service domains for a VPS subscription.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  Globe,
  Copy,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { useState } from "react";
import { useToast } from "@/shared/components/ui/use-toast";
import {
  useServiceDomains,
  useCreateCustomDomain,
  useUpdateServiceDomain,
  useDeleteServiceDomain,
} from "../hooks/useServiceDomains";
import type { VPSServiceDomain } from "../types";

interface ServiceDomainsPanelProps {
  subscriptionId: string;
}

export function ServiceDomainsPanel({ subscriptionId }: ServiceDomainsPanelProps) {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [domainToDelete, setDomainToDelete] = useState<VPSServiceDomain | null>(null);
  const [serviceName, setServiceName] = useState("");
  const [customDomain, setCustomDomain] = useState("");

  const { data: domainsData, isLoading, error } = useServiceDomains(subscriptionId);
  const createDomain = useCreateCustomDomain();
  const updateDomain = useUpdateServiceDomain();
  const deleteDomain = useDeleteServiceDomain();

  const domains = domainsData?.items || [];

  // Extract unique service names from existing domains for the selector
  const availableServices = Array.from(new Set(domains.map((d) => d.service_name)));

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied",
        description: `${label} copied to clipboard`,
      });
    } catch (err) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const handleAddDomain = async () => {
    if (!serviceName || !customDomain) {
      toast({
        title: "Validation Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    try {
      await createDomain.mutateAsync({
        subscription_id: subscriptionId,
        service_name: serviceName,
        custom_domain: customDomain,
      });
      setIsAddDialogOpen(false);
      setServiceName("");
      setCustomDomain("");
    } catch (error) {
      // Error is handled by the hook
    }
  };

  const handleToggleActive = async (domain: VPSServiceDomain) => {
    try {
      await updateDomain.mutateAsync({
        domainId: domain.id,
        data: { is_active: !domain.is_active },
        subscriptionId: domain.subscription_id,
      });
    } catch (error) {
      // Error is handled by the hook
    }
  };

  const handleDelete = async () => {
    if (!domainToDelete) return;

    try {
      await deleteDomain.mutateAsync({
        domainId: domainToDelete.id,
        subscriptionId: domainToDelete.subscription_id,
      });
      setDomainToDelete(null);
    } catch (error) {
      // Error is handled by the hook
    }
  };

  const getDomainUrl = (domain: VPSServiceDomain) => {
    return `http://${domain.domain_name}`;
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Service Domains</CardTitle>
              <CardDescription>Manage domains for your VPS services</CardDescription>
            </div>
            <Button
              size="sm"
              onClick={() => setIsAddDialogOpen(true)}
              disabled={availableServices.length === 0}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Domain
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {error && (
            <div className="rounded-md bg-destructive/10 p-4">
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">
                  Failed to load domains. Please try again.
                </span>
              </div>
            </div>
          )}

          {!isLoading && !error && domains.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Globe className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm">No service domains configured</p>
              <p className="text-xs mt-1">
                Deploy services to automatically generate domains, or add custom domains.
              </p>
            </div>
          )}

          {!isLoading && !error && domains.length > 0 && (
            <div className="space-y-3">
              {domains.map((domain) => (
                <div
                  key={domain.id}
                  className="border rounded-lg p-4 space-y-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium font-mono text-sm">
                            {domain.domain_name}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() =>
                            copyToClipboard(getDomainUrl(domain), "Domain URL")
                          }
                          aria-label="Copy domain URL"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-xs">
                          {domain.service_name}:{domain.service_port}
                        </Badge>
                        <Badge
                          variant={domain.domain_type === "AUTO" ? "secondary" : "default"}
                        >
                          {domain.domain_type === "AUTO" ? "Auto" : "Custom"}
                        </Badge>
                        <Badge
                          variant={domain.is_active ? "default" : "secondary"}
                          className={domain.is_active ? "bg-green-600" : ""}
                        >
                          {domain.is_active ? (
                            <>
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Active
                            </>
                          ) : (
                            <>
                              <XCircle className="h-3 w-3 mr-1" />
                              Inactive
                            </>
                          )}
                        </Badge>
                        {domain.proxy_configured && (
                          <Badge variant="outline" className="text-xs">
                            Proxy Configured
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleActive(domain)}
                        disabled={updateDomain.isPending}
                      >
                        {domain.is_active ? "Deactivate" : "Activate"}
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setDomainToDelete(domain)}
                        aria-label="Delete domain"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Custom Domain Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Custom Domain</DialogTitle>
            <DialogDescription>
              Add a custom domain name for one of your services. Make sure to configure DNS
              to point to your server's public IP.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="service-name">Service Name</Label>
              <Select value={serviceName} onValueChange={setServiceName}>
                <SelectTrigger id="service-name">
                  <SelectValue placeholder="Select a service" />
                </SelectTrigger>
                <SelectContent>
                  {availableServices.map((service) => (
                    <SelectItem key={service} value={service}>
                      {service}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Select the service to attach the domain to
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="custom-domain">Custom Domain</Label>
              <Input
                id="custom-domain"
                placeholder="example.com"
                value={customDomain}
                onChange={(e) => setCustomDomain(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Enter your custom domain name (e.g., app.example.com)
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddDialogOpen(false);
                setServiceName("");
                setCustomDomain("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddDomain}
              disabled={createDomain.isPending || !serviceName || !customDomain}
            >
              {createDomain.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Add Domain
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!domainToDelete}
        onOpenChange={(open) => !open && setDomainToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Domain</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the domain{" "}
              <span className="font-mono font-medium">
                {domainToDelete?.domain_name}
              </span>
              ? This action cannot be undone. The nginx configuration and DNS records
              (for auto-generated domains) will be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteDomain.isPending}
            >
              {deleteDomain.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
