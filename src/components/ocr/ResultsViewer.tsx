import React, { useState } from 'react';
import { 
  ChevronDown, 
  ChevronUp, 
  Copy, 
  Check, 
  Store, 
  Package, 
  Calendar, 
  Bell,
  FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { OCRResult } from '@/types/ocr';
import { toast } from '@/hooks/use-toast';

interface ResultsViewerProps {
  result: OCRResult;
  onExportJSON?: () => void;
}

export const ResultsViewer: React.FC<ResultsViewerProps> = ({ result, onExportJSON }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(result, null, 2));
      setCopied(true);
      toast({ title: 'Copied to clipboard' });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: 'Failed to copy', variant: 'destructive' });
    }
  };

  const confidenceColor = (conf: number) => {
    if (conf >= 0.8) return 'text-success';
    if (conf >= 0.5) return 'text-warning';
    return 'text-destructive';
  };

  const fields = result.extractedFields;

  return (
    <Card className="border-border/50 overflow-hidden">
      {/* Header - Always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between text-left hover:bg-accent/50 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className="text-xs capitalize">
                {result.documentType?.replace(/_/g, ' ') || 'Document'}
              </Badge>
              <span className={cn('text-xs font-medium', confidenceColor(result.confidence))}>
                {Math.round(result.confidence * 100)}%
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {result.metadata.fileName}
            </p>
          </div>
        </div>
        {isExpanded ? <ChevronUp className="h-4 w-4 flex-shrink-0" /> : <ChevronDown className="h-4 w-4 flex-shrink-0" />}
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <CardContent className="p-4 pt-0 space-y-4">
          {/* Vendor */}
          {fields?.vendor && Object.values(fields.vendor).some(v => v) && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Store className="h-3.5 w-3.5" />
                Vendor
              </div>
              <div className="space-y-1.5 text-sm">
                {fields.vendor.name && (
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Name</span>
                    <span className="font-medium text-right truncate max-w-[60%]">{fields.vendor.name}</span>
                  </div>
                )}
                {fields.vendor.phone && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Phone</span>
                    <span className="font-medium">{fields.vendor.phone}</span>
                  </div>
                )}
                {fields.vendor.gstin && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">GSTIN</span>
                    <span className="font-mono text-xs">{fields.vendor.gstin}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Product */}
          {fields?.product && Object.values(fields.product).some(v => v) && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Package className="h-3.5 w-3.5" />
                Product
              </div>
              <div className="space-y-1.5 text-sm">
                {fields.product.name && (
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Name</span>
                    <span className="font-medium text-right truncate max-w-[60%]">{fields.product.name}</span>
                  </div>
                )}
                {fields.product.model && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Model</span>
                    <span className="font-mono text-xs">{fields.product.model}</span>
                  </div>
                )}
                {fields.product.serialNumber && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Serial</span>
                    <span className="font-mono text-xs">{fields.product.serialNumber}</span>
                  </div>
                )}
                {fields.product.totalPrice && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Price</span>
                    <span className="font-medium">
                      {fields.amount?.currency || '₹'}{fields.product.totalPrice}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Dates */}
          {fields?.dates && Object.values(fields.dates).some(v => v) && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                Important Dates
              </div>
              <div className="space-y-1.5 text-sm">
                {fields.dates.purchaseDate && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Purchase</span>
                    <span className="font-medium">{fields.dates.purchaseDate}</span>
                  </div>
                )}
                {fields.dates.warrantyExpiry && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Warranty</span>
                    <span className="font-medium text-warning">{fields.dates.warrantyExpiry}</span>
                  </div>
                )}
                {fields.dates.nextServiceDue && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Service Due</span>
                    <span className="font-medium">{fields.dates.nextServiceDue}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Reminders */}
          {result.reminderData?.suggestedReminders && result.reminderData.suggestedReminders.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Bell className="h-3.5 w-3.5" />
                Reminders
              </div>
              <div className="space-y-2">
                {result.reminderData.suggestedReminders.map((reminder, idx) => (
                  <div 
                    key={idx} 
                    className="flex items-center justify-between p-2.5 rounded-lg bg-primary/5 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-foreground capitalize truncate">
                        {reminder.type.replace(/_/g, ' ')}
                      </p>
                      <p className="text-xs text-muted-foreground">{reminder.date}</p>
                    </div>
                    <Badge 
                      variant={reminder.priority === 'high' ? 'destructive' : 'secondary'}
                      className="text-xs flex-shrink-0"
                    >
                      {reminder.priority}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Raw Text Preview */}
          {result.rawText && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Raw Text</p>
              <ScrollArea className="h-[120px]">
                <div className="bg-muted/50 rounded-lg p-3 text-xs font-mono whitespace-pre-wrap">
                  {result.rawText}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={copyToClipboard}
            >
              {copied ? <Check className="h-3.5 w-3.5 mr-1.5" /> : <Copy className="h-3.5 w-3.5 mr-1.5" />}
              {copied ? 'Copied' : 'Copy JSON'}
            </Button>
            {onExportJSON && (
              <Button
                variant="outline"
                size="sm"
                onClick={onExportJSON}
              >
                Export
              </Button>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
};
