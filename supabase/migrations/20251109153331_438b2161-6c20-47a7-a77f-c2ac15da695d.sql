-- Create plot_points table for story arc visualization
CREATE TABLE public.plot_points (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  manuscript_id UUID NOT NULL,
  chapter_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  plot_type TEXT,
  tension_level INTEGER CHECK (tension_level >= 1 AND tension_level <= 10),
  sequence_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.plot_points ENABLE ROW LEVEL SECURITY;

-- Create policies for plot_points
CREATE POLICY "Users can view their own plot points"
ON public.plot_points FOR SELECT
USING (EXISTS (
  SELECT 1 FROM manuscripts
  WHERE manuscripts.id = plot_points.manuscript_id
  AND manuscripts.user_id = auth.uid()
));

CREATE POLICY "Users can create plot points for their manuscripts"
ON public.plot_points FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM manuscripts
  WHERE manuscripts.id = plot_points.manuscript_id
  AND manuscripts.user_id = auth.uid()
));

CREATE POLICY "Users can update their own plot points"
ON public.plot_points FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM manuscripts
  WHERE manuscripts.id = plot_points.manuscript_id
  AND manuscripts.user_id = auth.uid()
));

CREATE POLICY "Users can delete their own plot points"
ON public.plot_points FOR DELETE
USING (EXISTS (
  SELECT 1 FROM manuscripts
  WHERE manuscripts.id = plot_points.manuscript_id
  AND manuscripts.user_id = auth.uid()
));

-- Create conflicts table
CREATE TABLE public.conflicts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  manuscript_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  conflict_type TEXT,
  status TEXT DEFAULT 'unresolved',
  introduced_chapter TEXT,
  resolved_chapter TEXT,
  characters_involved TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.conflicts ENABLE ROW LEVEL SECURITY;

-- Create policies for conflicts
CREATE POLICY "Users can view their own conflicts"
ON public.conflicts FOR SELECT
USING (EXISTS (
  SELECT 1 FROM manuscripts
  WHERE manuscripts.id = conflicts.manuscript_id
  AND manuscripts.user_id = auth.uid()
));

CREATE POLICY "Users can create conflicts for their manuscripts"
ON public.conflicts FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM manuscripts
  WHERE manuscripts.id = conflicts.manuscript_id
  AND manuscripts.user_id = auth.uid()
));

CREATE POLICY "Users can update their own conflicts"
ON public.conflicts FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM manuscripts
  WHERE manuscripts.id = conflicts.manuscript_id
  AND manuscripts.user_id = auth.uid()
));

CREATE POLICY "Users can delete their own conflicts"
ON public.conflicts FOR DELETE
USING (EXISTS (
  SELECT 1 FROM manuscripts
  WHERE manuscripts.id = conflicts.manuscript_id
  AND manuscripts.user_id = auth.uid()
));

-- Create drafts table
CREATE TABLE public.drafts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  manuscript_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  content JSONB NOT NULL DEFAULT '{"chapters": []}'::jsonb,
  is_current BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.drafts ENABLE ROW LEVEL SECURITY;

-- Create policies for drafts
CREATE POLICY "Users can view their own drafts"
ON public.drafts FOR SELECT
USING (EXISTS (
  SELECT 1 FROM manuscripts
  WHERE manuscripts.id = drafts.manuscript_id
  AND manuscripts.user_id = auth.uid()
));

CREATE POLICY "Users can create drafts for their manuscripts"
ON public.drafts FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM manuscripts
  WHERE manuscripts.id = drafts.manuscript_id
  AND manuscripts.user_id = auth.uid()
));

CREATE POLICY "Users can update their own drafts"
ON public.drafts FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM manuscripts
  WHERE manuscripts.id = drafts.manuscript_id
  AND manuscripts.user_id = auth.uid()
));

CREATE POLICY "Users can delete their own drafts"
ON public.drafts FOR DELETE
USING (EXISTS (
  SELECT 1 FROM manuscripts
  WHERE manuscripts.id = drafts.manuscript_id
  AND manuscripts.user_id = auth.uid()
));

-- Add triggers for updated_at
CREATE TRIGGER update_plot_points_updated_at
BEFORE UPDATE ON public.plot_points
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_conflicts_updated_at
BEFORE UPDATE ON public.conflicts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_drafts_updated_at
BEFORE UPDATE ON public.drafts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();