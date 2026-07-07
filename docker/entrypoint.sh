#!/bin/sh
set -e

# Replace __RAZZIA_APP_DOMAIN__ placeholders if APP_DOMAIN environment variable is set
if [ -n "$APP_DOMAIN" ]; then
  # Strip trailing slash if present
  CLEAN_URL=$(echo "$APP_DOMAIN" | sed 's|/$||')
  # Extract host (without scheme) for wildcard matching
  HOST=$(echo "$CLEAN_URL" | sed -e 's|^[^/]*//||' -e 's|/.*$||')
  # Extract scheme (e.g. http or https)
  SCHEME=$(echo "$CLEAN_URL" | grep :// | sed -e 's|://.*||')
  if [ -z "$SCHEME" ]; then
    SCHEME="https"
    CLEAN_URL="https://${CLEAN_URL}"
  fi

  echo "🔧 Configuring PWA for APP_DOMAIN: ${CLEAN_URL} (Host: ${HOST}, Scheme: ${SCHEME})"

  # Replace main origin
  if [ -f /app/web/manifest.webmanifest ]; then
    sed -i "s|https://__RAZZIA_APP_DOMAIN__|${CLEAN_URL}|g" /app/web/manifest.webmanifest
    sed -i "s|https://\*.__RAZZIA_APP_DOMAIN__|${SCHEME}://\*.${HOST}|g" /app/web/manifest.webmanifest
  fi

  # Replace in origin association file
  if [ -f /app/web/.well-known/web-app-origin-association ]; then
    sed -i "s|https://__RAZZIA_APP_DOMAIN__|${CLEAN_URL}|g" /app/web/.well-known/web-app-origin-association
  fi
else
  echo "⚠️ APP_DOMAIN environment variable not set. PWA deep-linking will default to placeholders."
fi

# Run the CMD
exec "$@"
