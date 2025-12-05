import React, { useState } from 'react';
import { 
  Play, 
  Trash2, 
  Download,
  Settings2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { FileUploadZone } from './FileUploadZone';
import { ProcessingStatus } from './ProcessingStatus';
import { ResultsViewer } from './ResultsViewer';
import { useOCR } from '@/hooks/useOCR';

export const OCRModule: React.FC = () => {
  const [showSettings, setShowSettings] = useState(false);
  const [preprocessEnabled, setPreprocessEnabled] = useState(true);
  const [extractReminders, setExtractReminders] = useState(true);

  const {
    files,
    results,
    isProcessing,
    addFiles,
    removeFile,
    processFiles,
    clearAll,
    exportResults,
  } = useOCR({
    autoPreprocess: preprocessEnabled,
    extractReminders,
  });

  const pendingFiles = files.filter(f => f.status === 'pending');
  const processingFile = files.find(f => 
    f.status === 'preprocessing' || 
    f.status === 'extracting' || 
    f.status === 'parsing'
  );

  const handleExportSingleResult = (index: number) => {
    const result = results[index];
    if (!result) return;

    const blob = new Blob([JSON.stringify(result, null, 2)], {
      type: 'application/json',
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ocr-${result.metadata.fileName}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Upload Zone */}
      <FileUploadZone
        onFilesAdded={addFiles}
        uploadedFiles={files}
        onRemoveFile={removeFile}
        disabled={isProcessing}
      />

      {/* Settings - Collapsible */}
      <Collapsible open={showSettings} onOpenChange={setShowSettings}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="w-full justify-between h-10">
            <span className="flex items-center gap-2 text-muted-foreground">
              <Settings2 className="h-4 w-4" />
              Settings
            </span>
            {showSettings ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <Card className="border-border/50 mt-2">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="preprocess" className="text-sm">
                  Auto-enhance images
                </Label>
                <Switch
                  id="preprocess"
                  checked={preprocessEnabled}
                  onCheckedChange={setPreprocessEnabled}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="reminders" className="text-sm">
                  Extract reminders
                </Label>
                <Switch
                  id="reminders"
                  checked={extractReminders}
                  onCheckedChange={setExtractReminders}
                />
              </div>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      {/* Processing Status */}
      {processingFile && (
        <ProcessingStatus
          status={processingFile.status}
          progress={processingFile.progress}
          fileName={processingFile.file.name}
        />
      )}

      {/* Action Buttons */}
      {files.length > 0 && (
        <div className="flex gap-2">
          <Button
            onClick={processFiles}
            disabled={isProcessing || pendingFiles.length === 0}
            className="flex-1 h-12"
          >
            <Play className="h-4 w-4 mr-2" />
            {isProcessing ? 'Processing...' : `Scan ${pendingFiles.length > 0 ? `(${pendingFiles.length})` : ''}`}
          </Button>
          
          <Button
            variant="outline"
            size="icon"
            onClick={clearAll}
            disabled={isProcessing}
            className="h-12 w-12"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground">
              Results ({results.length})
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={exportResults}
              className="h-8"
            >
              <Download className="h-3.5 w-3.5 mr-1.5" />
              Export
            </Button>
          </div>
          
          {/* Show each result */}
          <div className="space-y-4">
            {results.map((result, index) => (
              <ResultsViewer 
                key={result.id} 
                result={result} 
                onExportJSON={() => handleExportSingleResult(index)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
