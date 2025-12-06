import React from 'react'
import Layout from '../components/Layout'

export default function ContactPage() {
  return (
    <Layout>
      {/* Hero */}
      <section className="bg-tan">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-10 sm:py-12 md:py-16">
          <div className="max-w-2xl">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-800 mb-3 sm:mb-4">
              Get in touch
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-gray-600">
              Have a question? Want to learn more? We'd love to hear from you.
            </p>
          </div>
        </div>
      </section>

      {/* Contact Options */}
      <section className="py-10 sm:py-12 md:py-16">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 md:gap-8 mb-10 sm:mb-12 md:mb-16">
            <a href="#sales" className="group p-4 sm:p-5 md:p-6 bg-white border border-gray-300 rounded-md hover:border-gray-400 hover:shadow-card transition-all">
              <div className="text-3xl sm:text-4xl mb-3 sm:mb-4">💼</div>
              <h3 className="font-bold text-gray-800 mb-1.5 sm:mb-2 group-hover:text-red transition-colors text-sm sm:text-base">
                Talk to Sales
              </h3>
              <p className="text-gray-600 text-xs sm:text-sm">
                Interested in World in Making for your team? Let's discuss your needs.
              </p>
            </a>
            <a href="#support" className="group p-4 sm:p-5 md:p-6 bg-white border border-gray-300 rounded-md hover:border-gray-400 hover:shadow-card transition-all">
              <div className="text-3xl sm:text-4xl mb-3 sm:mb-4">🛟</div>
              <h3 className="font-bold text-gray-800 mb-1.5 sm:mb-2 group-hover:text-red transition-colors text-sm sm:text-base">
                Get Support
              </h3>
              <p className="text-gray-600 text-xs sm:text-sm">
                Already a customer? Our support team is here to help.
              </p>
            </a>
            <a href="#community" className="group p-4 sm:p-5 md:p-6 bg-white border border-gray-300 rounded-md hover:border-gray-400 hover:shadow-card transition-all">
              <div className="text-3xl sm:text-4xl mb-3 sm:mb-4">👥</div>
              <h3 className="font-bold text-gray-800 mb-1.5 sm:mb-2 group-hover:text-red transition-colors text-sm sm:text-base">
                Join Community
              </h3>
              <p className="text-gray-600 text-xs sm:text-sm">
                Connect with other users, share tips, and get answers fast.
              </p>
            </a>
          </div>

          {/* Contact Form */}
          <div className="max-w-2xl mx-auto">
            <div className="bg-white border border-gray-300 rounded-md p-4 sm:p-6 md:p-8">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-6">Send us a message</h2>
              <form className="space-y-4 sm:space-y-6">
                <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
                  <div>
                    <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                      First name
                    </label>
                    <input
                      type="text"
                      id="firstName"
                      className="w-full px-4 py-3 bg-tan border border-gray-300 rounded-sm focus:ring-2 focus:ring-red/20 focus:border-red outline-none transition-all"
                      placeholder="John"
                    />
                  </div>
                  <div>
                    <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                      Last name
                    </label>
                    <input
                      type="text"
                      id="lastName"
                      className="w-full px-4 py-3 bg-tan border border-gray-300 rounded-sm focus:ring-2 focus:ring-red/20 focus:border-red outline-none transition-all"
                      placeholder="Doe"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Work email
                  </label>
                  <input
                    type="email"
                    id="email"
                    className="w-full px-4 py-3 bg-tan border border-gray-300 rounded-sm focus:ring-2 focus:ring-red/20 focus:border-red outline-none transition-all"
                    placeholder="john@company.com"
                  />
                </div>
                <div>
                  <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-2">
                    Company
                  </label>
                  <input
                    type="text"
                    id="company"
                    className="w-full px-4 py-3 bg-tan border border-gray-300 rounded-sm focus:ring-2 focus:ring-red/20 focus:border-red outline-none transition-all"
                    placeholder="Acme Inc."
                  />
                </div>
                <div>
                  <label htmlFor="topic" className="block text-sm font-medium text-gray-700 mb-2">
                    What can we help with?
                  </label>
                  <select
                    id="topic"
                    className="w-full px-4 py-3 bg-tan border border-gray-300 rounded-sm focus:ring-2 focus:ring-red/20 focus:border-red outline-none transition-all"
                  >
                    <option value="">Select a topic</option>
                    <option value="sales">Sales inquiry</option>
                    <option value="support">Technical support</option>
                    <option value="partnership">Partnership</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                    Message
                  </label>
                  <textarea
                    id="message"
                    rows="5"
                    className="w-full px-4 py-3 bg-tan border border-gray-300 rounded-sm focus:ring-2 focus:ring-red/20 focus:border-red outline-none transition-all resize-none"
                    placeholder="Tell us more about what you're looking for..."
                  />
                </div>
                <button type="submit" className="btn-primary w-full">
                  Send message
                </button>
                <p className="text-xs text-gray-500 text-center">
                  By submitting, you agree to our <a href="/privacy" className="text-red hover:underline">Privacy Policy</a>.
                </p>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Other ways */}
      <section className="bg-tan py-10 sm:py-12 md:py-16">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-10 md:mb-12">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-3 sm:mb-4">Other ways to reach us</h2>
          </div>
          <div className="grid grid-cols-3 gap-4 sm:gap-6 md:gap-8 max-w-3xl mx-auto text-center">
            <div>
              <div className="text-2xl sm:text-3xl mb-2 sm:mb-3">📧</div>
              <h3 className="font-semibold text-gray-800 mb-1 text-xs sm:text-sm md:text-base">Email</h3>
              <a href="mailto:hello@worldinmaking.com" className="text-red hover:underline text-[10px] sm:text-xs md:text-sm break-all">
                hello@worldinmaking.com
              </a>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl mb-2 sm:mb-3">💬</div>
              <h3 className="font-semibold text-gray-800 mb-1 text-xs sm:text-sm md:text-base">Slack</h3>
              <a href="#" className="text-red hover:underline text-[10px] sm:text-xs md:text-sm">
                Join our community
              </a>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl mb-2 sm:mb-3">🐙</div>
              <h3 className="font-semibold text-gray-800 mb-1 text-xs sm:text-sm md:text-base">GitHub</h3>
              <a href="#" className="text-red hover:underline text-[10px] sm:text-xs md:text-sm">
                Open an issue
              </a>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  )
}

export function Head() {
  return (
    <>
      <title>Contact - World in Making</title>
      <meta name="description" content="Get in touch with the World in Making team. We're here to help with sales, support, or any questions you have." />
    </>
  )
}
