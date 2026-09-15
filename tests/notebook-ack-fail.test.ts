import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

describe('Fail-closed nacks are present', () => {
  it('App.tsx contains fail acks for footnote, annotation, replace', () => {
    const src = fs.readFileSync(path.join(__dirname, '../src/notebook-app/App.tsx'), 'utf-8')
    expect(src).toContain("error: 'empty_text'")
    expect(src).toContain("error: 'selection_not_found'")
    expect(src).toContain("error: 'span_not_found'")
  })

  it('ClaudeWorkspaceChat checks for ok === false', () => {
    const src = fs.readFileSync(path.join(__dirname, '../src/components/ClaudeWorkspaceChat/index.tsx'), 'utf-8')
    expect(src).toContain("customEvent.detail?.ok === false")
  })
})
