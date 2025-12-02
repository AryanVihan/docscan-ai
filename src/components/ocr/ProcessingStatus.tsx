import React from 'react';
import { Loader2, CheckCircle2, XCircle, FileText, Zap, Brain } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ProcessingStatus as Status } from '@/types/ocr';

interface ProcessingStatusProps {
  status: Status;
  progress?: number;
  currentStep?: string;
  fileName?: string;
}

const statusConfig: Record<Status, { icon: React.ElementType; label: string; color: string }> = {
  pending: {
    icon: FileText,
    label: 'Waiting to process',
    color: 'text-muted-foreground',
  },
  preprocessing: {
    icon: Zap,
    label: 'Enhancing image',
    color: 'text-warning',
  },
  extracting: {
    icon: Brain,
    label: 'Extracting text (AI OCR)',
    color: 'text-primary',
  },
  parsing: {
    icon: Loader2,
    label: 'Parsing entities',
    color: 'text-accent',
  },
  completed: {
    icon: CheckCircle2,
    label: 'Extraction complete',
    color: 'text-success',
  },
  failed: {
    icon: XCircle,
    label: 'Extraction failed',
    color: 'text-destructive',
  },
};

export const ProcessingStatus: React.FC<ProcessingStatusProps> = ({
  status,
  progress = 0,
  currentStep,
  fileName,
}) => {
  const config = statusConfig[status];
  const Icon = config.icon;
  const isAnimating = ['preprocessing', 'extracting', 'parsing'].includes(status);

  return (
    <div className="card-elevated p-6">
      <div className="flex items-center gap-4">
        <div className={cn(
          'p-3 rounded-xl transition-all duration-300',
          status === 'completed' && 'bg-success/10',
          status === 'failed' && 'bg-destructive/10',
          isAnimating && 'bg-primary/10'
        )}>
          <Icon className={cn(
            'h-6 w-6',
            config.color,
            isAnimating && 'animate-spin'
          )} />
        </div>

        <div className="flex-1">
          <p className={cn('font-medium', config.color)}>
            {config.label}
          </p>
          {fileName && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {fileName}
            </p>
          )}
          {currentStep && isAnimating && (
            <p className="text-xs text-muted-foreground mt-1">
              {currentStep}
            </p>
          )}
        </div>

        {isAnimating && progress > 0 && (
          <div className="text-right">
            <span className="text-2xl font-semibold text-primary">
              {Math.round(progress)}%
            </span>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      {isAnimating && (
        <div className="mt-4">
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full gradient-primary transition-all duration-500 ease-out rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Processing Steps */}
      {isAnimating && (
        <div className="mt-4 grid grid-cols-4 gap-2">
          {['preprocessing', 'extracting', 'parsing', 'completed'].map((step, index) => {
            const stepIndex = ['preprocessing', 'extracting', 'parsing', 'completed'].indexOf(status);
            const isComplete = index < stepIndex;
            const isCurrent = index === stepIndex;

            return (
              <div
                key={step}
                className={cn(
                  'flex flex-col items-center gap-1 p-2 rounded-lg transition-all duration-300',
                  isComplete && 'bg-success/10',
                  isCurrent && 'bg-primary/10',
                  !isComplete && !isCurrent && 'opacity-40'
                )}
              >
                <div className={cn(
                  'w-2 h-2 rounded-full',
                  isComplete && 'bg-success',
                  isCurrent && 'bg-primary animate-pulse',
                  !isComplete && !isCurrent && 'bg-muted-foreground'
                )} />
                <span className="text-xs text-center capitalize">
                  {step === 'preprocessing' ? 'Enhance' : 
                   step === 'extracting' ? 'OCR' :
                   step === 'parsing' ? 'Parse' : 'Done'}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// Scan line animation component
export const ScanningOverlay: React.FC<{ isScanning: boolean }> = ({ isScanning }) => {
  if (!isScanning) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-lg">
      <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent animate-scan-line" />
    </div>
  );
};
