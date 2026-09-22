/**
 * Guards the Supabase realtime frame decoder.
 *
 * `@supabase/realtime-js` parses each raw WebSocket frame inside the socket
 * `onmessage` callback. A truncated frame — common on flaky mobile links —
 * makes that parse throw, and the throw escapes every channel-level guard as an
 * unhandled exception. This wrapper runs the parse in a guard, drops the bad
 * frame, and lets the socket survive so the channel keeps running.
 *
 * The wrapper guards only the parse, not the message callback. A throw from the
 * callback comes from our own handlers and must stay visible.
 */
export function createGuardedRealtimeDecode(
    parse: (rawPayload: unknown) => unknown,
    onDropped: (error: unknown) => void,
): (rawPayload: unknown, callback: (message: unknown) => void) => void {
    return (rawPayload, callback) => {
        let message: unknown
        try {
            message = parse(rawPayload)
        } catch (error) {
            onDropped(error)
            return
        }
        callback(message)
    }
}
