'use client'

import { Settings, Cpu, Globe, FileText } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { WhisperModel, Language, OutputFormat } from '@/types'

interface ConfigurationPanelProps {
  selectedModel: string
  selectedLanguage: string
  selectedFormat: string
  onModelChange: (model: string) => void
  onLanguageChange: (language: string) => void
  onFormatChange: (format: string) => void
}

const whisperModels: WhisperModel[] = [
  { id: 'tiny', name: 'Tiny', size: '39 MB', description: 'Fastest, least accurate' },
  { id: 'base', name: 'Base', size: '74 MB', description: 'Fast, good accuracy' },
  { id: 'small', name: 'Small', size: '244 MB', description: 'Balanced speed/accuracy' },
  { id: 'medium', name: 'Medium', size: '769 MB', description: 'Good accuracy, slower' },
  { id: 'large', name: 'Large', size: '1550 MB', description: 'Best accuracy, slowest' }
]

const languages: Language[] = [
  { code: 'pt', name: 'Portuguese (Brazil)', nativeName: 'Português (Brasil)' },
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
  { code: 'zh', name: 'Chinese', nativeName: '中文' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  { code: 'auto', name: 'Auto-detect', nativeName: 'Auto-detect' }
]

const outputFormats: OutputFormat[] = [
  { id: 'txt', name: 'Plain Text', extension: 'txt', description: 'Simple text transcription' },
  { id: 'srt', name: 'SubRip Subtitle', extension: 'srt', description: 'Subtitle format with timestamps' },
  { id: 'vtt', name: 'WebVTT', extension: 'vtt', description: 'Web video text tracks' },
  { id: 'json', name: 'JSON', extension: 'json', description: 'Complete data with metadata' }
]

export default function ConfigurationPanel({
  selectedModel,
  selectedLanguage,
  selectedFormat,
  onModelChange,
  onLanguageChange,
  onFormatChange
}: ConfigurationPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Configuration
        </CardTitle>
        <CardDescription>
          Configure transcription settings for optimal results
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Model Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <Cpu className="h-4 w-4" />
            Whisper Model
          </label>
          <Select value={selectedModel} onValueChange={onModelChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select model" />
            </SelectTrigger>
            <SelectContent>
              {whisperModels.map((model) => (
                <SelectItem key={model.id} value={model.id}>
                  <div className="flex items-center justify-between w-full">
                    <div>
                      <div className="font-medium">{model.name}</div>
                      <div className="text-xs text-gray-500">{model.description}</div>
                    </div>
                    <div className="text-xs text-gray-400 ml-4">{model.size}</div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-500">
            Larger models provide better accuracy but take longer to process
          </p>
        </div>

        {/* Language Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Language
          </label>
          <Select value={selectedLanguage} onValueChange={onLanguageChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select language" />
            </SelectTrigger>
            <SelectContent>
              {languages.map((language) => (
                <SelectItem key={language.code} value={language.code}>
                  <div className="flex items-center justify-between w-full">
                    <span>{language.name}</span>
                    <span className="text-xs text-gray-400 ml-4">{language.nativeName}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-500">
            Select the primary language of your video or use auto-detect
          </p>
        </div>

        {/* Output Format Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Output Format
          </label>
          <Select value={selectedFormat} onValueChange={onFormatChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select format" />
            </SelectTrigger>
            <SelectContent>
              {outputFormats.map((format) => (
                <SelectItem key={format.id} value={format.id}>
                  <div className="flex items-center justify-between w-full">
                    <div>
                      <div className="font-medium">{format.name}</div>
                      <div className="text-xs text-gray-500">{format.description}</div>
                    </div>
                    <div className="text-xs text-gray-400 ml-4">.{format.extension}</div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-500">
            Choose the format that best suits your needs
          </p>
        </div>
      </CardContent>
    </Card>
  )
}