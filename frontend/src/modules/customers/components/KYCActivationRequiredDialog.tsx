/**
 * KYC Activation Required Dialog
 *
 * Shown to the client when their KYC is not yet activated. Explains the situation
 * and offers a button to go to the profile page to upload documents.
 */

import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";

export interface KYCActivationRequiredDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGoToDocuments?: () => void;
}

const PROFILE_KYC_HASH = "#kyc-documents";

export const KYCActivationRequiredDialog: React.FC<
  KYCActivationRequiredDialogProps
> = ({ open, onOpenChange, onGoToDocuments }) => {
  const navigate = useNavigate();

  const handleGoToDocuments = () => {
    if (onGoToDocuments) {
      onGoToDocuments();
    } else {
      navigate(`/dashboard/profile${PROFILE_KYC_HASH}`);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Vérification KYC requise</DialogTitle>
          <DialogDescription>
            Votre compte n&apos;est pas encore activé. Pour accéder à tous les
            services, vous devez télécharger les documents requis (pièce
            d&apos;identité ou documents d&apos;entreprise) depuis votre profil.
            Une fois vos documents vérifiés et approuvés, votre compte sera
            activé et vous aurez accès à l&apos;ensemble des fonctionnalités.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
          <Button onClick={handleGoToDocuments}>
            Aller aux documents KYC
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
