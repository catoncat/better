# Observability (Jaeger v2 + OpenSearch)

## Goal
- Provide a local tracing stack for development.

## When to Use
- You want to see request traces in Jaeger UI.

## Local Stack (Docker)
From repo root:
```bash
docker compose -f ops/observability/jaeger/docker-compose.yml up -d
```

### URLs
- Jaeger UI: http://localhost:16686
- OpenSearch Dashboards: http://localhost:5601

## Server Env (apps/server/.env)
```bash
OTEL_ENABLED=true
OTEL_SERVICE_NAME=better-server
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318/v1/traces
```

## Notes
- Trace data is stored in OpenSearch.
- SQLite remains the application database and is not used by Jaeger.
