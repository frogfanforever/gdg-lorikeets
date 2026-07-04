# Build the Storybook static site and serve it with Nginx. Context = solvermaster/ root.
FROM node:20-alpine AS builder
WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY . .
# CI=true + telemetry opt-out so the build never blocks on Storybook's
# interactive "send anonymous crash reports?" prompt (no stdin in the container).
ENV CI=true STORYBOOK_DISABLE_TELEMETRY=1 STORYBOOK_TELEMETRY_DISABLED=1
RUN npx nx build-storybook frontend --configuration ci

# --- Nginx runtime ---
FROM nginx:alpine
COPY apps/frontend/storybook-nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=builder /usr/src/app/dist/storybook/frontend /usr/share/nginx/html

ENV PORT=8080
EXPOSE 8080
