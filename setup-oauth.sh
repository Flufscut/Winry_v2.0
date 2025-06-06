#!/bin/bash
# Google OAuth Setup Script for Local Development
# Run this script to set up Google OAuth environment variables

echo "🔐 Google OAuth Setup for Winry.AI"
echo "=================================="
echo ""
echo "To enable Google OAuth login, you need to:"
echo ""
echo "1. Go to Google Cloud Console (https://console.cloud.google.com/)"
echo "2. Create a new project or select existing one"
echo "3. Enable Google Identity/OAuth APIs"
echo "4. Create OAuth 2.0 Client ID credentials"
echo "5. Add this callback URL: http://localhost:5001/auth/google/callback"
echo "6. Copy the Client ID and Client Secret"
echo ""
echo "Then set these environment variables:"
echo ""
echo "export GOOGLE_CLIENT_ID='your_client_id_here'"
echo "export GOOGLE_CLIENT_SECRET='your_client_secret_here'"
echo "export GOOGLE_CALLBACK_URL='http://localhost:5001/auth/google/callback'"
echo ""
echo "Or create a .env file with:"
echo "GOOGLE_CLIENT_ID=your_client_id_here"
echo "GOOGLE_CLIENT_SECRET=your_client_secret_here"
echo "GOOGLE_CALLBACK_URL=http://localhost:5001/auth/google/callback"
echo ""
echo "Then restart the server with: npm run dev"
echo ""

# Uncomment and set these after getting credentials from Google Cloud Console:
# export GOOGLE_CLIENT_ID="your_actual_client_id"
# export GOOGLE_CLIENT_SECRET="your_actual_client_secret"
# export GOOGLE_CALLBACK_URL="http://localhost:5001/auth/google/callback"

echo "✅ Setup instructions displayed. Please follow steps above." 