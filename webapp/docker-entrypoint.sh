#!/bin/sh
set -eu

# Render the runtime config the app fetches at startup (see src/config.js) from
# the environment, so API URLs and ports live only in the root .env file.
: "${API_BASE_URL:?API_BASE_URL is not set}"
: "${PYTHON_API_BASE_URL:?PYTHON_API_BASE_URL is not set}"
: "${WEBAPP_PORT:=5173}"

envsubst '${API_BASE_URL} ${PYTHON_API_BASE_URL}' \
  < /app/public/config.json.template \
  > /app/public/config.json

echo "Rendered /app/public/config.json:"
cat /app/public/config.json

exec npm run dev -- --host 0.0.0.0 --port "${WEBAPP_PORT}"
