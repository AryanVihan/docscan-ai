import React from 'react';
import { Helmet } from 'react-helmet';
import { 
  FileSearch, 
  Zap, 
  Languages, 
  Bell, 
  Shield, 
  Layers,
  Github
} from 'lucide-react';
import { OCRModule } from '@/components/ocr/OCRModule';

const Index: React.FC = () => {
  const features = [
    {
      icon: FileSearch,
      title: 'Multi-Format OCR',
      description: 'Extract text from images, PDFs, scans, and low-quality uploads',
    },
    {
      icon: Zap,
      title: 'AI-Powered Extraction',
      description: 'Advanced vision AI for accurate entity recognition and structuring',
    },
    {
      icon: Languages,
      title: 'Multilingual Support',
      description: 'English + 9 Indian regional languages including Hindi, Tamil, Telugu',
    },
    {
      icon: Bell,
      title: 'Reminder Integration',
      description: 'Auto-generate reminders for warranty expiry, service due dates',
    },
    {
      icon: Shield,
      title: 'Confidence Scoring',
      description: 'Every field includes confidence scores for validation',
    },
    {
      icon: Layers,
      title: 'Structured JSON',
      description: 'Clean, consistent JSON schema ready for downstream processing',
    },
  ];

  return (
    <>
      <Helmet>
        <title>OCR Document Extractor | Extract Structured Data from Documents</title>
        <meta 
          name="description" 
          content="AI-powered OCR system to extract structured information from invoices, bills, warranty cards, receipts, and service documents. Multilingual support with confidence scoring." 
        />
      </Helmet>

      <div className="min-h-screen gradient-surface">
        {/* Header */}
        <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg gradient-primary">
                  <FileSearch className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-foreground">
                    OCR Extractor
                  </h1>
                  <p className="text-xs text-muted-foreground">
                    Document Intelligence Module
                  </p>
                </div>
              </div>

              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg hover:bg-secondary transition-colors"
              >
                <Github className="h-5 w-5 text-muted-foreground" />
              </a>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          {/* Hero Section */}
          <section className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Extract <span className="text-gradient">Structured Data</span>
              <br />from Any Document
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
              AI-powered OCR system for invoices, bills, warranty cards, receipts, 
              and service documents. Get structured JSON output ready for your 
              reminder automation workflow.
            </p>

            {/* Feature Pills */}
            <div className="flex flex-wrap justify-center gap-2 mb-8">
              {['Invoices', 'Receipts', 'Warranty Cards', 'Bills', 'Manuals'].map(type => (
                <span
                  key={type}
                  className="px-3 py-1.5 rounded-full bg-secondary text-sm text-secondary-foreground"
                >
                  {type}
                </span>
              ))}
            </div>
          </section>

          {/* Main OCR Module */}
          <section className="mb-16">
            <OCRModule />
          </section>

          {/* Features Grid */}
          <section className="mb-16">
            <h2 className="text-2xl font-bold text-foreground text-center mb-8">
              Powerful Features
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={feature.title}
                    className="card-interactive p-6"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="p-3 rounded-xl bg-primary/10 w-fit mb-4">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>

          {/* JSON Schema Example */}
          <section className="mb-16">
            <h2 className="text-2xl font-bold text-foreground text-center mb-8">
              Consistent JSON Output
            </h2>
            <div className="card-elevated p-6 max-w-3xl mx-auto">
              <pre className="json-viewer text-sm overflow-x-auto">
{`{
  "id": "uuid",
  "status": "completed",
  "documentType": "invoice",
  "extractedFields": {
    "vendor": {
      "name": "ABC Electronics Pvt Ltd",
      "gstin": "22AAAAA0000A1Z5",
      "phone": "+91 9876543210"
    },
    "product": {
      "name": "Washing Machine XL Pro",
      "model": "WM-2024-PRO",
      "serialNumber": "SN123456789"
    },
    "dates": {
      "purchaseDate": "2024-01-15",
      "warrantyExpiry": "2026-01-15"
    },
    "amount": {
      "total": 45999,
      "currency": "INR"
    }
  },
  "confidence": 0.92,
  "reminderData": {
    "suggestedReminders": [
      {
        "type": "warranty_expiry",
        "date": "2026-01-15",
        "priority": "high"
      }
    ]
  }
}`}
              </pre>
            </div>
          </section>

          {/* API Documentation Preview */}
          <section className="mb-16">
            <h2 className="text-2xl font-bold text-foreground text-center mb-8">
              API Integration
            </h2>
            <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              <div className="card-elevated p-6">
                <h3 className="font-semibold text-foreground mb-4">
                  Single File Extraction
                </h3>
                <pre className="json-viewer text-xs">
{`POST /functions/v1/ocr-extract
{
  "imageBase64": "data:image/...",
  "fileName": "invoice.pdf",
  "options": {
    "language": ["en", "hi"],
    "extractReminders": true
  }
}`}
                </pre>
              </div>
              <div className="card-elevated p-6">
                <h3 className="font-semibold text-foreground mb-4">
                  Response Format
                </h3>
                <pre className="json-viewer text-xs">
{`{
  "success": true,
  "data": {
    "id": "uuid",
    "documentType": "invoice",
    "extractedFields": {...},
    "confidence": 0.92,
    "metadata": {...}
  }
}`}
                </pre>
              </div>
            </div>
          </section>
        </main>

        {/* Footer */}
        <footer className="border-t border-border bg-card/50">
          <div className="container mx-auto px-4 py-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <FileSearch className="h-5 w-5 text-primary" />
                <span className="font-semibold text-foreground">
                  OCR Document Extractor
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Part of the Notification-Reminder Automation Platform
              </p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

export default Index;
