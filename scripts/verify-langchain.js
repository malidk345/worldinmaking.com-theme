/**
 * Comprehensive Live Verification Script for WorldInMaking LangChain & LangGraph Ecosystem
 *
 * Usage: node scripts/verify-langchain.js
 */

require('dotenv').config({ path: '.env.local' });

const { runLangGraphAgentPipeline } = require('../src/lib/chat-bots/langchain-pipeline');
const { runSymposiumLangGraph } = require('../src/lib/autonomous-entities/symposium-graph');
const { getPhilosopherTools } = require('../src/lib/chat-bots/langchain-tools');
const { splitDocumentContent } = require('../src/lib/chat-bots/langchain-vectorstore');

async function main() {
    console.log('🧪 Starting LangChain & LangGraph Ecosystem Verification...\n');

    // 1. Test LangChain LCEL & LLM Router Pipeline
    console.log('1️⃣ Testing LangChain LCEL Agent Pipeline...');
    try {
        const lcelResult = await runLangGraphAgentPipeline({
            botName: 'Marx',
            userPrompt: 'What is alienation in modern digital platforms?',
            documentContext: 'WorldInMaking OS is a digital philosophical workspace.',
        });
        console.log(`✅ LangChain LCEL Pipeline SUCCESS! Provider: ${lcelResult.provider}`);
        console.log(`   Excerpt: "${lcelResult.reply.slice(0, 120)}..."\n`);
    } catch (err) {
        console.error('❌ LangChain LCEL Pipeline Error:', err?.message || err);
    }

    // 2. Test LangGraph Stateful Debate DAG
    console.log('2️⃣ Testing LangGraph Stateful Multi-Agent Debate DAG...');
    try {
        const debateResult = await runSymposiumLangGraph({
            topicTitle: 'The Ethics of Artificial General Intelligence',
            proposerBot: 'Spinoza',
            opponentBot: 'Nietzsche',
            judgeBot: 'Adorno',
        });
        console.log(`✅ LangGraph Debate Graph SUCCESS! Critique Score: ${debateResult.critiqueScore}/100`);
        console.log(`   Thesis Excerpt (@Spinoza): "${debateResult.thesisText.slice(0, 90)}..."`);
        console.log(`   Antithesis Excerpt (@Nietzsche): "${debateResult.antithesisText.slice(0, 90)}..."`);
        console.log(`   Synthesis Excerpt (@Adorno): "${debateResult.synthesisText.slice(0, 90)}..."\n`);
    } catch (err) {
        console.error('❌ LangGraph Debate Graph Error:', err?.message || err);
    }

    // 3. Test LangChain Dynamic Tools
    console.log('3️⃣ Testing LangChain Dynamic Tools...');
    try {
        const tools = getPhilosopherTools();
        console.log(`✅ Loaded ${tools.length} LangChain Dynamic Tools: ${tools.map((t) => t.name).join(', ')}`);
        const dbResult = await tools[0].call('ethics');
        console.log(`   Tool test (database_search): "${dbResult.slice(0, 90)}..."\n`);
    } catch (err) {
        console.error('❌ LangChain Dynamic Tools Error:', err?.message || err);
    }

    // 4. Test LangChain Recursive Text Splitter
    console.log('4️⃣ Testing LangChain Recursive Text Splitter...');
    try {
        const chunks = await splitDocumentContent(
            'Paragraph 1 about philosophy.\n\nParagraph 2 about technology and AI.\n\nParagraph 3 about existentialism.'
        );
        console.log(`✅ LangChain Text Splitter SUCCESS! Created ${chunks.length} chunks.\n`);
    } catch (err) {
        console.error('❌ LangChain Text Splitter Error:', err?.message || err);
    }

    console.log('🎉 Full LangChain & LangGraph Ecosystem Verification Complete!');
}

main().catch((e) => {
    console.error('Verification script crashed:', e);
    process.exit(1);
});
