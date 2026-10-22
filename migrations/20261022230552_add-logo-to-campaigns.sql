-- Add logo column to campaigns table
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS logo TEXT;
