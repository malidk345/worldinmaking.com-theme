import { useState, useEffect, useCallback } from 'react'

export type FontFamily = 'system' | 'serif' | 'mono'
export type FontSize = 'sm' | 'md' | 'lg'
export type LineHeight = 'tight' | 'normal' | 'relaxed'
export type ContentWidth = 'narrow' | 'normal' | 'wide'

export interface EditorSettings {
  fontFamily: FontFamily
  fontSize: FontSize
  lineHeight: LineHeight
  contentWidth: ContentWidth
}

const DEFAULTS: EditorSettings = {
  fontFamily: 'system',
  fontSize: 'md',
  lineHeight: 'normal',
  contentWidth: 'normal',
}

export function useEditorSettings() {
  const [settings, setSettings] = useState<EditorSettings>(DEFAULTS)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem('craft_settings')
      if (stored) setSettings({ ...DEFAULTS, ...JSON.parse(stored) })
    } catch {}
    setLoaded(true)
  }, [])

  const updateSettings = useCallback((updates: Partial<EditorSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...updates }
      localStorage.setItem('craft_settings', JSON.stringify(next))
      return next
    })
  }, [])

  return { settings, updateSettings, loaded }
}
