-- Add client_name column to sales_deals table
ALTER TABLE public.sales_deals 
ADD COLUMN IF NOT EXISTS client_name text;
