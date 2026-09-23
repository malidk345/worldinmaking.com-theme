import { test, expect } from '@playwright/test'
import handler from '../src/pages/api/cron/bot-queue'
import * as botQueueModule from '../src/lib/bots/bot-queue'
import * as philosopherTickModule from '../src/lib/bots/philosopher-tick'

test.describe('bot-queue cron handler performance & behavior', () => {
    test('processes pending tasks concurrently and records results accurately', async () => {
        process.env.CRON_SECRET = 'test-secret'

        const mockTasks: botQueueModule.BotQueueTask[] = [
            {
                id: 'task_1',
                task_type: 'philosopher_tick',
                payload: { tickReq: { phase: 'topic' } },
                status: 'pending',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            },
            {
                id: 'task_2',
                task_type: 'philosopher_tick',
                payload: { tickReq: { phase: 'plan' } },
                status: 'pending',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            },
            {
                id: 'task_3',
                task_type: 'philosopher_tick',
                payload: { tickReq: { phase: 'reply' } },
                status: 'pending',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            },
        ]

        const popPendingSpy = (botQueueModule as any).popPendingBotTasks = async (limit = 5) => {
            return mockTasks.slice(0, limit)
        }

        const completedMap = new Map<string, { success: boolean; errorMsg?: string }>()
        const markCompleteSpy = (botQueueModule as any).markBotTaskComplete = async (
            id: string,
            success: boolean,
            errorMsg?: string
        ) => {
            completedMap.set(id, { success, errorMsg })
        }

        const runTickSpy = (philosopherTickModule as any).runPhilosopherBotTick = async (req: any) => {
            // Simulate an async operation that takes 100ms per task
            await new Promise((resolve) => setTimeout(resolve, 100))
        }

        const req = new Request('http://localhost/api/cron/bot-queue', {
            method: 'POST',
            headers: {
                'x-cron-secret': 'test-secret',
            },
        })

        const startTime = Date.now()
        const res = await handler(req)
        const duration = Date.now() - startTime

        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.success).toBe(true)
        expect(body.claimed).toBe(3)
        expect(body.results).toHaveLength(3)

        expect(completedMap.get('task_1')).toEqual({ success: true, errorMsg: undefined })
        expect(completedMap.get('task_2')).toEqual({ success: true, errorMsg: undefined })
        expect(completedMap.get('task_3')).toEqual({ success: true, errorMsg: undefined })

        console.log(`Duration for 3 tasks with 100ms delay each: ${duration}ms`)
    })
})
