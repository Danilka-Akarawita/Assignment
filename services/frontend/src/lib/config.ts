export const config = {
  authApiUrl: process.env.NEXT_PUBLIC_AUTH_API_URL ?? 'http://localhost:3001',
  gatewayApiUrl: process.env.NEXT_PUBLIC_GATEWAY_API_URL ?? 'http://localhost:3004',
  knowledgeApiUrl: process.env.NEXT_PUBLIC_KNOWLEDGE_API_URL ?? 'http://localhost:3002',
} as const;
