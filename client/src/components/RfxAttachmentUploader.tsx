import { useState, useCallback, ReactNode } from "react";
import { useToast } from "@/hooks/use-toast";
import { ObjectUploader } from "./ObjectUploader";
import { Button } from "@/components/ui/button";
import { Upload, FileText, X, AlertCircle } from "lucide-react";
import { nanoid } from "nanoid";

interface AttachmentInfo {
  id: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  fileType: string;
  uploadedAt: Date;
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
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const handleUploadParameters = useCallback(async (file: any) => {
    try {
      const result = await onGetUploadParameters(file.name);
      return {
        method: result.method,
        url: result.url,
        filePath: result.filePath // Ensure filePath is returned and used
      };
    } catch (error) {
      console.error('Error getting upload parameters:', error);
      throw error;
    }
  }, [onGetUploadParameters]);

  const validateFile = useCallback((file: File): string | null => {
    // Check file size
    if (file.size > maxFileSize) {
      return `File size exceeds ${formatFileSize(maxFileSize)} limit`;
    }

    // Check file type
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    const isValidType = ALLOWED_FILE_TYPES.includes(fileExtension) || 
                       ALLOWED_MIME_TYPES.includes(file.type);

    if (!isValidType) {
      return 'File type not supported. Please use PDF, DOC, XLS, images, or ZIP files.';
    }

    // Check if already at max files
    if (attachments.length >= maxNumberOfFiles) {
      return `Maximum ${maxNumberOfFiles} files allowed`;
    }

    // Check for duplicate file names
    if (attachments.some(att => att.fileName === file.name)) {
      return 'A file with this name already exists';
    }

    return null;
  }, [attachments, maxFileSize, maxNumberOfFiles]);

  const handleFileSelect = useCallback(async (files: FileList) => {
    const validFiles: File[] = [];
    const errors: string[] = [];

    Array.from(files).forEach(file => {
      const error = validateFile(file);
      if (error) {
        errors.push(`${file.name}: ${error}`);
      } else {
        validFiles.push(file);
      }
    });

    if (errors.length > 0) {
      toast({
        title: "File Validation Errors",
        description: errors.join('\n'),
        variant: "destructive",
      });
    }

    if (validFiles.length === 0) return;

    setIsUploading(true);

    try {
      const uploadPromises = validFiles.map(async (file) => {
        const attachmentId = nanoid();

        // Create attachment info before upload
        const attachmentInfo: AttachmentInfo = {
          id: attachmentId,
          fileName: file.name,
          filePath: '', // Will be set after upload
          fileSize: file.size,
          fileType: file.type,
          uploadedAt: new Date(),
        };

        try {
          const uploadParams = await handleUploadParameters(file);

          // Upload file
          const uploadResponse = await fetch(uploadParams.url, {
            method: uploadParams.method,
            body: file,
            headers: {
              'Content-Type': file.type,
              ...uploadParams.headers,
            },
          });

          if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text();
            console.error('Upload error response:', errorText);
            throw new Error(`Upload failed: ${uploadResponse.status} - ${errorText}`);
          }

          // Set the file path from upload parameters
          attachmentInfo.filePath = uploadParams.filePath;

          return attachmentInfo;
        } catch (error) {
          console.error(`Failed to upload ${file.name}:`, error);
          throw new Error(`Failed to upload ${file.name}`);
        }
      });

      const uploadedAttachments = await Promise.all(uploadPromises);
      const newAttachments = [...attachments, ...uploadedAttachments];

      onAttachmentsChange?.(newAttachments);

      toast({
        title: "Upload Successful",
        description: `${validFiles.length} file(s) uploaded successfully`,
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload files",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  }, [attachments, validateFile, handleUploadParameters, onAttachmentsChange, toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (disabled || isUploading) return;

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files);
    }
  }, [disabled, isUploading, handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files);
    }
    // Reset input value to allow selecting the same file again
    e.target.value = '';
  }, [handleFileSelect]);

  if (children) {
    return (
      <div 
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className={disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      >
        <input
          type="file"
          multiple
          accept={ALLOWED_FILE_TYPES.join(',')}
          onChange={handleFileInputChange}
          className="hidden"
          id={`rfx-file-upload-${rfxId}`}
          disabled={disabled || isUploading}
        />
        <label htmlFor={`rfx-file-upload-${rfxId}`} className="block">
          {children}
        </label>
        {isUploading && (
          <div className="mt-2 text-sm text-blue-600 flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span>Uploading files...</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div 
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          disabled || isUploading 
            ? 'border-gray-200 bg-gray-50 cursor-not-allowed' 
            : 'border-gray-300 hover:border-primary cursor-pointer'
        }`}
      >
        <input
          type="file"
          multiple
          accept={ALLOWED_FILE_TYPES.join(',')}
          onChange={handleFileInputChange}
          className="hidden"
          id={`rfx-file-upload-${rfxId}`}
          disabled={disabled || isUploading}
        />
        <label htmlFor={`rfx-file-upload-${rfxId}`} className="block cursor-pointer">
          <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-600 font-medium">
            {isUploading ? 'Uploading...' : 'Click to upload files or drag and drop'}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            PDF, DOC, XLS, Images, ZIP (Max {formatFileSize(maxFileSize)} each)
          </p>
          <p className="text-xs text-gray-400">
            {attachments.length}/{maxNumberOfFiles} files
          </p>
        </label>
      </div>

      {isUploading && (
        <div className="flex items-center justify-center space-x-2 text-blue-600">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span className="text-sm">Processing uploads...</span>
        </div>
      )}
    </div>
  );
}