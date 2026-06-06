FROM node:20-alpine AS deps

WORKDIR /app

# Copy files needed for local file dependencies used by this service.
COPY package*.json ./
COPY packages/shared ./packages/shared
COPY services/tool-execution-service/package*.json ./services/tool-execution-service/
COPY services/tool-execution-service/prisma ./services/tool-execution-service/prisma

RUN npm ci --ignore-scripts --prefix ./packages/shared
RUN npm ci --ignore-scripts --prefix ./services/tool-execution-service


FROM deps AS builder

WORKDIR /app
ARG DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres?schema=public
ENV DATABASE_URL=${DATABASE_URL}

COPY package*.json ./
COPY packages/shared ./packages/shared
COPY services/tool-execution-service ./services/tool-execution-service

RUN npm run build --prefix ./services/tool-execution-service


FROM node:20-alpine AS runner

ENV NODE_ENV=production
WORKDIR /app

COPY --from=builder /app/package.json ./package.json
COPY --from=deps /app/services/tool-execution-service/node_modules ./services/tool-execution-service/node_modules
COPY --from=builder /app/services/tool-execution-service/dist ./services/tool-execution-service/dist
COPY --from=builder /app/services/tool-execution-service/prisma ./services/tool-execution-service/prisma
COPY --from=builder /app/services/tool-execution-service/package.json ./services/tool-execution-service/package.json
COPY --from=builder /app/packages/shared ./packages/shared

WORKDIR /app/services/tool-execution-service

EXPOSE 3003

CMD ["node", "dist/index.js"]
