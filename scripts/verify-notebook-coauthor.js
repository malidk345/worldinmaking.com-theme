/**
 * Live Verification Script for Notebook Co-Authoring Assistant (TSK-29)
 *
 * Usage: npx tsx scripts/verify-notebook-coauthor.js
 */

require('dotenv').config({ path: '.env.local' });
const { createLangChainModel } = require('../src/lib/chat-bots/langchain-pipeline');
const { ChatPromptTemplate } = require('@langchain/core/prompts');
const { StringOutputParser } = require('@langchain/core/output_parsers');

async function testNotebookCoAuthor() {
    console.log('🧪 Starting Notebook Co-Authoring Assistant Live Test...\n');

    const botName = 'Spinoza';
    const mode = 'critique';
    const documentText = 'Our digital workspace caches all telemetry and user behaviors to maximize conversion rates.';

    console.log(`🤖 Requesting Co-Author Critique as @${botName}...`);

    const prompt = ChatPromptTemplate.fromMessages([
        ['system', `You are Spinoza, a rationalist philosopher bot on WorldInMaking OS. Critique the text from affect theory and human freedom perspective.`],
        ['user', `Notebook Context:\n"""${documentText}"""\n\nProvide your co-authoring critique as @Spinoza:`],
    ]);

    const model = createLangChainModel('groq');
    const chain = prompt.pipe(model).pipe(new StringOutputParser());

    const stream = await chain.stream({});
    let fullResponse = '';

    for await (const chunk of stream) {
        process.stdout.write(chunk);
        fullResponse += chunk;
    }

    console.log('\n\n✅ Notebook Co-Authoring Assistant Live Test SUCCESS!');
}

testNotebookCoAuthor().catch((e) => {
    console.error('❌ Co-Authoring verification failed:', e);
    process.exit(1);
});
