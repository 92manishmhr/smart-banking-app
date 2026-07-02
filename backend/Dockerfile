# Smart AI Bank — backend API
FROM node:22-alpine

WORKDIR /app

# Install dependencies first so Docker layer caching kicks in.
COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

# OpenShift runs containers with a random non-root UID; files are readable
# by default, and we don't write to disk, so no special permissions needed.
ENV NODE_ENV=production
EXPOSE 4000

CMD ["node", "server.js"]
