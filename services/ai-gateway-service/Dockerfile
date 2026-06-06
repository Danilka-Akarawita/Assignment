FROM node:20-alpine AS deps

WORKDIR /app

# Copy full shared package so local file dependency resolution has all build files.
COPY packages/shared ./packages/shared
COPY services/ai-gateway-service/package*.json ./services/ai-gateway-service/
COPY services/ai-gateway-service/prisma ./services/ai-gateway-service/prisma

RUN npm ci --ignore-scripts --prefix ./packages/shared
RUN npm ci --ignore-scripts --prefix ./services/ai-gateway-service


FROM deps AS builder

WORKDIR /app
ARG DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres?schema=public
ENV DATABASE_URL=${DATABASE_URL}

COPY packages/shared ./packages/shared
COPY services/ai-gateway-service ./services/ai-gateway-service

RUN npm run build --prefix ./packages/shared
RUN npm run build --prefix ./services/ai-gateway-service


FROM node:20-alpine AS runner

ENV NODE_ENV=production
WORKDIR /app

COPY --from=deps /app/services/ai-gateway-service/node_modules ./services/ai-gateway-service/node_modules
COPY --from=builder /app/services/ai-gateway-service/dist ./services/ai-gateway-service/dist
COPY --from=builder /app/services/ai-gateway-service/prisma ./services/ai-gateway-service/prisma
COPY --from=builder /app/services/ai-gateway-service/package.json ./services/ai-gateway-service/package.json
COPY --from=builder /app/packages/shared ./packages/shared

WORKDIR /app/services/ai-gateway-service

EXPOSE 3004

CMD ["node", "dist/index.js"]
