'use client'
import { useState } from 'react'
import { usePresignedUpload, type UploadedFile } from 'ultra-fileio/client'
import { FileDropzone } from './FileUploadButton'

interface FileUploadProps {
    onUploadSuccess: () => void
}
export default function FileUpload({ onUploadSuccess }: FileUploadProps) {
    const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
    const { upload, uploading, progress, error } = usePresignedUpload()
    const handleFileSelect = async (file: File) => {
        await upload(file)
    }
    return (
        <FileDropzone
            onFileSelect={handleFileSelect}
            uploading={uploading}
            progress={progress}
            error={error}
            accept="image/*"
            onUploadSuccess={onUploadSuccess}
            maxSize={5 * 1024 * 1024}
            uploadedFiles={uploadedFiles}
            onFileRemove={(id: string) => setUploadedFiles(files => files.filter(f => f.id !== id))}
        />
    )
}
