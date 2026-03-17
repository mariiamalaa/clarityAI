import { useState, useEffect } from 'react'
import client from '../api/client'

export default function WizardStep2Columns({ fileId, columns, onNext, onUpdate }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [suggestions, setSuggestions] = useState({
    date_col: null,
    metric_col: null,
    group_col: null,
  })
  const [preview, setPreview] = useState([])
  const [selectedCols, setSelectedCols] = useState({
    dateCol: null,
    metricCol: null,
    groupCol: null,
  })
  const [validating, setValidating] = useState(false)
  const [validationResult, setValidationResult] = useState(null)

  useEffect(() => {
    if (!fileId) return

    const fetchProfile = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await client.get(`/profile/${fileId}`)
        const data = response.data
        
        setSuggestions({
          date_col: data.suggestions?.date_col || null,
          metric_col: data.suggestions?.metric_col || null,
          group_col: data.suggestions?.group_col || null,
        })
        
        setPreview(data.preview || [])
        
        // Pre-select suggested columns
        setSelectedCols({
          dateCol: data.suggestions?.date_col || null,
          metricCol: data.suggestions?.metric_col || null,
          groupCol: data.suggestions?.group_col || null,
        })
      } catch (err) {
        setError(err.message || 'Failed to load column suggestions')
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [fileId])

  const handleColumnChange = (type, value) => {
    const newSelections = {
      ...selectedCols,
      [type]: value === '' ? null : value,
    }
    setSelectedCols(newSelections)
    setValidationResult(null) // Clear validation when selections change
  }

  const handleNext = async () => {
    if (!selectedCols.dateCol || !selectedCols.metricCol) {
      setError('Please select both Date and Metric columns')
      return
    }

    setValidating(true)
    setError(null)

    try {
      const response = await client.post('/validate', {
        file_id: fileId,
        date_col: selectedCols.dateCol,
        metric_col: selectedCols.metricCol,
        group_col: selectedCols.groupCol || null,
      })

      const result = response.data
      setValidationResult(result)

      if (result.valid) {
        // Save selections to wizard state
        onUpdate({
          dateCol: selectedCols.dateCol,
          metricCol: selectedCols.metricCol,
          groupCol: selectedCols.groupCol,
        })
        // Proceed to next step
        onNext()
      } else {
        // Errors block - show them but don't proceed
        setError(result.errors.join(' '))
      }
    } catch (err) {
      setError(err.message || 'Validation failed')
    } finally {
      setValidating(false)
    }
  }

  const isAutoDetected = (colName, type) => {
    if (type === 'dateCol') return suggestions.date_col === colName
    if (type === 'metricCol') return suggestions.metric_col === colName
    if (type === 'groupCol') return suggestions.group_col === colName
    return false
  }

  if (loading) {
    return (
      <div className="columnsStep">
        <div className="loadingState">
          <div className="uploadSpinner"></div>
          <p>Loading column suggestions...</p>
        </div>
      </div>
    )
  }

  if (error && !validationResult) {
    return (
      <div className="columnsStep">
        <div className="uploadError">
          <span className="errorIcon">⚠️</span>
          <span>{error}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="columnsStep">
      <h2 className="columnsTitle">Confirm your columns</h2>
      <p className="columnsSubtitle">
        Review the auto-detected columns or select different ones
      </p>

      <div className="columnsForm">
        <div className="columnField">
          <label className="columnLabel">
            Date Column <span className="required">*</span>
          </label>
          <div className="selectWrapper">
            <select
              className="columnSelect"
              value={selectedCols.dateCol || ''}
              onChange={(e) => handleColumnChange('dateCol', e.target.value)}
            >
              <option value="">Select date column...</option>
              {columns.map((col) => (
                <option key={col} value={col}>
                  {col}
                </option>
              ))}
            </select>
            {selectedCols.dateCol && isAutoDetected(selectedCols.dateCol, 'dateCol') && (
              <span className="autoDetectedBadge">Auto-detected</span>
            )}
          </div>
        </div>

        <div className="columnField">
          <label className="columnLabel">
            Metric Column <span className="required">*</span>
          </label>
          <div className="selectWrapper">
            <select
              className="columnSelect"
              value={selectedCols.metricCol || ''}
              onChange={(e) => handleColumnChange('metricCol', e.target.value)}
            >
              <option value="">Select metric column...</option>
              {columns.map((col) => (
                <option key={col} value={col}>
                  {col}
                </option>
              ))}
            </select>
            {selectedCols.metricCol && isAutoDetected(selectedCols.metricCol, 'metricCol') && (
              <span className="autoDetectedBadge">Auto-detected</span>
            )}
          </div>
        </div>

        <div className="columnField">
          <label className="columnLabel">
            Group Column <span className="optional">(optional)</span>
          </label>
          <div className="selectWrapper">
            <select
              className="columnSelect"
              value={selectedCols.groupCol || ''}
              onChange={(e) => handleColumnChange('groupCol', e.target.value)}
            >
              <option value="">None</option>
              {columns.map((col) => (
                <option key={col} value={col}>
                  {col}
                </option>
              ))}
            </select>
            {selectedCols.groupCol && isAutoDetected(selectedCols.groupCol, 'groupCol') && (
              <span className="autoDetectedBadge">Auto-detected</span>
            )}
          </div>
        </div>
      </div>

      {preview.length > 0 && (
        <div className="previewSection">
          <h3 className="previewTitle">Data Preview</h3>
          <div className="previewTableContainer">
            <table className="previewTable">
              <thead>
                <tr>
                  {Object.keys(preview[0]).map((col) => (
                    <th key={col} className={col === selectedCols.dateCol ? 'highlighted' : col === selectedCols.metricCol ? 'highlighted' : col === selectedCols.groupCol ? 'highlighted' : ''}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.map((row, idx) => (
                  <tr key={idx}>
                    {Object.keys(row).map((col) => (
                      <td key={col} className={col === selectedCols.dateCol ? 'highlighted' : col === selectedCols.metricCol ? 'highlighted' : col === selectedCols.groupCol ? 'highlighted' : ''}>
                        {row[col] !== null && row[col] !== undefined ? String(row[col]) : ''}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {validationResult && (
        <div className="validationSection">
          {validationResult.errors.length > 0 && (
            <div className="validationErrors">
              {validationResult.errors.map((err, idx) => (
                <div key={idx} className="errorMessage">
                  <span className="errorIcon">❌</span>
                  <span>{err}</span>
                </div>
              ))}
            </div>
          )}
          {validationResult.warnings.length > 0 && (
            <div className="validationWarnings">
              {validationResult.warnings.map((warn, idx) => (
                <div key={idx} className="warningMessage">
                  <span className="warningIcon">⚠️</span>
                  <span>{warn}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="uploadError">
          <span className="errorIcon">⚠️</span>
          <span>{error}</span>
        </div>
      )}

      <div className="columnsActions">
        <button
          className="btnPrimary"
          onClick={handleNext}
          disabled={validating || !selectedCols.dateCol || !selectedCols.metricCol || (validationResult && !validationResult.valid)}
        >
          {validating ? 'Validating...' : 'Next'}
        </button>
      </div>
    </div>
  )
}
