import React, { useState } from 'react';
import { 
  ChevronDown, 
  ChevronRight, 
  Copy, 
  Check, 
  Building2, 
  Package, 
  Calendar, 
  DollarSign,
  Bell,
  FileText,
  AlertTriangle,
  Download
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { OCRResult } from '@/types/ocr';

interface ResultsViewerProps {
  result: OCRResult;
  onExportJSON?: () => void;
}

type TabType = 'structured' | 'raw' | 'json';

export const ResultsViewer: React.FC<ResultsViewerProps> = ({ result, onExportJSON }) => {
  const [activeTab, setActiveTab] = useState<TabType>('structured');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['vendor', 'product', 'dates', 'amount'])
  );
  const [copied, setCopied] = useState(false);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const confidenceColor = (conf: number) => {
    if (conf >= 0.8) return 'text-success';
    if (conf >= 0.5) return 'text-warning';
    return 'text-destructive';
  };

  const renderFieldValue = (value: unknown, confidence?: number) => {
    if (value === null || value === undefined) {
      return <span className="text-muted-foreground italic">Not detected</span>;
    }
    return (
      <span className="text-foreground font-medium">
        {String(value)}
        {confidence !== undefined && (
          <span className={cn('ml-2 text-xs', confidenceColor(confidence))}>
            ({Math.round(confidence * 100)}%)
          </span>
        )}
      </span>
    );
  };

  const renderSection = (
    title: string,
    icon: React.ElementType,
    data: object,
    sectionKey: string
  ) => {
    const Icon = icon;
    const isExpanded = expandedSections.has(sectionKey);
    const hasData = Object.values(data).some(v => v !== null && v !== undefined);

    return (
      <div className="border border-border rounded-lg overflow-hidden">
        <button
          onClick={() => toggleSection(sectionKey)}
          className="w-full flex items-center gap-3 p-4 bg-card hover:bg-secondary/50 transition-colors"
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          <Icon className="h-5 w-5 text-primary" />
          <span className="font-medium text-foreground">{title}</span>
          {hasData && (
            <span className="ml-auto status-badge status-success">
              Data found
            </span>
          )}
        </button>

        {isExpanded && (
          <div className="p-4 bg-card/50 border-t border-border">
            <div className="grid gap-3">
              {Object.entries(data).map(([key, value]) => (
                <div key={key} className="flex justify-between items-start gap-4">
                  <span className="text-sm text-muted-foreground capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                  <div className="text-right">
                    {renderFieldValue(value)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="card-elevated overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border bg-secondary/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-primary" />
            <div>
              <h3 className="font-semibold text-foreground">
                Extraction Results
              </h3>
              <p className="text-sm text-muted-foreground">
                {result.documentType.replace(/_/g, ' ')} • {result.metadata.fileName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={cn(
              'text-sm font-medium',
              confidenceColor(result.confidence)
            )}>
              {Math.round(result.confidence * 100)}% confidence
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        {(['structured', 'raw', 'json'] as TabType[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'flex-1 px-4 py-3 text-sm font-medium transition-colors',
              activeTab === tab
                ? 'text-primary border-b-2 border-primary bg-primary/5'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {tab === 'structured' ? 'Structured Data' :
             tab === 'raw' ? 'Raw Text' : 'JSON Output'}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-4">
        {activeTab === 'structured' && (
          <div className="space-y-4">
            {renderSection('Vendor Details', Building2, result.extractedFields.vendor, 'vendor')}
            {renderSection('Product Details', Package, result.extractedFields.product, 'product')}
            {renderSection('Date Information', Calendar, result.extractedFields.dates, 'dates')}
            {result.extractedFields.amount && (
              renderSection('Amount', DollarSign, result.extractedFields.amount, 'amount')
            )}

            {/* Custom Fields */}
            {result.extractedFields.custom.length > 0 && (
              <div className="border border-border rounded-lg overflow-hidden">
                <div className="p-4 bg-card">
                  <h4 className="font-medium text-foreground mb-3">Additional Fields</h4>
                  <div className="grid gap-2">
                    {result.extractedFields.custom.map((field, idx) => (
                      <div key={idx} className="flex justify-between items-start gap-4">
                        <span className="text-sm text-muted-foreground">
                          {field.fieldName}
                        </span>
                        <div className="text-right">
                          {renderFieldValue(field.value, field.confidence)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Suggested Reminders */}
            {result.reminderData?.suggestedReminders && result.reminderData.suggestedReminders.length > 0 && (
              <div className="border border-border rounded-lg overflow-hidden">
                <div className="p-4 bg-accent/10">
                  <div className="flex items-center gap-2 mb-3">
                    <Bell className="h-5 w-5 text-accent" />
                    <h4 className="font-medium text-foreground">Suggested Reminders</h4>
                  </div>
                  <div className="grid gap-2">
                    {result.reminderData.suggestedReminders.map((reminder, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-3 p-3 bg-card rounded-lg"
                      >
                        <div className={cn(
                          'px-2 py-1 rounded text-xs font-medium',
                          reminder.priority === 'high' && 'bg-destructive/10 text-destructive',
                          reminder.priority === 'medium' && 'bg-warning/10 text-warning',
                          reminder.priority === 'low' && 'bg-muted text-muted-foreground'
                        )}>
                          {reminder.priority}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-foreground">
                            {reminder.type.replace(/_/g, ' ')}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {reminder.description}
                          </p>
                          <p className="text-xs text-primary mt-1">
                            {reminder.date}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Errors & Warnings */}
            {result.errors.length > 0 && (
              <div className="border border-warning/30 rounded-lg overflow-hidden">
                <div className="p-4 bg-warning/5">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="h-5 w-5 text-warning" />
                    <h4 className="font-medium text-foreground">Warnings & Errors</h4>
                  </div>
                  <div className="grid gap-2">
                    {result.errors.map((error, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          'p-2 rounded text-sm',
                          error.severity === 'error' ? 'bg-destructive/10 text-destructive' : 'bg-warning/10 text-warning'
                        )}
                      >
                        <span className="font-mono text-xs">[{error.code}]</span> {error.message}
                        {error.field && <span className="text-xs ml-1">({error.field})</span>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'raw' && (
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-2 right-2"
              onClick={() => copyToClipboard(result.rawText)}
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
            <pre className="json-viewer whitespace-pre-wrap text-sm max-h-[500px]">
              {result.rawText || 'No text extracted'}
            </pre>
          </div>
        )}

        {activeTab === 'json' && (
          <div className="relative">
            <div className="absolute top-2 right-2 flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(JSON.stringify(result, null, 2))}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
              {onExportJSON && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onExportJSON}
                >
                  <Download className="h-4 w-4" />
                </Button>
              )}
            </div>
            <pre className="json-viewer text-sm max-h-[500px] overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* Metadata Footer */}
      <div className="p-4 border-t border-border bg-secondary/30">
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
          <span>Engine: {result.metadata.ocrEngine}</span>
          <span>Languages: {result.metadata.language.join(', ')}</span>
          <span>Quality: {result.metadata.imageQuality}</span>
          <span>Duration: {result.metadata.processingDuration}ms</span>
        </div>
      </div>
    </div>
  );
};
