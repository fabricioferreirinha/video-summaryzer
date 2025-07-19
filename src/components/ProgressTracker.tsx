'use client'

import { useState, useEffect } from 'react'
import { Clock, Activity, CheckCircle, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { TranscriptionProgress, LogEntry } from '@/types'
import { formatTime } from '@/lib/utils'

interface ProgressTrackerProps {
  progress: TranscriptionProgress
  isTranscribing: boolean
}

export default function ProgressTracker({ progress, isTranscribing }: ProgressTrackerProps) {
  const [elapsedTime, setElapsedTime] = useState(0)
  const [startTime, setStartTime] = useState<number | null>(null)

  useEffect(() => {
    if (isTranscribing && !startTime) {
      setStartTime(Date.now())
      setElapsedTime(0)
    } else if (!isTranscribing) {
      setStartTime(null)
      setElapsedTime(0)
    }
  }, [isTranscribing, startTime])

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    if (isTranscribing && startTime) {
      interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000))
      }, 1000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isTranscribing, startTime])

  const getStatusIcon = () => {
    if (progress.progress === 100) {
      return <CheckCircle className="h-5 w-5 text-green-600" />
    } else if (isTranscribing) {
      return <Activity className="h-5 w-5 text-blue-600 animate-pulse" />
    } else {
      return <Clock className="h-5 w-5 text-gray-400" />
    }
  }

  const getStatusColor = () => {
    if (progress.progress === 100) return 'text-green-600'
    if (isTranscribing) return 'text-blue-600'
    return 'text-gray-500'
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {getStatusIcon()}
          Transcription Progress
        </CardTitle>
        <CardDescription>
          Track the progress of your video transcription
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Progress</span>
            <span className="text-sm text-gray-500">{progress.progress}%</span>
          </div>
          <Progress value={progress.progress} className="h-2" />
          <p className={`text-sm font-medium ${getStatusColor()}`}>
            {progress.status}
          </p>
        </div>

        {/* Time Information */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-sm text-gray-500">Elapsed Time</p>
            <p className="text-lg font-semibold">{formatTime(elapsedTime)}</p>
          </div>
          {progress.estimatedTimeRemaining && (
            <div className="space-y-1">
              <p className="text-sm text-gray-500">Estimated Remaining</p>
              <p className="text-lg font-semibold text-blue-600">
                {formatTime(progress.estimatedTimeRemaining)}
              </p>
            </div>
          )}
        </div>

        {/* Logs */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Process Logs</h4>
          <div className="log-container">
            {progress.logs.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                No logs yet. Start transcription to see progress.
              </p>
            ) : (
              <div className="space-y-1">
                {progress.logs.slice(-10).map((log, index) => (
                  <div key={index} className={`log-entry ${log.level}`}>
                    <span className="text-gray-400">[{log.timestamp}]</span>{' '}
                    <span className="font-medium">{log.level.toUpperCase()}:</span>{' '}
                    {log.message}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Status Indicators */}
        <div className="flex items-center gap-4 pt-4 border-t">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              isTranscribing ? 'bg-blue-500 animate-pulse' : 'bg-gray-300'
            }`} />
            <span className="text-sm text-gray-600">
              {isTranscribing ? 'Processing...' : 'Idle'}
            </span>
          </div>
          {progress.progress === 100 && (
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-600">Complete</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}