-- Create profiles table for app user data
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
