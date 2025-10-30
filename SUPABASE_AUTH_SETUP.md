# Supabase Authentication Setup Guide

This guide walks you through setting up Google OAuth authentication for PromptBoard.

## 1. Google OAuth Configuration

### Step 1: Create Google OAuth Credentials

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API:
   - Go to "APIs & Services" > "Library"
   - Search for "Google+ API" and enable it
4. Create OAuth 2.0 credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth 2.0 Client IDs"
   - Choose "Web application"
   - Add authorized redirect URIs:
     - Development: `https://your-project.supabase.co/auth/v1/callback`
     - Production: `https://your-production-project.supabase.co/auth/v1/callback`

### Step 2: Configure Supabase Auth

1. Go to your Supabase project dashboard
2. Navigate to "Authentication" > "Providers"
3. Enable Google provider:
   - Toggle "Enable sign in with Google"
   - Enter your Google Client ID
   - Enter your Google Client Secret
   - Set redirect URL to: `https://your-project.supabase.co/auth/v1/callback`

### Step 3: Configure Redirect URLs

Add the following redirect URLs in your Supabase Auth settings:

**Development:**
- `http://localhost:3000/auth/callback`
- `raycast://extensions/promptboard/auth/callback`

**Production:**
- `https://your-production-domain.com/auth/callback`
- `raycast://extensions/promptboard/auth/callback`

## 2. Environment Variables

Update your `.env` file with the following variables:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Application URLs
NEXT_PUBLIC_APP_URL=http://localhost:3000
PRODUCTION_APP_URL=https://your-production-domain.com
```

## 3. Verification

After setup, verify the configuration:

1. Test Google OAuth flow in Supabase Auth dashboard
2. Check that redirect URLs are properly configured
3. Ensure environment variables are loaded correctly

## 4. Security Notes

- Keep your Google Client Secret secure and never commit it to version control
- Use different Google OAuth credentials for development and production
- Regularly rotate your Supabase service role key
- Monitor authentication logs for suspicious activity

## 5. Troubleshooting

### Common Issues:

1. **Redirect URI mismatch**: Ensure all redirect URIs are exactly configured in both Google Console and Supabase
2. **Invalid client**: Verify Google Client ID and Secret are correct
3. **CORS errors**: Check that your domain is properly configured in Supabase settings

### Debug Steps:

1. Check Supabase Auth logs in the dashboard
2. Verify environment variables are loaded
3. Test OAuth flow with Supabase's built-in test feature
4. Check browser network tab for detailed error messages
