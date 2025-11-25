# API Usage Examples

This document provides examples of how to use the File Manager API.

## File Upload Examples

### Basic File Upload (JavaScript/Fetch)

```javascript
const uploadFile = async (file) => {
  const formData = new FormData()
  formData.append('file', file)
  
  const response = await fetch('/api/files', {
    method: 'POST',
    headers: {
      'x-user-id': 'demo-user'
    },
    body: formData
  })
  
  const data = await response.json()
  return data
}

// Usage
const input = document.querySelector('input[type="file"]')
input.addEventListener('change', async (e) => {
  const file = e.target.files[0]
  const result = await uploadFile(file)
  console.log('Uploaded:', result)
})
```

### Upload with Progress (Axios)

```javascript
import axios from 'axios'

const uploadFileWithProgress = async (file, onProgress) => {
  const formData = new FormData()
  formData.append('file', file)
  
  const response = await axios.post('/api/files', formData, {
    headers: {
      'x-user-id': 'demo-user'
    },
    onUploadProgress: (progressEvent) => {
      const percentCompleted = Math.round(
        (progressEvent.loaded * 100) / progressEvent.total
      )
      onProgress(percentCompleted)
    }
  })
  
  return response.data
}

// Usage
uploadFileWithProgress(file, (progress) => {
  console.log(`Upload progress: ${progress}%`)
})
```

### React Component Example

```tsx
'use client'

import { useState } from 'react'

export default function FileUploadExample() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const handleUpload = async () => {
    if (!file) return
    
    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    
    try {
      const response = await fetch('/api/files', {
        method: 'POST',
        headers: {
          'x-user-id': 'demo-user'
        },
        body: formData
      })
      
      const data = await response.json()
      setResult(data)
    } catch (error) {
      console.error('Upload failed:', error)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <input 
        type="file" 
        onChange={(e) => setFile(e.target.files?.[0] || null)}
      />
      <button 
        onClick={handleUpload}
        disabled={!file || uploading}
      >
        {uploading ? 'Uploading...' : 'Upload'}
      </button>
      {result && <pre>{JSON.stringify(result, null, 2)}</pre>}
    </div>
  )
}
```

## File Download Examples

### Download File

```javascript
const downloadFile = async (fileId, originalName) => {
  const response = await fetch(`/api/files/${fileId}/download`)
  
  if (!response.ok) {
    throw new Error('Download failed')
  }
  
  const blob = await response.blob()
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = originalName
  document.body.appendChild(a)
  a.click()
  window.URL.revokeObjectURL(url)
  document.body.removeChild(a)
}

// Usage
downloadFile('file-id-123', 'document.pdf')
```

### Download with Progress

```javascript
const downloadFileWithProgress = async (fileId, originalName, onProgress) => {
  const response = await fetch(`/api/files/${fileId}/download`)
  
  if (!response.ok) {
    throw new Error('Download failed')
  }
  
  const reader = response.body.getReader()
  const contentLength = +response.headers.get('Content-Length')
  
  let receivedLength = 0
  const chunks = []
  
  while (true) {
    const { done, value } = await reader.read()
    
    if (done) break
    
    chunks.push(value)
    receivedLength += value.length
    
    onProgress(Math.round((receivedLength / contentLength) * 100))
  }
  
  const blob = new Blob(chunks)
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = originalName
  document.body.appendChild(a)
  a.click()
  window.URL.revokeObjectURL(url)
  document.body.removeChild(a)
}

// Usage
downloadFileWithProgress('file-id-123', 'document.pdf', (progress) => {
  console.log(`Download progress: ${progress}%`)
})
```

## File List Examples

### Get All Files

```javascript
const getFiles = async (userId) => {
  const response = await fetch('/api/files', {
    headers: {
      'x-user-id': userId
    }
  })
  
  const data = await response.json()
  return data.files
}

// Usage
const files = await getFiles('demo-user')
console.log('Files:', files)
```

### Get Single File

```javascript
const getFile = async (fileId) => {
  const response = await fetch(`/api/files/${fileId}`)
  const data = await response.json()
  return data.file
}

// Usage
const file = await getFile('file-id-123')
console.log('File:', file)
```

## File Delete Examples

### Delete File

```javascript
const deleteFile = async (fileId) => {
  const response = await fetch(`/api/files/${fileId}`, {
    method: 'DELETE',
    headers: {
      'x-user-id': 'demo-user'
    }
  })
  
  if (!response.ok) {
    throw new Error('Delete failed')
  }
  
  const data = await response.json()
  return data
}

// Usage
await deleteFile('file-id-123')
console.log('File deleted')
```

### Bulk Delete

```javascript
const deleteFiles = async (fileIds) => {
  const promises = fileIds.map(id => 
    fetch(`/api/files/${id}`, {
      method: 'DELETE',
      headers: {
        'x-user-id': 'demo-user'
      }
    })
  )
  
  const results = await Promise.all(promises)
  return results
}

// Usage
await deleteFiles(['file-id-1', 'file-id-2', 'file-id-3'])
console.log('Files deleted')
```

## User Management Examples

### Get All Users

```javascript
const getUsers = async () => {
  const response = await fetch('/api/users')
  const data = await response.json()
  return data.users
}

// Usage
const users = await getUsers()
console.log('Users:', users)
```

### Create User

```javascript
const createUser = async (email, name) => {
  const response = await fetch('/api/users', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, name })
  })
  
  const data = await response.json()
  return data.user
}

// Usage
const user = await createUser('john@example.com', 'John Doe')
console.log('Created user:', user)
```

## Advanced Examples

### Multiple File Upload

```javascript
const uploadMultipleFiles = async (files) => {
  const promises = Array.from(files).map(file => {
    const formData = new FormData()
    formData.append('file', file)
    
    return fetch('/api/files', {
      method: 'POST',
      headers: {
        'x-user-id': 'demo-user'
      },
      body: formData
    }).then(res => res.json())
  })
  
  return Promise.all(promises)
}

// Usage
const input = document.querySelector('input[type="file"][multiple]')
const files = input.files
const results = await uploadMultipleFiles(files)
console.log('Uploaded files:', results)
```

### File Upload with Validation

```javascript
const validateAndUpload = async (file) => {
  // Validate file size (5MB)
  const maxSize = 5 * 1024 * 1024
  if (file.size > maxSize) {
    throw new Error('File too large')
  }
  
  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf']
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Invalid file type')
  }
  
  // Upload
  const formData = new FormData()
  formData.append('file', file)
  
  const response = await fetch('/api/files', {
    method: 'POST',
    headers: {
      'x-user-id': 'demo-user'
    },
    body: formData
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error)
  }
  
  return response.json()
}
```

### Search and Filter Files

```javascript
const searchFiles = (files, query) => {
  return files.filter(file => 
    file.originalName.toLowerCase().includes(query.toLowerCase()) ||
    file.mimeType.toLowerCase().includes(query.toLowerCase())
  )
}

const filterByType = (files, mimeType) => {
  return files.filter(file => file.mimeType === mimeType)
}

const sortByDate = (files, ascending = false) => {
  return [...files].sort((a, b) => {
    const dateA = new Date(a.createdAt)
    const dateB = new Date(b.createdAt)
    return ascending ? dateA - dateB : dateB - dateA
  })
}

// Usage
const files = await getFiles('demo-user')
const searchResults = searchFiles(files, 'report')
const pdfFiles = filterByType(files, 'application/pdf')
const sortedFiles = sortByDate(files, false)
```

## Error Handling

### Robust Error Handling

```javascript
const uploadFileWithErrorHandling = async (file) => {
  try {
    const formData = new FormData()
    formData.append('file', file)
    
    const response = await fetch('/api/files', {
      method: 'POST',
      headers: {
        'x-user-id': 'demo-user'
      },
      body: formData
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Upload failed')
    }
    
    return await response.json()
  } catch (error) {
    if (error instanceof TypeError) {
      console.error('Network error:', error)
      throw new Error('Network error. Please check your connection.')
    } else {
      console.error('Upload error:', error)
      throw error
    }
  }
}
```

## Testing Examples

### Jest Test Example

```javascript
import { uploadFile } from './fileService'

describe('File Upload', () => {
  it('should upload a file successfully', async () => {
    const file = new File(['content'], 'test.txt', { type: 'text/plain' })
    
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        file: {
          id: 'test-id',
          originalName: 'test.txt',
          size: 7
        }
      })
    })
    
    const result = await uploadFile(file)
    
    expect(result.file.originalName).toBe('test.txt')
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/files',
      expect.objectContaining({
        method: 'POST'
      })
    )
  })
})
```
