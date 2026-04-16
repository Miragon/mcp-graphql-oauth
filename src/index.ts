import "dotenv/config";
import { MCPServer, text, error } from "mcp-use/server";
import { parse } from "graphql/language";
import { z } from "zod";
import { buildOAuthProvider } from "./helpers/oauth.js";
import { buildHeaders } from "./helpers/headers.js";
import {
	introspectEndpoint,
	introspectLocalSchema,
	introspectSchemaFromUrl,
} from "./helpers/introspection.js";
import { getVersion } from "./helpers/package.js";

const EnvSchema = z.object({
	NAME: z.string().default("mcp-graphql"),
	ENDPOINT: z.url().default("http://localhost:4000/graphql"),
	ALLOW_MUTATIONS: z
		.enum(["true", "false"])
		.default("false")
		.transform((value) => value === "true"),
	HEADERS: z
		.string()
		.default("{}")
		.transform((val) => {
			try {
				return JSON.parse(val);
			} catch (e) {
				throw new Error("HEADERS must be a valid JSON string");
			}
		}),
	SCHEMA: z.string().optional(),
});

const env = EnvSchema.parse(process.env);

const server = new MCPServer({
	name: env.NAME,
	version: getVersion(),
	description: `GraphQL MCP server for ${env.ENDPOINT}`,
	baseUrl: process.env.MCP_URL || "http://localhost:3000",
	oauth: buildOAuthProvider(),
});

server.resource(
	{
		name: "graphql_schema",
		uri: `graphql://${new URL(env.ENDPOINT).host}/schema`,
		title: "GraphQL Schema",
		description: "The GraphQL schema for the configured endpoint",
	},
	async () => {
		try {
			let schema: string;
			if (env.SCHEMA) {
				if (
					env.SCHEMA.startsWith("http://") ||
					env.SCHEMA.startsWith("https://")
				) {
					schema = await introspectSchemaFromUrl(env.SCHEMA);
				} else {
					schema = await introspectLocalSchema(env.SCHEMA);
				}
			} else {
				schema = await introspectEndpoint(env.ENDPOINT, env.HEADERS);
			}

			return text(schema);
		} catch (err) {
			return error(`Failed to get GraphQL schema: ${err}`);
		}
	},
);

server.tool(
	{
		name: "introspect-schema",
		description:
			"Introspect the GraphQL schema, use this tool before doing a query to get the schema information if you do not have it available as a resource already.",
		schema: z.object({
			// Workaround for clients that can't handle an empty object as an argument
			__ignore__: z
				.boolean()
				.default(false)
				.describe("This does not do anything"),
		}),
		annotations: { readOnlyHint: true },
	},
	async (_args, ctx) => {
		try {
			const headers = buildHeaders(env.HEADERS, ctx.auth?.accessToken);
			let schema: string;
			if (env.SCHEMA) {
				if (
					env.SCHEMA.startsWith("http://") ||
					env.SCHEMA.startsWith("https://")
				) {
					schema = await introspectSchemaFromUrl(env.SCHEMA, headers);
				} else {
					schema = await introspectLocalSchema(env.SCHEMA);
				}
			} else {
				schema = await introspectEndpoint(env.ENDPOINT, headers);
			}

			return text(schema);
		} catch (err) {
			return error(`Failed to introspect schema: ${err}`);
		}
	},
);

server.tool(
	{
		name: "query-graphql",
		description: "Query a GraphQL endpoint with the given query and variables",
		schema: z.object({
			query: z.string().describe("The GraphQL query to execute"),
			variables: z
				.string()
				.optional()
				.describe("Optional JSON string of query variables"),
		}),
	},
	async ({ query, variables }, ctx) => {
		try {
			const parsedQuery = parse(query);

			const isMutation = parsedQuery.definitions.some(
				(def) =>
					def.kind === "OperationDefinition" && def.operation === "mutation",
			);

			if (isMutation && !env.ALLOW_MUTATIONS) {
				return error(
					"Mutations are not allowed unless you enable them in the configuration. Please use a query operation instead.",
				);
			}
		} catch (err) {
			return error(`Invalid GraphQL query: ${err}`);
		}

		try {
			const headers = buildHeaders(env.HEADERS, ctx.auth?.accessToken);

			const response = await fetch(env.ENDPOINT, {
				method: "POST",
				headers,
				body: JSON.stringify({
					query,
					variables,
				}),
			});

			if (!response.ok) {
				const responseText = await response.text();
				return error(
					`GraphQL request failed: ${response.statusText}\n${responseText}`,
				);
			}

			const data = await response.json();

			if (data.errors && data.errors.length > 0) {
				return error(
					`The GraphQL response has errors, please fix the query: ${JSON.stringify(data, null, 2)}`,
				);
			}

			return text(JSON.stringify(data, null, 2));
		} catch (err) {
			return error(`Failed to execute GraphQL query: ${err}`);
		}
	},
);

server.listen();
