export interface TranscriptionSegment {
  id: number
  start: number
  end: number
  text: string
}

export interface TranscriptionResult {
  text: string
  segments: TranscriptionSegment[]
  language: string
}

export interface TranscriptionProgress {
  progress: number
  status: string
  estimatedTimeRemaining?: number
  logs: LogEntry[]
}

export interface LogEntry {
  timestamp: string
  level: 'info' | 'warning' | 'error'
  message: string
}

export interface WhisperModel {
  id: string
  name: string
  size: string
  description: string
}

export interface Language {
  code: string
  name: string
  nativeName: string
}

export interface OutputFormat {
  id: string
  name: string
  extension: string
  description: string
}

export interface VideoFile {
  file: File
  name: string
  size: number
  duration?: number
  type: string
}