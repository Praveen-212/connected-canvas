
-- Create doctors table
CREATE TABLE public.doctors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  specialization TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create tokens table
CREATE TABLE public.tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  patient_name TEXT NOT NULL,
  patient_phone TEXT NOT NULL,
  token_number INTEGER NOT NULL,
  token_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  queue_position INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Unique constraint: token_number per doctor per day
ALTER TABLE public.tokens ADD CONSTRAINT tokens_unique_per_doctor_per_day 
  UNIQUE (doctor_id, token_date, token_number);

-- Index for efficient queue queries
CREATE INDEX idx_tokens_doctor_date ON public.tokens(doctor_id, token_date);
CREATE INDEX idx_tokens_status ON public.tokens(status);

-- Enable RLS
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tokens ENABLE ROW LEVEL SECURITY;

-- Public read/write policies (clinic app - no user auth needed for this use case)
CREATE POLICY "Anyone can view doctors" ON public.doctors FOR SELECT USING (true);
CREATE POLICY "Anyone can insert doctors" ON public.doctors FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can view tokens" ON public.tokens FOR SELECT USING (true);
CREATE POLICY "Anyone can insert tokens" ON public.tokens FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update tokens" ON public.tokens FOR UPDATE USING (true);

-- Enable realtime for tokens
ALTER PUBLICATION supabase_realtime ADD TABLE public.tokens;
ALTER PUBLICATION supabase_realtime ADD TABLE public.doctors;

-- Function to get next token number (handles concurrency)
CREATE OR REPLACE FUNCTION public.get_next_token_number(p_doctor_id UUID, p_date DATE)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_next_number INTEGER;
BEGIN
  -- Lock and get the max token number for this doctor on this date
  SELECT COALESCE(MAX(token_number), 0) + 1
  INTO v_next_number
  FROM public.tokens
  WHERE doctor_id = p_doctor_id AND token_date = p_date
  FOR UPDATE;
  
  RETURN v_next_number;
END;
$$;

-- Function to generate token atomically (handles concurrency)
CREATE OR REPLACE FUNCTION public.generate_token(
  p_doctor_id UUID,
  p_patient_name TEXT,
  p_patient_phone TEXT
)
RETURNS TABLE(token_number INTEGER, token_date DATE, queue_position INTEGER, token_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token_number INTEGER;
  v_date DATE := CURRENT_DATE;
  v_token_id UUID;
BEGIN
  -- Get next token number atomically
  SELECT COALESCE(MAX(t.token_number), 0) + 1
  INTO v_token_number
  FROM public.tokens t
  WHERE t.doctor_id = p_doctor_id AND t.token_date = v_date
  FOR UPDATE;

  -- Insert new token
  INSERT INTO public.tokens (doctor_id, patient_name, patient_phone, token_number, token_date, queue_position)
  VALUES (p_doctor_id, p_patient_name, p_patient_phone, v_token_number, v_date, v_token_number)
  RETURNING id INTO v_token_id;

  RETURN QUERY SELECT v_token_number, v_date, v_token_number, v_token_id;
END;
$$;
