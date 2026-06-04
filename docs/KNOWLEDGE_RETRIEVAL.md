# Knowledge retrieval pipeline

## Flow

1. **Metadata from query** (OpenAI) — infer `topics`, `keywords`, `entities`, `contentType`, `section` from the user question.
2. **Merge filters** — combine with explicit `filters` from `POST /documents/search`.
3. **Vector search** — pgvector top‑`limit` by cosine similarity, with metadata SQL filters + `minSimilarity`.
4. **Metadata fallback** — if zero hits with filters, retry without metadata filters.

## Env (`knowledge-service`)

See `services/knowledge-service/.env.example`:

- `METADATA_QUERY_EXTRACTION_ENABLED` — set `false` to skip LLM filter extraction
- `METADATA_QUERY_MODEL` — model for filter extraction (default `gpt-4o-mini`)

## API

`POST /documents/search`

```json
{
  "query": "refund policy for shipping",
  "limit": 10,
  "minSimilarity": 0.25,
  "filters": { "topics": ["policy"] },
  "useMetadataExtraction": true
}
```

Response includes `appliedFilters` and `retrieval.metadataFallback`.
