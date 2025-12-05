import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { 
  FileSearch, 
  Zap, 
  Languages, 
  Bell, 
  Shield, 
  Layers,
  LayoutDashboard,
  Upload,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { OCRModule } from '@/components/ocr/OCRModule';
import { OCRDashboard } from '@/components/ocr/OCRDashboard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const Index: React.FC = () => {
  const [activeTab, setActiveTab] = useState('upload');
  const { user, profile } = useAuth();

  const features = [
    {
      icon: FileSearch,
      title: 'Multi-Format OCR',
      description: 'Extract text from images, PDFs, scans, and low-quality uploads with AI-powered preprocessing.',
    },
    {
      icon: Zap,
      title: 'AI-Powered Extraction',
      description: 'Advanced vision AI for accurate entity recognition, structuring, and confidence scoring.',
    },
    {
      icon: Languages,
      title: 'Multilingual Support',
      description: 'English + 9 Indian regional languages including Hindi, Tamil, Telugu, Bengali.',
    },
    {
      icon: Bell,
      title: 'Reminder Integration',
      description: 'Auto-generate reminders for warranty expiry, service due dates, and payments.',
    },
    {
      icon: Shield,
      title: 'Confidence Scoring',
      description: 'Every extracted field includes confidence scores for validation and quality control.',
    },
    {
      icon: Layers,
      title: 'Structured JSON',
      description: 'Clean, consistent JSON schema ready for downstream processing and automation.',
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
        <Header />

        <main className="container mx-auto px-4 py-8">
          {/* Hero Section */}
          <section className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm mb-6">
              <Sparkles className="h-4 w-4" />
              AI-Powered Document Intelligence
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
              Extract <span className="text-gradient">Structured Data</span>
              <br />from Any Document
            </h1>
            
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
              Transform invoices, bills, warranty cards, receipts, and service documents 
              into structured JSON output ready for your automation workflows.
            </p>

            {/* CTA Buttons */}
            {!user && (
              <div className="flex flex-wrap justify-center gap-4 mb-8">
                <Link to="/auth">
                  <Button size="lg" className="gap-2 h-12 px-8">
                    Get Started Free
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Button variant="outline" size="lg" className="h-12 px-8" onClick={() => setActiveTab('upload')}>
                  Try Demo
                </Button>
              </div>
            )}

            {/* Stats */}
            {user && profile && (
              <div className="flex flex-wrap justify-center gap-8 mb-8">
                <div className="text-center">
                  <div className="text-3xl font-bold text-foreground">{profile.total_extractions}</div>
                  <div className="text-sm text-muted-foreground">Total Extractions</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-success">{profile.successful_extractions}</div>
                  <div className="text-sm text-muted-foreground">Successful</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-foreground">
                    {profile.total_extractions > 0 
                      ? Math.round((profile.successful_extractions / profile.total_extractions) * 100)
                      : 0}%
                  </div>
                  <div className="text-sm text-muted-foreground">Success Rate</div>
                </div>
              </div>
            )}

            {/* Feature Pills */}
            <div className="flex flex-wrap justify-center gap-2">
              {['Invoices', 'Receipts', 'Warranty Cards', 'Bills', 'Manuals', 'Service Docs'].map(type => (
                <span
                  key={type}
                  className="px-4 py-2 rounded-full bg-secondary/50 border border-border text-sm text-secondary-foreground hover:bg-secondary transition-colors"
                >
                  {type}
                </span>
              ))}
            </div>
          </section>

          {/* Main Content Tabs */}
          <section className="mb-16">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-8 h-12">
                <TabsTrigger value="upload" className="flex items-center gap-2 h-10">
                  <Upload className="w-4 h-4" />
                  Upload & Extract
                </TabsTrigger>
                <TabsTrigger value="dashboard" className="flex items-center gap-2 h-10">
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="upload">
                <OCRModule />
              </TabsContent>
              
              <TabsContent value="dashboard">
                <OCRDashboard />
              </TabsContent>
            </Tabs>
          </section>

          {/* Features Grid */}
          <section className="mb-16">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground text-center mb-4">
              Powerful Features
            </h2>
            <p className="text-muted-foreground text-center max-w-2xl mx-auto mb-10">
              Built for accuracy, speed, and reliability. Our AI-powered extraction handles even the most challenging documents.
            </p>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={feature.title}
                    className="group p-6 rounded-xl bg-card border border-border hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="p-3 rounded-xl bg-primary/10 w-fit mb-4 group-hover:bg-primary/20 transition-colors">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-2 text-lg">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>

          {/* JSON Schema Example */}
          <section className="mb-16">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground text-center mb-4">
              Consistent JSON Output
            </h2>
            <p className="text-muted-foreground text-center max-w-2xl mx-auto mb-10">
              Every extraction returns a standardized JSON schema, ready for your downstream processing.
            </p>
            <div className="card-elevated p-6 max-w-3xl mx-auto rounded-xl border border-border">
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
            <h2 className="text-2xl md:text-3xl font-bold text-foreground text-center mb-4">
              Simple API Integration
            </h2>
            <p className="text-muted-foreground text-center max-w-2xl mx-auto mb-10">
              Integrate OCR extraction into your workflow with our simple REST API.
            </p>
            <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              <div className="p-6 rounded-xl bg-card border border-border">
                <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-primary/20 text-primary text-xs font-mono">POST</span>
                  Request
                </h3>
                <pre className="json-viewer text-xs overflow-x-auto">
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
              <div className="p-6 rounded-xl bg-card border border-border">
                <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-success/20 text-success text-xs font-mono">200</span>
                  Response
                </h3>
                <pre className="json-viewer text-xs overflow-x-auto">
{`{
  "success": true,
  "data": {
    "id": "uuid",
    "documentType": "invoice",
    "extractedFields": {...},
    "confidence": 0.92,
    "metadata": {...}
  },
  "jobId": "uuid"
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
                <span className="font-semibold text-foreground">OCR Document Extractor</span>
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
