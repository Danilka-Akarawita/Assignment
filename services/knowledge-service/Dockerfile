FROM node:20-alpine AS deps

WORKDIR /app

# Copy full shared package so local file dependency resolution has all build files.
COPY packages/shared ./packages/shared
COPY services/knowledge-service/package*.json ./services/knowledge-service/
COPY services/knowledge-service/prisma ./services/knowledge-service/prisma

RUN npm ci --ignore-scripts --prefix ./packages/shared
RUN npm install --ignore-scripts --prefix ./services/knowledge-service


FROM deps AS builder

WORKDIR /app
ARG DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres?schema=public
ENV DATABASE_URL=${DATABASE_URL}

COPY packages/shared ./packages/shared
COPY services/knowledge-service ./services/knowledge-service

RUN npm run build --prefix ./packages/shared
RUN npm run build --prefix ./services/knowledge-service


FROM node:20-alpine AS runner

ENV NODE_ENV=production
WORKDIR /app

COPY --from=deps /app/services/knowledge-service/node_modules ./services/knowledge-service/node_modules
COPY --from=builder /app/services/knowledge-service/dist ./services/knowledge-service/dist
COPY --from=builder /app/services/knowledge-service/prisma ./services/knowledge-service/prisma
COPY --from=builder /app/services/knowledge-service/package.json ./services/knowledge-service/package.json
COPY --from=builder /app/packages/shared ./packages/shared

WORKDIR /app/services/knowledge-service

EXPOSE 3002

CMD ["node", "dist/index.js"]
