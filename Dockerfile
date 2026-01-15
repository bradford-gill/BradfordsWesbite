# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY project/package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY project/ ./

# Build the app
RUN npm run build

# Production stage
FROM caddy:2-alpine

# Copy built assets from builder
COPY --from=builder /app/dist /srv

# Copy Caddyfile
COPY Caddyfile /etc/caddy/Caddyfile

EXPOSE 80

