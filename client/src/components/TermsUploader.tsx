import { useState } from "react";
import type { ReactNode } from "react";
import Uppy from "@uppy/core";
import { DashboardModal } from "@uppy/react";
import "@uppy/core/dist/style.min.css";
import "@uppy/dashboard/dist/style.min.css";
import AwsS3 from "@uppy/aws-s3";
import type { UploadResult } from "@uppy/core";
import { Button } from "@/components/ui/button";
import { FileText, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface TermsUploaderProps {
  onUploadComplete?: (filePath: string) => void;  // Updated for consistency
  onTermsUpload?: (url: string) => void;          // Keep for backward compatibility
  currentTermsUrl?: string;
  currentFilePath?: string;                       // Add for consistency
  buttonClassName?: string;
  children?: ReactNode;
}

/**
 * A specialized file upload component for Terms & Conditions PDF documents.
 * 
 * Features:
 * - Restricts uploads to PDF files only
 * - Shows current T&C file status
 * - Provides clear upload progress
 * - Handles T&C file replacement
 * 
 * @param props - Component props
 * @param props.onUploadComplete - Callback when T&C PDF upload is complete
 * @param props.currentFilePath - Path to current T&C file (if any)
 * @param props.buttonClassName - Optional CSS class name for the button
 * @param props.children - Optional custom button content
 */
export function TermsUploader({
  onUploadComplete,
  onTermsUpload,
  currentTermsUrl,
  currentFilePath,
  buttonClassName,
  children,
}: TermsUploaderProps) {
  const [showModal, setShowModal] = useState(false);
  const [uppy] = useState(() =>
    new Uppy({
      restrictions: {
        maxNumberOfFiles: 1,
        maxFileSize: 10485760, // 10MB
        allowedFileTypes: ['.pdf', 'application/pdf'],
      },
      autoProceed: false,
    })
      .use(AwsS3, {
        shouldUseMultipart: false,
        getUploadParameters: async () => {
          const response = await fetch('/api/objects/upload', {
            method: 'POST',
            credentials: 'include',
          });
          
          if (!response.ok) {
            throw new Error('Failed to get upload URL');
          }
          
          const { uploadURL } = await response.json();
          return {
            method: 'PUT' as const,
            url: uploadURL,
          };
        },
      })
      .on('complete', (result) => {
        if (result.successful && result.successful.length > 0) {
          const uploadedFile = result.successful[0];
          if (uploadedFile.uploadURL) {
            // Call both callbacks for compatibility
            onTermsUpload?.(uploadedFile.uploadURL);
            onUploadComplete?.(uploadedFile.uploadURL);
            setShowModal(false);
          }
        }
      })
  );

  const hasCurrentFile = Boolean(currentTermsUrl || currentFilePath);

  return (
    <div className="space-y-2">
      <Button 
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setShowModal(true);
        }} 
        className={buttonClassName}
        variant={hasCurrentFile ? "outline" : "default"}
      >
        {children || (
          <div className="flex items-center gap-2">
            {hasCurrentFile ? <FileText className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
            <span>
              {hasCurrentFile ? "Update Terms & Conditions" : "Upload Terms & Conditions"}
            </span>
          </div>
        )}
      </Button>

      {hasCurrentFile && (
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            <FileText className="w-3 h-3 mr-1" />
            T&C PDF Uploaded
          </Badge>
          <span className="text-xs text-muted-foreground">
            Vendors must accept these terms before bidding
          </span>
        </div>
      )}

      <DashboardModal
        uppy={uppy}
        open={showModal}
        onRequestClose={() => setShowModal(false)}
        proudlyDisplayPoweredByUppy={false}
        note="Upload PDF file containing Terms & Conditions (max 10MB)"
      />
    </div>
  );
}