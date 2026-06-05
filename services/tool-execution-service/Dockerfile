FROM node:22-alpine AS builder
WORKDIR /app
COPY packages/shared /packages/shared
RUN npm ci --prefix /packages/shared && npm run build --prefix /packages/shared
COPY services/tool-execution-service/package*.json ./
RUN npm ci
COPY services/tool-execution-service/prisma ./prisma
COPY services/tool-execution-service/prisma.config.ts ./
RUN npx prisma generate
COPY services/tool-execution-service/tsconfig.json ./
COPY services/tool-execution-service/src ./src
RUN npm run build

FROM node:22-alpine
WORKDIR /app
COPY packages/shared /packages/shared
RUN npm ci --prefix /packages/shared --omit=dev && npm run build --prefix /packages/shared
COPY services/tool-execution-service/package*.json ./
RUN npm ci --omit=dev
COPY services/tool-execution-service/prisma ./prisma
COPY services/tool-execution-service/prisma.config.ts ./
RUN npx prisma generate
COPY --from=builder /app/dist ./dist
EXPOSE 3003
CMD ["node", "dist/index.js"]
