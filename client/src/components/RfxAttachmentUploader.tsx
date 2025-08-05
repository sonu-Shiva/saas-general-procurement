
import { useState, useCallback } from "react";
import type { ReactNode } from "react";
import Uppy from "@uppy/core";
import { DashboardModal } from "@uppy/react";
import "@uppy/core/dist/style.min.css";
import "@uppy/dashboard/dist/style.min.css";
import AwsS3 from "@uppy/aws-s3";
import type { UploadResult } from "@uppy/core";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { 
  FileText, 
  Upload, 
  X, 
  Download,
  Eye,
  Paperclip
} from "lucide-react";

interface AttachmentInfo {
  fileName: string;
  filePath: string;
  fileSize: number;
  uploadDate: string;
  fileType: string;
}

interface RfxAttachmentUploaderProps {
  maxNumberOfFiles?: number;
  maxFileSize?: number;
  attachments?: AttachmentInfo[];
  onAttachmentsChange?: (attachments: AttachmentInfo[]) => void;
  onGetUploadParameters: (fileName: string) => Promise<{
    method: "PUT";
    url: string;
    filePath: string;
  }>;
  buttonClassName?: string;
  children?: ReactNode;
  disabled?: boolean;
  rfxId?: string;
}

// Allowed file types for RFx attachments
const ALLOWED_FILE_TYPES = [
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.txt', '.csv', '.jpg', '.jpeg', '.png', '.gif', '.bmp',
  '.zip', '.rar'
];

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/bmp',
  'application/zip',
  'application/x-rar-compressed'
];

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getFileIcon(fileType: string) {
  if (fileType.includes('image/')) return '🖼️';
  if (fileType.includes('pdf')) return '📄';
  if (fileType.includes('word') || fileType.includes('document')) return '📝';
  if (fileType.includes('excel') || fileType.includes('sheet')) return '📊';
  if (fileType.includes('powerpoint') || fileType.includes('presentation')) return '📋';
  if (fileType.includes('zip') || fileType.includes('rar')) return '🗜️';
  return '📎';
}

export function RfxAttachmentUploader({
  maxNumberOfFiles = 10,
  maxFileSize = 26214400, // 25MB default
  attachments = [],
  onAttachmentsChange,
  onGetUploadParameters,
  buttonClassName,
  children,
  disabled = false,
  rfxId
}: RfxAttachmentUploaderProps) {
  const [showModal, setShowModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const handleUploadParameters = useCallback(async (file: any) => {
    try {
      const result = await onGetUploadParameters(file.name);
      return {
        method: result.method,
        url: result.url,
        headers: {}
      };
    } catch (error) {
      console.error('Error getting upload parameters:', error);
      throw error;
    }
  }, [onGetUploadParameters]);

  const [uppy] = useState(() =>
    new Uppy({
      restrictions: {
        maxNumberOfFiles,
        maxFileSize,
        allowedFileTypes: ALLOWED_FILE_TYPES
      },
      autoProceed: false,
    })
      .use(AwsS3, {
        shouldUseMultipart: false,
        getUploadParameters: handleUploadParameters,
      })
      .on('upload', () => {
        setIsUploading(true);
      })
      .on('complete', (result) => {
        setIsUploading(false);
        
        if (result.successful && result.successful.length > 0) {
          const newAttachments: AttachmentInfo[] = result.successful.map((file: any) => ({
            fileName: file.name,
            filePath: file.response?.uploadURL?.split('?')[0] || '',
            fileSize: file.size,
            uploadDate: new Date().toISOString(),
            fileType: file.type
          }));

          const updatedAttachments = [...attachments, ...newAttachments];
          onAttachmentsChange?.(updatedAttachments);
          
          toast({
            title: "Files uploaded successfully",
            description: `${result.successful.length} file(s) uploaded`,
          });
        }

        if (result.failed && result.failed.length > 0) {
          toast({
            variant: "destructive",
            title: "Some files failed to upload",
            description: `${result.failed.length} file(s) failed. Please try again.`,
          });
        }

        setShowModal(false);
      })
      .on('file-added', (file) => {
        // Validate file type
        if (!ALLOWED_MIME_TYPES.includes(file.type)) {
          uppy.removeFile(file.id);
          toast({
            variant: "destructive",
            title: "Invalid file type",
            description: `${file.name} is not an allowed file type. Please upload PDF, Office documents, images, or archives.`,
          });
          return false;
        }

        // Check if file already exists
        const fileExists = attachments.some(att => att.fileName === file.name);
        if (fileExists) {
          uppy.removeFile(file.id);
          toast({
            variant: "destructive",
            title: "Duplicate file",
            description: `${file.name} has already been uploaded.`,
          });
          return false;
        }

        // Check total file limit
        if (attachments.length >= maxNumberOfFiles) {
          uppy.removeFile(file.id);
          toast({
            variant: "destructive",
            title: "File limit exceeded",
            description: `Maximum ${maxNumberOfFiles} files allowed.`,
          });
          return false;
        }
      })
      .on('restriction-failed', (file, error) => {
        toast({
          variant: "destructive",
          title: "File restriction failed",
          description: error.message,
        });
      })
  );

  const removeAttachment = (filePath: string) => {
    const updatedAttachments = attachments.filter(att => att.filePath !== filePath);
    onAttachmentsChange?.(updatedAttachments);
    
    toast({
      title: "File removed",
      description: "Attachment has been removed from the response.",
    });
  };

  const handlePreview = (attachment: AttachmentInfo) => {
    if (attachment.fileType.includes('image/')) {
      window.open(attachment.filePath, '_blank');
    } else {
      // For non-image files, trigger download
      const link = document.createElement('a');
      link.href = attachment.filePath;
      link.download = attachment.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const hasAttachments = attachments.length > 0;
  const remainingSlots = maxNumberOfFiles - attachments.length;

  return (
    <div className="space-y-4">
      {/* Upload Button */}
      <div className="flex items-center justify-between">
        <Button 
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowModal(true);
          }} 
          className={buttonClassName}
          variant={hasAttachments ? "outline" : "default"}
          disabled={disabled || isUploading || remainingSlots <= 0}
        >
          {children || (
            <div className="flex items-center gap-2">
              {isUploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <span>Uploading...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>
                    {hasAttachments ? "Add More Files" : "Upload Attachments"}
                  </span>
                </>
              )}
            </div>
          )}
        </Button>

        {hasAttachments && (
          <Badge variant="secondary" className="text-xs">
            <Paperclip className="w-3 h-3 mr-1" />
            {attachments.length} file{attachments.length !== 1 ? 's' : ''} attached
          </Badge>
        )}
      </div>

      {/* File Limit Info */}
      <div className="text-xs text-muted-foreground">
        {remainingSlots > 0 ? (
          <>You can upload {remainingSlots} more file{remainingSlots !== 1 ? 's' : ''} (max {formatFileSize(maxFileSize)} each)</>
        ) : (
          <>Maximum file limit reached ({maxNumberOfFiles} files)</>
        )}
      </div>

      {/* Attachments List */}
      {hasAttachments && (
        <Card>
          <CardContent className="p-4">
            <h4 className="text-sm font-medium mb-3">Attached Files</h4>
            <div className="space-y-2">
              {attachments.map((attachment, index) => (
                <div key={index} className="flex items-center justify-between p-2 border rounded-lg hover:bg-muted/50">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="text-lg flex-shrink-0">
                      {getFileIcon(attachment.fileType)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {attachment.fileName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(attachment.fileSize)} • {new Date(attachment.uploadDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handlePreview(attachment)}
                      className="h-8 w-8 p-0"
                      title={attachment.fileType.includes('image/') ? "Preview" : "Download"}
                    >
                      {attachment.fileType.includes('image/') ? (
                        <Eye className="w-3 h-3" />
                      ) : (
                        <Download className="w-3 h-3" />
                      )}
                    </Button>
                    
                    {!disabled && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAttachment(attachment.filePath)}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        title="Remove file"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload Modal */}
      <DashboardModal
        uppy={uppy}
        open={showModal}
        onRequestClose={() => setShowModal(false)}
        proudlyDisplayPoweredByUppy={false}
        note={`Upload business documents (PDF, Office files, images, archives). Max ${maxNumberOfFiles} files, ${formatFileSize(maxFileSize)} each.`}
      />
    </div>
  );
}
