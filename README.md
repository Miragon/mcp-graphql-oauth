# mcp-graphql

A Model Context Protocol (MCP) server that enables LLMs to interact with GraphQL APIs. Provides schema introspection and query execution with optional OAuth authentication — the authenticated user's Bearer token is automatically forwarded to the GraphQL endpoint.

Built with [mcp-use](https://github.com/mcp-use/mcp-use).

## Quick Start

```bash
# Install dependencies
bun install

# Copy and configure environment
cp .env.example .env

# Start dev server
bun run dev
```

The server starts on `http://localhost:3000` by default.

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ENDPOINT` | GraphQL endpoint URL | `http://localhost:4000/graphql` |
| `NAME` | Name of the MCP server | `mcp-graphql` |
| `HEADERS` | JSON string with custom headers for requests | `{}` |
| `ALLOW_MUTATIONS` | Enable mutation operations | `false` |
| `SCHEMA` | Path or URL to a GraphQL schema file (optional, overrides introspection) | - |
| `MCP_URL` | Public URL of the MCP server | `http://localhost:3000` |

### OAuth (optional)

When `OAUTH_ISSUER` is set, the server requires OAuth authentication and forwards the user's access token as `Authorization: Bearer <token>` to the GraphQL endpoint. Without these variables, the server runs without authentication.

| Variable | Description |
|----------|-------------|
| `OAUTH_ISSUER` | OIDC issuer URL |
| `OAUTH_JWKS_URL` | JWKS endpoint for token verification |
| `OAUTH_AUTH_ENDPOINT` | Authorization endpoint |
| `OAUTH_TOKEN_ENDPOINT` | Token endpoint |
| `OAUTH_AUDIENCE` | Expected audience claim (optional) |
| `OAUTH_SCOPES` | Comma-separated list of scopes (optional) |

## Claude Desktop Configuration

Use `mcp-remote` to connect Claude Desktop to the server. With OAuth enabled, pass your client ID via `--static-oauth-client-info`:

```json
{
    "mcpServers": {
        "mcp-graphql": {
            "command": "npx",
            "args": [
                "mcp-remote",
                "http://localhost:3000/mcp",
                "--static-oauth-client-info",
                "{\"client_id\":\"my-client\"}"
            ]
        }
    }
}
```

Without OAuth, omit the `--static-oauth-client-info` argument.

## Available Tools

1. **introspect-schema** — Retrieves the GraphQL schema via introspection query, local file, or remote URL.
2. **query-graphql** — Executes GraphQL queries (and mutations, if enabled) against the endpoint.

## Resources

- **graphql_schema** — The GraphQL schema exposed as an MCP resource for clients that support it.

## Scripts

| Script | Description |
|--------|-------------|
| `bun run dev` | Start dev server with hot reload |
| `bun run build` | Build for production |
| `bun run start` | Start production server |

## Security Considerations

Mutations are disabled by default to prevent LLMs from modifying data. Enable with `ALLOW_MUTATIONS=true` only when appropriate.
