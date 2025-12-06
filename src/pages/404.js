import React from 'react'
import Layout from '../components/Layout'

export default function NotFoundPage() {
  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-32 text-center">
        <span className="text-8xl mb-8 block">🦔</span>
        <h1 className="text-6xl font-bold text-gray-800 mb-4">404</h1>
        <p className="text-2xl text-gray-600 mb-2">Page not found</p>
        <p className="text-gray-500 mb-8">
          Looks like this hedgehog wandered off the path.
        </p>
        <a href="/" className="btn-primary">
          Take me home →
        </a>
      </div>
    </Layout>
  )
}

export function Head() {
  return <title>404: Not Found - World in Making</title>
}
