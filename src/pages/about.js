import React from 'react'
import Layout from '../components/Layout'

const TeamMember = ({ emoji, name, role }) => (
  <div className="text-center">
    <div className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 bg-tan rounded-full flex items-center justify-center text-2xl sm:text-3xl md:text-4xl mx-auto mb-2 sm:mb-3">
      {emoji}
    </div>
    <h3 className="font-bold text-gray-800 text-sm sm:text-base">{name}</h3>
    <p className="text-gray-500 text-xs sm:text-sm">{role}</p>
  </div>
)

const Value = ({ icon, title, description }) => (
  <div className="flex gap-3 sm:gap-4">
    <div className="text-2xl sm:text-3xl flex-shrink-0">{icon}</div>
    <div>
      <h3 className="font-bold text-gray-800 mb-1.5 sm:mb-2 text-sm sm:text-base">{title}</h3>
      <p className="text-gray-600 text-xs sm:text-sm leading-relaxed">{description}</p>
    </div>
  </div>
)

export default function AboutPage() {
  return (
    <Layout>
      {/* Hero */}
      <section className="bg-tan">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-10 sm:py-16 md:py-20">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm mb-4 sm:mb-6">
              <span>🌍</span>
              <span className="text-gray-600">About us</span>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-800 mb-4 sm:mb-6">
              We're building the infrastructure for
              <span className="gradient-text"> the next generation</span>
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-gray-600 leading-relaxed">
              World in Making started with a simple idea: make it easier for teams 
              to understand their users and build better products. Today, we're 
              helping thousands of companies do exactly that.
            </p>
          </div>
        </div>
      </section>

      {/* Story */}
      <section className="py-10 sm:py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-4 sm:mb-6">Our story</h2>
              <div className="space-y-3 sm:space-y-4 text-gray-600 text-sm sm:text-base">
                <p>
                  Founded in 2024, World in Making was born out of frustration with 
                  existing tools. We wanted something that was powerful yet simple, 
                  comprehensive yet focused.
                </p>
                <p>
                  We're a remote-first company with team members across the globe. 
                  We believe in transparency, open source, and putting users first.
                </p>
                <p>
                  Today, we process billions of events every month and help teams 
                  of all sizes—from bootstrapped startups to Fortune 500 companies—ship 
                  better products, faster.
                </p>
              </div>
            </div>
            <div className="bg-tan rounded-lg p-4 sm:p-6 md:p-8">
              <div className="grid grid-cols-2 gap-4 sm:gap-6 text-center">
                <div>
                  <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-red mb-1 sm:mb-2">2024</div>
                  <div className="text-gray-500 text-xs sm:text-sm">Founded</div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-red mb-1 sm:mb-2">50+</div>
                  <div className="text-gray-500 text-xs sm:text-sm">Team members</div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-red mb-1 sm:mb-2">20+</div>
                  <div className="text-gray-500 text-xs sm:text-sm">Countries</div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-red mb-1 sm:mb-2">100%</div>
                  <div className="text-gray-500 text-xs sm:text-sm">Remote</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="bg-white py-10 sm:py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-12 md:mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-3 sm:mb-4">Our values</h2>
            <p className="text-gray-600 max-w-2xl mx-auto text-sm sm:text-base">
              These principles guide everything we do, from how we build our product 
              to how we work together as a team.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-6 sm:gap-8 max-w-4xl mx-auto">
            <Value 
              icon="🔓"
              title="Transparency by default"
              description="We share everything publicly—our roadmap, our metrics, even our handbook. We believe transparency builds trust."
            />
            <Value 
              icon="🚀"
              title="Ship fast, iterate faster"
              description="We'd rather ship something imperfect and improve it based on feedback than wait for perfection that never comes."
            />
            <Value 
              icon="🎯"
              title="Users come first"
              description="Every decision starts with 'How does this help our users?' If it doesn't, we don't do it."
            />
            <Value 
              icon="🌱"
              title="Stay scrappy"
              description="We act like a startup no matter how big we get. No unnecessary meetings, no bureaucracy, just building."
            />
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-10 sm:py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-12 md:mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-3 sm:mb-4">Meet the team</h2>
            <p className="text-gray-600 text-sm sm:text-base">
              A small team doing big things from all over the world.
            </p>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4 sm:gap-6 md:gap-8">
            <TeamMember emoji="👨‍💻" name="Alex" role="CEO" />
            <TeamMember emoji="👩‍💻" name="Sarah" role="CTO" />
            <TeamMember emoji="🧑‍🎨" name="Mike" role="Design" />
            <TeamMember emoji="👨‍🔬" name="James" role="Engineering" />
            <TeamMember emoji="👩‍🔬" name="Emily" role="Engineering" />
            <TeamMember emoji="🧑‍💼" name="Chris" role="Product" />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-dark-bg text-white py-20">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6">Want to join us?</h2>
          <p className="text-gray-400 mb-8 text-lg">
            We're always looking for talented people who share our values. 
            Check out our open positions.
          </p>
          <a href="/careers" className="btn-primary">
            View open roles →
          </a>
        </div>
      </section>
    </Layout>
  )
}

export function Head() {
  return (
    <>
      <title>About - World in Making</title>
      <meta name="description" content="Learn about World in Making, our mission, values, and the team building the future of product analytics." />
    </>
  )
}
