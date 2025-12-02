import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Supported languages for OCR
const SUPPORTED_LANGUAGES = [
  'en', // English
  'hi', // Hindi
  'bn', // Bengali
  'ta', // Tamil
  'te', // Telugu
  'mr', // Marathi
  'gu', // Gujarati
  'kn', // Kannada
  'ml', // Malayalam
  'pa', // Punjabi
];

interface OCRRequest {
  imageBase64: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  options?: {
    language?: string[];
    documentTypeHint?: string;
    extractReminders?: boolean;
  };
}

interface ExtractedData {
  vendor: {
    name: string | null;
    address: string | null;
    phone: string | null;
    email: string | null;
    gstin: string | null;
    pan: string | null;
  };
  product: {
    name: string | null;
    model: string | null;
    serialNumber: string | null;
    category: string | null;
    quantity: number | null;
    unitPrice: number | null;
    totalPrice: number | null;
  };
  dates: {
    purchaseDate: string | null;
    warrantyExpiry: string | null;
    serviceInterval: string | null;
    nextServiceDue: string | null;
    invoiceDate: string | null;
  };
  amount: {
    subtotal: number | null;
    tax: number | null;
    total: number | null;
    currency: string;
  };
  custom: Array<{
    fieldName: string;
    value: string | null;
    confidence: number;
  }>;
}

// System prompt for structured extraction
const SYSTEM_PROMPT = `You are an expert OCR and document analysis system specialized in extracting structured information from invoices, bills, warranty cards, receipts, product manuals, and service documents.

Your task is to analyze the provided document image and extract information into a structured JSON format.

EXTRACTION RULES:
1. Extract all visible text accurately, handling multilingual content (English and Indian regional languages)
2. Identify and classify the document type
3. Extract key fields with high precision
4. Provide confidence scores (0-1) for extracted fields
5. Handle low-quality images, handwritten text, and skewed documents
6. Return null for fields that cannot be found or are unclear

DOCUMENT TYPES:
- invoice: Commercial invoices with line items
- bill: Utility bills, service bills
- warranty_card: Product warranty documents
- receipt: Purchase receipts
- product_manual: User manuals, guides
- service_document: Service records, maintenance logs
- unknown: Cannot determine type

OUTPUT FORMAT:
You MUST respond with ONLY a valid JSON object (no markdown, no explanation) with this exact structure:
{
  "documentType": "string",
  "documentTypeConfidence": number,
  "rawText": "string (all extracted text)",
  "extractedFields": {
    "vendor": {
      "name": "string or null",
      "address": "string or null",
      "phone": "string or null",
      "email": "string or null",
      "gstin": "string or null (Indian GST Number format: 22AAAAA0000A1Z5)",
      "pan": "string or null (PAN format: AAAAA0000A)"
    },
    "product": {
      "name": "string or null",
      "model": "string or null",
      "serialNumber": "string or null",
      "category": "string or null",
      "quantity": number or null,
      "unitPrice": number or null,
      "totalPrice": number or null
    },
    "dates": {
      "purchaseDate": "string or null (format: YYYY-MM-DD if possible)",
      "warrantyExpiry": "string or null",
      "serviceInterval": "string or null (e.g., '6 months', '10000 km')",
      "nextServiceDue": "string or null",
      "invoiceDate": "string or null"
    },
    "amount": {
      "subtotal": number or null,
      "tax": number or null,
      "total": number or null,
      "currency": "string (default: INR)"
    },
    "custom": [
      {
        "fieldName": "string",
        "value": "string",
        "confidence": number
      }
    ]
  },
  "confidence": number,
  "detectedLanguages": ["string"],
  "suggestedReminders": [
    {
      "type": "warranty_expiry | service_due | payment_due",
      "date": "string",
      "description": "string",
      "priority": "low | medium | high"
    }
  ],
  "errors": [
    {
      "code": "string",
      "message": "string",
      "field": "string or null",
      "severity": "warning | error"
    }
  ]
}`;

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const { imageBase64, fileName, fileType, fileSize, options } = await req.json() as OCRRequest;

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: { code: 'MISSING_IMAGE', message: 'No image data provided' } 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: { code: 'CONFIG_ERROR', message: 'OCR service not configured' } 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine mime type for the image
    let mimeType = 'image/jpeg';
    if (fileType.includes('png')) mimeType = 'image/png';
    else if (fileType.includes('webp')) mimeType = 'image/webp';
    else if (fileType.includes('gif')) mimeType = 'image/gif';

    console.log(`Processing OCR for file: ${fileName}, type: ${fileType}, size: ${fileSize}`);

    // Call Lovable AI with vision capabilities
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: SYSTEM_PROMPT
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analyze this document image and extract all structured information. Document hint: ${options?.documentTypeHint || 'auto-detect'}. Languages to consider: ${(options?.language || ['en', 'hi']).join(', ')}. Extract reminders: ${options?.extractReminders !== false}`
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageBase64.startsWith('data:') ? imageBase64 : `data:${mimeType};base64,${imageBase64}`
                }
              }
            ]
          }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: { code: 'RATE_LIMITED', message: 'Service is busy. Please try again in a moment.' } 
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: { code: 'QUOTA_EXCEEDED', message: 'OCR quota exceeded. Please contact support.' } 
          }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: { code: 'AI_ERROR', message: 'Failed to process document' } 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content;

    if (!aiContent) {
      console.error('No content in AI response');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: { code: 'EMPTY_RESPONSE', message: 'No extraction result returned' } 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse the JSON response
    let extractedData;
    try {
      // Clean the response (remove markdown code blocks if present)
      let cleanContent = aiContent.trim();
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.slice(7);
      } else if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.slice(3);
      }
      if (cleanContent.endsWith('```')) {
        cleanContent = cleanContent.slice(0, -3);
      }
      cleanContent = cleanContent.trim();
      
      extractedData = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError, 'Content:', aiContent);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: { code: 'PARSE_ERROR', message: 'Failed to parse extraction results' },
          rawContent: aiContent
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const processingDuration = Date.now() - startTime;

    // Build the final OCR result
    const ocrResult = {
      id: crypto.randomUUID(),
      status: 'completed',
      documentType: extractedData.documentType || 'unknown',
      extractedFields: extractedData.extractedFields || {
        vendor: { name: null, address: null, phone: null, email: null, gstin: null, pan: null },
        product: { name: null, model: null, serialNumber: null, category: null, quantity: null, unitPrice: null, totalPrice: null },
        dates: { purchaseDate: null, warrantyExpiry: null, serviceInterval: null, nextServiceDue: null, invoiceDate: null },
        amount: { subtotal: null, tax: null, total: null, currency: 'INR' },
        custom: []
      },
      rawText: extractedData.rawText || '',
      confidence: extractedData.confidence || 0.5,
      metadata: {
        fileName,
        fileType,
        fileSize,
        pageCount: 1,
        processedAt: new Date().toISOString(),
        processingDuration,
        ocrEngine: 'lovable-ai-vision',
        language: extractedData.detectedLanguages || ['en'],
        imageQuality: 'medium',
        preprocessingApplied: ['ai-enhancement']
      },
      errors: extractedData.errors || [],
      reminderData: options?.extractReminders !== false ? {
        suggestedReminders: extractedData.suggestedReminders || []
      } : undefined
    };

    console.log(`OCR completed in ${processingDuration}ms, confidence: ${ocrResult.confidence}`);

    return new Response(
      JSON.stringify({ success: true, data: ocrResult }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('OCR processing error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: { 
          code: 'PROCESSING_ERROR', 
          message: error instanceof Error ? error.message : 'Unknown error occurred' 
        } 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
