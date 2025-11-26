import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-950 py-20 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-6xl">
              Production-Ready File Uploads for{' '}
              <span className="text-blue-600 dark:text-blue-400">Next.js</span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-300">
              ORM-agnostic file upload library with S3, Prisma, Drizzle support.
              Type-safe, production-ready, and blazingly fast.
            </p>

            {/* CLI Command Showcase */}
            <div className="mt-10 flex flex-col items-center gap-6">
              <div className="w-full max-w-xl">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  Get started in seconds with our CLI:
                </p>
                <div className="relative group">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg blur opacity-25 group-hover:opacity-40 transition"></div>
                  <div className="relative bg-gray-900 dark:bg-gray-950 rounded-lg px-6 py-4 border border-gray-800">
                    <code className="text-blue-400 font-mono text-sm sm:text-base">
                      npx ultra-fileio@latest init
                    </code>
                  </div>
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-4 mt-4">
                <Link
                  href="/docs"
                  className="rounded-md bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 transition"
                >
                  Get Started
                </Link>
                <a
                  href="https://github.com/codersaadi/ultra-fileio"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-md bg-white dark:bg-gray-800 px-6 py-3 text-sm font-semibold text-gray-900 dark:text-white shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                >
                  View on GitHub
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 sm:py-24 bg-white dark:bg-gray-950">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
              Everything you need for file uploads
            </h2>
          </div>

          <div className="mx-auto max-w-5xl">
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              <FeatureCard
                icon="🎯"
                title="CLI Setup"
                description="Auto-configure your Next.js project with one command. Supports App Router out of the box."
              />
              <FeatureCard
                icon="☁️"
                title="Cloud Storage"
                description="Works seamlessly with AWS S3 and Cloudflare R2. Presigned URLs for direct uploads."
              />
              <FeatureCard
                icon="🔧"
                title="ORM Agnostic"
                description="Use Prisma, Drizzle, or any ORM. Flexible repository pattern for easy integration."
              />
              <FeatureCard
                icon="🛡️"
                title="Type-Safe"
                description="Full TypeScript support with Zod validation. Catch errors at compile time."
              />
              <FeatureCard
                icon="🖼️"
                title="Image Optimization"
                description="Automatic compression and thumbnail generation with Sharp. Production-ready."
              />
              <FeatureCard
                icon="⚡"
                title="Next.js First"
                description="Built specifically for Next.js 14+ App Router with Server Components support."
              />
            </div>
          </div>
        </div>
      </section>

      {/* Quick Start CTA */}
      <section className="bg-blue-600 dark:bg-blue-700 py-16">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Ready to get started?
            </h2>
            <p className="mt-4 text-lg text-blue-100">
              Install ultra-fileio and have file uploads running in minutes.
            </p>
            <div className="mt-8">
              <Link
                href="/docs"
                className="rounded-md bg-white px-8 py-3.5 text-sm font-semibold text-blue-600 shadow-sm hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white transition inline-block"
              >
                View Documentation
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="relative bg-gray-50 dark:bg-gray-900 rounded-2xl p-8 border border-gray-200 dark:border-gray-800 hover:border-blue-500 dark:hover:border-blue-500 transition-colors">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{title}</h3>
      <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
    </div>
  );
}
