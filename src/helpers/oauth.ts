import { oauthCustomProvider } from "mcp-use/server";
import { createRemoteJWKSet, jwtVerify } from "jose";

/**
 * Build an OAuth provider from environment variables.
 * Returns undefined if OAUTH_ISSUER is not set (server runs without auth).
 *
 * Uses "direct" mode so clients communicate directly with the IdP
 * (no proxy rewrite issues with the Inspector).
 *
 * Environment variables:
 *   OAUTH_ISSUER          - OIDC issuer URL
 *   OAUTH_JWKS_URL        - JWKS endpoint for key discovery
 *   OAUTH_AUTH_ENDPOINT   - Authorization endpoint
 *   OAUTH_TOKEN_ENDPOINT  - Token endpoint
 *   OAUTH_AUDIENCE        - JWT audience (optional)
 *   OAUTH_SCOPES          - Comma-separated supported scopes (optional)
 */
export function buildOAuthProvider() {
	const issuer = process.env.OAUTH_ISSUER;
	if (!issuer) {
		return undefined;
	}

	const jwksUrl = process.env.OAUTH_JWKS_URL;
	const authEndpoint = process.env.OAUTH_AUTH_ENDPOINT;
	const tokenEndpoint = process.env.OAUTH_TOKEN_ENDPOINT;
	const audience = process.env.OAUTH_AUDIENCE;
	const scopes = process.env.OAUTH_SCOPES?.split(",").map((s) => s.trim());

	if (!jwksUrl || !authEndpoint || !tokenEndpoint) {
		throw new Error(
			"When OAUTH_ISSUER is set, OAUTH_JWKS_URL, OAUTH_AUTH_ENDPOINT, and OAUTH_TOKEN_ENDPOINT must also be set.",
		);
	}

	const JWKS = createRemoteJWKSet(new URL(jwksUrl));

	// Build the base custom provider, then wrap it to use "direct" mode
	const baseProvider = oauthCustomProvider({
		issuer,
		jwksUrl,
		authEndpoint,
		tokenEndpoint,
		verifyToken: async (token) => {
			const result = await jwtVerify(token, JWKS, {
				issuer,
				...(audience ? { audience } : {}),
			});
			return result;
		},
		...(scopes ? { scopesSupported: scopes } : {}),
	});

	// Wrap the provider to use "direct" mode so the client talks to the IdP
	// directly (avoids the Inspector proxy rewrite issue).
	// We use a Proxy because object spread doesn't copy prototype methods.
	return new Proxy(baseProvider, {
		get(target, prop) {
			if (prop === "getMode") return () => "direct";
			return (target as any)[prop];
		},
	});
}
