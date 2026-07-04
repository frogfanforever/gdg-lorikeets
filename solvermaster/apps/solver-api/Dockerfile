# Multi-stage build for the NestJS solver-api (Nx monorepo). Context = solvermaster/ root.
FROM node:20-alpine AS builder
WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY . .
RUN npx nx build solver-api --configuration=production

# --- Production runtime ---
FROM node:20-alpine AS runner
WORKDIR /usr/src/app
ENV NODE_ENV=production
ENV PORT=8080

# Nx webpack emits dist/apps/solver-api with a generated package.json of runtime deps.
COPY --from=builder /usr/src/app/dist/apps/solver-api ./
RUN npm install --omit=dev --legacy-peer-deps

EXPOSE 8080
CMD ["node", "main.js"]
