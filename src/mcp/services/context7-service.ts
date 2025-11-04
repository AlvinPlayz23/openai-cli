import { BaseMCPService } from '../base-service';
import {
    MCPRequest,
    MCPResponse,
    MCPTool
} from '../types';

const CONTEXT7_API_BASE_URL = "https://context7.com/api";
const DEFAULT_TOKENS = 5000;
const MINIMUM_TOKENS = 1000;

interface SearchResult {
    id: string;
    title: string;
    description: string;
    branch: string;
    lastUpdateDate: string;
    state: string;
    totalTokens: number;
    totalSnippets: number;
    totalPages: number;
    stars?: number;
    trustScore?: number;
    versions?: string[];
}

interface SearchResponse {
    error?: string;
    results: SearchResult[];
}

interface ResolveLibraryParams {
    libraryName: string;
}

interface GetLibraryDocsParams {
    context7CompatibleLibraryID: string;
    topic?: string;
    tokens?: number;
}

export class Context7Service extends BaseMCPService {
    private apiKey?: string;

    constructor() {
        super('context7', '1.0.0');
        // Get API key from environment variable if available
        this.apiKey = process.env.CONTEXT7_API_KEY;
    }

    getTools(): MCPTool[] {
        return [
            {
                name: 'resolve_library_id',
                description: `Resolves a package/product name to a Context7-compatible library ID and returns a list of matching libraries.

You MUST call this function before 'get_library_docs' to obtain a valid Context7-compatible library ID UNLESS the user explicitly provides a library ID in the format '/org/project' or '/org/project/version' in their query.

Selection Process:
1. Analyze the query to understand what library/package the user is looking for
2. Return the most relevant match based on:
   - Name similarity to the query (exact matches prioritized)
   - Description relevance to the query's intent
   - Documentation coverage (prioritize libraries with higher Code Snippet counts)
   - Trust score (consider libraries with scores of 7-10 more authoritative)

Response Format:
- Return the selected library ID in a clearly marked section
- Provide a brief explanation for why this library was chosen
- If multiple good matches exist, acknowledge this but proceed with the most relevant one
- If no good matches exist, clearly state this and suggest query refinements

For ambiguous queries, request clarification before proceeding with a best-guess match.`,
                inputSchema: {
                    type: 'object',
                    properties: {
                        libraryName: {
                            type: 'string',
                            description: 'Library name to search for and retrieve a Context7-compatible library ID.'
                        }
                    },
                    required: ['libraryName']
                }
            },
            {
                name: 'get_library_docs',
                description: `Fetches up-to-date documentation for a library. You must call 'resolve_library_id' first to obtain the exact Context7-compatible library ID required to use this tool, UNLESS the user explicitly provides a library ID in the format '/org/project' or '/org/project/version' in their query.`,
                inputSchema: {
                    type: 'object',
                    properties: {
                        context7CompatibleLibraryID: {
                            type: 'string',
                            description: `Exact Context7-compatible library ID (e.g., '/mongodb/docs', '/vercel/next.js', '/supabase/supabase', '/vercel/next.js/v14.3.0-canary.87') retrieved from 'resolve_library_id' or directly from user query in the format '/org/project' or '/org/project/version'.`
                        },
                        topic: {
                            type: 'string',
                            description: `Topic to focus documentation on (e.g., 'hooks', 'routing').`
                        },
                        tokens: {
                            type: 'number',
                            description: `Maximum number of tokens of documentation to retrieve (default: ${DEFAULT_TOKENS}). Higher values provide more context but consume more tokens.`,
                            minimum: MINIMUM_TOKENS,
                            default: DEFAULT_TOKENS
                        }
                    },
                    required: ['context7CompatibleLibraryID']
                }
            }
        ];
    }

    async handleRequest(request: MCPRequest): Promise<MCPResponse> {
        const { id, method, params } = request;

        try {
            switch (method) {
                case 'resolve_library_id':
                    const resolveResult = await this.resolveLibraryId(params as ResolveLibraryParams);
                    return this.createSuccessResponse(id, resolveResult);
                    
                case 'get_library_docs':
                    const docsResult = await this.getLibraryDocs(params as GetLibraryDocsParams);
                    return this.createSuccessResponse(id, docsResult);
                    
                default:
                    return this.createErrorResponse(id, -32601, `Unsupported method: ${method}`);
            }
        } catch (error) {
            return this.createErrorResponse(id, -32603, error instanceof Error ? error.message : 'Internal error');
        }
    }

    private async resolveLibraryId(params: ResolveLibraryParams): Promise<any> {
        try {
            const searchResponse = await this.searchLibraries(params.libraryName);

            if (!searchResponse.results || searchResponse.results.length === 0) {
                return {
                    content: [{
                        type: 'text',
                        text: searchResponse.error || 'No libraries found matching your query. Please try a different search term.'
                    }]
                };
            }

            const resultsText = this.formatSearchResults(searchResponse);

            const responseText = `Available Libraries (top matches):

Each result includes:
- Library ID: Context7-compatible identifier (format: /org/project)
- Name: Library or package name
- Description: Short summary
- Code Snippets: Number of available code examples
- Trust Score: Authority indicator
- Versions: List of versions if available. Use one of those versions if the user provides a version in their query. The format of the version is /org/project/version.

For best results, select libraries based on name match, trust score, snippet coverage, and relevance to your use case.

----------

${resultsText}`;

            return {
                content: [{
                    type: 'text',
                    text: responseText
                }]
            };
        } catch (error) {
            return {
                content: [{
                    type: 'text',
                    text: `Error searching libraries: ${error instanceof Error ? error.message : 'Unknown error'}`
                }]
            };
        }
    }

    private async getLibraryDocs(params: GetLibraryDocsParams): Promise<any> {
        try {
            const tokens = params.tokens && params.tokens >= MINIMUM_TOKENS 
                ? params.tokens 
                : DEFAULT_TOKENS;

            const documentation = await this.fetchLibraryDocumentation(
                params.context7CompatibleLibraryID,
                {
                    tokens,
                    topic: params.topic
                }
            );

            if (!documentation) {
                return {
                    content: [{
                        type: 'text',
                        text: 'Documentation not found or not finalized for this library. This might have happened because you used an invalid Context7-compatible library ID. To get a valid Context7-compatible library ID, use the \'resolve_library_id\' with the package name you wish to retrieve documentation for.'
                    }]
                };
            }

            return {
                content: [{
                    type: 'text',
                    text: documentation
                }]
            };
        } catch (error) {
            return {
                content: [{
                    type: 'text',
                    text: `Error fetching documentation: ${error instanceof Error ? error.message : 'Unknown error'}`
                }]
            };
        }
    }

    private async searchLibraries(query: string): Promise<SearchResponse> {
        try {
            const url = new URL(`${CONTEXT7_API_BASE_URL}/v1/search`);
            url.searchParams.set('query', query);

            const headers = this.generateHeaders();

            const response = await fetch(url.toString(), { headers });

            if (!response.ok) {
                const errorCode = response.status;
                if (errorCode === 429) {
                    const errorMessage = this.apiKey
                        ? 'Rate limited due to too many requests. Please try again later.'
                        : 'Rate limited due to too many requests. You can create a free API key at https://context7.com/dashboard for higher rate limits.';
                    return {
                        results: [],
                        error: errorMessage
                    };
                }
                if (errorCode === 401) {
                    const errorMessage = 'Unauthorized. Please check your API key. API keys should start with \'ctx7sk\'';
                    return {
                        results: [],
                        error: errorMessage
                    };
                }
                const errorMessage = `Failed to search libraries. Error code: ${errorCode}`;
                return {
                    results: [],
                    error: errorMessage
                };
            }

            const data = await response.json() as SearchResponse;
            return data;
        } catch (error) {
            const errorMessage = `Error searching libraries: ${error instanceof Error ? error.message : 'Unknown error'}`;
            return {
                results: [],
                error: errorMessage
            };
        }
    }

    private async fetchLibraryDocumentation(
        libraryId: string,
        options: {
            tokens?: number;
            topic?: string;
        } = {}
    ): Promise<string | null> {
        try {
            if (libraryId.startsWith('/')) {
                libraryId = libraryId.slice(1);
            }

            const url = new URL(`${CONTEXT7_API_BASE_URL}/v1/${libraryId}`);
            if (options.tokens) url.searchParams.set('tokens', options.tokens.toString());
            if (options.topic) url.searchParams.set('topic', options.topic);
            url.searchParams.set('type', 'txt');

            const headers = this.generateHeaders({ 'X-Context7-Source': 'openai-cli' });

            const response = await fetch(url.toString(), { headers });

            if (!response.ok) {
                const errorCode = response.status;
                if (errorCode === 429) {
                    const errorMessage = this.apiKey
                        ? 'Rate limited due to too many requests. Please try again later.'
                        : 'Rate limited due to too many requests. You can create a free API key at https://context7.com/dashboard for higher rate limits.';
                    return errorMessage;
                }
                if (errorCode === 404) {
                    return 'The library you are trying to access does not exist. Please try with a different library ID.';
                }
                if (errorCode === 401) {
                    return 'Unauthorized. Please check your API key. API keys should start with \'ctx7sk\'';
                }
                return `Failed to fetch documentation. Error code: ${errorCode}`;
            }

            const text = await response.text();
            if (!text || text === 'No content available' || text === 'No context data available') {
                return null;
            }

            return text;
        } catch (error) {
            return `Error fetching library documentation: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
    }

    private generateHeaders(additionalHeaders: Record<string, string> = {}): Record<string, string> {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'User-Agent': 'openai-cli-context7/1.0.0',
            ...additionalHeaders
        };

        if (this.apiKey) {
            headers['Authorization'] = `Bearer ${this.apiKey}`;
        }

        return headers;
    }

    private formatSearchResults(searchResponse: SearchResponse): string {
        if (!searchResponse.results || searchResponse.results.length === 0) {
            return 'No results found.';
        }

        return searchResponse.results
            .map((result, index) => {
                const parts = [
                    `${index + 1}. Library ID: ${result.id}`,
                    `   Name: ${result.title}`,
                    `   Description: ${result.description || 'N/A'}`
                ];

                if (result.totalSnippets) {
                    parts.push(`   Code Snippets: ${result.totalSnippets}`);
                }

                if (result.trustScore !== undefined) {
                    parts.push(`   Trust Score: ${result.trustScore}/10`);
                }

                if (result.versions && result.versions.length > 0) {
                    parts.push(`   Versions: ${result.versions.join(', ')}`);
                }

                parts.push(`   Status: ${result.state}`);

                return parts.join('\n');
            })
            .join('\n\n');
    }
}
