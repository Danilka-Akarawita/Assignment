# Knowledge retrieval pipeline

## Flow

1. **Load metadata catalog** — distinct `topics`, `keywords`, `entities`, `contentType`, and `section` values from the user's indexed chunks (optionally scoped to `documentId`).
2. **Metadata from query** (OpenAI) — pick matching catalog values for the user question; do not invent labels outside the catalog.
3. **Vector search** — pgvector top‑`limit` by cosine similarity, with metadata SQL filters + `minSimilarity`.
4. **Metadata fallback** — if zero hits with filters, retry without metadata filters.

## Env (`knowledge-service`)

See `services/knowledge-service/.env.example`:

- `METADATA_QUERY_EXTRACTION_ENABLED` — set `false` to skip LLM filter extraction
- `METADATA_QUERY_MODEL` — model for filter extraction (default `gpt-4o-mini`)
- `METADATA_CATALOG_LIMIT` — max distinct values per catalog field (default `200`)

## API

`POST /documents/search`

```json
{
  "query": "refund policy for shipping",
  "limit": 10,
  "minSimilarity": 0.25,
  "useMetadataExtraction": true
}
```

Response includes `appliedFilters` (LLM-selected catalog values) and `retrieval.metadataFallback`.
