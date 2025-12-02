import React, { useState } from 'react';
import { 
  FileSearch, 
  Zap, 
  Download, 
  Trash2, 
  Settings2,
  Languages,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FileUploadZone } from './FileUploadZone';
import { ProcessingStatus } from './ProcessingStatus';
import { ResultsViewer } from './ResultsViewer';
import { useOCR } from '@/hooks/useOCR';
import { cn } from '@/lib/utils';

interface OCRModuleProps {
  className?: string;
}

export const OCRModule: React.FC<OCRModuleProps> = ({ className }) => {
  const [showSettings, setShowSettings] = useState(false);
  const [selectedResultIndex, setSelectedResultIndex] = useState<number | null>(null);
  
  // OCR options
  const [ocrOptions, setOcrOptions] = useState({
    autoPreprocess: true,
    enhanceContrast: true,
    denoise: true,
    extractReminders: true,
    languages: ['en', 'hi'],
  });

  const {
    files,
    results,
    isProcessing,
    addFiles,
    removeFile,
    processFiles,
    clearAll,
    exportResults,
  } = useOCR(ocrOptions);

  const pendingCount = files.filter(f => f.status === 'pending').length;
  const processingFile = files.find(f => 
    ['preprocessing', 'extracting', 'parsing'].includes(f.status)
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

  const availableLanguages = [
    { code: 'en', name: 'English' },
    { code: 'hi', name: 'Hindi' },
    { code: 'bn', name: 'Bengali' },
    { code: 'ta', name: 'Tamil' },
    { code: 'te', name: 'Telugu' },
    { code: 'mr', name: 'Marathi' },
    { code: 'gu', name: 'Gujarati' },
    { code: 'kn', name: 'Kannada' },
    { code: 'ml', name: 'Malayalam' },
    { code: 'pa', name: 'Punjabi' },
  ];

  const toggleLanguage = (code: string) => {
    setOcrOptions(prev => ({
      ...prev,
      languages: prev.languages.includes(code)
        ? prev.languages.filter(l => l !== code)
        : [...prev.languages, code],
    }));
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl gradient-primary">
            <FileSearch className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              OCR Document Extractor
            </h2>
            <p className="text-sm text-muted-foreground">
              Extract structured data from invoices, receipts, and documents
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowSettings(!showSettings)}
            className={cn(showSettings && 'bg-secondary')}
          >
            <Settings2 className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="card-elevated p-4 animate-fade-up">
          <h3 className="font-medium text-foreground mb-4 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Processing Options
          </h3>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Preprocessing Options */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">
                Image Enhancement
              </h4>
              
              {[
                { key: 'autoPreprocess', label: 'Auto Preprocess' },
                { key: 'enhanceContrast', label: 'Enhance Contrast' },
                { key: 'denoise', label: 'Noise Reduction' },
                { key: 'extractReminders', label: 'Extract Reminders' },
              ].map(({ key, label }) => (
                <label
                  key={key}
                  className="flex items-center gap-3 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={ocrOptions[key as keyof typeof ocrOptions] as boolean}
                    onChange={(e) => setOcrOptions(prev => ({
                      ...prev,
                      [key]: e.target.checked,
                    }))}
                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-foreground">{label}</span>
                </label>
              ))}
            </div>

            {/* Language Selection */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Languages className="h-4 w-4" />
                Languages
              </h4>
              
              <div className="flex flex-wrap gap-2">
                {availableLanguages.map(lang => (
                  <button
                    key={lang.code}
                    onClick={() => toggleLanguage(lang.code)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-sm transition-colors',
                      ocrOptions.languages.includes(lang.code)
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                    )}
                  >
                    {lang.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Zone */}
      <FileUploadZone
        onFilesAdded={addFiles}
        uploadedFiles={files}
        onRemoveFile={removeFile}
        disabled={isProcessing}
      />

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
        <div className="flex flex-wrap gap-3">
          <Button
            variant="gradient"
            size="lg"
            onClick={processFiles}
            disabled={isProcessing || pendingCount === 0}
          >
            <Zap className="h-5 w-5" />
            {isProcessing ? 'Processing...' : `Extract Data (${pendingCount})`}
          </Button>

          {results.length > 0 && (
            <Button
              variant="outline"
              size="lg"
              onClick={exportResults}
            >
              <Download className="h-5 w-5" />
              Export All ({results.length})
            </Button>
          )}

          <Button
            variant="ghost"
            size="lg"
            onClick={clearAll}
            disabled={isProcessing}
          >
            <Trash2 className="h-5 w-5" />
            Clear All
          </Button>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">
            Extraction Results ({results.length})
          </h3>

          {/* Result Tabs */}
          {results.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {results.map((result, index) => (
                <button
                  key={result.id}
                  onClick={() => setSelectedResultIndex(
                    selectedResultIndex === index ? null : index
                  )}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
                    selectedResultIndex === index
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                  )}
                >
                  {result.metadata.fileName}
                </button>
              ))}
            </div>
          )}

          {/* Single Result or Selected Result */}
          {(selectedResultIndex !== null || results.length === 1) && (
            <ResultsViewer
              result={results[selectedResultIndex ?? 0]}
              onExportJSON={() => handleExportSingleResult(selectedResultIndex ?? 0)}
            />
          )}

          {/* All Results Grid (when no selection and multiple results) */}
          {selectedResultIndex === null && results.length > 1 && (
            <div className="grid gap-4">
              {results.map((result, index) => (
                <div
                  key={result.id}
                  className="card-interactive p-4 cursor-pointer"
                  onClick={() => setSelectedResultIndex(index)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <FileSearch className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {result.metadata.fileName}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {result.documentType.replace(/_/g, ' ')} • {Math.round(result.confidence * 100)}% confidence
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      View Details
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
