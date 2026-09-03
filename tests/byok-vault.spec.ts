import { test, expect } from '@playwright/test'
import { getActiveByokPayload, loadByokConfigs } from '../src/lib/byok-vault'

test.describe('BYOK vault', () => {
    test('defaults include DeepSeek and send no keys until enabled', () => {
        const configs = loadByokConfigs()
        expect(configs.deepseek?.providerId).toBe('deepseek')
        expect(configs.deepseek?.preferredModel).toBe('deepseek-chat')
        expect(getActiveByokPayload()).toEqual({})
    })
})
