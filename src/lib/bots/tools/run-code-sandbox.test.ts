import { describe, it, expect } from 'vitest';
import { executeCodeSandbox } from './run-code-sandbox';

describe('executeCodeSandbox', () => {
    it('evaluates basic math', async () => {
        const res = await executeCodeSandbox({ code: '1 + 1', language: 'math' });
        expect(res.ok).toBe(true);
        expect(res.result).toContain('2');
    });

    it('prevents access to process', async () => {
        const res = await executeCodeSandbox({ code: 'process.env', language: 'javascript' });
        expect(res.ok).toBe(false);
        expect(res.result).toContain('process is not defined');
    });

    it('times out on infinite loops', async () => {
        const res = await executeCodeSandbox({ code: 'while(true){}', language: 'javascript' });
        expect(res.ok).toBe(false);
        expect(res.result).toContain('timed out');
    });
});
