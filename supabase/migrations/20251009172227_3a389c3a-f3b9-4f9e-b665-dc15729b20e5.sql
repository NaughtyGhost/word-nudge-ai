-- Create locations table for world-building
CREATE TABLE public.locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  manuscript_id UUID NOT NULL,
  name TEXT NOT NULL,
  type TEXT,
  description TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

-- Create policies for locations
CREATE POLICY "Users can view their own locations"
ON public.locations
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM manuscripts
  WHERE manuscripts.id = locations.manuscript_id
  AND manuscripts.user_id = auth.uid()
));

CREATE POLICY "Users can create locations for their manuscripts"
ON public.locations
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM manuscripts
  WHERE manuscripts.id = locations.manuscript_id
  AND manuscripts.user_id = auth.uid()
));

CREATE POLICY "Users can update their own locations"
ON public.locations
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM manuscripts
  WHERE manuscripts.id = locations.manuscript_id
  AND manuscripts.user_id = auth.uid()
));

CREATE POLICY "Users can delete their own locations"
ON public.locations
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM manuscripts
  WHERE manuscripts.id = locations.manuscript_id
  AND manuscripts.user_id = auth.uid()
));

-- Create trigger for locations updated_at
CREATE TRIGGER update_locations_updated_at
BEFORE UPDATE ON public.locations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create timeline_events table
CREATE TABLE public.timeline_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  manuscript_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  event_date TEXT,
  event_time TEXT,
  category TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.timeline_events ENABLE ROW LEVEL SECURITY;

-- Create policies for timeline_events
CREATE POLICY "Users can view their own timeline events"
ON public.timeline_events
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM manuscripts
  WHERE manuscripts.id = timeline_events.manuscript_id
  AND manuscripts.user_id = auth.uid()
));

CREATE POLICY "Users can create timeline events for their manuscripts"
ON public.timeline_events
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM manuscripts
  WHERE manuscripts.id = timeline_events.manuscript_id
  AND manuscripts.user_id = auth.uid()
));

CREATE POLICY "Users can update their own timeline events"
ON public.timeline_events
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM manuscripts
  WHERE manuscripts.id = timeline_events.manuscript_id
  AND manuscripts.user_id = auth.uid()
));

CREATE POLICY "Users can delete their own timeline events"
ON public.timeline_events
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM manuscripts
  WHERE manuscripts.id = timeline_events.manuscript_id
  AND manuscripts.user_id = auth.uid()
));

-- Create trigger for timeline_events updated_at
CREATE TRIGGER update_timeline_events_updated_at
BEFORE UPDATE ON public.timeline_events
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();