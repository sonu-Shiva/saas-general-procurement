import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, FileText, Download } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface TermsAcceptanceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: () => void;
  termsPath: string;
  entityType: string;
  entityId: string;
}

export function TermsAcceptanceDialog({
  isOpen,
  onClose,
  onAccept,
  termsPath,
  entityType,
  entityId,
}: TermsAcceptanceDialogProps) {
  const [hasRead, setHasRead] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const { toast } = useToast();

  const acceptTermsMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/terms/accept', 'POST', {
        entityType,
        entityId,
      });
    },
    onSuccess: () => {
      toast({
        title: "Terms Accepted",
        description: "You have successfully accepted the terms and conditions.",
      });
      onAccept();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to accept terms. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleAccept = async () => {
    if (!hasRead) {
      toast({
        title: "Please confirm",
        description: "You must confirm that you have read the terms and conditions.",
        variant: "destructive",
      });
      return;
    }
    
    setIsAccepting(true);
    try {
      await acceptTermsMutation.mutateAsync();
    } finally {
      setIsAccepting(false);
    }
  };

  const downloadTerms = () => {
    // Open the terms document in a new tab for download
    window.open(termsPath, '_blank');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            Terms & Conditions Required
          </DialogTitle>
          <DialogDescription>
            You must read and accept the terms and conditions before proceeding.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                <div className="space-y-2">
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    Mandatory Terms Acceptance
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    Before you can submit your response, you must review and accept the terms and conditions
                    document provided for this request.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border border-border rounded-lg">
              <div className="flex items-center gap-3">
                <FileText className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="font-medium">Terms & Conditions Document</p>
                  <p className="text-sm text-muted-foreground">
                    Review the complete terms and conditions
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={downloadTerms}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Download & Review
              </Button>
            </div>

            <div className="flex items-start space-x-3 p-4 bg-muted/50 rounded-lg">
              <Checkbox
                id="terms-read"
                checked={hasRead}
                onCheckedChange={(checked) => setHasRead(checked as boolean)}
                className="mt-1"
              />
              <div className="space-y-1 leading-none">
                <label
                  htmlFor="terms-read"
                  className="text-sm font-medium leading-normal cursor-pointer"
                >
                  I have read and understood the terms and conditions
                </label>
                <p className="text-xs text-muted-foreground">
                  By checking this box, you confirm that you have thoroughly reviewed
                  the terms and conditions document and understand all obligations.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleAccept}
              disabled={!hasRead || isAccepting || acceptTermsMutation.isPending}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {isAccepting || acceptTermsMutation.isPending ? "Accepting..." : "Accept & Continue"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}