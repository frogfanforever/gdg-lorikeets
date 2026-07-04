# Multi-stage build for the Angular frontend, served by Nginx (Nx monorepo).
# Build context = example-app/ root.
FROM node:20-alpine AS builder
WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY . .
RUN npx nx build frontend --configuration=production

# --- Nginx runtime ---
FROM nginx:alpine
# Templated config: envsubst fills ${PORT}/${BACKEND_URL} at container start
# (only env-defined vars are substituted, so nginx's own $uri/$host survive).
COPY apps/frontend/nginx.conf /etc/nginx/templates/default.conf.template
# Angular's application builder emits static assets under browser/
COPY --from=builder /usr/src/app/dist/apps/frontend/browser /usr/share/nginx/html

ENV PORT=8080
EXPOSE 8080
