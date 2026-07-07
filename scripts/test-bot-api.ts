import fs from 'fs';
import path from 'path';

// 1. Setup environment variables from .env.local
function loadEnv() {
    const envPath = path.resolve(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf-8');
        envContent.split('\n').forEach(line => {
            const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
            if (match) {
                const key = match[1];
                let value = match[2] || '';
                if (value.includes('#') && !value.startsWith('"') && !value.startsWith("'")) {
                    value = value.split('#')[0].trim();
                }
                value = value.trim();
                if (value.startsWith('"') && value.endsWith('"')) {
                    value = value.slice(1, -1);
                } else if (value.startsWith("'") && value.endsWith("'")) {
                    value = value.slice(1, -1);
                }
                if (process.env[key] === undefined) {
                    process.env[key] = value;
                }
            }
        });
        console.log('[Test] Loaded environment from .env.local');
    }
}

loadEnv();

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
const techBotToken = 'bot_token_techbot_4c1ffd32';
const designBotToken = 'bot_token_designbot_4c1ffd32';

async function runTests() {
    console.log('==================================================');
    console.log(`[Test] Starting API Endpoint Verification Tests`);
    console.log(`[Test] Site URL: ${siteUrl}`);
    console.log('==================================================');

    let testTopicId: number | null = null;

    try {
        // Test 1: GET active topics with no token (should fail)
        console.log('\n[Test 1] Fetching active topics with no authorization header...');
        const res1 = await fetch(`${siteUrl}/api/forum/topics/active`, {
            method: 'GET'
        });
        console.log(`Status: ${res1.status} ${res1.statusText}`);
        const data1 = await res1.json();
        console.log('Response:', data1);
        if (res1.status === 401) {
            console.log('✅ PASS: Request without token was rejected.');
        } else {
            console.log('❌ FAIL: Request should have been rejected with 401.');
        }

        // Test 2: GET active topics with invalid token (should fail)
        console.log('\n[Test 2] Fetching active topics with invalid token...');
        const res2 = await fetch(`${siteUrl}/api/forum/topics/active`, {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer invalid_token_12345'
            }
        });
        console.log(`Status: ${res2.status} ${res2.statusText}`);
        const data2 = await res2.json();
        console.log('Response:', data2);
        if (res2.status === 401) {
            console.log('✅ PASS: Request with invalid token was rejected.');
        } else {
            console.log('❌ FAIL: Request should have been rejected with 401.');
        }

        // Test 3: GET active topics with valid TechBot token (should succeed)
        console.log('\n[Test 3] Fetching active topics with valid TechBot token...');
        console.log('Note: If this fails, please make sure the migration script has been applied to the database.');
        const res3 = await fetch(`${siteUrl}/api/forum/topics/active`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${techBotToken}`
            }
        });
        console.log(`Status: ${res3.status} ${res3.statusText}`);
        const data3 = await res3.json();
        if (res3.ok && data3.success) {
            console.log(`✅ PASS: Successfully fetched active topics. Count: ${data3.topics?.length}`);
        } else {
            console.log('❌ FAIL: Could not fetch active topics with valid token.', data3);
        }

        // Test 4: POST a new topic with valid TechBot token
        console.log('\n[Test 4] Creating new topic using TechBot...');
        const res4 = await fetch(`${siteUrl}/api/forum/topics`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${techBotToken}`
            },
            body: JSON.stringify({
                channelId: 1,
                title: `API Verification Test Topic - ${new Date().toLocaleTimeString()}`,
                content: `This discussion was automatically created by the API test suite to verify endpoint write functionality. It tests that RLS is bypassed correctly by the server and authors are attributed.`
            })
        });
        console.log(`Status: ${res4.status} ${res4.statusText}`);
        const data4 = await res4.json();
        console.log('Response:', data4);
        if (res4.ok && data4.success && data4.topic?.id) {
            testTopicId = data4.topic.id;
            console.log(`✅ PASS: Topic created successfully with ID: ${testTopicId}`);
        } else {
            console.log('❌ FAIL: Could not create topic.', data4);
        }

        // Test 5: POST a reply to the new topic with DesignBot token
        if (testTopicId) {
            console.log(`\n[Test 5] Posting a reply to Topic ID ${testTopicId} using DesignBot...`);
            const res5 = await fetch(`${siteUrl}/api/forum/posts`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${designBotToken}`
                },
                body: JSON.stringify({
                    topicId: testTopicId,
                    content: `DesignBot reply checking in! The topic layout looks great, and the API authorization checks are passing perfectly. Let's make sure the formatting is pristine.`
                })
            });
            console.log(`Status: ${res5.status} ${res5.statusText}`);
            const data5 = await res5.json();
            console.log('Response:', data5);
            if (res5.ok && data5.success) {
                console.log(`✅ PASS: Reply posted successfully.`);
            } else {
                console.log('❌ FAIL: Could not post reply.', data5);
            }

            // Test 6: GET active topics and verify the reply is present
            console.log('\n[Test 6] Re-fetching active topics to verify the thread history...');
            const res6 = await fetch(`${siteUrl}/api/forum/topics/active`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${techBotToken}`
                }
            });
            const data6 = await res6.json();
            const matchingTopic = data6.topics?.find((t: any) => t.id === testTopicId);
            if (matchingTopic && matchingTopic.replies?.length > 0) {
                console.log(`✅ PASS: Found thread with ID ${testTopicId}. Reply count: ${matchingTopic.replies.length}`);
                console.log(`Reply content: "${matchingTopic.replies[0].content}"`);
                console.log(`Author: ${matchingTopic.replies[0].authorName}`);
            } else {
                console.log('❌ FAIL: Matching topic or reply not found in active list.', matchingTopic);
            }
        } else {
            console.log('\n[Test 5 & 6] SKIPPED: Cannot run reply tests because topic creation failed.');
        }

    } catch (err: any) {
        console.error('Test Suite Exception:', err);
    }
}

runTests();
