/**
 * LangGraph Enterprise Multi-Agent Debate & Consensus Engine — WorldInMaking.com
 *
 * Implements a stateful Directed Acyclic Graph (DAG) state machine using `@langchain/langgraph`:
 *   Node 1: `Node_Propose` (Primary philosopher proposes thesis)
 *   Node 2: `Node_Antithesis` (Opposing philosopher challenges premise)
 *   Node 3: `Node_Epistemic_Judge` (Independent judge evaluates logical fallacies & confidence)
 *   Node 4: `Node_Synthesis` (Final consensus synthesis)
 */

import { StateGraph, START, END, Annotation } from '@langchain/langgraph';
import { executeEnterpriseLLMCall } from '../chat-bots/llm-router';

/**
 * LangGraph State Annotation Schema for Multi-Agent Symposia.
 */
export const SymposiumStateAnnotation = Annotation.Root({
    topicTitle: Annotation<string>(),
    proposerBot: Annotation<string>(),
    opponentBot: Annotation<string>(),
    judgeBot: Annotation<string>(),

    thesisText: Annotation<string>(),
    antithesisText: Annotation<string>(),
    critiqueScore: Annotation<number>(),
    critiqueFeedback: Annotation<string>(),
    synthesisText: Annotation<string>(),
    iterationCount: Annotation<number>(),
});

/**
 * Node 1: Primary Philosopher proposes initial thesis.
 */
async function proposeThesisNode(state: typeof SymposiumStateAnnotation.State) {
    const res = await executeEnterpriseLLMCall({
        systemPrompt: `You are @${state.proposerBot}. Propose a bold, intellectually rigorous thesis on: "${state.topicTitle}". Write 2 tight paragraphs.`,
        userPrompt: `State your thesis on ${state.topicTitle}.`,
    });
    return {
        thesisText: res.content,
        iterationCount: (state.iterationCount || 0) + 1,
    };
}

/**
 * Node 2: Opposing Philosopher presents counter-antithesis.
 */
async function challengeAntithesisNode(state: typeof SymposiumStateAnnotation.State) {
    const res = await executeEnterpriseLLMCall({
        systemPrompt: `You are @${state.opponentBot}. Critically challenge @${state.proposerBot}'s thesis on "${state.topicTitle}".
THESIS:
${state.thesisText}`,
        userPrompt: `Provide your counter-antithesis.`,
    });
    return {
        antithesisText: res.content,
    };
}

/**
 * Node 3: Independent Judge evaluates epistemic confidence & logical fallacies.
 */
async function judgeCritiqueNode(state: typeof SymposiumStateAnnotation.State) {
    const res = await executeEnterpriseLLMCall({
        systemPrompt: `You are @${state.judgeBot}, an impartial philosophical critique judge.
Evaluate the tension between Thesis and Antithesis.
THESIS (@${state.proposerBot}): ${state.thesisText}
ANTITHESIS (@${state.opponentBot}): ${state.antithesisText}

Return a JSON object with:
"score": (integer 0-100 epistemic rigor score),
"feedback": "short critique"`,
        userPrompt: `Evaluate thesis vs antithesis.`,
    });

    let score = 85;
    let feedback = 'Rigorous debate.';
    try {
        const jsonMatch = res.content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            score = typeof parsed.score === 'number' ? parsed.score : 85;
            feedback = parsed.feedback || feedback;
        }
    } catch {
        /* fallback default */
    }

    return {
        critiqueScore: score,
        critiqueFeedback: feedback,
    };
}

/**
 * Node 4: Synthesis Node.
 */
async function synthesizeConsensusNode(state: typeof SymposiumStateAnnotation.State) {
    const res = await executeEnterpriseLLMCall({
        systemPrompt: `You are @${state.judgeBot}. Synthesize a higher-order philosophical consensus resolving the tension between @${state.proposerBot} and @${state.opponentBot}.
THESIS: ${state.thesisText}
ANTITHESIS: ${state.antithesisText}
CRITIQUE: ${state.critiqueFeedback}`,
        userPrompt: `Synthesize the final open horizon conclusion.`,
    });

    return {
        synthesisText: res.content,
    };
}

/**
 * Builds and compiles the LangGraph Multi-Agent Symposium Workflow.
 */
export function createSymposiumLangGraph() {
    const workflow = new StateGraph(SymposiumStateAnnotation)
        .addNode('propose', proposeThesisNode)
        .addNode('antithesis', challengeAntithesisNode)
        .addNode('judge', judgeCritiqueNode)
        .addNode('synthesize', synthesizeConsensusNode)

        .addEdge(START, 'propose')
        .addEdge('propose', 'antithesis')
        .addEdge('antithesis', 'judge')
        .addConditionalEdges('judge', (state) => {
            // Loop back if score < 70 and iterations < 2
            if (state.critiqueScore < 70 && (state.iterationCount || 0) < 2) {
                return 'propose';
            }
            return 'synthesize';
        })
        .addEdge('synthesize', END);

    return workflow.compile();
}

/**
 * Runs a complete LangGraph Multi-Agent Debate session.
 */
export async function runSymposiumLangGraph(params: {
    topicTitle: string;
    proposerBot: string;
    opponentBot: string;
    judgeBot: string;
}) {
    const app = createSymposiumLangGraph();
    const result = await app.invoke({
        topicTitle: params.topicTitle,
        proposerBot: params.proposerBot,
        opponentBot: params.opponentBot,
        judgeBot: params.judgeBot,
        thesisText: '',
        antithesisText: '',
        critiqueScore: 0,
        critiqueFeedback: '',
        synthesisText: '',
        iterationCount: 0,
    });

    return result;
}
