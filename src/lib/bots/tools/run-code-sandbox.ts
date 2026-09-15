import * as vm from 'vm';

export async function executeCodeSandbox(args: Record<string, unknown>): Promise<{ ok: boolean; result: string; title?: string }> {
    const code = typeof args.code === 'string' ? args.code : '';
    const language = typeof args.language === 'string' ? args.language : 'javascript';
    const title = typeof args.title === 'string' ? args.title : undefined;

    if (!code) {
        return { ok: false, result: JSON.stringify({ ok: false, error: 'code is required' }) };
    }
    if (language !== 'javascript' && language !== 'math' && language !== 'logic') {
        return { ok: false, result: JSON.stringify({ ok: false, error: 'unsupported language, use javascript, math, or logic' }) };
    }

    try {
        // Create an empty context without inheriting outer-realm Object prototype
        const context = Object.create(null);
        vm.createContext(context);

        const startTime = performance.now();
        const val = vm.runInContext(code, context, { timeout: 200 });
        const executionTime = performance.now() - startTime;

        let output = String(val);
        if (typeof val === 'object' && val !== null) {
            try {
                // Use the context's JSON stringify if possible, or fallback
                const innerJSON = vm.runInContext('JSON.stringify', context);
                if (typeof innerJSON === 'function') {
                     output = innerJSON(val, null, 2);
                } else {
                     output = String(val);
                }
            } catch {
                // ignore
            }
        }
        if (val === undefined) output = 'undefined';

        const formattedResult = `Execution time: ${executionTime.toFixed(2)}ms\n\n\`\`\`${language}\n${output}\n\`\`\``;
        return { ok: true, result: formattedResult, title };
    } catch (error: any) {
        return { ok: false, result: JSON.stringify({ ok: false, error: error.message || 'Execution failed' }), title };
    }
}
