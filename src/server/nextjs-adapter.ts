import { type FileHandlerConfig, createFileHandler } from "./file-handler";

// ============================================================================
// NEXT.JS ADAPTER
// Convert FileHandler responses to Next.js Response objects
// ============================================================================

/**
 * Create a Next.js App Router compatible handler from FileHandler
 */
export const createNextFileHandler = (config: FileHandlerConfig) => {
	if (!config.fileService || !config.fileRepository) {
		// export return response for all method
		return Response.json(
			{
				error:
					"File service not configured. Please check your .env file and ensure R2/S3 credentials are properly set.",
				details:
					"Missing required environment variables: S3_ACCOUNT_ID, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_BUCKET_NAME",
			},
			{ status: 500 },
		);
	}
	const handler = createFileHandler(config);

	return async (request: Request) => {
		const response = await handler.handle(request);

		// Handle redirects
		if (response.redirect) {
			return Response.redirect(response.redirect, response.status);
		}

		// Handle regular JSON responses
		return Response.json(response.body || {}, {
			status: response.status,
			headers: response.headers,
		});
	};
};

/**
 * Export the handler for use in catch-all routes
 * Usage: export const { GET, POST, DELETE } = fileUploadsHandler(config)
 */
export const fileUploadsHandler = (config: FileHandlerConfig) => {
	const nextHandler = createNextFileHandler(config);

	return {
		GET: nextHandler,
		POST: nextHandler,
		PUT: nextHandler,
		PATCH: nextHandler,
		DELETE: nextHandler,
	};
};
