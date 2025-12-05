import React, { useCallback, useState } from 'react';
import { Upload, FileText, Image, X, AlertCircle, Camera } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { UploadedFile } from '@/types/ocr';

interface FileUploadZoneProps {
  onFilesAdded: (files: File[]) => void;
  uploadedFiles: UploadedFile[];
  onRemoveFile: (id: string) => void;
  maxFiles?: number;
  maxFileSize?: number;
  disabled?: boolean;
}

const ACCEPTED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
];

const ACCEPTED_EXTENSIONS = '.jpg,.jpeg,.png,.webp,.gif,.pdf';

export const FileUploadZone: React.FC<FileUploadZoneProps> = ({
  onFilesAdded,
  uploadedFiles,
  onRemoveFile,
  maxFiles = 10,
  maxFileSize = 20,
  disabled = false,
}) => {
  const [isDragActive, setIsDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateFiles = (files: File[]): File[] => {
    const validFiles: File[] = [];
    const errors: string[] = [];

    for (const file of files) {
      if (!ACCEPTED_TYPES.includes(file.type) && !file.name.endsWith('.pdf')) {
        errors.push(`${file.name}: Unsupported file type`);
        continue;
      }

      if (file.size > maxFileSize * 1024 * 1024) {
        errors.push(`${file.name}: File exceeds ${maxFileSize}MB limit`);
        continue;
      }

      validFiles.push(file);
    }

    if (uploadedFiles.length + validFiles.length > maxFiles) {
      const remaining = maxFiles - uploadedFiles.length;
      if (remaining > 0) {
        errors.push(`Only ${remaining} more file(s) can be uploaded`);
        validFiles.splice(remaining);
      } else {
        errors.push(`Maximum ${maxFiles} files allowed`);
        validFiles.length = 0;
      }
    }

    if (errors.length > 0) {
      setError(errors.join('. '));
      setTimeout(() => setError(null), 5000);
    }

    return validFiles;
  };

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragActive(false);

      if (disabled) return;

      const files = Array.from(e.dataTransfer.files);
      const validFiles = validateFiles(files);
      if (validFiles.length > 0) {
        onFilesAdded(validFiles);
      }
    },
    [disabled, onFilesAdded, uploadedFiles.length, maxFiles, maxFileSize]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      if (!disabled) {
        setIsDragActive(true);
      }
    },
    [disabled]
  );

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragActive(false);
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (disabled || !e.target.files) return;

      const files = Array.from(e.target.files);
      const validFiles = validateFiles(files);
      if (validFiles.length > 0) {
        onFilesAdded(validFiles);
      }
      e.target.value = '';
    },
    [disabled, onFilesAdded, uploadedFiles.length, maxFiles, maxFileSize]
  );

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) {
      return <Image className="h-5 w-5 text-muted-foreground" />;
    }
    return <FileText className="h-5 w-5 text-muted-foreground" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-3">
      {/* Drop Zone - Compact for mobile */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          'relative rounded-xl border-2 border-dashed transition-all p-6',
          isDragActive ? 'border-primary bg-primary/5' : 'border-border',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <input
          type="file"
          id="file-upload"
          multiple
          accept={ACCEPTED_EXTENSIONS}
          onChange={handleFileInput}
          className="hidden"
          disabled={disabled}
        />
        
        <input
          type="file"
          id="camera-upload"
          accept="image/*"
          capture="environment"
          onChange={handleFileInput}
          className="hidden"
          disabled={disabled}
        />

        <label
          htmlFor="file-upload"
          className={cn('block text-center', !disabled && 'cursor-pointer')}
        >
          <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm font-medium text-foreground mb-1">
            Tap to upload
          </p>
          <p className="text-xs text-muted-foreground">
            JPG, PNG, PDF • Max {maxFileSize}MB
          </p>
        </label>
      </div>

      {/* Camera Button */}
      <Button
        variant="outline"
        className="w-full h-12"
        onClick={() => document.getElementById('camera-upload')?.click()}
        disabled={disabled}
      >
        <Camera className="h-4 w-4 mr-2" />
        Take Photo
      </Button>

      {/* Error Message */}
      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Uploaded Files List - Compact */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          {uploadedFiles.map((file) => (
            <div
              key={file.id}
              className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border"
            >
              {file.preview ? (
                <img
                  src={file.preview}
                  alt={file.file.name}
                  className="h-10 w-10 rounded object-cover flex-shrink-0"
                />
              ) : (
                <div className="h-10 w-10 rounded bg-muted flex items-center justify-center flex-shrink-0">
                  {getFileIcon(file.file.type)}
                </div>
              )}

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {file.file.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(file.file.size)}
                </p>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {file.status === 'pending' && (
                  <button
                    onClick={() => onRemoveFile(file.id)}
                    className="p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}

                {(file.status === 'preprocessing' || file.status === 'extracting' || file.status === 'parsing') && (
                  <div className="pulse-dot text-primary" />
                )}

                {file.status === 'completed' && (
                  <span className="text-xs text-success font-medium">Done</span>
                )}

                {file.status === 'failed' && (
                  <span className="text-xs text-destructive font-medium">Failed</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
