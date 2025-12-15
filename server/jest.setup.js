// Set default environment variables for testing
process.env.NODE_ENV = "test";
process.env.PORT = "5000";
process.env.ACCESS_TOKEN_SECRET = "test_access_secret";
process.env.ACCESS_TOKEN_EXPIRY = "15m";
process.env.REFRESH_TOKEN_SECRET = "test_refresh_secret";
process.env.REFRESH_TOKEN_EXPIRY = "7d";
process.env.RESET_PASSWORD_TOKEN_SECRET = "test_reset_secret";
process.env.RESET_PASSWORD_TOKEN_EXPIRY = "15m";
process.env.GOOGLE_CLIENT_ID = "test_google_client_id";
process.env.GOOGLE_CLIENT_SECRET = "test_google_client_secret";
process.env.GOOGLE_REDIRECT_URI = "test_google_redirect_uri";

// Increase timeout for tests if needed
jest.setTimeout(30000);
