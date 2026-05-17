import { expect, test, describe } from 'vitest'
import { toSlug, sanitizeHtml, stripHtmlTags } from '../utils/security'

describe('Security Utils', () => {
  test('toSlug creates valid slugs', () => {
    expect(toSlug('Hello World')).toBe('hello-world')
    expect(toSlug('This is a TEST! 123')).toBe('this-is-a-test-123')
    expect(toSlug('   Extra   Spaces   ')).toBe('extra-spaces')
  })

  test('sanitizeHtml removes script tags', () => {
    const dirty = '<script>alert("xss")</script><p>Hello</p>'
    expect(sanitizeHtml(dirty)).toBe('<p>Hello</p>')
  })

  test('stripHtmlTags removes all HTML tags', () => {
    const html = '<h1>Title</h1><p>Some <b>bold</b> text.</p>'
    expect(stripHtmlTags(html)).toBe('TitleSome bold text.')
  })
})
