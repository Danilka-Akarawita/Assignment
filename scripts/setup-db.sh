#!/bin/bash
# Wait for postgres to be ready, then create vector extension
docker exec -i $(docker ps -qf "name=db") psql -U app_user -d app_db <<EOF
CREATE EXTENSION IF NOT EXISTS vector;
ALTER TABLE knowledge_document_chunks ADD COLUMN IF NOT EXISTS embedding vector(1536);
EOF