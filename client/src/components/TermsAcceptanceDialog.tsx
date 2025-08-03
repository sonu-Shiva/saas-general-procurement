import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface TermsAcceptanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: "rfx" | "auction" | "direct_procurement";
  entityId: string;
  entityTitle: string;
  termsAndConditionsPath?: string;
  onAccepted: () => void;
}

/**
 * Dialog component for vendor Terms & Conditions acceptance.
 * 
 * Features:
 * - Shows T&C document link if available
 * - Requires explicit checkbox acceptance
 * - Records acceptance with timestamp and IP tracking
 * - Prevents action without T&C acceptance
 * 
 * @param props - Component props
 * @param props.open - Whether the dialog is open
 * @param props.onOpenChange - Function to handle dialog open state changes
 * @param props.entityType - Type of procurement entity (rfx, auction, direct_procurement)
 * @param props.entityId - ID of the procurement entity
 * @param props.entityTitle - Display title of the procurement entity
 * @param props.termsAndConditionsPath - Path to T&C document (if available)
 * @param props.onAccepted - Callback when T&C are successfully accepted
 */
export function TermsAcceptanceDialog({
  open,
  onOpenChange,
  entityType,
  entityId,
  entityTitle,
  termsAndConditionsPath,
  onAccepted,
}: TermsAcceptanceDialogProps) {
  const [hasAccepted, setHasAccepted] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const acceptTermsMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("/api/terms/accept", "POST", {
        entityType,
        entityId,
        termsAndConditionsPath: termsAndConditionsPath || "",
      });
    },
    onSuccess: () => {
      toast({
        title: "Terms Accepted",
        description: "You have successfully accepted the terms and conditions.",
      });
      onAccepted();
      onOpenChange(false);
      setHasAccepted(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to record terms acceptance",
        variant: "destructive",
      });
    },
  });

  const handleAccept = () => {
    if (!hasAccepted) {
      toast({
        title: "Terms Required",
        description: "You must accept the terms and conditions to proceed.",
        variant: "destructive",
      });
      return;
    }
    acceptTermsMutation.mutate();
  };

  const getEntityTypeLabel = () => {
    switch (entityType) {
      case "rfx":
        return "RFx";
      case "auction":
        return "Auction";
      case "direct_procurement":
        return "Direct Procurement";
      default:
        return "Procurement";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Terms & Conditions Acceptance Required
          </DialogTitle>
          <DialogDescription>
            You must review and accept the terms and conditions before participating in this {getEntityTypeLabel().toLowerCase()}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border p-4 bg-muted/50">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium">{getEntityTypeLabel()}: {entityTitle}</h4>
              <Badge variant="secondary">{getEntityTypeLabel()}</Badge>
            </div>
            
            {termsAndConditionsPath ? (
              <div className="flex items-center gap-2 text-sm">
                <FileText className="w-4 h-4" />
                <span>Terms & Conditions document available</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(termsAndConditionsPath, '_blank')}
                  className="ml-auto"
                >
                  <ExternalLink className="w-3 h-3 mr-1" />
                  View T&C
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="w-4 h-4" />
                <span>Standard terms and conditions apply</span>
              </div>
            )}
          </div>

          <ScrollArea className="h-32 rounded-lg border p-4">
            <div className="text-sm text-muted-foreground">
              <p className="mb-2"><strong>By participating in this procurement process, you agree to:</strong></p>
              <ul className="list-disc list-inside space-y-1">
                <li>Provide accurate and complete information in all responses</li>
                <li>Comply with all specified requirements and timelines</li>
                <li>Honor your submitted bids and proposals</li>
                <li>Maintain confidentiality of procurement information</li>
                <li>Follow all applicable laws and regulations</li>
                <li>Accept the buyer's terms for payment and delivery</li>
              </ul>
              {termsAndConditionsPath && (
                <p className="mt-2 text-xs">
                  Additional terms and conditions may apply as specified in the attached document.
                </p>
              )}
            </div>
          </ScrollArea>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="terms-acceptance"
              checked={hasAccepted}
              onCheckedChange={(checked) => setHasAccepted(checked as boolean)}
            />
            <label
              htmlFor="terms-acceptance"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              I have read, understood, and agree to abide by all terms and conditions
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleAccept}
            disabled={!hasAccepted || acceptTermsMutation.isPending}
          >
            {acceptTermsMutation.isPending ? "Recording..." : "Accept & Continue"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}