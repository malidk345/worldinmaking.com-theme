// Node.js script to test the /api/notebook/co-author endpoint locally
async function testEndpoint() {
    const payloads = [
        {
            botName: 'zizek',
            mode: 'critique',
            documentText: 'Our new Agile framework will maximize developer productivity by 20% this quarter through better synergy and stand-up meetings.',
            nodeContent: 'We need to enforce strict daily stand-ups to ensure everyone is aligned.'
        },
        {
            botName: 'spinoza',
            mode: 'synthesize',
            documentText: 'We have two factions. Faction A wants microservices for infinite scalability. Faction B wants a monolith for simplicity. We are paralyzed by this choice.',
            nodeContent: 'We are paralyzed by this choice.'
        },
        {
            botName: 'rand',
            mode: 'debate',
            documentText: 'If we raise the marginal tax rate slightly, we can fund universal healthcare without hurting overall economic growth.',
            nodeContent: 'If we raise the marginal tax rate slightly, we can fund universal healthcare without hurting overall economic growth.'
        }
    ];

    let failures = 0;
    for (let i = 0; i < payloads.length; i++) {
        const payload = payloads[i];
        console.log(`\n===========================================`);
        console.log(`TEST ${i + 1}: Bot=@${payload.botName} | Mode=${payload.mode}`);
        console.log(`===========================================\n`);

        try {
            const res = await fetch('http://localhost:3000/api/notebook/co-author', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                console.error(`Request failed with status ${res.status}`);
                const text = await res.text();
                console.error(text);
                failures++;
                continue;
            }

            // Since it's an SSE stream, we read it chunk by chunk
            const reader = res.body.getReader();
            const decoder = new TextDecoder('utf-8');
            let done = false;
            let buffer = '';
            let sawDone = false;

            let fullText = '';
            while (!done) {
                const { value, done: readerDone } = await reader.read();
                if (value) {
                    buffer += decoder.decode(value, { stream: true });
                    const frames = buffer.split(/\r?\n\r?\n/);
                    buffer = frames.pop() || '';
                    for (const frame of frames) {
                        const line = frame.split(/\r?\n/).find((entry) => entry.startsWith('data: '));
                        if (!line) continue;
                        const parsed = JSON.parse(line.slice(6));
                        if (parsed.error) throw new Error(parsed.error);
                        if (parsed.token) fullText += parsed.token;
                        if (parsed.done) sawDone = true;
                    }
                }
                done = readerDone;
            }
            if (buffer.trim()) {
                const line = buffer.split(/\r?\n/).find((entry) => entry.startsWith('data: '));
                if (line) {
                    const parsed = JSON.parse(line.slice(6));
                    if (parsed.token) fullText += parsed.token;
                    if (parsed.done) sawDone = true;
                }
            }
            if (!sawDone || !fullText.trim()) {
                throw new Error('SSE response did not contain a complete non-empty reply');
            }
            console.log(fullText);

        } catch (e) {
            console.error(`Failed to connect:`, e.message);
            failures++;
        }
    }
    if (failures > 0) process.exitCode = 1;
}

// Keep checking until server is up
async function waitForServerAndTest() {
    console.log("Waiting for http://localhost:3000 to be ready...");
    let retries = 20;
    while (retries > 0) {
        try {
            await fetch('http://localhost:3000/api/health', { method: 'HEAD' }).catch(() => fetch('http://localhost:3000'));
            console.log("Server is up! Running tests...\n");
            await testEndpoint();
            process.exit(process.exitCode || 0);
        } catch (e) {
            retries--;
            await new Promise(r => setTimeout(r, 2000));
        }
    }
    console.error("Server did not start in time.");
    process.exit(1);
}

waitForServerAndTest();
