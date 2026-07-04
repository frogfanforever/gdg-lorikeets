# Multi-stage build for the NestJS + Sequelize API (Nx monorepo).
# Build context = solvermaster/ root.
FROM node:20-alpine AS builder
WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY . .
RUN npx nx build api --configuration=production

# --- Production runtime ---
FROM node:20-alpine AS runner
WORKDIR /usr/src/app
ENV NODE_ENV=production
ENV PORT=8080

# The Nx webpack build emits dist/apps/api with a generated package.json listing
# runtime deps. Install those, then ensure the pg driver (loaded dynamically by
# Sequelize, so not always detected by generatePackageJson) is present.
COPY --from=builder /usr/src/app/dist/apps/api ./
RUN npm install --omit=dev --legacy-peer-deps \
 && npm install --no-save --legacy-peer-deps pg@^8.22.0 pg-hstore@^2.3.4

EXPOSE 8080
CMD ["node", "main.js"]
