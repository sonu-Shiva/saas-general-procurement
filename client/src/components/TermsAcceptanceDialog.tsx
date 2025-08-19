import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle, FileText, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface TermsAcceptanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  termsAndConditionsPath?: string;
  rfxTitle: string;
  rfxType: string;
  rfxId?: string; // Added for RFx ID
  auctionId?: string; // Added for auction ID
  onAccept: () => void;
  onDecline: () => void;
}

export function TermsAcceptanceDialog({
  open,
  onOpenChange,
  termsAndConditionsPath,
  rfxTitle,
  rfxType,
  rfxId,
  auctionId,
  onAccept,
  onDecline,
}: TermsAcceptanceDialogProps) {
  const [hasReadTerms, setHasReadTerms] = useState(false);
  const [hasAgreedToTerms, setHasAgreedToTerms] = useState(false);

  const handleAccept = () => {
    if (hasReadTerms && hasAgreedToTerms) {
      onAccept();
      onOpenChange(false);
    }
  };

  const handleDecline = () => {
    onDecline();
    onOpenChange(false);
  };

  const handleDownloadTerms = () => {
    console.log('DEBUG: Terms path:', termsAndConditionsPath);
    console.log('DEBUG: RFx ID:', rfxId);
    console.log('DEBUG: Auction ID:', auctionId);
    
    let downloadUrl: string;
    
    if (rfxId) {
      // For RFx, use the unified terms endpoint
      downloadUrl = `/api/terms/download/${rfxId}`;
    } else if (auctionId) {
      // For auctions, use the unified terms endpoint
      downloadUrl = `/api/terms/download/${auctionId}`;
    } else if (termsAndConditionsPath) {
      // Fallback to the provided path (might be full URL)
      if (termsAndConditionsPath.startsWith('/api/')) {
        downloadUrl = termsAndConditionsPath;
      } else {
        // Extract filename and use old endpoint as fallback
        let filename = termsAndConditionsPath;
        if (filename.includes('/')) {
          filename = filename.split('/').pop() || 'terms.pdf';
        }
        downloadUrl = `/api/terms/download/${filename}`;
      }
    } else {
      console.error('DEBUG: No download method available');
      return;
    }
    
    console.log('DEBUG: Opening URL:', downloadUrl);
    window.open(downloadUrl, '_blank');
    setHasReadTerms(true);
  };

  const canAccept = hasReadTerms && hasAgreedToTerms;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" data-testid="dialog-terms-acceptance">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Terms & Conditions Required
          </DialogTitle>
          <DialogDescription>
            You must review and accept the terms & conditions before participating in this {rfxType.toUpperCase()}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
            <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">{rfxTitle}</h4>
            <Badge variant="outline" className="text-blue-700 dark:text-blue-300">
              {rfxType.toUpperCase()}
            </Badge>
          </div>

          {termsAndConditionsPath && (
            <div className="space-y-3">
              <Button
                onClick={handleDownloadTerms}
                variant="outline"
                className="w-full"
                data-testid="button-download-terms"
              >
                <FileText className="h-4 w-4 mr-2" />
                Download & Read Terms & Conditions
                <Download className="h-4 w-4 ml-2" />
              </Button>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="read-terms"
                  checked={hasReadTerms}
                  onCheckedChange={(checked) => setHasReadTerms(checked as boolean)}
                  disabled={!termsAndConditionsPath}
                  data-testid="checkbox-read-terms"
                />
                <label
                  htmlFor="read-terms"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  I have downloaded and read the Terms & Conditions
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="agree-terms"
                  checked={hasAgreedToTerms}
                  onCheckedChange={(checked) => setHasAgreedToTerms(checked as boolean)}
                  disabled={!hasReadTerms}
                  data-testid="checkbox-agree-terms"
                />
                <label
                  htmlFor="agree-terms"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  I agree to the Terms & Conditions and understand they are legally binding
                </label>
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button
              onClick={handleDecline}
              variant="outline"
              className="flex-1"
              data-testid="button-decline-terms"
            >
              Decline
            </Button>
            <Button
              onClick={handleAccept}
              disabled={!canAccept}
              className="flex-1"
              data-testid="button-accept-terms"
            >
              Accept & Continue
            </Button>
          </div>

          {!canAccept && termsAndConditionsPath && (
            <p className="text-xs text-muted-foreground text-center">
              You must download, read, and agree to the terms before proceeding.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}