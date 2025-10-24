-- Migration: Add AI Chatbot Support to calculator_estimates
-- Adds support for custom line items, price overrides, and user preferences

-- 1. Add new columns to calculator_estimates for flexible AI-generated estimates
ALTER TABLE calculator_estimates
ADD COLUMN IF NOT EXISTS custom_line_items JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS price_overrides JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS ai_conversation_history JSONB DEFAULT '[]'::jsonb;

-- 2. Create user_preferences table for AI memory
CREATE TABLE IF NOT EXISTS user_calculator_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    preference_key TEXT NOT NULL, -- e.g., 'preferred_decking_brand', 'default_labor_rate'
    preference_value JSONB NOT NULL, -- flexible storage for any preference type
    category TEXT, -- e.g., 'materials', 'labor', 'general'
    last_used_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, preference_key)
);

-- 3. Create indexes for preferences
CREATE INDEX idx_user_preferences_user_id ON user_calculator_preferences(user_id);
CREATE INDEX idx_user_preferences_category ON user_calculator_preferences(category);
CREATE INDEX idx_user_preferences_last_used ON user_calculator_preferences(last_used_at DESC);

-- 4. Enable RLS on preferences
ALTER TABLE user_calculator_preferences ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies for preferences
CREATE POLICY "Users can view their own preferences"
    ON user_calculator_preferences
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences"
    ON user_calculator_preferences
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
    ON user_calculator_preferences
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own preferences"
    ON user_calculator_preferences
    FOR DELETE
    USING (auth.uid() = user_id);

-- 6. Create trigger for updated_at on preferences
CREATE OR REPLACE FUNCTION update_user_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS user_preferences_updated_at_trigger ON user_calculator_preferences;
CREATE TRIGGER user_preferences_updated_at_trigger
    BEFORE UPDATE ON user_calculator_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_user_preferences_updated_at();

-- 7. Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON user_calculator_preferences TO authenticated;

-- 8. Add comments for documentation
COMMENT ON TABLE user_calculator_preferences IS 'Stores user preferences for AI chatbot memory (materials, brands, labor rates, etc.)';
COMMENT ON COLUMN calculator_estimates.custom_line_items IS 'AI-added custom items: permits, fees, custom materials, etc. Format: [{name, quantity, unit, price, total, type}]';
COMMENT ON COLUMN calculator_estimates.price_overrides IS 'User-specified price overrides for standard materials. Format: {itemKey: {standardPrice, customPrice, reason}}';
COMMENT ON COLUMN calculator_estimates.ai_conversation_history IS 'Chat conversation history for this estimate. Format: [{role, content, timestamp}]';

-- 9. Create helper function to upsert preferences
CREATE OR REPLACE FUNCTION upsert_user_preference(
    p_user_id UUID,
    p_key TEXT,
    p_value JSONB,
    p_category TEXT DEFAULT NULL
)
RETURNS user_calculator_preferences AS $$
DECLARE
    result user_calculator_preferences;
BEGIN
    INSERT INTO user_calculator_preferences (user_id, preference_key, preference_value, category, last_used_at)
    VALUES (p_user_id, p_key, p_value, p_category, NOW())
    ON CONFLICT (user_id, preference_key)
    DO UPDATE SET
        preference_value = EXCLUDED.preference_value,
        category = COALESCE(EXCLUDED.category, user_calculator_preferences.category),
        last_used_at = NOW(),
        updated_at = NOW()
    RETURNING * INTO result;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Create helper function to get user preference
CREATE OR REPLACE FUNCTION get_user_preference(
    p_user_id UUID,
    p_key TEXT
)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT preference_value INTO result
    FROM user_calculator_preferences
    WHERE user_id = p_user_id AND preference_key = p_key;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Example preference data structure (for reference)
COMMENT ON FUNCTION upsert_user_preference IS
'Upsert user preference. Example:
- Key: "preferred_decking_brand"
- Value: {"brand": "Trex Transcend", "price_per_20ft": 136.00, "last_project": "Johnson Deck"}
- Category: "materials"';
