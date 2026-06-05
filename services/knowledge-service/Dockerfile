FROM node:22-alpine AS builder
WORKDIR /app
COPY packages/shared /packages/shared
RUN npm ci --prefix /packages/shared && npm run build --prefix /packages/shared
COPY services/knowledge-service/package*.json ./
RUN npm ci
COPY services/knowledge-service/prisma ./prisma
COPY services/knowledge-service/prisma.config.ts ./
RUN npx prisma generate
COPY services/knowledge-service/tsconfig.json ./
COPY services/knowledge-service/src ./src
RUN npm run build

FROM node:22-alpine
WORKDIR /app
COPY packages/shared /packages/shared
RUN npm ci --prefix /packages/shared --omit=dev && npm run build --prefix /packages/shared
COPY services/knowledge-service/package*.json ./
RUN npm ci --omit=dev
COPY services/knowledge-service/prisma ./prisma
COPY services/knowledge-service/prisma.config.ts ./
RUN npx prisma generate
COPY --from=builder /app/dist ./dist
EXPOSE 3002
CMD ["node", "dist/index.js"]
