# Hono + Node.js
This repository is configured to use Node.js instead of Cloudflare.

## Why?
Because I'm using a PostgreSQL instance set up in a local Docker container.
It seems like Hyperdrive is required for the connection.

```
pnpm install
pnpm run dev
```

```
open http://localhost:3000
```
