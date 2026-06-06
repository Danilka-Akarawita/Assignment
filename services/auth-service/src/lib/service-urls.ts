export const serviceUrls = {
  aiGateway:
    process.env.AI_GATEWAY_SERVICE_URL ?? 'http://localhost:3004',
  knowledge:
    process.env.KNOWLEDGE_SERVICE_URL ?? 'http://localhost:3002',
} as const;
