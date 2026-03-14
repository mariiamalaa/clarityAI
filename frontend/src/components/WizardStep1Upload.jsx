import { useState } from 'react'
import { useDropzone } from 'react-dropzone'
import client from '../api/client'

export default function WizardStep1Upload({ onSuccess }) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)

  const onDrop = async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return

    const file = acceptedFiles[0]
    setError(null)
    setUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await client.post('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      onSuccess(response.data)
    } catch (err) {
      setError(err.message || 'Failed to upload file')
    } finally {
      setUploading(false)
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
            <p>Uploading...</p>
          </div>
        ) : (
          <div className="uploadContent">
            <div className="uploadIcon">📁</div>
            <p className="uploadText">
              {isDragActive
                ? 'Drop your file here'
                : 'Drag and drop a file here, or click to select'}
            </p>
            <p className="uploadHint">CSV, XLS, or XLSX files supported</p>
          </div>
        )}
      </div>

      {error && (
        <div className="uploadError">
          <span className="errorIcon">⚠️</span>
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}
