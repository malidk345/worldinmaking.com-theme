import React from 'react'
import Layout from '../components/Layout'

const FeatureSection = ({ badge, title, description, features, image, reverse }) => (
  <div className={`grid md:grid-cols-2 gap-12 items-center ${reverse ? 'md:flex-row-reverse' : ''}`}>
    <div className={reverse ? 'md:order-2' : ''}>
      <div className="inline-flex items-center gap-2 bg-tan px-3 py-1 rounded-full text-sm mb-4">
        <span>{badge.icon}</span>
        <span className="text-gray-600 font-medium">{badge.text}</span>
      </div>
      <h2 className="text-3xl font-bold text-gray-800 mb-4">{title}</h2>
      <p className="text-gray-600 mb-6 leading-relaxed">{description}</p>
      <ul className="space-y-3">
        {features.map((feature, idx) => (
          <li key={idx} className="flex items-start gap-3">
            <span className="text-green mt-0.5">✓</span>
            <span className="text-gray-700">{feature}</span>
          </li>
        ))}
      </ul>
    </div>
    <div className={`bg-tan rounded-lg p-8 ${reverse ? 'md:order-1' : ''}`}>
      <div className="bg-white rounded-md border border-gray-300 h-64 flex items-center justify-center">
        <span className="text-6xl">{image}</span>
      </div>
    </div>
  </div>
)

export default function FeaturesPage() {
  return (
    <Layout>
      {/* Hero */}
      <section className="bg-tan">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-6">
              All-in-one platform for
              <span className="gradient-text"> product teams</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Stop juggling between tools. Get everything you need to understand users, 
              ship features, and grow your product—in one place.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <a href="/signup" className="btn-primary">Get started free</a>
              <a href="/demo" className="btn-secondary">Book a demo</a>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Sections */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-24">
          
          <FeatureSection 
            badge={{ icon: '📈', text: 'Product Analytics' }}
            title="Understand every user interaction"
            description="Track events, analyze funnels, measure retention—all without writing SQL. Get insights that actually help you make decisions."
            features={[
              'Auto-capture events without code changes',
              'Build funnels and retention charts in seconds',
              'Segment users by any property or behavior',
              'Export data to your data warehouse'
            ]}
            image="📊"
          />

          <FeatureSection 
            badge={{ icon: '🔴', text: 'Session Recording' }}
            title="See exactly what users do"
            description="Watch real user sessions to understand where they get stuck, what they ignore, and what delights them."
            features={[
              'Automatic session recording',
              'Console logs and network requests',
              'Privacy controls built-in',
              'Link recordings to analytics events'
            ]}
            image="🎬"
            reverse
          />

          <FeatureSection 
            badge={{ icon: '🚩', text: 'Feature Flags' }}
            title="Ship features without fear"
            description="Roll out features gradually, run experiments, and kill bad releases instantly. No more all-or-nothing deployments."
            features={[
              'Percentage rollouts',
              'Target by user properties',
              'Instant rollback',
              'Multi-variant testing'
            ]}
            image="🎛️"
          />

          <FeatureSection 
            badge={{ icon: '🧪', text: 'A/B Testing' }}
            title="Make decisions with data"
            description="Run statistically rigorous experiments on any feature. Know for certain what works and what doesn't."
            features={[
              'Built-in statistical significance',
              'Multi-variant experiments',
              'Revenue and engagement goals',
              'Integrated with feature flags'
            ]}
            image="⚗️"
            reverse
          />

          <FeatureSection 
            badge={{ icon: '💬', text: 'Surveys' }}
            title="Ask users directly"
            description="Collect qualitative feedback at the right moment. Understand the why behind user behavior."
            features={[
              'In-app surveys',
              'NPS, CSAT, and custom questions',
              'Target specific user segments',
              'Analyze responses with AI'
            ]}
            image="📝"
          />

          <FeatureSection 
            badge={{ icon: '🗄️', text: 'Data Warehouse' }}
            title="All your data, one place"
            description="Query product data alongside your own sources. Build dashboards that tell the full story."
            features={[
              'SQL query interface',
              'Connect external data sources',
              'Custom dashboards',
              'Scheduled reports'
            ]}
            image="💾"
            reverse
          />

        </div>
      </section>

      {/* Comparison */}
      <section className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-800 mb-4">
              Replace your entire analytics stack
            </h2>
            <p className="text-gray-600">
              One tool instead of five. Simpler, cheaper, better integrated.
            </p>
          </div>
          <div className="max-w-3xl mx-auto">
            <div className="grid grid-cols-2 gap-8">
              <div className="text-center p-6 bg-tan rounded-lg">
                <div className="text-4xl mb-4">😫</div>
                <h3 className="font-bold text-gray-800 mb-2">Before</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>Amplitude for analytics</li>
                  <li>Hotjar for recordings</li>
                  <li>LaunchDarkly for flags</li>
                  <li>Optimizely for A/B tests</li>
                  <li>Typeform for surveys</li>
                </ul>
                <p className="text-red font-bold mt-4">$2,000+/month</p>
              </div>
              <div className="text-center p-6 bg-green/10 rounded-lg border-2 border-green">
                <div className="text-4xl mb-4">🎉</div>
                <h3 className="font-bold text-gray-800 mb-2">After</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>World in Making</li>
                  <li>&nbsp;</li>
                  <li>&nbsp;</li>
                  <li>&nbsp;</li>
                  <li>&nbsp;</li>
                </ul>
                <p className="text-green font-bold mt-4">Free to start</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-dark-bg text-white py-20">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6">Ready to get started?</h2>
          <p className="text-gray-400 mb-8 text-lg">
            Free tier available. No credit card required.
          </p>
          <a href="/signup" className="btn-primary">
            Start for free →
          </a>
        </div>
      </section>
    </Layout>
  )
}

export function Head() {
  return (
    <>
      <title>Features - World in Making</title>
      <meta name="description" content="Discover all the features World in Making offers: product analytics, session recording, feature flags, A/B testing, surveys, and more." />
    </>
  )
}
