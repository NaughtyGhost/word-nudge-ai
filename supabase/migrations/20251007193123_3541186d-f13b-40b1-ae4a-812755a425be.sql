-- Create characters table
CREATE TABLE public.characters (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  manuscript_id uuid NOT NULL REFERENCES public.manuscripts(id) ON DELETE CASCADE,
  name text NOT NULL,
  role text,
  description text,
  personality text,
  background text,
  relationships jsonb DEFAULT '[]'::jsonb,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.characters ENABLE ROW LEVEL SECURITY;

-- RLS policies for characters
CREATE POLICY "Users can view their own characters"
ON public.characters FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.manuscripts
    WHERE manuscripts.id = characters.manuscript_id
    AND manuscripts.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create characters for their manuscripts"
ON public.characters FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.manuscripts
    WHERE manuscripts.id = characters.manuscript_id
    AND manuscripts.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own characters"
ON public.characters FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.manuscripts
    WHERE manuscripts.id = characters.manuscript_id
    AND manuscripts.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own characters"
ON public.characters FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.manuscripts
    WHERE manuscripts.id = characters.manuscript_id
    AND manuscripts.user_id = auth.uid()
  )
);

-- Create chapter_versions table for version snapshots
CREATE TABLE public.chapter_versions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  manuscript_id uuid NOT NULL REFERENCES public.manuscripts(id) ON DELETE CASCADE,
  chapter_id text NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  version_number integer NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chapter_versions ENABLE ROW LEVEL SECURITY;

-- RLS policies for chapter_versions
CREATE POLICY "Users can view their own chapter versions"
ON public.chapter_versions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.manuscripts
    WHERE manuscripts.id = chapter_versions.manuscript_id
    AND manuscripts.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create chapter versions for their manuscripts"
ON public.chapter_versions FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.manuscripts
    WHERE manuscripts.id = chapter_versions.manuscript_id
    AND manuscripts.user_id = auth.uid()
  )
);

-- Add trigger for updating updated_at on characters
CREATE TRIGGER update_characters_updated_at
BEFORE UPDATE ON public.characters
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();