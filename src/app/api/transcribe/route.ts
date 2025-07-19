import { NextRequest, NextResponse } from 'next/server'
import { writeFile, unlink } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { v4 as uuidv4 } from 'uuid'
import { formatTimeForSubtitle, formatTimeForVTT } from '@/lib/utils'
import { spawn } from 'child_process'
import { promisify } from 'util'
import path from 'path'

const exec = promisify(require('child_process').exec)

export async function POST(request: NextRequest) {
  try {
    const data = await request.formData()
    const file: File | null = data.get('file') as unknown as File
    const model = data.get('model') as string
    const language = data.get('language') as string
    const format = data.get('format') as string

    if (!file) {
      return NextResponse.json({ error: 'No file received' }, { status: 400 })
    }

    // Save the file temporarily
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const filename = `${uuidv4()}_${file.name}`
    const filepath = join(tmpdir(), filename)
    
    await writeFile(filepath, buffer)

    try {
      // Use local Whisper implementation
      const pythonScript = path.join(process.cwd(), 'whisper_cli.py')
      console.log(`Starting Python process: python ${pythonScript} ${filepath}`)
      
      // Use spawn instead of exec to get real-time output
      const pythonProcess = spawn('python', [
        pythonScript,
        filepath,
        '--model', model,
        '--language', language === 'auto' ? '' : language,
        '--format', 'json'
      ], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          PYTHONIOENCODING: 'utf-8',
          PYTHONLEGACYWINDOWSFSENCODING: '0'
        }
      })

      let transcriptionResult: any = null
      let lastProgress = 0

      // Create a ReadableStream for SSE
      const stream = new ReadableStream({
        async start(controller) {
          // Handle client disconnect and process cleanup
          const cleanup = () => {
            console.log('Cleaning up: killing Python process')
            if (!pythonProcess.killed) {
              pythonProcess.kill('SIGTERM')
              // Force kill if process doesn't terminate gracefully
              setTimeout(() => {
                if (!pythonProcess.killed) {
                  pythonProcess.kill('SIGKILL')
                }
              }, 5000)
            }
            try {
              require('fs').unlinkSync(filepath)
            } catch (e) {
              console.log('Temp file already cleaned up')
            }
          }
          
          // Set up cleanup on various events
          process.on('SIGTERM', cleanup)
          process.on('SIGINT', cleanup)
          
          // Handle request cancellation (when user clicks cancel)
          const handleCancellation = () => {
            cleanup()
            controller.enqueue(`data: ${JSON.stringify({
              type: 'error',
              message: 'Transcription cancelled by user'
            })}\n\n`)
            controller.close()
          }
          let partialLine = ''
          let resultSent = false  // Flag to prevent duplicate results
          
          pythonProcess.stdout.on('data', (data) => {
            const rawData = partialLine + data.toString('utf8')
            const lines = rawData.split('\n')
            
            // Keep the last line as partial if it doesn't end with newline
            partialLine = lines.pop() || ''
            
            for (const line of lines) {
              if (!line.trim()) continue
              
              // Handle result collection with base64 delimiter
              const delimiter = "===TRANSCRIPTION_RESULT_B64==="
              if (line.includes(delimiter)) {
                if (resultSent) {
                  console.log('Ignoring duplicate result')
                  continue
                }
                resultSent = true
                
                // Extract base64 JSON from between delimiters
                const parts = line.split(delimiter)
                if (parts.length >= 3) {
                  const resultBase64 = parts[1]
                  
                  try {
                    // Decode base64 to get JSON string
                    const resultJson = Buffer.from(resultBase64, 'base64').toString('utf-8')
                    const parsedResult = JSON.parse(resultJson)
                    
                    if (parsedResult && parsedResult.text && parsedResult.text.trim()) {
                      transcriptionResult = parsedResult
                      console.log('Transcription result collected successfully')
                    } else {
                      transcriptionResult = {
                        text: "Transcription completed but no text was extracted.",
                        language: "unknown"
                      }
                    }
                    
                  } catch (e) {
                    console.error('Failed to parse base64 result:', e)
                    console.error('Raw base64 result:', resultBase64.substring(0, 500))
                    
                    // Ultimate fallback: create minimal result
                    transcriptionResult = {
                      text: "Transcription completed but result parsing failed. Check server logs for details.",
                      language: "unknown"
                    }
                  }
                }
                continue
              }
              
              // Handle progress updates
              try {
                const jsonData = JSON.parse(line)
                if (jsonData.progress !== undefined) {
                  // Send progress update
                  controller.enqueue(`data: ${JSON.stringify({
                    type: 'progress',
                    progress: jsonData.progress,
                    status: jsonData.status
                  })}\n\n`)
                  lastProgress = jsonData.progress
                }
              } catch (e) {
                console.log('Non-JSON output:', line.substring(0, 100) + '...')
              }
            }
          })

          pythonProcess.stderr.on('data', (data) => {
            const errorMessage = data.toString()
            console.error('Python script stderr:', errorMessage)
            
            // Only send actual errors to frontend, not warnings or progress bars
            if (errorMessage.includes('Error:') || errorMessage.includes('Exception:') || errorMessage.includes('Traceback:')) {
              controller.enqueue(`data: ${JSON.stringify({
                type: 'error',
                message: errorMessage
              })}\n\n`)
            }
          })

          await new Promise((resolve, reject) => {
            pythonProcess.on('close', async (code) => {
              try {
                // Clean up temporary file
                await unlink(filepath)
              } catch (cleanupError) {
                console.error('Error cleaning up temporary file:', cleanupError)
              }

              if (code === 0) {
                // Send final transcription with saved file info
                const response = {
                  type: 'complete',
                  result: transcriptionResult
                }
                
                // Log saved file info if available
                if (transcriptionResult && transcriptionResult.saved_file) {
                  console.log(`Transcription saved to: ${transcriptionResult.saved_file}`)
                }
                
                controller.enqueue(`data: ${JSON.stringify(response)}\n\n`)
                controller.close()
                resolve(null)
              } else if (code === null) {
                // Process was killed (cancelled)
                controller.enqueue(`data: ${JSON.stringify({
                  type: 'error',
                  message: 'Transcription cancelled'
                })}\n\n`)
                controller.close()
                resolve(null)
              } else {
                console.error(`Python process exited with code ${code}`)
                controller.enqueue(`data: ${JSON.stringify({
                  type: 'error',
                  message: `Python process failed with exit code ${code}`
                })}\n\n`)
                reject(new Error(`Transcription failed with exit code ${code}`))
              }
            })
            
            pythonProcess.on('error', async (error) => {
              try {
                // Clean up temporary file on error
                await unlink(filepath)
              } catch (cleanupError) {
                console.error('Error cleaning up temporary file:', cleanupError)
              }
              
              console.error('Python process error:', error)
              controller.enqueue(`data: ${JSON.stringify({
                type: 'error',
                message: `Process error: ${error.message}`
              })}\n\n`)
              reject(error)
            })
          })
        }
      })

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      })

    } catch (transcriptionError) {
      // Clean up temporary file on error
      await unlink(filepath)
      console.error('Transcription error:', transcriptionError)
      return NextResponse.json(
        { error: 'Failed to transcribe audio' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Error processing request:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function formatSRT(segments: any[]): string {
  return segments.map((segment, index) => {
    const start = formatTimeForSubtitle(segment.start)
    const end = formatTimeForSubtitle(segment.end)
    return `${index + 1}\n${start} --> ${end}\n${segment.text.trim()}\n\n`
  }).join('')
}

function formatVTT(segments: any[]): string {
  let vtt = 'WEBVTT\n\n'
  vtt += segments.map((segment) => {
    const start = formatTimeForVTT(segment.start)
    const end = formatTimeForVTT(segment.end)
    return `${start} --> ${end}\n${segment.text.trim()}\n\n`
  }).join('')
  return vtt
}

// Alternative local Whisper implementation (commented out)
// This would require installing Whisper locally
/*
import { spawn } from 'child_process'

async function transcribeWithLocalWhisper(filepath: string, model: string, language: string) {
  return new Promise((resolve, reject) => {
    const args = [
      filepath,
      '--model', model,
      '--output_format', 'json',
      '--verbose', 'False'
    ]
    
    if (language !== 'auto') {
      args.push('--language', language)
    }
    
    const whisper = spawn('whisper', args)
    let output = ''
    let error = ''
    
    whisper.stdout.on('data', (data) => {
      output += data.toString()
    })
    
    whisper.stderr.on('data', (data) => {
      error += data.toString()
    })
    
    whisper.on('close', (code) => {
      if (code === 0) {
        try {
          const result = JSON.parse(output)
          resolve(result)
        } catch (e) {
          reject(new Error('Failed to parse Whisper output'))
        }
      } else {
        reject(new Error(`Whisper failed with code ${code}: ${error}`))
      }
    })
  })
}
*/