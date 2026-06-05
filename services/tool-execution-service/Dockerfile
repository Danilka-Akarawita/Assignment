# syntax=docker/dockerfile:1

FROM node:22-alpine AS shared-builder
WORKDIR /packages/shared
COPY packages/shared/package*.json ./
RUN npm ci
COPY packages/shared/ ./
RUN npm run build && npm prune --omit=dev

FROM node:22-alpine AS deps
WORKDIR /app
COPY packages/shared /packages/shared
COPY --from=shared-builder /packages/shared/dist /packages/shared/dist
COPY services/tool-execution-service/package*.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
COPY packages/shared /packages/shared
COPY --from=shared-builder /packages/shared/dist /packages/shared/dist
COPY --from=deps /app/node_modules ./node_modules
COPY services/tool-execution-service/prisma ./prisma
COPY services/tool-execution-service/prisma.config.ts ./
COPY services/tool-execution-service/tsconfig.json ./
COPY services/tool-execution-service/src ./src
RUN npx prisma generate && npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001 -G nodejs
COPY packages/shared /packages/shared
COPY --from=shared-builder /packages/shared/dist /packages/shared/dist
COPY --from=shared-builder /packages/shared/node_modules /packages/shared/node_modules
COPY services/tool-execution-service/package*.json ./
RUN npm ci --omit=dev
COPY services/tool-execution-service/prisma ./prisma
COPY services/tool-execution-service/prisma.config.ts ./
RUN npx prisma generate
COPY --from=builder /app/dist ./dist
USER nodejs
EXPOSE 3003
CMD ["node", "dist/index.js"]
