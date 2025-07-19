'use client'

import { useState, useRef } from 'react'
import { Upload, X, FileVideo, CheckCircle, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { VideoFile } from '@/types'
import { formatFileSize } from '@/lib/utils'

interface VideoUploadProps {
  onVideoSelect: (video: VideoFile) => void
  selectedVideo: VideoFile | null
  onClear: () => void
  transcriptionProgress: number
  transcriptionStatus: string
}

export default function VideoUpload({ 
  onVideoSelect, 
  selectedVideo, 
  onClear, 
  transcriptionProgress, 
  transcriptionStatus 
}: VideoUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return

    const file = files[0]
    
    // Clear previous error
    setError(null)
    
    if (!file.type.startsWith('video/')) {
      setError('Please select a video file. Supported formats: MP4, MOV, AVI, and others.')
      return
    }

    // Check file size (1GB limit)
    const maxSize = 1024 * 1024 * 1024 // 1GB
    if (file.size > maxSize) {
      setError(`File size too large. Maximum size is ${formatFileSize(maxSize)}.`)
      return
    }

    const videoFile: VideoFile = {
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      duration: 0 // Will be set later when video metadata is loaded
    }

    onVideoSelect(videoFile)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    handleFileSelect(e.dataTransfer.files)
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files)
  }

  const handleClear = () => {
    setError(null)
    onClear()
  }


  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Video Upload
        </CardTitle>
        <CardDescription>
          Upload your video file to begin transcription
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          </div>
        )}
        {!selectedVideo ? (
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragging
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="flex flex-col items-center gap-4">
              <div className="p-4 bg-gray-100 rounded-full">
                <FileVideo className="h-8 w-8 text-gray-600" />
              </div>
              <div>
                <p className="text-lg font-medium text-gray-900">
                  Drop your video here or click to browse
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Supports MP4, MOV, AVI, and other video formats
                </p>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={handleFileInputChange}
            />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FileVideo className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{selectedVideo.name}</p>
                  <p className="text-sm text-gray-500">
                    {formatFileSize(selectedVideo.size)} • {selectedVideo.type}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {transcriptionProgress === 100 && (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClear}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {transcriptionProgress > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Upload Progress</span>
                  <span className="text-sm text-gray-500">{transcriptionProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${transcriptionProgress}%` }}
                  />
                </div>
                <p className="text-sm text-gray-600">{transcriptionStatus}</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}