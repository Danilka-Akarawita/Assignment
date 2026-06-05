FROM node:22-alpine AS builder
WORKDIR /app
COPY packages/shared /packages/shared
RUN npm ci --prefix /packages/shared && npm run build --prefix /packages/shared
COPY services/ai-gateway-service/package*.json ./
RUN npm ci
COPY services/ai-gateway-service/prisma ./prisma
COPY services/ai-gateway-service/prisma.config.ts ./
RUN npx prisma generate
COPY services/ai-gateway-service/tsconfig.json ./
COPY services/ai-gateway-service/src ./src
RUN npm run build

FROM node:22-alpine
WORKDIR /app
COPY packages/shared /packages/shared
RUN npm ci --prefix /packages/shared --omit=dev && npm run build --prefix /packages/shared
COPY services/ai-gateway-service/package*.json ./
RUN npm ci --omit=dev
COPY services/ai-gateway-service/prisma ./prisma
COPY services/ai-gateway-service/prisma.config.ts ./
RUN npx prisma generate
COPY --from=builder /app/dist ./dist
EXPOSE 3004
CMD ["node", "dist/index.js"]
