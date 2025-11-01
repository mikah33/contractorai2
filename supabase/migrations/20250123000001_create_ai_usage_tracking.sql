-- AI API Usage Tracking
-- Track Anthropic API calls for cost monitoring and analytics

CREATE TABLE IF NOT EXISTS ai_api_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,

    -- Request details
    request_type TEXT NOT NULL DEFAULT 'chat', -- 'chat', 'function_call', etc.
    model TEXT NOT NULL DEFAULT 'claude-3-5-sonnet-20241022',

    -- Token usage
    input_tokens INTEGER NOT NULL DEFAULT 0,
    output_tokens INTEGER NOT NULL DEFAULT 0,
    cache_read_tokens INTEGER DEFAULT 0,
    cache_creation_tokens INTEGER DEFAULT 0,

    -- Cost calculation (in USD)
    input_cost DECIMAL(10, 6) DEFAULT 0,
    output_cost DECIMAL(10, 6) DEFAULT 0,
    total_cost DECIMAL(10, 6) DEFAULT 0,

    -- Metadata
    estimate_id UUID REFERENCES calculator_estimates(id) ON DELETE SET NULL,
    conversation_turns INTEGER DEFAULT 1,
    function_calls_made INTEGER DEFAULT 0,

    -- Timing
    response_time_ms INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for analytics
CREATE INDEX idx_ai_usage_user_id ON ai_api_usage(user_id);
CREATE INDEX idx_ai_usage_created_at ON ai_api_usage(created_at DESC);
CREATE INDEX idx_ai_usage_estimate_id ON ai_api_usage(estimate_id) WHERE estimate_id IS NOT NULL;
CREATE INDEX idx_ai_usage_user_date ON ai_api_usage(user_id, created_at DESC);

-- Enable RLS
ALTER TABLE ai_api_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own API usage"
    ON ai_api_usage
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "System can insert API usage"
    ON ai_api_usage
    FOR INSERT
    WITH CHECK (true); -- Edge function inserts

-- Grant permissions
GRANT SELECT ON ai_api_usage TO authenticated;
GRANT INSERT ON ai_api_usage TO service_role;

-- Helper function to calculate costs
CREATE OR REPLACE FUNCTION calculate_ai_cost(
    p_model TEXT,
    p_input_tokens INTEGER,
    p_output_tokens INTEGER
)
RETURNS TABLE(
    input_cost DECIMAL(10, 6),
    output_cost DECIMAL(10, 6),
    total_cost DECIMAL(10, 6)
) AS $$
DECLARE
    v_input_rate DECIMAL(10, 6);
    v_output_rate DECIMAL(10, 6);
    v_input_cost DECIMAL(10, 6);
    v_output_cost DECIMAL(10, 6);
BEGIN
    -- Claude 3.5 Sonnet pricing (per million tokens)
    -- Input: $3.00, Output: $15.00
    IF p_model LIKE 'claude-3-5-sonnet%' THEN
        v_input_rate := 3.00 / 1000000;
        v_output_rate := 15.00 / 1000000;
    -- Claude 3 Opus pricing
    ELSIF p_model LIKE 'claude-3-opus%' THEN
        v_input_rate := 15.00 / 1000000;
        v_output_rate := 75.00 / 1000000;
    -- Claude 3 Haiku pricing
    ELSIF p_model LIKE 'claude-3-haiku%' THEN
        v_input_rate := 0.25 / 1000000;
        v_output_rate := 1.25 / 1000000;
    ELSE
        -- Default to Sonnet pricing
        v_input_rate := 3.00 / 1000000;
        v_output_rate := 15.00 / 1000000;
    END IF;

    v_input_cost := p_input_tokens * v_input_rate;
    v_output_cost := p_output_tokens * v_output_rate;

    RETURN QUERY SELECT
        v_input_cost,
        v_output_cost,
        v_input_cost + v_output_cost;
END;
$$ LANGUAGE plpgsql;

-- View for user usage summary
CREATE OR REPLACE VIEW user_ai_usage_summary AS
SELECT
    user_id,
    COUNT(*) as total_requests,
    SUM(input_tokens) as total_input_tokens,
    SUM(output_tokens) as total_output_tokens,
    SUM(total_cost) as total_cost,
    AVG(response_time_ms) as avg_response_time_ms,
    MAX(created_at) as last_request_at,
    DATE_TRUNC('month', created_at) as month
FROM ai_api_usage
GROUP BY user_id, DATE_TRUNC('month', created_at);

-- View for daily usage
CREATE OR REPLACE VIEW daily_ai_usage AS
SELECT
    user_id,
    DATE(created_at) as date,
    COUNT(*) as requests,
    SUM(input_tokens) as input_tokens,
    SUM(output_tokens) as output_tokens,
    SUM(total_cost) as cost
FROM ai_api_usage
GROUP BY user_id, DATE(created_at)
ORDER BY date DESC;

-- Grant view access
GRANT SELECT ON user_ai_usage_summary TO authenticated;
GRANT SELECT ON daily_ai_usage TO authenticated;

COMMENT ON TABLE ai_api_usage IS 'Tracks Anthropic Claude API usage for cost monitoring and analytics';
COMMENT ON FUNCTION calculate_ai_cost IS 'Calculates cost based on Claude API pricing tiers';
