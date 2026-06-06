FROM node:20-alpine AS deps

WORKDIR /app

# Install dependencies for local package links first.
COPY packages/shared/package*.json ./packages/shared/
COPY services/auth-service/package*.json ./services/auth-service/

RUN npm ci --prefix ./packages/shared
RUN npm ci --prefix ./services/auth-service


FROM deps AS builder

WORKDIR /app

COPY packages/shared ./packages/shared
COPY services/auth-service ./services/auth-service

RUN npm run build --prefix ./packages/shared
RUN npm run build --prefix ./services/auth-service


FROM node:20-alpine AS runner

ENV NODE_ENV=production
WORKDIR /app

# Keep the monorepo-relative layout because auth-service uses a local file dependency.
COPY --from=deps /app/services/auth-service/node_modules ./services/auth-service/node_modules
COPY --from=builder /app/services/auth-service/dist ./services/auth-service/dist
COPY --from=builder /app/services/auth-service/prisma ./services/auth-service/prisma
COPY --from=builder /app/services/auth-service/package.json ./services/auth-service/package.json
COPY --from=builder /app/packages/shared ./packages/shared

WORKDIR /app/services/auth-service

EXPOSE 3002

CMD ["node", "dist/index.js"]
