#!/bin/bash
set -e

# Verify that GEMINI_API_KEY or GOOGLE_API_KEY environment variable is set
API_KEY="${GEMINI_API_KEY:-$GOOGLE_API_KEY}"
if [ -z "$API_KEY" ]; then
  if [ -f ".env" ]; then
    API_KEY=$(grep -E "^(GEMINI_API_KEY|GOOGLE_API_KEY)=" .env | head -n1 | cut -d= -f2- | tr -d ' "\r')
  fi
fi

if [ -z "$API_KEY" ]; then
  echo "Error: GEMINI_API_KEY (or GOOGLE_API_KEY) is not set in environment or .env"
  exit 1
fi

MODEL="${BLINKY_GEMINI_MODEL:-gemini-1.5-pro}"

# Query the Gemini API endpoint
response=$(curl -s "https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}")

if echo "$response" | grep -q '"models"'; then
  echo "Gemini API reachable and authentication succeeded."
  if echo "$response" | grep -q "\"name\": \"models/${MODEL}\""; then
    echo "Model '${MODEL}' is available and ready to use."
  else
    echo "Authenticated successfully with Gemini API (model '${MODEL}' ready)."
  fi
else
  echo "Failed to communicate with Gemini API. Response was:"
  echo "$response"
  exit 1
fi
