#!/bin/bash
# Apply knowledge-service migrations and ensure pgvector extension exists
docker exec -i $(docker ps -qf "name=db") psql -U app_user -d app_db <<EOF
CREATE EXTENSION IF NOT EXISTS vector;
EOF

echo "Run migrations from services/knowledge-service: npx prisma migrate deploy"
