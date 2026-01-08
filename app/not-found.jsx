import Link from 'next/link';

export default function NotFound() {
    return (
        <div className="flex-1 flex items-center justify-center bg-bg-3000 p-6 min-h-screen">
            <div className="max-w-md w-full text-center">
                {/* 404 */}
                <div className="text-8xl font-black text-gray-200 dark:text-gray-800 mb-4">404</div>

                {/* Message */}
                <h1 className="text-2xl font-bold text-primary mb-2">page not found</h1>
                <p className="text-secondary text-sm mb-8">
                    the page you&apos;re looking for doesn&apos;t exist or has been moved.
                </p>

                {/* Suggestions */}
                <div className="mb-8 p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl">
                    <p className="text-xs font-bold text-secondary mb-3">helpful links</p>
                    <div className="flex flex-col gap-2">
                        <Link href="/" className="text-sm text-blue-600 hover:underline">
                            ← go to homepage
                        </Link>
                        <Link href="/search" className="text-sm text-blue-600 hover:underline">
                            🔍 search for content
                        </Link>
                        <Link href="/explore" className="text-sm text-blue-600 hover:underline">
                            📚 explore categories
                        </Link>
                    </div>
                </div>

                {/* Home Button */}
                <Link
                    href="/"
                    className="inline-flex px-6 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg font-bold text-sm hover:opacity-90 transition-opacity"
                >
                    back to home
                </Link>
            </div>
        </div>
    );
}
