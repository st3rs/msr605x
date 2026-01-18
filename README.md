# MSR-OPS Monorepo

## System Architecture

- **Web**: Next.js Dashboard for operators.
- **API**: NestJS backend with Redis-backed Job Queues (BullMQ) and WebSocket Gateway for agents.
- **Agent**: Headless Node.js service running on QA workstations. Handles physical hardware interaction and data masking.

## Compliance
- **Zero Track Storage**: The Agent masks track data (First 6/Last 4 + SHA256 hash) *before* transmission.
- **Audit**: All actions are logged to immutable tables in Postgres.

## Setup

1. **Infrastructure**:
   ```bash
   docker-compose up -d
   ```

2. **Install**:
   ```bash
   pnpm install
   ```

3. **Run**:
   - API: `cd apps/api && pnpm start:dev`
   - Web: `cd apps/web && pnpm dev`
   - Agent: `cd apps/agent && pnpm start` (Requires API running)
