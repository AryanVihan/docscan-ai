/**
 * Entity Extraction Layer
 * Combines rule-based patterns with structured extraction
 * for extracting key fields from OCR text
 */

import type { 
  VendorDetails, 
  ProductDetails, 
  DateDetails, 
  DocumentType,
  ExtractedField 
} from '@/types/ocr';

// Common date formats in India and internationally
const DATE_PATTERNS = [
  // DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY
  /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/g,
  // YYYY-MM-DD (ISO format)
  /(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/g,
  // Month DD, YYYY
  /(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})/gi,
  // DD Month YYYY
  /(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/gi,
];

// Indian phone number patterns
const PHONE_PATTERNS = [
  /(?:\+91[\-\s]?)?[6-9]\d{9}/g,
  /(?:0\d{2,4}[\-\s]?)?\d{6,8}/g,
];

// Email pattern
const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

// Indian GST Number pattern
const GSTIN_PATTERN = /\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}/g;

// PAN Number pattern
const PAN_PATTERN = /[A-Z]{5}\d{4}[A-Z]{1}/g;

// Currency patterns
const CURRENCY_PATTERNS = [
  /(?:Rs\.?|INR|₹)\s*[\d,]+(?:\.\d{2})?/gi,
  /(?:\$|USD)\s*[\d,]+(?:\.\d{2})?/gi,
  /(?:€|EUR)\s*[\d,]+(?:\.\d{2})?/gi,
];

// Serial/Model number patterns
const SERIAL_PATTERNS = [
  /(?:serial\s*(?:no\.?|number)?|s\/n|sn)\s*[:.]?\s*([A-Z0-9\-]+)/gi,
  /(?:model\s*(?:no\.?|number)?|m\/n)\s*[:.]?\s*([A-Z0-9\-]+)/gi,
  /(?:imei)\s*[:.]?\s*(\d{15})/gi,
];

// Warranty keywords
const WARRANTY_KEYWORDS = [
  'warranty', 'guarantee', 'valid until', 'expires', 'expiry',
  'coverage', 'protection plan', 'extended warranty'
];

// Service keywords
const SERVICE_KEYWORDS = [
  'service', 'maintenance', 'next service', 'service due',
  'service interval', 'annual service', 'periodic'
];

/**
 * Extract all dates from text
 */
export const extractDates = (text: string): string[] => {
  const dates: string[] = [];
  
  DATE_PATTERNS.forEach(pattern => {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      dates.push(match[0]);
    }
  });
  
  return [...new Set(dates)];
};

/**
 * Extract phone numbers
 */
export const extractPhoneNumbers = (text: string): string[] => {
  const phones: string[] = [];
  
  PHONE_PATTERNS.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) phones.push(...matches);
  });
  
  return [...new Set(phones.map(p => p.replace(/[\s\-]/g, '')))];
};

/**
 * Extract email addresses
 */
export const extractEmails = (text: string): string[] => {
  const matches = text.match(EMAIL_PATTERN);
  return matches ? [...new Set(matches.map(e => e.toLowerCase()))] : [];
};

/**
 * Extract GSTIN
 */
export const extractGSTIN = (text: string): string | null => {
  const match = text.match(GSTIN_PATTERN);
  return match ? match[0] : null;
};

/**
 * Extract PAN
 */
export const extractPAN = (text: string): string | null => {
  const match = text.match(PAN_PATTERN);
  return match ? match[0] : null;
};

/**
 * Extract monetary amounts
 */
export const extractAmounts = (text: string): Array<{ value: number; currency: string; raw: string }> => {
  const amounts: Array<{ value: number; currency: string; raw: string }> = [];
  
  CURRENCY_PATTERNS.forEach(pattern => {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      const raw = match[0];
      const numericStr = raw.replace(/[^0-9.]/g, '');
      const value = parseFloat(numericStr);
      
      let currency = 'INR';
      if (raw.includes('$') || raw.includes('USD')) currency = 'USD';
      else if (raw.includes('€') || raw.includes('EUR')) currency = 'EUR';
      
      if (!isNaN(value)) {
        amounts.push({ value, currency, raw });
      }
    }
  });
  
  return amounts;
};

/**
 * Extract serial/model numbers
 */
export const extractSerialNumbers = (text: string): Array<{ type: string; value: string }> => {
  const serials: Array<{ type: string; value: string }> = [];
  
  SERIAL_PATTERNS.forEach((pattern, idx) => {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      const types = ['serial', 'model', 'imei'];
      serials.push({
        type: types[idx] || 'serial',
        value: match[1]
      });
    }
  });
  
  return serials;
};

/**
 * Detect document type based on content
 */
export const detectDocumentType = (text: string): { type: DocumentType; confidence: number } => {
  const textLower = text.toLowerCase();
  
  const typeScores: Record<DocumentType, number> = {
    invoice: 0,
    bill: 0,
    warranty_card: 0,
    receipt: 0,
    product_manual: 0,
    service_document: 0,
    unknown: 0,
  };
  
  // Invoice indicators
  if (textLower.includes('invoice')) typeScores.invoice += 3;
  if (textLower.includes('invoice no')) typeScores.invoice += 2;
  if (textLower.includes('bill to') || textLower.includes('ship to')) typeScores.invoice += 2;
  if (textLower.includes('gstin') || textLower.includes('gst')) typeScores.invoice += 1;
  
  // Bill indicators
  if (textLower.includes('electricity bill') || textLower.includes('water bill')) typeScores.bill += 3;
  if (textLower.includes('consumer no') || textLower.includes('account no')) typeScores.bill += 2;
  if (textLower.includes('due date') || textLower.includes('payment due')) typeScores.bill += 1;
  
  // Warranty card indicators
  WARRANTY_KEYWORDS.forEach(kw => {
    if (textLower.includes(kw)) typeScores.warranty_card += 2;
  });
  if (textLower.includes('terms and conditions')) typeScores.warranty_card += 1;
  
  // Receipt indicators
  if (textLower.includes('receipt')) typeScores.receipt += 3;
  if (textLower.includes('thank you') && textLower.includes('visit')) typeScores.receipt += 2;
  if (textLower.includes('cash') || textLower.includes('card')) typeScores.receipt += 1;
  
  // Product manual indicators
  if (textLower.includes('user manual') || textLower.includes('user guide')) typeScores.product_manual += 3;
  if (textLower.includes('instructions') || textLower.includes('how to')) typeScores.product_manual += 2;
  if (textLower.includes('safety') || textLower.includes('caution')) typeScores.product_manual += 1;
  
  // Service document indicators
  SERVICE_KEYWORDS.forEach(kw => {
    if (textLower.includes(kw)) typeScores.service_document += 2;
  });
  if (textLower.includes('technician') || textLower.includes('engineer')) typeScores.service_document += 1;
  
  // Find highest scoring type
  let maxScore = 0;
  let detectedType: DocumentType = 'unknown';
  
  Object.entries(typeScores).forEach(([type, score]) => {
    if (score > maxScore && type !== 'unknown') {
      maxScore = score;
      detectedType = type as DocumentType;
    }
  });
  
  // Calculate confidence
  const totalScore = Object.values(typeScores).reduce((a, b) => a + b, 0);
  const confidence = totalScore > 0 ? Math.min(0.95, maxScore / totalScore + 0.3) : 0.1;
  
  return { type: detectedType, confidence };
};

/**
 * Extract vendor details
 */
export const extractVendorDetails = (text: string): VendorDetails => {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const emails = extractEmails(text);
  const phones = extractPhoneNumbers(text);
  
  // First few lines often contain vendor name
  let name: string | null = null;
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const line = lines[i];
    // Skip lines that look like addresses or contain common keywords
    if (line.length > 5 && line.length < 100 && 
        !line.match(/\d{5,}/) && 
        !line.toLowerCase().includes('invoice') &&
        !line.toLowerCase().includes('receipt')) {
      name = line;
      break;
    }
  }
  
  // Extract address (look for patterns with PIN code)
  let address: string | null = null;
  const addressMatch = text.match(/[\w\s,]+(?:road|street|lane|nagar|colony|sector)[\w\s,]+\d{6}/gi);
  if (addressMatch) {
    address = addressMatch[0];
  }
  
  return {
    name,
    address,
    phone: phones[0] || null,
    email: emails[0] || null,
    gstin: extractGSTIN(text),
    pan: extractPAN(text),
  };
};

/**
 * Extract product details
 */
export const extractProductDetails = (text: string): ProductDetails => {
  const serials = extractSerialNumbers(text);
  const amounts = extractAmounts(text);
  
  // Find model and serial
  const modelEntry = serials.find(s => s.type === 'model');
  const serialEntry = serials.find(s => s.type === 'serial' || s.type === 'imei');
  
  // Try to extract product name (look for common patterns)
  let productName: string | null = null;
  const productPatterns = [
    /(?:product|item|description)\s*[:.]?\s*([^\n]+)/i,
    /(?:name)\s*[:.]?\s*([^\n]+)/i,
  ];
  
  for (const pattern of productPatterns) {
    const match = text.match(pattern);
    if (match) {
      productName = match[1].trim();
      break;
    }
  }
  
  // Get total price (usually the largest amount)
  const sortedAmounts = [...amounts].sort((a, b) => b.value - a.value);
  const totalPrice = sortedAmounts[0]?.value || null;
  
  return {
    name: productName,
    model: modelEntry?.value || null,
    serialNumber: serialEntry?.value || null,
    category: null,
    quantity: 1,
    unitPrice: null,
    totalPrice,
  };
};

/**
 * Extract date-related details
 */
export const extractDateDetails = (text: string): DateDetails => {
  const textLower = text.toLowerCase();
  const allDates = extractDates(text);
  
  let purchaseDate: string | null = null;
  let warrantyExpiry: string | null = null;
  let serviceInterval: string | null = null;
  let nextServiceDue: string | null = null;
  let invoiceDate: string | null = null;
  
  // Try to associate dates with their context
  const lines = text.split('\n');
  
  lines.forEach(line => {
    const lineLower = line.toLowerCase();
    const dates = extractDates(line);
    
    if (dates.length > 0) {
      const date = dates[0];
      
      if (lineLower.includes('purchase') || lineLower.includes('bought')) {
        purchaseDate = date;
      } else if (lineLower.includes('warranty') && (lineLower.includes('expir') || lineLower.includes('until') || lineLower.includes('valid'))) {
        warrantyExpiry = date;
      } else if (lineLower.includes('next service') || lineLower.includes('service due')) {
        nextServiceDue = date;
      } else if (lineLower.includes('invoice date') || lineLower.includes('date of invoice')) {
        invoiceDate = date;
      }
    }
    
    // Look for service interval patterns
    const intervalMatch = line.match(/(\d+)\s*(month|year|km|mile)/i);
    if (intervalMatch && SERVICE_KEYWORDS.some(kw => lineLower.includes(kw))) {
      serviceInterval = `${intervalMatch[1]} ${intervalMatch[2]}`;
    }
  });
  
  // If no specific purchase date found, use invoice date or first date
  if (!purchaseDate) {
    purchaseDate = invoiceDate || allDates[0] || null;
  }
  
  return {
    purchaseDate,
    warrantyExpiry,
    serviceInterval,
    nextServiceDue,
    invoiceDate,
  };
};

/**
 * Generate reminder suggestions based on extracted data
 */
export const generateReminderSuggestions = (
  dates: DateDetails,
  documentType: DocumentType
): Array<{
  type: 'warranty_expiry' | 'service_due' | 'payment_due';
  date: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
}> => {
  const reminders: Array<{
    type: 'warranty_expiry' | 'service_due' | 'payment_due';
    date: string;
    description: string;
    priority: 'low' | 'medium' | 'high';
  }> = [];
  
  if (dates.warrantyExpiry) {
    reminders.push({
      type: 'warranty_expiry',
      date: dates.warrantyExpiry,
      description: 'Warranty is about to expire. Consider extending warranty or making claims.',
      priority: 'high',
    });
  }
  
  if (dates.nextServiceDue) {
    reminders.push({
      type: 'service_due',
      date: dates.nextServiceDue,
      description: 'Scheduled service is due. Book an appointment.',
      priority: 'medium',
    });
  }
  
  if (documentType === 'bill' && dates.invoiceDate) {
    reminders.push({
      type: 'payment_due',
      date: dates.invoiceDate,
      description: 'Bill payment is due.',
      priority: 'high',
    });
  }
  
  return reminders;
};

/**
 * Calculate overall confidence score
 */
export const calculateConfidence = (
  vendor: VendorDetails,
  product: ProductDetails,
  dates: DateDetails
): number => {
  let filledFields = 0;
  let totalFields = 0;
  
  // Count vendor fields
  Object.values(vendor).forEach(v => {
    totalFields++;
    if (v) filledFields++;
  });
  
  // Count product fields
  Object.values(product).forEach(v => {
    totalFields++;
    if (v) filledFields++;
  });
  
  // Count date fields
  Object.values(dates).forEach(v => {
    totalFields++;
    if (v) filledFields++;
  });
  
  return totalFields > 0 ? filledFields / totalFields : 0;
};
