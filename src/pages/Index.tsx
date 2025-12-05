import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { 
  LayoutDashboard,
  Upload,
  Sparkles,
  ScanLine,
  History
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { OCRModule } from '@/components/ocr/OCRModule';
import { OCRDashboard } from '@/components/ocr/OCRDashboard';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const Index: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'upload' | 'history'>('upload');
  const { user, profile } = useAuth();

  return (
    <>
      <Helmet>
        <title>OCR Extractor | Scan Documents</title>
        <meta 
          name="description" 
          content="Scan and extract data from invoices, bills, warranty cards, and receipts." 
        />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
      </Helmet>

      <div className="min-h-screen bg-background flex flex-col">
        <Header />

        <main className="flex-1 flex flex-col">
          {/* Hero - Compact for mobile */}
          <section className="px-4 py-6 text-center border-b border-border bg-card/50">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium mb-3">
              <Sparkles className="h-3 w-3" />
              AI-Powered OCR
            </div>
            
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Scan Your Documents
            </h1>
            
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Extract data from invoices, bills, warranty cards & receipts instantly
            </p>

            {/* Quick Stats for logged in users */}
            {user && profile && profile.total_extractions > 0 && (
              <div className="flex justify-center gap-6 mt-4 pt-4 border-t border-border">
                <div className="text-center">
                  <div className="text-xl font-bold text-foreground">{profile.total_extractions}</div>
                  <div className="text-xs text-muted-foreground">Scans</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-success">{profile.successful_extractions}</div>
                  <div className="text-xs text-muted-foreground">Success</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-foreground">
                    {profile.total_extractions > 0 
                      ? Math.round((profile.successful_extractions / profile.total_extractions) * 100)
                      : 0}%
                  </div>
                  <div className="text-xs text-muted-foreground">Rate</div>
                </div>
              </div>
            )}

            {/* CTA for non-logged in users */}
            {!user && (
              <Link to="/auth" className="block mt-4">
                <Button size="sm" variant="outline" className="w-full max-w-xs">
                  Sign in to save your scans
                </Button>
              </Link>
            )}
          </section>

          {/* Tab Navigation - Fixed at position */}
          <div className="sticky top-[57px] z-40 bg-background border-b border-border">
            <div className="flex">
              <button
                onClick={() => setActiveTab('upload')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors relative ${
                  activeTab === 'upload' 
                    ? 'text-primary' 
                    : 'text-muted-foreground'
                }`}
              >
                <ScanLine className="h-4 w-4" />
                Scan
                {activeTab === 'upload' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                )}
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors relative ${
                  activeTab === 'history' 
                    ? 'text-primary' 
                    : 'text-muted-foreground'
                }`}
              >
                <History className="h-4 w-4" />
                History
                {activeTab === 'history' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                )}
              </button>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 p-4">
            {activeTab === 'upload' ? (
              <OCRModule />
            ) : (
              <OCRDashboard />
            )}
          </div>
        </main>
      </div>
    </>
  );
};

export default Index;
