import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

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
  userId?: string;
  options?: {
    language?: string[];
    documentTypeHint?: string;
    extractReminders?: boolean;
  };
}

// System prompt for structured extraction - PRIORITIZES DATES AND REMINDERS
const SYSTEM_PROMPT = `You are an expert OCR and document analysis system specialized in extracting structured information from invoices, bills, warranty cards, receipts, product manuals, and service documents.

**CRITICAL PRIORITY**: Your PRIMARY goal is to find and extract ALL DATE-RELATED INFORMATION, especially:
- Warranty expiry dates
- Service due dates / Next service dates
- Subscription renewal dates
- Payment due dates
- Insurance expiry dates
- Product expiry dates
- License/registration renewal dates

EXTRACTION RULES:
1. **DATES ARE TOP PRIORITY** - Extract ALL visible dates, especially expiry and service dates
2. Extract all visible text accurately, handling multilingual content (English and Indian regional languages)
3. Identify and classify the document type
4. Extract key fields with high precision
5. Provide confidence scores (0-1) for extracted fields
6. Handle low-quality images, handwritten text, and skewed documents
7. Return null for fields that cannot be found or are unclear
8. **ALWAYS suggest reminders** for any date found that represents a deadline or expiry

DOCUMENT TYPES:
- invoice: Commercial invoices with line items
- bill: Utility bills, service bills
- warranty_card: Product warranty documents
- receipt: Purchase receipts
- product_manual: User manuals, guides
- service_document: Service records, maintenance logs
- insurance: Insurance policies
- subscription: Subscription receipts/confirmations
- unknown: Cannot determine type

DATE EXTRACTION PRIORITIES (look for these keywords):
- "Valid till", "Expires on", "Expiry date", "Expiry", "Valid until"
- "Next service", "Service due", "Due date", "Renewal date"
- "Warranty period", "Warranty valid", "Guarantee period"
- "Premium due", "Payment due", "Installment date"
- Look for patterns like: DD/MM/YYYY, DD-MM-YYYY, Month DD, YYYY, etc.

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
      "purchaseDate": "string or null (format: YYYY-MM-DD)",
      "warrantyExpiry": "string or null (format: YYYY-MM-DD) - CRITICAL: Extract if visible",
      "serviceInterval": "string or null (e.g., '6 months', '10000 km')",
      "nextServiceDue": "string or null (format: YYYY-MM-DD) - CRITICAL: Extract if visible",
      "invoiceDate": "string or null",
      "expiryDate": "string or null (format: YYYY-MM-DD) - For any product/service expiry",
      "renewalDate": "string or null (format: YYYY-MM-DD) - For subscriptions/insurance"
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
      "type": "warranty_expiry | service_due | subscription_renewal | payment_due | custom",
      "date": "YYYY-MM-DD format - REQUIRED",
      "title": "short title for the reminder",
      "description": "what needs to be done",
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
}

REMINDER GENERATION RULES:
1. Create a reminder for EVERY date found that represents a future deadline
2. For warranty expiry: suggest reminder 7-30 days before
3. For service due: suggest reminder 7 days before
4. For subscriptions: suggest reminder 3-7 days before renewal
5. Use clear, actionable titles like "Car Insurance Expiring" or "AC Service Due"`;

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  let jobId: string | null = null;

  // Initialize Supabase client
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { imageBase64, fileName, fileType, fileSize, userId, options } = await req.json() as OCRRequest;

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: { code: 'MISSING_IMAGE', message: 'No image data provided' } 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create job record in database
    const { data: job, error: jobError } = await supabase
      .from('ocr_jobs')
      .insert({
        file_name: fileName,
        file_type: fileType,
        file_size: fileSize,
        user_id: userId || null,
        status: 'processing',
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (jobError) {
      console.error('Failed to create job record:', jobError);
    } else {
      jobId = job.id;
      console.log(`Created OCR job: ${jobId}`);
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      
      // Log error to database
      if (jobId) {
        await supabase.from('ocr_jobs').update({ 
          status: 'failed', 
          error_message: 'OCR service not configured',
          completed_at: new Date().toISOString()
        }).eq('id', jobId);
        
        await supabase.from('ocr_errors').insert({
          job_id: jobId,
          error_code: 'CONFIG_ERROR',
          error_message: 'LOVABLE_API_KEY not configured',
        });
      }
      
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
      
      const errorCode = aiResponse.status === 429 ? 'RATE_LIMITED' : 
                        aiResponse.status === 402 ? 'QUOTA_EXCEEDED' : 'AI_ERROR';
      const errorMessage = aiResponse.status === 429 ? 'Service is busy. Please try again in a moment.' :
                           aiResponse.status === 402 ? 'OCR quota exceeded. Please contact support.' :
                           'Failed to process document';
      
      // Log error to database
      if (jobId) {
        await supabase.from('ocr_jobs').update({ 
          status: 'failed', 
          error_message: errorMessage,
          completed_at: new Date().toISOString(),
          processing_time_ms: Date.now() - startTime
        }).eq('id', jobId);
        
        await supabase.from('ocr_errors').insert({
          job_id: jobId,
          error_code: errorCode,
          error_message: errorMessage,
          error_details: { statusCode: aiResponse.status, response: errorText }
        });
      }
      
      return new Response(
        JSON.stringify({ success: false, error: { code: errorCode, message: errorMessage } }),
        { status: aiResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content;

    if (!aiContent) {
      console.error('No content in AI response');
      
      if (jobId) {
        await supabase.from('ocr_jobs').update({ 
          status: 'failed', 
          error_message: 'No extraction result returned',
          completed_at: new Date().toISOString(),
          processing_time_ms: Date.now() - startTime
        }).eq('id', jobId);
        
        await supabase.from('ocr_errors').insert({
          job_id: jobId,
          error_code: 'EMPTY_RESPONSE',
          error_message: 'No extraction result returned',
        });
      }
      
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
      
      if (jobId) {
        await supabase.from('ocr_jobs').update({ 
          status: 'failed', 
          error_message: 'Failed to parse extraction results',
          completed_at: new Date().toISOString(),
          processing_time_ms: Date.now() - startTime
        }).eq('id', jobId);
        
        await supabase.from('ocr_errors').insert({
          job_id: jobId,
          error_code: 'PARSE_ERROR',
          error_message: 'Failed to parse extraction results',
          error_details: { rawContent: aiContent }
        });
      }
      
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
      id: jobId || crypto.randomUUID(),
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

    // Update job and save result to database
    if (jobId) {
      await supabase.from('ocr_jobs').update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        processing_time_ms: processingDuration
      }).eq('id', jobId);

      // Save OCR result
      const { error: resultError } = await supabase.from('ocr_results').insert({
        job_id: jobId,
        document_type: ocrResult.documentType,
        raw_text: ocrResult.rawText,
        confidence: ocrResult.confidence,
        extracted_data: ocrResult.extractedFields,
        vendor_details: ocrResult.extractedFields.vendor,
        product_details: ocrResult.extractedFields.product,
        date_details: ocrResult.extractedFields.dates,
        reminder_suggestions: ocrResult.reminderData?.suggestedReminders || [],
        metadata: ocrResult.metadata
      });

      if (resultError) {
        console.error('Failed to save OCR result:', resultError);
      }

      // Log any extraction errors/warnings
      if (ocrResult.errors && ocrResult.errors.length > 0) {
        for (const err of ocrResult.errors) {
          await supabase.from('ocr_errors').insert({
            job_id: jobId,
            error_code: err.code,
            error_message: err.message,
            error_details: { field: err.field, severity: err.severity }
          });
        }
      }
    }

    console.log(`OCR completed in ${processingDuration}ms, confidence: ${ocrResult.confidence}`);

    return new Response(
      JSON.stringify({ success: true, data: ocrResult, jobId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('OCR processing error:', error);
    
    // Log error to database
    if (jobId) {
      await supabase.from('ocr_jobs').update({ 
        status: 'failed', 
        error_message: error instanceof Error ? error.message : 'Unknown error',
        completed_at: new Date().toISOString(),
        processing_time_ms: Date.now() - startTime
      }).eq('id', jobId);
      
      await supabase.from('ocr_errors').insert({
        job_id: jobId,
        error_code: 'PROCESSING_ERROR',
        error_message: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
    
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
