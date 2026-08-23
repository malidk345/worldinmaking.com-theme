#!/usr/bin/env node

/**
 * Grok / WIM AI Interactive CLI
 * Usage:
 *   pnpm grok                    -> Interactive chat REPL
 *   pnpm grok "Your question"    -> One-shot answer
 *   pnpm grok --model gemini     -> Run with Gemini
 *   pnpm grok --persona nietzsche "What is virtue?"
 */

import fs from 'fs';
import path from 'path';
import readline from 'readline';

// 1. Read environment variables from .env.local
const env = { ...process.env };
try {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const envFile = fs.readFileSync(envPath, 'utf8');
    for (const line of envFile.split(/\r?\n/)) {
      if (!line || line.startsWith('#')) continue;
      const idx = line.indexOf('=');
      if (idx < 0) continue;
      let v = line.slice(idx + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      env[line.slice(0, idx).trim()] = v;
    }
  }
} catch (e) {
  // Continue with process.env
}

// Extract API keys
const groqKeys = (env.GROQ_API_KEY || env.GROQ_API_KEYS || '')
  .split(',')
  .map(k => k.trim())
  .filter(Boolean);

const geminiKeys = (env.GEMINI_API_KEY || env.GEMINI_API_KEYS || '')
  .split(',')
  .map(k => k.trim())
  .filter(Boolean);

const xaiKey = (env.XAI_API_KEY || env.GROK_API_KEY_NATIVE || '').trim();

// Parse CLI arguments
const args = process.argv.slice(2);
let customPersona = 'Assistant';
let preferredModel = '';
let oneShotPrompt = '';

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--persona' && args[i + 1]) {
    customPersona = args[i + 1];
    i++;
  } else if (args[i] === '--model' && args[i + 1]) {
    preferredModel = args[i + 1].toLowerCase();
    i++;
  } else if (!args[i].startsWith('--')) {
    oneShotPrompt += (oneShotPrompt ? ' ' : '') + args[i];
  }
}

async function callGroq(prompt, history = []) {
  const models = ['qwen/qwen3.6-27b', 'openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'groq/compound'];
  const messages = [
    { role: 'system', content: `You are a helpful, brilliant AI assistant and philosopher (${customPersona}) working with WorldInMaking. Provide concise, clear, and direct answers in markdown.` },
    ...history,
    { role: 'user', content: prompt }
  ];

  for (const key of groqKeys) {
    for (const model of models) {
      try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${key}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model,
            messages,
            temperature: 0.7,
          })
        });

        if (res.ok) {
          const data = await res.json();
          const text = data.choices?.[0]?.message?.content;
          if (text) return { ok: true, text, provider: `groq:${model}` };
        }
      } catch (err) {
        // try next model / key
      }
    }
  }
  return null;
}

async function callGemini(prompt, history = []) {
  const models = ['gemini-2.5-flash', 'gemini-3.6-flash', 'gemini-2.5-flash-lite', 'gemini-2.5-pro'];
  const contents = [
    ...history.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    })),
    {
      role: 'user',
      parts: [{ text: prompt }]
    }
  ];

  for (const key of geminiKeys) {
    for (const model of models) {
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents,
            systemInstruction: {
              parts: [{ text: `You are a helpful AI assistant (${customPersona}) working with WorldInMaking. Answer concisely and accurately in markdown.` }]
            }
          })
        });

        if (res.ok) {
          const data = await res.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) return { ok: true, text, provider: `gemini:${model}` };
        }
      } catch (err) {
        // try next key / model
      }
    }
  }
  return null;
}

async function askAI(prompt, history = []) {
  if (preferredModel.includes('gemini')) {
    const geminiRes = await callGemini(prompt, history);
    if (geminiRes) return geminiRes;
    const groqRes = await callGroq(prompt, history);
    if (groqRes) return groqRes;
  } else {
    const groqRes = await callGroq(prompt, history);
    if (groqRes) return groqRes;
    const geminiRes = await callGemini(prompt, history);
    if (geminiRes) return geminiRes;
  }

  return { ok: false, error: 'All configured AI providers (Groq & Gemini) failed or are cooling down.' };
}

async function startRepl() {
  console.log('\x1b[36m%s\x1b[0m', '═══════════════════════════════════════════════════════════════');
  console.log('\x1b[1m\x1b[32m%s\x1b[0m', ' 🚀 WIM / Grok AI CLI (Interactive Terminal)');
  console.log('\x1b[90m%s\x1b[0m', ' Type your prompt and press Enter. Type "exit" or "quit" to leave.');
  console.log('\x1b[36m%s\x1b[0m', '═══════════════════════════════════════════════════════════════\n');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '\x1b[33m\x1b[1m> \x1b[0m',
  });

  const history = [];
  rl.prompt();

  rl.on('line', async (line) => {
    const input = line.trim();
    if (!input) {
      rl.prompt();
      return;
    }

    if (input.toLowerCase() === 'exit' || input.toLowerCase() === 'quit') {
      console.log('\n\x1b[90mGoodbye!\x1b[0m');
      process.exit(0);
    }

    process.stdout.write('\x1b[90mThinking...\x1b[0m\r');
    const result = await askAI(input, history);

    readline.clearLine(process.stdout, 0);
    readline.cursorTo(process.stdout, 0);

    if (result.ok) {
      console.log('\x1b[36m%s\x1b[0m', `[${result.provider}]`);
      console.log(stripThinking(result.text));
      console.log();
      history.push({ role: 'user', content: input });
      history.push({ role: 'assistant', content: result.text });
    } else {
      console.log('\x1b[31m%s\x1b[0m\n', `Error: ${result.error}`);
    }

    rl.prompt();
  });

  rl.on('close', () => {
    console.log('\n\x1b[90mSession closed.\x1b[0m');
    process.exit(0);
  });
}

function stripThinking(text) {
  if (!text) return '';
  return text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
}

async function main() {
  if (oneShotPrompt) {
    const result = await askAI(oneShotPrompt);
    if (result.ok) {
      console.log(stripThinking(result.text));
    } else {
      console.error(`Error: ${result.error}`);
      process.exitCode = 1;
    }
  } else {
    await startRepl();
  }
}

main();
