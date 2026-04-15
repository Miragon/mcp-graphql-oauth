/**
 * Build headers for GraphQL requests.
 * Merges Content-Type, env-configured headers, and optional OAuth Bearer token.
 *
 * Priority (later overrides earlier):
 *   1. Content-Type: application/json
 *   2. HEADERS env var (custom static headers)
 *   3. OAuth Bearer token (overwrites any Authorization from HEADERS)
 */
export function buildHeaders(
	envHeaders: Record<string, string>,
	authToken?: string,
): Record<string, string> {
	const headers: Record<string, string> = {
		"Content-Type": "application/json",
		...envHeaders,
	};
	if (authToken) {
		headers["Authorization"] = `Bearer ${authToken}`;
	}
	return headers;
}
