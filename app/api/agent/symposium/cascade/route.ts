export const runtime = 'edge';
import { NextRequest, NextResponse } from 'next/server';

import type { ResearchSource } from '../../../symposium/research/route';

const STEP_DELAY_MS = 500; // brief pause between steps

export async function POST(request: NextRequest) {
    try {
        const { collaborationId, researchContext } = await request.json() as {
            collaborationId?: string;
            researchContext?: ResearchSource[];
        };

        if (!collaborationId) {
            return NextResponse.json({ error: 'collaborationId is required' }, { status: 400 });
        }

        const baseUrl = request.nextUrl.origin;
        const results: unknown[] = [];
        let isCompleted = false;
        let postId: string | null = null;
        const safetyLimit = 40; // Max tasks to execute in a single cascade call

        // Loop and trigger step route which will dynamically claim and execute next blackboard tasks
        for (let i = 0; i < safetyLimit; i++) {
            if (isCompleted) break;

            const res = await fetch(`${baseUrl}/api/agent/symposium/step`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    collaborationId,
                    ...(researchContext && i === 0 ? { researchContext } : {}),
                }),
            });

            const data = await res.json() as {
                success?: boolean;
                error?: string;
                isCompleted?: boolean;
                postId?: string;
                message?: string;
            };

            if (!res.ok || data.error) {
                return NextResponse.json({
                    error: `Step ${i + 1} failed: ${data.error}`,
                    completedSteps: i,
                    results,
                }, { status: 500 });
            }

            results.push(data);
            
            // If it returns message like "Spawned tasks" or "Bootstrapped", it means a phase transition happened.
            // We just continue to let it process the newly spawned tasks in the next iteration.
            isCompleted = Boolean(data.isCompleted);
            if (data.postId) postId = data.postId;

            // Small delay between steps
            if (!isCompleted) {
                await new Promise(r => setTimeout(r, STEP_DELAY_MS));
            }
        }

        return NextResponse.json({
            success: true,
            completedSteps: results.length,
            isCompleted: true,
            postId,
        });

    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
