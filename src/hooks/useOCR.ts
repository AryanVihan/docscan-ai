import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { preprocessImage, analyzeImageQuality } from '@/lib/image-preprocessing';
import { useAuth } from '@/contexts/AuthContext';
import { useReminders } from '@/hooks/useReminders';
import type { 
  UploadedFile, 
  OCRResult, 
  ProcessingStatus,
  DocumentType 
} from '@/types/ocr';
import { toast } from '@/hooks/use-toast';

interface UseOCROptions {
  autoPreprocess?: boolean;
  enhanceContrast?: boolean;
  denoise?: boolean;
  extractReminders?: boolean;
  languages?: string[];
}

interface UseOCRReturn {
  files: UploadedFile[];
  results: OCRResult[];
  isProcessing: boolean;
  addFiles: (newFiles: File[]) => void;
  removeFile: (id: string) => void;
  processFiles: () => Promise<void>;
  processSingleFile: (file: UploadedFile) => Promise<OCRResult | null>;
  clearAll: () => void;
  exportResults: () => void;
}

export const useOCR = (options: UseOCROptions = {}): UseOCRReturn => {
  const {
    autoPreprocess = true,
    enhanceContrast = true,
    denoise = true,
    extractReminders = true,
    languages = ['en', 'hi'],
  } = options;

  const { user } = useAuth();
  const { createRemindersFromOCR } = useReminders();
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [results, setResults] = useState<OCRResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const generateId = () => crypto.randomUUID();

  const fileToBase64 = (file: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const addFiles = useCallback((newFiles: File[]) => {
    const uploadedFiles: UploadedFile[] = newFiles.map(file => ({
      id: generateId(),
      file,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
      status: 'pending' as ProcessingStatus,
      progress: 0,
    }));

    setFiles(prev => [...prev, ...uploadedFiles]);
  }, []);

  const removeFile = useCallback((id: string) => {
    setFiles(prev => {
      const file = prev.find(f => f.id === id);
      if (file?.preview) {
        URL.revokeObjectURL(file.preview);
      }
      return prev.filter(f => f.id !== id);
    });
  }, []);

  const updateFileStatus = (id: string, status: ProcessingStatus, progress?: number) => {
    setFiles(prev => prev.map(f => 
      f.id === id ? { ...f, status, progress: progress ?? f.progress } : f
    ));
  };

  const processSingleFile = useCallback(async (file: UploadedFile): Promise<OCRResult | null> => {
    try {
      updateFileStatus(file.id, 'preprocessing', 10);

      let processedBlob: Blob = file.file;

      // Preprocess image if it's an image file
      if (autoPreprocess && file.file.type.startsWith('image/')) {
        const quality = await analyzeImageQuality(file.file);
        console.log('Image quality analysis:', quality);

        const preprocessingOptions = {
          grayscale: false,
          enhanceContrast: enhanceContrast || quality.metrics.contrast < 0.5,
          denoise: denoise || quality.metrics.noise < 0.5,
          sharpen: quality.metrics.sharpness < 0.3,
          resize: { maxWidth: 2048, maxHeight: 2048 },
        };

        const preprocessed = await preprocessImage(file.file, preprocessingOptions);
        processedBlob = preprocessed.processedImage;
        console.log('Preprocessing applied:', preprocessed.appliedOperations);
      }

      updateFileStatus(file.id, 'extracting', 40);

      // Convert to base64
      const base64Data = await fileToBase64(processedBlob);

      // Call the OCR edge function
      const { data, error } = await supabase.functions.invoke('ocr-extract', {
        body: {
          imageBase64: base64Data,
          fileName: file.file.name,
          fileType: file.file.type,
          fileSize: file.file.size,
          userId: user?.id,
          options: {
            language: languages,
            extractReminders,
          },
        },
      });

      if (error) {
        console.error('OCR function error:', error);
        throw new Error(error.message || 'OCR extraction failed');
      }

      if (!data.success) {
        throw new Error(data.error?.message || 'OCR extraction failed');
      }

      updateFileStatus(file.id, 'parsing', 80);

      const result = data.data as OCRResult;
      
      // Auto-create reminders from OCR results
      if (user && result.reminderData?.suggestedReminders?.length > 0) {
        await createRemindersFromOCR(
          data.jobId || result.id,
          result.reminderData.suggestedReminders
        );
      }
      
      updateFileStatus(file.id, 'completed', 100);
      
      // Update file with result
      setFiles(prev => prev.map(f => 
        f.id === file.id ? { ...f, result, status: 'completed' as ProcessingStatus } : f
      ));

      return result;
    } catch (error) {
      console.error('Error processing file:', file.file.name, error);
      updateFileStatus(file.id, 'failed', 0);
      
      setFiles(prev => prev.map(f => 
        f.id === file.id ? { 
          ...f, 
          status: 'failed' as ProcessingStatus, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        } : f
      ));

      return null;
    }
  }, [autoPreprocess, enhanceContrast, denoise, languages, extractReminders, user, createRemindersFromOCR]);

  const processFiles = useCallback(async () => {
    const pendingFiles = files.filter(f => f.status === 'pending');
    
    if (pendingFiles.length === 0) {
      toast({
        title: 'No files to process',
        description: 'Please upload some files first.',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    const newResults: OCRResult[] = [];

    for (const file of pendingFiles) {
      const result = await processSingleFile(file);
      if (result) {
        newResults.push(result);
      }
    }

    setResults(prev => [...prev, ...newResults]);
    setIsProcessing(false);

    const successCount = newResults.length;
    const failedCount = pendingFiles.length - successCount;

    if (successCount > 0) {
      toast({
        title: 'Extraction complete',
        description: `Successfully processed ${successCount} file(s)${failedCount > 0 ? `, ${failedCount} failed` : ''}`,
      });
    } else {
      toast({
        title: 'Extraction failed',
        description: 'No files were processed successfully.',
        variant: 'destructive',
      });
    }
  }, [files, processSingleFile]);

  const clearAll = useCallback(() => {
    // Revoke object URLs
    files.forEach(file => {
      if (file.preview) {
        URL.revokeObjectURL(file.preview);
      }
    });
    
    setFiles([]);
    setResults([]);
  }, [files]);

  const exportResults = useCallback(() => {
    if (results.length === 0) {
      toast({
        title: 'No results to export',
        description: 'Process some files first.',
        variant: 'destructive',
      });
      return;
    }

    const exportData = {
      exportedAt: new Date().toISOString(),
      totalResults: results.length,
      results: results,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ocr-results-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: 'Export successful',
      description: `Exported ${results.length} result(s) to JSON.`,
    });
  }, [results]);

  return {
    files,
    results,
    isProcessing,
    addFiles,
    removeFile,
    processFiles,
    processSingleFile,
    clearAll,
    exportResults,
  };
};
