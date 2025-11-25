"use client";

import { useCallback, useMemo, useState } from "react";

// ============================================================================
// TYPES
// ============================================================================

export interface UploadProgress {
	loaded: number;
	total: number;
	percentage: number;
}

export interface UploadedFile {
	id: string;
	url: string;
	publicUrl?: string;
	filename: string;
	size: number;
	contentType: string;
	uploadedAt: string;
}

export interface UseFileUploadOptions {
	endpoint: string; // API endpoint for direct upload
	category?: string;
	onSuccess?: (file: UploadedFile) => void;
	onError?: (error: Error) => void;
	onProgress?: (progress: UploadProgress) => void;
}

export interface UseFileUploadReturn {
	upload: (file: File) => Promise<UploadedFile | null>;
	uploading: boolean;
	progress: UploadProgress | null;
	error: Error | null;
	reset: () => void;
}

// ============================================================================
// DIRECT UPLOAD HOOK
// ============================================================================

/**
 * React hook for direct file uploads to your Next.js API
 *
 * @example
 * ```tsx
 * 'use client';
 *
 * import { useFileUpload } from 'meta-uploads/client';
 *
 * export function FileUploader() {
 *   const { upload, uploading, progress, error } = useFileUpload({
 *     endpoint: '/api/upload',
 *     category: 'avatars',
 *     onSuccess: (file) => {
 *       console.log('Uploaded:', file);
 *     },
 *   });
 *
 *   const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
 *     const file = e.target.files?.[0];
 *     if (file) {
 *       await upload(file);
 *     }
 *   };
 *
 *   return (
 *     <div>
 *       <input
 *         type="file"
 *         onChange={handleFileChange}
 *         disabled={uploading}
 *       />
 *       {uploading && progress && (
 *         <div>Uploading: {progress.percentage}%</div>
 *       )}
 *       {error && <div>Error: {error.message}</div>}
 *     </div>
 *   );
 * }
 * ```
 */
export function useFileUpload(
	options: UseFileUploadOptions,
): UseFileUploadReturn {
	const [uploading, setUploading] = useState(false);
	const [progress, setProgress] = useState<UploadProgress | null>(null);
	const [error, setError] = useState<Error | null>(null);

	const reset = useCallback(() => {
		setUploading(false);
		setProgress(null);
		setError(null);
	}, []);

	const upload = useCallback(
		async (file: File): Promise<UploadedFile | null> => {
			setUploading(true);
			setError(null);
			setProgress({ loaded: 0, total: file.size, percentage: 0 });

			try {
				const formData = new FormData();
				formData.append("file", file);

				const url = options.category
					? `${options.endpoint}?category=${options.category}`
					: options.endpoint;

				const xhr = new XMLHttpRequest();

				return await new Promise<UploadedFile>((resolve, reject) => {
					// Track upload progress
					xhr.upload.addEventListener("progress", (e) => {
						if (e.lengthComputable) {
							const progressData = {
								loaded: e.loaded,
								total: e.total,
								percentage: Math.round((e.loaded / e.total) * 100),
							};
							setProgress(progressData);
							options.onProgress?.(progressData);
						}
					});

					// Handle completion
					xhr.addEventListener("load", () => {
						if (xhr.status >= 200 && xhr.status < 300) {
							try {
								const response = JSON.parse(xhr.responseText);
								const uploadedFile: UploadedFile = {
									id: response.file.id,
									url: response.file.publicUrl || response.file.url,
									publicUrl: response.file.publicUrl,
									filename: response.file.originalFilename,
									size: response.file.fileSize,
									contentType: file.type,
									uploadedAt: response.file.uploadedAt,
								};
								options.onSuccess?.(uploadedFile);
								resolve(uploadedFile);
							} catch (parseError) {
								const error = new Error("Failed to parse server response");
								setError(error);
								options.onError?.(error);
								reject(error);
							}
						} else {
							try {
								const response = JSON.parse(xhr.responseText);
								const error = new Error(response.error || "Upload failed");
								setError(error);
								options.onError?.(error);
								reject(error);
							} catch {
								const error = new Error("Upload failed");
								setError(error);
								options.onError?.(error);
								reject(error);
							}
						}
					});

					// Handle errors
					xhr.addEventListener("error", () => {
						const error = new Error("Network error occurred");
						setError(error);
						options.onError?.(error);
						reject(error);
					});

					// Handle abort
					xhr.addEventListener("abort", () => {
						const error = new Error("Upload aborted");
						setError(error);
						options.onError?.(error);
						reject(error);
					});

					// Send request
					xhr.open("POST", url);
					xhr.send(formData);
				});
			} catch (err) {
				const error = err instanceof Error ? err : new Error("Upload failed");
				setError(error);
				options.onError?.(error);
				return null;
			} finally {
				setUploading(false);
			}
		},
		[options],
	);

	return {
		upload,
		uploading,
		progress,
		error,
		reset,
	};
}

// ============================================================================
// PRESIGNED URL UPLOAD HOOK
// ============================================================================

export interface UsePresignedUploadOptions {
	getPresignedUrlEndpoint?: string; // API endpoint to get presigned URL (default: '/api/fileuploads/upload-url')
	saveFileRecordEndpoint?: string; // API endpoint to save file record to database (default: '/api/fileuploads/save-file')
	category?: string;
	maxFileSize?: number; // Max file size in bytes (default: 5MB)
	allowedTypes?: string[]; // Allowed MIME types (default: ['image/*'])
	onSuccess?: (file: UploadedFile) => void;
	onError?: (error: Error) => void;
	onProgress?: (progress: UploadProgress) => void;
}

/**
 * React hook for client-side uploads using presigned URLs (more secure)
 *
 * This hook performs a 3-step upload process:
 * 1. Get presigned URL from your API
 * 2. Upload file directly to R2/S3
 * 3. Save file record to your database
 *
 * @example
 * ```tsx
 * 'use client';
 *
 * import { usePresignedUpload } from 'meta-uploads/client';
 *
 * export function SecureFileUploader() {
 *   const { upload, uploading, progress, error } = usePresignedUpload({
 *     getPresignedUrlEndpoint: '/api/upload-url',
 *     saveFileRecordEndpoint: '/api/save-file',
 *     category: 'documents',
 *     maxFileSize: 5 * 1024 * 1024, // 5MB
 *     allowedTypes: ['image/'], // Images only
 *     onSuccess: (file) => {
 *       console.log('Uploaded:', file);
 *     },
 *   });
 *
 *   const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
 *     const file = e.target.files?.[0];
 *     if (file) {
 *       await upload(file);
 *     }
 *   };
 *
 *   return (
 *     <div>
 *       <input
 *         type="file"
 *         onChange={handleFileChange}
 *         disabled={uploading}
 *       />
 *       {uploading && progress && (
 *         <div>Uploading: {progress.percentage}%</div>
 *       )}
 *       {error && <div>Error: {error.message}</div>}
 *     </div>
 *   );
 * }
 * ```
 */
export function usePresignedUpload(
	options?: UsePresignedUploadOptions,
): UseFileUploadReturn {
	const [uploading, setUploading] = useState(false);
	const [progress, setProgress] = useState<UploadProgress | null>(null);
	const [error, setError] = useState<Error | null>(null);

	// Set defaults at the top of the function
	const config = useMemo(
		() => ({
			getPresignedUrlEndpoint:
				options?.getPresignedUrlEndpoint || "/api/fileuploads/upload-url",
			saveFileRecordEndpoint:
				options?.saveFileRecordEndpoint || "/api/fileuploads/save-file",
			maxFileSize: options?.maxFileSize || 5 * 1024 * 1024, // 5MB
			allowedTypes: options?.allowedTypes || ["image/*"], // Images only
			category: options?.category,
			onSuccess: options?.onSuccess,
			onError: options?.onError,
			onProgress: options?.onProgress,
		}),
		[
			options?.getPresignedUrlEndpoint,
			options?.saveFileRecordEndpoint,
			options?.maxFileSize,
			options?.allowedTypes,
			options?.category,
			options?.onSuccess,
			options?.onError,
			options?.onProgress,
		],
	);

	const reset = useCallback(() => {
		setUploading(false);
		setProgress(null);
		setError(null);
	}, []);

	const upload = useCallback(
		async (file: File): Promise<UploadedFile | null> => {
			setUploading(true);
			setError(null);
			setProgress({ loaded: 0, total: file.size, percentage: 0 });

			try {
				// Validation: Check file type
				const allowedTypes = config.allowedTypes;
				const isAllowed = allowedTypes.some((type) =>
					type.endsWith("/") ? file.type.startsWith(type) : file.type === type,
				);

				if (!isAllowed) {
					throw new Error(
						`Invalid file type. Allowed types: ${allowedTypes.join(", ")}`,
					);
				}

				// Validation: Check file size
				const maxSize = config.maxFileSize;
				if (file.size > maxSize) {
					const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(2);
					throw new Error(`File size must be less than ${maxSizeMB}MB`);
				}

				// Step 1: Get presigned URL from your API
				setProgress({ loaded: 0, total: file.size, percentage: 10 });
				const presignedResponse = await fetch(config.getPresignedUrlEndpoint, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						filename: file.name,
						contentType: file.type,
						fileSize: file.size,
						category: config.category,
					}),
				});

				if (!presignedResponse.ok) {
					const errorData = await presignedResponse.json().catch(() => ({}));
					throw new Error(errorData.error || "Failed to get presigned URL");
				}

				const { uploadUrl, key, publicUrl } = await presignedResponse.json();
				setProgress({ loaded: 0, total: file.size, percentage: 20 });

				// Step 2: Upload directly to R2/S3 using presigned URL
				const xhr = new XMLHttpRequest();

				await new Promise<void>((resolve, reject) => {
					// Track upload progress
					xhr.upload.addEventListener("progress", (e) => {
						if (e.lengthComputable) {
							// Map upload progress from 20% to 90%
							const uploadPercentage = Math.round(
								(e.loaded / e.total) * 70 + 20,
							);
							const progressData = {
								loaded: e.loaded,
								total: e.total,
								percentage: uploadPercentage,
							};
							setProgress(progressData);
							config.onProgress?.(progressData);
						}
					});

					// Handle completion
					xhr.addEventListener("load", () => {
						if (xhr.status >= 200 && xhr.status < 300) {
							setProgress({
								loaded: file.size,
								total: file.size,
								percentage: 90,
							});
							resolve();
						} else {
							const error = new Error(
								`Upload to storage failed: ${xhr.statusText}`,
							);
							setError(error);
							config.onError?.(error);
							reject(error);
						}
					});

					// Handle errors
					xhr.addEventListener("error", () => {
						const error = new Error("Network error occurred during upload");
						setError(error);
						config.onError?.(error);
						reject(error);
					});

					// Handle abort
					xhr.addEventListener("abort", () => {
						const error = new Error("Upload aborted");
						setError(error);
						config.onError?.(error);
						reject(error);
					});

					// Send request to presigned URL
					xhr.open("PUT", uploadUrl);
					xhr.setRequestHeader("Content-Type", file.type);
					xhr.send(file);
				});

				// Step 3: Save file record to database
				const saveResponse = await fetch(config.saveFileRecordEndpoint, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						r2Key: key,
						originalFilename: file.name,
						fileSize: file.size,
						publicUrl,
						category: config.category,
					}),
				});

				if (!saveResponse.ok) {
					const errorData = await saveResponse.json().catch(() => ({}));
					throw new Error(errorData.error || "Failed to save file record");
				}

				const { file: savedFile } = await saveResponse.json();

				setProgress({ loaded: file.size, total: file.size, percentage: 100 });

				const uploadedFile: UploadedFile = {
					id: savedFile.id,
					url: savedFile.publicUrl || publicUrl,
					publicUrl: savedFile.publicUrl,
					filename: savedFile.originalFilename,
					size: savedFile.fileSize,
					contentType: file.type,
					uploadedAt: savedFile.uploadedAt || new Date().toISOString(),
				};

				config.onSuccess?.(uploadedFile);
				return uploadedFile;
			} catch (err) {
				const error = err instanceof Error ? err : new Error("Upload failed");
				setError(error);
				config.onError?.(error);
				return null;
			} finally {
				setUploading(false);
				// Reset progress after a delay
				setTimeout(() => setProgress(null), 1000);
			}
		},
		[config],
	);

	return {
		upload,
		uploading,
		progress,
		error,
		reset,
	};
}
