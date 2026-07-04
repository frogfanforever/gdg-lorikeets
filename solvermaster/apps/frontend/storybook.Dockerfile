# Build the Storybook static site and serve it with Nginx. Context = solvermaster/ root.
FROM node:20-alpine AS builder
WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY . .
RUN npx nx build-storybook frontend

# --- Nginx runtime ---
FROM nginx:alpine
COPY apps/frontend/storybook-nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=builder /usr/src/app/dist/storybook/frontend /usr/share/nginx/html

ENV PORT=8080
EXPOSE 8080
