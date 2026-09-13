# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Install deps first (layer caching)
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
# Build args become Vite env vars at build time (these are server-side-only keys,
# passed at container start NOT baked into the bundle — see entrypoint.sh)
RUN npm run build

# ── Stage 2: Serve ────────────────────────────────────────────────────────────
FROM nginx:1.27-alpine AS runner

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Clean nginx config and add SPA fallback
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
