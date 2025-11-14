#!/bin/sh
# Entrypoint script for Kong to replace JWT_SECRET in kong.yml

set -e

# Replace JWT_SECRET in template file
if [ -n "$JWT_SECRET" ]; then
  echo "Replacing JWT_SECRET in kong.yml..."
  sed "s|\${JWT_SECRET}|$JWT_SECRET|g" /tmp/kong.yml.template > /tmp/kong.yml
  echo "JWT_SECRET replaced successfully"
else
  echo "WARNING: JWT_SECRET is not set! Using template as-is."
  cp /tmp/kong.yml.template /tmp/kong.yml
fi

# Start Kong
echo "Starting Kong..."
kong migrations bootstrap
kong start -c /tmp/kong.yml
echo "Kong started successfully"
tail -f /dev/null

