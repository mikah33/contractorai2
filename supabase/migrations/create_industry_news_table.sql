-- Create industry_news table for storing construction news articles
CREATE TABLE IF NOT EXISTS industry_news (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  summary TEXT, -- AI-generated summary
  source_name TEXT NOT NULL,
  source_url TEXT NOT NULL,
  thumbnail_url TEXT,
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_industry_news_published_at ON industry_news(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_industry_news_is_active ON industry_news(is_active);

-- Enable RLS
ALTER TABLE industry_news ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read news (it's public content)
CREATE POLICY "Anyone can read industry news"
  ON industry_news FOR SELECT
  USING (is_active = true);

-- Only service role can insert/update (edge function)
CREATE POLICY "Service role can manage news"
  ON industry_news FOR ALL
  USING (auth.role() = 'service_role');
