"use client";

import { ExternalLink, File as FileIcon, Trash2 } from "lucide-react";

interface FileItem {
	id: string;
	r2Key: string;
	originalFilename: string;
	fileSize: number;
	publicUrl: string;
	uploadedBy: string;
	createdAt: string;
}

interface FileListProps {
	files: FileItem[];
	onFileDeleted: () => void;
}

export default function FileList({ files, onFileDeleted }: FileListProps) {
	const handleDelete = async (id: string) => {
		if (!confirm("Are you sure you want to delete this file?")) return;

		try {
			const response = await fetch(`/api/fileuploads/files/${id}`, {
				method: "DELETE",
				headers: {
					"x-user-id": "demo-user",
				},
			});
			if (response.ok) {
				onFileDeleted();
			} else {
				console.error("Failed to delete file");
			}
		} catch (error) {
			console.error("Error deleting file:", error);
		}
	};

	if (files.length === 0) {
		return (
			<div className="text-center py-12 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
				<FileIcon className="mx-auto h-12 w-12 text-gray-400" />
				<h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">
					No files
				</h3>
				<p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
					Get started by uploading a file.
				</p>
			</div>
		);
	}

	return (
		<div className="overflow-hidden bg-white dark:bg-gray-800 shadow sm:rounded-md">
			<ul role="list" className="divide-y divide-gray-200 dark:divide-gray-700">
				{files.map((file) => (
					<li key={file.id}>
						<div className="flex items-center px-4 py-4 sm:px-6">
							<div className="min-w-0 flex-1 flex items-center">
								<div className="flex-shrink-0">
									<div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
										<FileIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
									</div>
								</div>
								<div className="min-w-0 flex-1 px-4 md:grid md:grid-cols-2 md:gap-4">
									<div>
										<p className="truncate text-sm font-medium text-blue-600 dark:text-blue-400">
											{file.originalFilename}
										</p>
										<p className="mt-2 flex items-center text-sm text-gray-500 dark:text-gray-400">
											<span className="truncate">
												{(file.fileSize / 1024).toFixed(1)} KB
											</span>
										</p>
									</div>
									<div className="hidden md:block">
										<div>
											<p className="text-sm text-gray-900 dark:text-white">
												Uploaded on{" "}
												<time dateTime={file.createdAt}>
													{new Date(file.createdAt).toLocaleDateString()}
												</time>
											</p>
										</div>
									</div>
								</div>
							</div>
							<div className="ml-5 flex-shrink-0 flex items-center gap-2">
								<a
									href={file.publicUrl}
									target="_blank"
									rel="noopener noreferrer"
									className="p-2 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
									title="View file"
								>
									<ExternalLink className="h-5 w-5" />
								</a>
								<button
									onClick={() => handleDelete(file.id)}
									className="p-2 text-gray-400 hover:text-red-500"
									title="Delete file"
								>
									<Trash2 className="h-5 w-5" />
								</button>
							</div>
						</div>
					</li>
				))}
			</ul>
		</div>
	);
}
