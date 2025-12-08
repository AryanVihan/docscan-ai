// OCR Module Type Definitions

export type DocumentType = 
  | 'invoice'
  | 'bill'
  | 'warranty_card'
  | 'receipt'
  | 'product_manual'
  | 'service_document'
  | 'unknown';

export type ProcessingStatus = 
  | 'pending'
  | 'preprocessing'
  | 'extracting'
  | 'parsing'
  | 'completed'
  | 'failed';

export interface ExtractedField {
  fieldName: string;
  value: string | null;
  confidence: number; // 0-1
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  rawText?: string;
}

export interface VendorDetails {
  name: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  gstin?: string | null; // Indian GST Number
  pan?: string | null;
}

export interface ProductDetails {
  name: string | null;
  model: string | null;
  serialNumber: string | null;
  category?: string | null;
  quantity?: number | null;
  unitPrice?: number | null;
  totalPrice?: number | null;
}

export interface DateDetails {
  purchaseDate: string | null;
  warrantyExpiry: string | null;
  serviceInterval?: string | null;
  nextServiceDue?: string | null;
  invoiceDate?: string | null;
}

export interface OCRMetadata {
  fileName: string;
  fileType: string;
  fileSize: number;
  pageCount: number;
  processedAt: string;
  processingDuration: number; // milliseconds
  ocrEngine: string;
  language: string[];
  imageQuality: 'low' | 'medium' | 'high';
  preprocessingApplied: string[];
}

export interface OCRError {
  code: string;
  message: string;
  field?: string;
  severity: 'warning' | 'error';
}

export interface OCRResult {
  id: string;
  status: ProcessingStatus;
  documentType: DocumentType;
  
  // Extracted structured data
  extractedFields: {
    vendor: VendorDetails;
    product: ProductDetails;
    dates: DateDetails;
    amount?: {
      subtotal: number | null;
      tax: number | null;
      total: number | null;
      currency: string;
    };
    custom: ExtractedField[];
  };
  
  // Raw OCR output
  rawText: string;
  confidence: number; // Overall confidence score
  
  // Metadata
  metadata: OCRMetadata;
  
  // Errors and warnings
  errors: OCRError[];
  
  // For reminder automation integration
  reminderData?: {
    suggestedReminders: Array<{
      type: 'warranty_expiry' | 'service_due' | 'payment_due' | 'subscription_renewal' | 'custom';
      date: string;
      title: string;
      description: string;
      priority: 'low' | 'medium' | 'high';
    }>;
  };
}

export interface BatchProcessingResult {
  batchId: string;
  totalFiles: number;
  processed: number;
  successful: number;
  failed: number;
  results: OCRResult[];
  startedAt: string;
  completedAt?: string;
  status: 'processing' | 'completed' | 'partial_failure';
}

export interface UploadedFile {
  id: string;
  file: File;
  preview?: string;
  status: ProcessingStatus;
  progress: number;
  result?: OCRResult;
  error?: string;
}

// API Request/Response types
export interface OCRRequest {
  files: File[];
  options?: {
    language?: string[];
    enhanceImage?: boolean;
    documentTypeHint?: DocumentType;
    extractReminders?: boolean;
  };
}

export interface OCRResponse {
  success: boolean;
  data?: OCRResult | BatchProcessingResult;
  error?: {
    code: string;
    message: string;
  };
}
