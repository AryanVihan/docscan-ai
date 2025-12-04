import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  RefreshCw, 
  FileText,
  TrendingUp,
  AlertTriangle,
  Activity
} from 'lucide-react';
import { format } from 'date-fns';

interface OCRJob {
  id: string;
  file_name: string;
  file_type: string | null;
  file_size: number | null;
  status: string;
  started_at: string | null;
  completed_at: string | null;
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

interface OCRStatistics {
  id: string;
  date: string;
  total_jobs: number | null;
  successful_jobs: number | null;
  failed_jobs: number | null;
  avg_confidence: number | null;
  avg_processing_time_ms: number | null;
}

interface OCRError {
  id: string;
  job_id: string | null;
  error_code: string;
  error_message: string;
  created_at: string;
}

export const OCRDashboard = () => {
  const [jobs, setJobs] = useState<OCRJob[]>([]);
  const [results, setResults] = useState<OCRResult[]>([]);
  const [statistics, setStatistics] = useState<OCRStatistics[]>([]);
  const [errors, setErrors] = useState<OCRError[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [jobsRes, resultsRes, statsRes, errorsRes] = await Promise.all([
        supabase.from('ocr_jobs').select('*').order('created_at', { ascending: false }).limit(50),
        supabase.from('ocr_results').select('*').order('created_at', { ascending: false }).limit(50),
        supabase.from('ocr_statistics').select('*').order('date', { ascending: false }).limit(7),
        supabase.from('ocr_errors').select('*').order('created_at', { ascending: false }).limit(20),
      ]);

      if (jobsRes.data) setJobs(jobsRes.data);
      if (resultsRes.data) setResults(resultsRes.data);
      if (statsRes.data) setStatistics(statsRes.data);
      if (errorsRes.data) setErrors(errorsRes.data);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Calculate summary stats
  const totalJobs = jobs.length;
  const completedJobs = jobs.filter(j => j.status === 'completed').length;
  const failedJobs = jobs.filter(j => j.status === 'failed').length;
  const successRate = totalJobs > 0 ? ((completedJobs / totalJobs) * 100).toFixed(1) : '0';
  const avgConfidence = results.length > 0 
    ? (results.reduce((sum, r) => sum + (r.confidence || 0), 0) / results.length * 100).toFixed(1)
    : '0';
  const avgProcessingTime = jobs.filter(j => j.processing_time_ms).length > 0
    ? Math.round(jobs.filter(j => j.processing_time_ms).reduce((sum, j) => sum + (j.processing_time_ms || 0), 0) / jobs.filter(j => j.processing_time_ms).length)
    : 0;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-success/10 text-success border-success/20"><CheckCircle2 className="w-3 h-3 mr-1" />Completed</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>;
      case 'processing':
        return <Badge className="bg-warning/10 text-warning border-warning/20"><Clock className="w-3 h-3 mr-1" />Processing</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const selectedResult = selectedJob ? results.find(r => r.job_id === selectedJob) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">OCR Dashboard</h2>
          <p className="text-muted-foreground">Monitor extraction jobs, results, and performance</p>
        </div>
        <Button onClick={fetchData} disabled={loading} variant="outline">
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Jobs</p>
                <p className="text-3xl font-bold text-foreground">{totalJobs}</p>
              </div>
              <div className="p-3 rounded-full bg-primary/10">
                <FileText className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Success Rate</p>
                <p className="text-3xl font-bold text-success">{successRate}%</p>
              </div>
              <div className="p-3 rounded-full bg-success/10">
                <TrendingUp className="w-6 h-6 text-success" />
              </div>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              {completedJobs} completed, {failedJobs} failed
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Confidence</p>
                <p className="text-3xl font-bold text-foreground">{avgConfidence}%</p>
              </div>
              <div className="p-3 rounded-full bg-primary/10">
                <Activity className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Processing</p>
                <p className="text-3xl font-bold text-foreground">{(avgProcessingTime / 1000).toFixed(1)}s</p>
              </div>
              <div className="p-3 rounded-full bg-warning/10">
                <Clock className="w-6 h-6 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Jobs Table */}
        <Card className="lg:col-span-2 border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Recent Extraction Jobs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>File</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs.map((job) => (
                    <TableRow 
                      key={job.id} 
                      className={`cursor-pointer hover:bg-accent/50 ${selectedJob === job.id ? 'bg-accent' : ''}`}
                      onClick={() => setSelectedJob(job.id)}
                    >
                      <TableCell>
                        <div>
                          <p className="font-medium text-foreground truncate max-w-[200px]">{job.file_name}</p>
                          <p className="text-xs text-muted-foreground">{formatFileSize(job.file_size)}</p>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(job.status)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {job.processing_time_ms ? `${(job.processing_time_ms / 1000).toFixed(1)}s` : '-'}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(job.created_at), 'MMM d, HH:mm')}
                      </TableCell>
                    </TableRow>
                  ))}
                  {jobs.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        No extraction jobs yet. Upload a document to get started.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Result Detail / Errors */}
        <div className="space-y-6">
          {/* Selected Result */}
          {selectedResult && (
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-lg">Extraction Result</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Document Type</span>
                  <Badge variant="outline">{selectedResult.document_type || 'Unknown'}</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Confidence</span>
                  <span className="font-mono">{((selectedResult.confidence || 0) * 100).toFixed(1)}%</span>
                </div>
                {selectedResult.raw_text && (
                  <div className="mt-4">
                    <p className="text-sm text-muted-foreground mb-2">Extracted Text Preview</p>
                    <div className="bg-muted/50 rounded-lg p-3 text-xs font-mono max-h-[150px] overflow-auto">
                      {selectedResult.raw_text.slice(0, 500)}
                      {selectedResult.raw_text.length > 500 && '...'}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Recent Errors */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <AlertTriangle className="w-4 h-4 text-warning" />
                Recent Errors
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[200px]">
                {errors.length > 0 ? (
                  <div className="space-y-3">
                    {errors.slice(0, 5).map((error) => (
                      <div key={error.id} className="border-b border-border/50 pb-3 last:border-0">
                        <div className="flex items-center gap-2">
                          <Badge variant="destructive" className="text-xs">{error.error_code}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{error.error_message}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(error.created_at), 'MMM d, HH:mm')}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-4">No errors recorded</p>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
