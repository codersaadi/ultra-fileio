'use client'

import { useEffect, useState } from 'react'
import FileUpload from '@/components/FileUpload'
import FileList from '@/components/FileList'

interface FileItem {
  id: string
  r2Key: string
  originalFilename: string
  fileSize: number
  publicUrl: string
  uploadedBy: string
  createdAt: string
}

export default function Home() {
  const [files, setFiles] = useState<FileItem[]>([])
  const [loading, setLoading] = useState(true)
  const [initialized, setInitialized] = useState(false)

  const initializeApp = async () => {
    try {
      await fetch('/api/init', { method: 'POST' })
      setInitialized(true)
    } catch (error) {
      console.error('Error initializing app:', error)
    }
  }

  const fetchFiles = async () => {
    try {
      const response = await fetch('/api/fileuploads/files', {
        headers: {
          'x-user-id': 'demo-user',
        },
      })
      const data = await response.json()
      setFiles(data.files || [])
    } catch (error) {
      console.error('Error fetching files:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    initializeApp().then(() => {
      fetchFiles()
    })
  }, [])

  const handleUploadSuccess = () => {
    fetchFiles()
  }

  const handleFileDeleted = () => {
    fetchFiles()
  }

  if (!initialized || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            File Manager
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Upload, manage, and download your files with ease
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Upload File
          </h2>
          <FileUpload onUploadSuccess={handleUploadSuccess} />
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Your Files
            </h2>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {files.length} {files.length === 1 ? 'file' : 'files'}
            </span>
          </div>
          <FileList files={files} onFileDeleted={handleFileDeleted} />
        </div>

        <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>Built with Next.js App Router, Prisma, and TypeScript</p>
        </div>
      </div>
    </div>
  )
}
