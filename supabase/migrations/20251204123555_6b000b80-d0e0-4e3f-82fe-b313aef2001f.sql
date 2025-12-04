-- Create table for OCR extraction jobs
CREATE TABLE public.ocr_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  file_name TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  processing_time_ms INTEGER,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for OCR results
CREATE TABLE public.ocr_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.ocr_jobs(id) ON DELETE CASCADE,
  document_type TEXT,
  raw_text TEXT,
  confidence NUMERIC(5,4),
  extracted_data JSONB,
  vendor_details JSONB,
  product_details JSONB,
  date_details JSONB,
  reminder_suggestions JSONB,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for OCR errors/logs
CREATE TABLE public.ocr_errors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID REFERENCES public.ocr_jobs(id) ON DELETE CASCADE,
  error_code TEXT NOT NULL,
  error_message TEXT NOT NULL,
  error_details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for OCR statistics (aggregated metrics)
CREATE TABLE public.ocr_statistics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_jobs INTEGER DEFAULT 0,
  successful_jobs INTEGER DEFAULT 0,
  failed_jobs INTEGER DEFAULT 0,
  avg_confidence NUMERIC(5,4),
  avg_processing_time_ms INTEGER,
  document_types JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(date)
);

-- Enable RLS on all tables
ALTER TABLE public.ocr_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ocr_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ocr_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ocr_statistics ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (since no auth is implemented yet)
CREATE POLICY "Allow public read access to ocr_jobs" ON public.ocr_jobs FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to ocr_jobs" ON public.ocr_jobs FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access to ocr_jobs" ON public.ocr_jobs FOR UPDATE USING (true);

CREATE POLICY "Allow public read access to ocr_results" ON public.ocr_results FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to ocr_results" ON public.ocr_results FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read access to ocr_errors" ON public.ocr_errors FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to ocr_errors" ON public.ocr_errors FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read access to ocr_statistics" ON public.ocr_statistics FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to ocr_statistics" ON public.ocr_statistics FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access to ocr_statistics" ON public.ocr_statistics FOR UPDATE USING (true);

-- Create indexes for better query performance
CREATE INDEX idx_ocr_jobs_status ON public.ocr_jobs(status);
CREATE INDEX idx_ocr_jobs_created_at ON public.ocr_jobs(created_at DESC);
CREATE INDEX idx_ocr_results_job_id ON public.ocr_results(job_id);
CREATE INDEX idx_ocr_errors_job_id ON public.ocr_errors(job_id);
CREATE INDEX idx_ocr_statistics_date ON public.ocr_statistics(date DESC);

-- Function to update statistics after job completion
CREATE OR REPLACE FUNCTION public.update_ocr_statistics()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('completed', 'failed') AND (OLD.status IS NULL OR OLD.status != NEW.status) THEN
    INSERT INTO public.ocr_statistics (date, total_jobs, successful_jobs, failed_jobs)
    VALUES (CURRENT_DATE, 1, CASE WHEN NEW.status = 'completed' THEN 1 ELSE 0 END, CASE WHEN NEW.status = 'failed' THEN 1 ELSE 0 END)
    ON CONFLICT (date) DO UPDATE SET
      total_jobs = ocr_statistics.total_jobs + 1,
      successful_jobs = ocr_statistics.successful_jobs + CASE WHEN NEW.status = 'completed' THEN 1 ELSE 0 END,
      failed_jobs = ocr_statistics.failed_jobs + CASE WHEN NEW.status = 'failed' THEN 1 ELSE 0 END,
      updated_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for auto-updating statistics
CREATE TRIGGER trigger_update_ocr_statistics
AFTER UPDATE ON public.ocr_jobs
FOR EACH ROW
EXECUTE FUNCTION public.update_ocr_statistics();