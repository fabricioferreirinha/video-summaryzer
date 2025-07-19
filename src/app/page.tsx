'use client'

import { useState, useRef } from 'react'
import { Play, Download, Sparkles, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import VideoUpload from '@/components/VideoUpload'
import ConfigurationPanel from '@/components/ConfigurationPanel'
import ProgressTracker from '@/components/ProgressTracker'
import { ThemeToggle } from '@/components/ThemeToggle'
import { VideoFile, TranscriptionProgress, LogEntry } from '@/types'

export default function Home() {
  const [selectedVideo, setSelectedVideo] = useState<VideoFile | null>(null)
  const [selectedModel, setSelectedModel] = useState('base')
  const [selectedLanguage, setSelectedLanguage] = useState('pt')
  const [selectedFormat, setSelectedFormat] = useState('txt')
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [transcriptionResult, setTranscriptionResult] = useState<string | null>(null)
  const [progress, setProgress] = useState<TranscriptionProgress>({
    progress: 0,
    status: 'Ready',
    logs: []
  })
  const abortControllerRef = useRef<AbortController | null>(null)

  const addLog = (message: string, level: 'info' | 'warning' | 'error' = 'info') => {
    const timestamp = new Date().toLocaleTimeString()
    const logEntry: LogEntry = { timestamp, level, message }
    
    setProgress(prev => ({
      ...prev,
      logs: [...prev.logs, logEntry]
    }))
  }

  const handleTranscribe = async () => {
    if (!selectedVideo) return

    setIsTranscribing(true)
    setTranscriptionResult(null)
    setProgress({ progress: 0, status: 'Initializing...', logs: [] })

    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController()

    try {
      addLog('Starting transcription process...')
      addLog(`Video: ${selectedVideo.name}`)
      addLog(`Model: ${selectedModel}`)
      addLog(`Language: ${selectedLanguage}`)
      addLog(`Format: ${selectedFormat}`)

      // Update progress
      setProgress(prev => ({ ...prev, progress: 10, status: 'Uploading video...' }))
      
      const formData = new FormData()
      formData.append('file', selectedVideo.file)
      formData.append('model', selectedModel)
      formData.append('language', selectedLanguage)
      formData.append('format', selectedFormat)

      addLog('Uploading video file...')
      
      // Update progress
      setProgress(prev => ({ ...prev, progress: 25, status: 'Processing with Whisper...' }))
      
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
        signal: abortControllerRef.current.signal
      })

      if (!response.ok) {
        throw new Error('Transcription failed')
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response stream')

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        // Parse the SSE data
        const text = new TextDecoder().decode(value)
        const lines = text.split('\n')
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6))
            
            if (data.type === 'progress') {
              setProgress(prev => ({
                ...prev,
                progress: data.progress,
                status: data.status
              }))
              addLog(data.status)
            } else if (data.type === 'complete') {
              if (data.result && data.result.text) {
                setTranscriptionResult(data.result.text)
                addLog(`Detected language: ${data.result.language || 'unknown'}`)
                
                // Log saved file info if available
                if (data.result.saved_file) {
                  addLog(`Transcription saved to: ${data.result.saved_file}`)
                }
                
                setProgress(prev => ({ 
                  ...prev, 
                  progress: 100, 
                  status: 'Transcription complete!' 
                }))
              } else {
                addLog('Error: No transcription result received', 'error')
                setProgress(prev => ({ ...prev, status: 'Error: No result received' }))
              }
            } else if (data.type === 'error') {
              addLog(`Error: ${data.message}`, 'error')
              setProgress(prev => ({ ...prev, status: 'Error occurred' }))
            }
          }
        }
      }

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        addLog('Transcription cancelled by user', 'warning')
        setProgress(prev => ({ ...prev, status: 'Cancelled' }))
      } else {
        console.error('Transcription error:', error)
        addLog(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error')
        setProgress(prev => ({ ...prev, status: 'Error occurred' }))
      }
    } finally {
      setIsTranscribing(false)
      abortControllerRef.current = null
    }
  }

  const handleDownload = () => {
    if (!transcriptionResult || !selectedVideo) return

    const blob = new Blob([transcriptionResult], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${selectedVideo.name.split('.')[0]}_transcription.${selectedFormat}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleClearVideo = () => {
    setSelectedVideo(null)
    setTranscriptionResult(null)
    setProgress({ progress: 0, status: 'Ready', logs: [] })
  }

  const handleCancelTranscription = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      addLog('Cancelling transcription...', 'warning')
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">
                Video Transcriber
              </h1>
              <p className="text-sm text-muted-foreground">
                AI-powered transcription with OpenAI Whisper
              </p>
            </div>
          </div>
          <ThemeToggle />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Upload & Configuration */}
          <div className="lg:col-span-1 space-y-6">
            <VideoUpload
              onVideoSelect={setSelectedVideo}
              selectedVideo={selectedVideo}
              onClear={() => setSelectedVideo(null)}
              transcriptionProgress={progress.progress}
              transcriptionStatus={progress.status}
            />
            <ConfigurationPanel
              selectedModel={selectedModel}
              selectedLanguage={selectedLanguage}
              selectedFormat={selectedFormat}
              onModelChange={setSelectedModel}
              onLanguageChange={setSelectedLanguage}
              onFormatChange={setSelectedFormat}
            />

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button
                onClick={handleTranscribe}
                disabled={!selectedVideo || isTranscribing}
                className="w-full h-11"
                size="lg"
              >
                {isTranscribing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Transcribing...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Start Transcription
                  </>
                )}
              </Button>
              
              {isTranscribing && (
                <Button
                  onClick={handleCancelTranscription}
                  variant="outline"
                  className="w-full h-11"
                  size="lg"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              )}
            </div>
          </div>

          {/* Right Column - Progress & Results */}
          <div className="lg:col-span-2 space-y-6">
            <ProgressTracker
              progress={progress}
              isTranscribing={isTranscribing}
            />

            {/* Results */}
            {transcriptionResult && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Result</span>
                    <Button
                      onClick={handleDownload}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Download
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted/50 rounded-lg p-4 max-h-96 overflow-y-auto">
                    <pre className="text-sm text-foreground whitespace-pre-wrap font-mono">
                      {transcriptionResult}
                    </pre>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}