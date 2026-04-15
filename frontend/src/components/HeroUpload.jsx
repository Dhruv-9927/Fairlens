import { useState, useRef } from 'react'
import { uploadDataset, loadSample } from '../api'

export default function HeroUpload({ onDatasetLoaded }) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [loadingText, setLoadingText] = useState('')
  const fileInputRef = useRef(null)

  const handleFile = async (file) => {
    if (!file || !file.name.endsWith('.csv')) {
      alert('Please upload a CSV file')
      return
    }
    setIsLoading(true)
    setLoadingText('> parsing dataset...')
    try {
      const result = await uploadDataset(file)
      onDatasetLoaded(result)
    } catch (e) {
      alert('Upload failed: ' + e.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSample = async (filename) => {
    setIsLoading(true)
    setLoadingText(`> loading ${filename}...`)
    try {
      const result = await loadSample(filename)
      onDatasetLoaded(result)
    } catch (e) {
      alert('Failed to load sample: ' + e.message)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div style={{ padding: '6rem 0' }}>
        <div className="loader" style={{ flexDirection: 'column', gap: '1rem' }}>
          <div className="spinner" />
          <span className="loading-text">{loadingText}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="hero-section animate-fade-in">
      <div className="hero-eyebrow">
        <div className="hero-eyebrow-dot" />
        <span className="hero-eyebrow-text">Bias Detection Platform</span>
      </div>

      <h1 className="hero-headline">
        The tool that would have caught{' '}
        <span>Amazon's hiring bias</span>
      </h1>

      <p className="hero-subtitle">
        Upload any dataset. Detect demographic bias in seconds.
        Get plain-English explanations powered by Gemini.
      </p>

      <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div
          className={`upload-zone ${isDragOver ? 'drag-over' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setIsDragOver(false)
            handleFile(e.dataTransfer.files[0])
          }}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="upload-icon">↑</div>
          <div className="upload-title">Drop CSV here or click to browse</div>
          <div className="upload-hint">Any CSV with demographic columns</div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            style={{ display: 'none' }}
            onChange={(e) => handleFile(e.target.files[0])}
          />
        </div>

        <div>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: '0.6rem',
            color: 'var(--text-4)', textTransform: 'uppercase',
            letterSpacing: '0.12em', marginBottom: '0.75rem',
          }}>
            Sample Datasets
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <button className="btn btn-outline" onClick={() => handleSample('hiring_bias.csv')}
              style={{ width: '100%', justifyContent: 'space-between' }}>
              <span>Hiring Bias</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--text-4)' }}>160 rows</span>
            </button>
            <button className="btn btn-outline" onClick={() => handleSample('lending_bias.csv')}
              style={{ width: '100%', justifyContent: 'space-between' }}>
              <span>Lending Bias</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--text-4)' }}>80 rows</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
