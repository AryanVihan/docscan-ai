import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  RefreshCw, 
  FileText,
  ChevronRight,
  AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';

interface OCRJob {
  id: string;
  file_name: string;
  file_type: string | null;
  file_size: number | null;
  status: string;
  processing_time_ms: number | null;
  error_message: string | null;
  created_at: string;
}

interface OCRResult {
  id: string;
  job_id: string;
  document_type: string | null;
  confidence: number | null;
  raw_text: string | null;
  extracted_data: unknown;
  created_at: string;
}

export const OCRDashboard = () => {
  const [jobs, setJobs] = useState<OCRJob[]>([]);
  const [results, setResults] = useState<OCRResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [jobsRes, resultsRes] = await Promise.all([
        supabase.from('ocr_jobs').select('*').order('created_at', { ascending: false }).limit(50),
        supabase.from('ocr_results').select('*').order('created_at', { ascending: false }).limit(50),
      ]);

      if (jobsRes.data) setJobs(jobsRes.data);
      if (resultsRes.data) setResults(resultsRes.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const completedJobs = jobs.filter(j => j.status === 'completed').length;
  const failedJobs = jobs.filter(j => j.status === 'failed').length;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-success" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'processing':
        return <Clock className="h-4 w-4 text-warning animate-pulse" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const selectedResult = selectedJobId ? results.find(r => r.job_id === selectedJobId) : null;
  const selectedJob = selectedJobId ? jobs.find(j => j.id === selectedJobId) : null;

  if (selectedResult && selectedJob) {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSelectedJobId(null)}
          className="mb-2"
        >
          ← Back to history
        </Button>

        <Card className="border-border/50">
          <CardContent className="p-4 space-y-4">
            <div>
              <h3 className="font-semibold text-foreground truncate">{selectedJob.file_name}</h3>
              <p className="text-xs text-muted-foreground">
                {format(new Date(selectedJob.created_at), 'MMM d, yyyy • HH:mm')}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Type</span>
                <p className="font-medium">{selectedResult.document_type || 'Unknown'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Confidence</span>
                <p className="font-medium">{((selectedResult.confidence || 0) * 100).toFixed(0)}%</p>
              </div>
              <div>
                <span className="text-muted-foreground">Size</span>
                <p className="font-medium">{formatFileSize(selectedJob.file_size)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Time</span>
                <p className="font-medium">{selectedJob.processing_time_ms ? `${(selectedJob.processing_time_ms / 1000).toFixed(1)}s` : '-'}</p>
              </div>
            </div>

            {selectedResult.raw_text && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Extracted Text</p>
                <ScrollArea className="h-[200px]">
                  <div className="bg-muted/50 rounded-lg p-3 text-xs font-mono whitespace-pre-wrap">
                    {selectedResult.raw_text}
                  </div>
                </ScrollArea>
              </div>
            )}

            {selectedResult.extracted_data && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Extracted Data</p>
                <ScrollArea className="h-[200px]">
                  <pre className="bg-muted/50 rounded-lg p-3 text-xs overflow-auto">
                    {JSON.stringify(selectedResult.extracted_data, null, 2)}
                  </pre>
                </ScrollArea>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-foreground">Scan History</h2>
          <p className="text-xs text-muted-foreground">
            {completedJobs} successful • {failedJobs} failed
          </p>
        </div>
        <Button onClick={fetchData} disabled={loading} variant="ghost" size="icon" className="h-9 w-9">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Job List */}
      {jobs.length > 0 ? (
        <div className="space-y-2">
          {jobs.map((job) => {
            const result = results.find(r => r.job_id === job.id);
            return (
              <Card 
                key={job.id} 
                className="border-border/50 cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => result && setSelectedJobId(job.id)}
              >
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {job.file_name}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{format(new Date(job.created_at), 'MMM d, HH:mm')}</span>
                        {result?.document_type && (
                          <>
                            <span>•</span>
                            <span className="capitalize">{result.document_type}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {getStatusIcon(job.status)}
                      {result && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                    </div>
                  </div>

                  {job.status === 'failed' && job.error_message && (
                    <div className="mt-2 flex items-start gap-2 p-2 rounded bg-destructive/10 text-xs text-destructive">
                      <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                      <span className="line-clamp-2">{job.error_message}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="border-border/50">
          <CardContent className="p-8 text-center">
            <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              No scans yet. Upload a document to get started.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
