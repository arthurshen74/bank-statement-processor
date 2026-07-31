FROM node:22-alpine

# gettext provides envsubst, used by the entrypoint to render public/config.json
RUN apk add --no-cache gettext

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 5173

ENTRYPOINT ["docker-entrypoint.sh"]
