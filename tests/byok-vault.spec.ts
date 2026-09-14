import { test, expect } from '@playwright/test'
import { getActiveByokPayload, loadByokConfigs } from '../src/lib/byok-vault'

test.describe('BYOK vault', () => {
    test('defaults include Anthropic and send no keys until enabled', () => {
        const configs = loadByokConfigs()
        expect(configs.anthropic?.providerId).toBe('anthropic')
        expect(configs.anthropic?.preferredModel).toBe('claude-3-7-sonnet')
        expect(getActiveByokPayload()).toEqual({})
    })
})