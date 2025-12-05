-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  total_extractions INTEGER DEFAULT 0,
  successful_extractions INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data ->> 'avatar_url'
  );
  RETURN NEW;
END;
$$;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Add user_id to ocr_jobs for tracking
ALTER TABLE public.ocr_jobs ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Update RLS policies for ocr_jobs to be user-specific
DROP POLICY IF EXISTS "Allow public read access to ocr_jobs" ON public.ocr_jobs;
DROP POLICY IF EXISTS "Allow public insert access to ocr_jobs" ON public.ocr_jobs;
DROP POLICY IF EXISTS "Allow public update access to ocr_jobs" ON public.ocr_jobs;

CREATE POLICY "Users can view their own jobs" ON public.ocr_jobs
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert their own jobs" ON public.ocr_jobs
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update their own jobs" ON public.ocr_jobs
  FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL);

-- Update RLS for ocr_results
DROP POLICY IF EXISTS "Allow public read access to ocr_results" ON public.ocr_results;
DROP POLICY IF EXISTS "Allow public insert access to ocr_results" ON public.ocr_results;

CREATE POLICY "Users can view results of their jobs" ON public.ocr_results
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.ocr_jobs WHERE id = ocr_results.job_id AND (user_id = auth.uid() OR user_id IS NULL))
  );

CREATE POLICY "Service can insert results" ON public.ocr_results
  FOR INSERT WITH CHECK (true);

-- Update RLS for ocr_errors
DROP POLICY IF EXISTS "Allow public read access to ocr_errors" ON public.ocr_errors;
DROP POLICY IF EXISTS "Allow public insert access to ocr_errors" ON public.ocr_errors;

CREATE POLICY "Users can view errors of their jobs" ON public.ocr_errors
  FOR SELECT USING (
    job_id IS NULL OR EXISTS (SELECT 1 FROM public.ocr_jobs WHERE id = ocr_errors.job_id AND (user_id = auth.uid() OR user_id IS NULL))
  );

CREATE POLICY "Service can insert errors" ON public.ocr_errors
  FOR INSERT WITH CHECK (true);

-- Create index for user_id lookups
CREATE INDEX idx_ocr_jobs_user_id ON public.ocr_jobs(user_id);

-- Function to update profile stats
CREATE OR REPLACE FUNCTION public.update_profile_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('completed', 'failed') AND NEW.user_id IS NOT NULL THEN
    UPDATE public.profiles SET
      total_extractions = total_extractions + 1,
      successful_extractions = CASE WHEN NEW.status = 'completed' THEN successful_extractions + 1 ELSE successful_extractions END,
      updated_at = now()
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to update profile stats
CREATE TRIGGER trigger_update_profile_stats
AFTER UPDATE ON public.ocr_jobs
FOR EACH ROW
EXECUTE FUNCTION public.update_profile_stats();