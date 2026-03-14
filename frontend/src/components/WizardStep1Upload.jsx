import { useState } from 'react'
import { useDropzone } from 'react-dropzone'
import client from '../api/client'
import demoData from '../data/demoData.csv?url'

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB in bytes

export default function WizardStep1Upload({ onSuccess }) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const [uploadProgress, setUploadProgress] = useState(0)

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
  }

  const validateFile = (file) => {
    // Check file type
    const validTypes = ['.csv', '.xlsx', '.xls']
    const fileExt = '.' + file.name.split('.').pop().toLowerCase()
    
    if (!validTypes.includes(fileExt)) {
      return 'Invalid file type. Please upload a CSV, XLS, or XLSX file.'
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return `File is too large (${formatFileSize(file.size)}). Maximum size is 50MB.`
    }

    return null
  }

  const uploadFile = async (file) => {
    setError(null)
    setUploading(true)
    setUploadProgress(0)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await client.post('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            )
            setUploadProgress(percentCompleted)
          }
        },
      })

      onSuccess(response.data)
    } catch (err) {
      setError(err.message || 'Failed to upload file')
      setUploadProgress(0)
    } finally {
      setUploading(false)
    }
  }

  const onDrop = async (acceptedFiles, rejectedFiles) => {
    // Handle rejected files (wrong type)
    if (rejectedFiles.length > 0) {
      const rejection = rejectedFiles[0]
      if (rejection.errors.some(e => e.code === 'file-invalid-type')) {
        setError('Invalid file type. Please upload a CSV, XLS, or XLSX file.')
      } else if (rejection.errors.some(e => e.code === 'file-too-large')) {
        setError(`File is too large. Maximum size is 50MB.`)
      } else {
        setError(rejection.errors[0]?.message || 'File rejected')
      }
      setSelectedFile(null)
      return
    }

    if (acceptedFiles.length === 0) return

    const file = acceptedFiles[0]
    
    // Additional validation
    const validationError = validateFile(file)
    if (validationError) {
      setError(validationError)
      setSelectedFile(null)
      return
    }

    setSelectedFile(file)
    setError(null)
    await uploadFile(file)
  }

  const handleDemoDataset = async () => {
    setError(null)
    setUploading(true)
    setUploadProgress(0)
    setSelectedFile(null)

    try {
      // Fetch the demo CSV file
      const response = await fetch(demoData)
      const blob = await response.blob()
      const file = new File([blob], 'demo_data.csv', { type: 'text/csv' })
      
      setSelectedFile(file)
      
      // Upload the demo file
      await uploadFile(file)
    } catch (err) {
      setError('Failed to load demo dataset. Please try uploading your own file.')
      setUploading(false)
      setUploadProgress(0)
    }
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
    multiple: false,
    disabled: uploading,
    maxSize: MAX_FILE_SIZE,
  })

  return (
    <div className="uploadStep">
      <h2 className="uploadTitle">Upload your data file</h2>
      <p className="uploadSubtitle">
        Upload a CSV or Excel file with your time series data
      </p>

      <div
        {...getRootProps()}
        className={`uploadZone ${isDragActive ? 'dragActive' : ''} ${uploading ? 'uploading' : ''}`}
      >
        <input {...getInputProps()} />
        {uploading ? (
          <div className="uploadStatus">
            <div className="uploadSpinner"></div>
            <p>Uploading{selectedFile ? ` ${selectedFile.name}` : ''}...</p>
            <div className="progressBarContainer">
              <div 
                className="progressBar" 
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            <p className="progressText">{uploadProgress}%</p>
          </div>
        ) : selectedFile ? (
          <div className="selectedFile">
            <div className="fileIcon">📄</div>
            <div className="fileInfo">
              <p className="fileName">{selectedFile.name}</p>
              <p className="fileSize">{formatFileSize(selectedFile.size)}</p>
            </div>
          </div>
        ) : (
          <div className="uploadContent">
            <div className="uploadIcon">📁</div>
            <p className="uploadText">
              {isDragActive
                ? 'Drop your file here'
                : 'Drag and drop a file here, or click to select'}
            </p>
            <p className="uploadHint">CSV, XLS, or XLSX files supported (max 50MB)</p>
          </div>
        )}
      </div>

      {error && (
        <div className="uploadError">
          <span className="errorIcon">⚠️</span>
          <span>{error}</span>
        </div>
      )}

      <div className="demoSection">
        <p className="demoText">Or try our demo dataset:</p>
        <button 
          className="demoButton" 
          onClick={handleDemoDataset}
          disabled={uploading}
        >
          Try Demo Dataset
        </button>
      </div>
    </div>
  )
}
