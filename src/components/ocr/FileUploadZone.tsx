import React, { useCallback, useState } from 'react';
import { Upload, FileText, Image, X, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UploadedFile } from '@/types/ocr';

interface FileUploadZoneProps {
  onFilesAdded: (files: File[]) => void;
  uploadedFiles: UploadedFile[];
  onRemoveFile: (id: string) => void;
  maxFiles?: number;
  maxFileSize?: number; // in MB
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
      return <Image className="h-8 w-8 text-primary" />;
    }
    return <FileText className="h-8 w-8 text-primary" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          'dropzone cursor-pointer',
          isDragActive && 'dropzone-active',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <input
          type="file"
          multiple
          accept={ACCEPTED_EXTENSIONS}
          onChange={handleFileInput}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={disabled}
        />

        <div className="flex flex-col items-center gap-4 pointer-events-none">
          <div className={cn(
            'p-4 rounded-full transition-colors duration-300',
            isDragActive ? 'bg-primary/20' : 'bg-secondary'
          )}>
            <Upload className={cn(
              'h-8 w-8 transition-colors duration-300',
              isDragActive ? 'text-primary' : 'text-muted-foreground'
            )} />
          </div>

          <div className="text-center">
            <p className="text-base font-medium text-foreground">
              {isDragActive ? 'Drop files here' : 'Drag & drop documents'}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              or click to browse
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-2 text-xs text-muted-foreground">
            <span className="px-2 py-1 rounded-md bg-secondary">JPG</span>
            <span className="px-2 py-1 rounded-md bg-secondary">PNG</span>
            <span className="px-2 py-1 rounded-md bg-secondary">PDF</span>
            <span className="px-2 py-1 rounded-md bg-secondary">WebP</span>
          </div>

          <p className="text-xs text-muted-foreground">
            Max {maxFileSize}MB per file • Up to {maxFiles} files
          </p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm animate-fade-up">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Uploaded Files List */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">
            Uploaded Files ({uploadedFiles.length}/{maxFiles})
          </p>
          <div className="grid gap-2">
            {uploadedFiles.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border group hover:border-primary/30 transition-colors"
              >
                {file.preview ? (
                  <img
                    src={file.preview}
                    alt={file.file.name}
                    className="h-10 w-10 rounded object-cover"
                  />
                ) : (
                  getFileIcon(file.file.type)
                )}

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {file.file.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(file.file.size)}
                  </p>
                </div>

                {file.status === 'pending' && (
                  <button
                    onClick={() => onRemoveFile(file.id)}
                    className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}

                {file.status === 'extracting' && (
                  <div className="flex items-center gap-2">
                    <div className="pulse-dot text-primary" />
                    <span className="text-xs text-primary">Processing</span>
                  </div>
                )}

                {file.status === 'completed' && (
                  <span className="status-badge status-success">
                    Extracted
                  </span>
                )}

                {file.status === 'failed' && (
                  <span className="status-badge status-error">
                    Failed
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
