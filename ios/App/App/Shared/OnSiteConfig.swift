import Foundation

struct OnSiteConfig {
    static let supabaseURL = "https://ujhgwcurllkkeouzwvgk.supabase.co"
    static let supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqaGd3Y3VybGxra2VvdXp3dmdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwMzIzMjQsImV4cCI6MjA3MjYwODMyNH0.ez6RDJ2FxgSfb7mo2Xug1lXaynKLR-2nJFO-x64UNnY"
    static let chatFunctionPath = "/functions/v1/contractor-chat"
    static let tokenRefreshPath = "/auth/v1/token?grant_type=refresh_token"

    // Keychain keys
    static let keychainAccessToken = "supabase_access_token"
    static let keychainRefreshToken = "supabase_refresh_token"
    static let keychainUserId = "supabase_user_id"
}
