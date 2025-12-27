import Link from 'next/link'
import { ThemeToggle } from '@/components/ThemeToggle'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      {/* Navigation */}
      <nav className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="container-responsive py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-blue-600">PMP Study App</h1>
          <div className="flex items-center space-x-4">
            <ThemeToggle />
            <Link href="/login" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
              Sign In
            </Link>
            <Link href="/signup" className="btn-primary">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container-responsive py-20 flex flex-col items-center text-center">
        <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
          Master the PMP 2026 Exam
        </h2>
        <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl">
          Prepare efficiently with AI-powered flashcards and spaced repetition. Study smarter, not
          harder.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 mb-12">
          <Link href="/signup" className="btn-primary text-lg px-8 py-3">
            Start Learning Free
          </Link>
          <Link href="#features" className="btn-secondary text-lg px-8 py-3">
            Learn More
          </Link>
        </div>

        {/* Key Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 my-16 w-full">
          <div className="card">
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">3</div>
            <div className="text-gray-600 dark:text-gray-300">PMP Domains Covered</div>
          </div>
          <div className="card">
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">26</div>
            <div className="text-gray-600 dark:text-gray-300">Tasks to Master</div>
          </div>
          <div className="card">
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">FSRS</div>
            <div className="text-gray-600 dark:text-gray-300">Spaced Repetition</div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="bg-white dark:bg-gray-800 py-20">
        <div className="container-responsive">
          <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-12 text-center">Why Choose Us?</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="card">
              <div className="text-3xl mb-4">📚</div>
              <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Comprehensive Coverage</h4>
              <p className="text-gray-600 dark:text-gray-300">
                Covers all 3 domains and 26 tasks of the PMP 2026 exam content outline.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="card">
              <div className="text-3xl mb-4">🧠</div>
              <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Smart Learning</h4>
              <p className="text-gray-600 dark:text-gray-300">
                FSRS-powered spaced repetition schedules reviews based on your progress.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="card">
              <div className="text-3xl mb-4">📱</div>
              <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Multi-Platform</h4>
              <p className="text-gray-600 dark:text-gray-300">
                Study on web, iOS, or Android with seamless synchronization across devices.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="card">
              <div className="text-3xl mb-4">📊</div>
              <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Progress Tracking</h4>
              <p className="text-gray-600 dark:text-gray-300">
                Track your learning progress with detailed statistics and insights.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="card">
              <div className="text-3xl mb-4">🔐</div>
              <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Secure & Private</h4>
              <p className="text-gray-600 dark:text-gray-300">
                Your study data is encrypted and stored securely in Firebase.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="card">
              <div className="text-3xl mb-4">✨</div>
              <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Custom Flashcards</h4>
              <p className="text-gray-600 dark:text-gray-300">
                Create your own flashcards to supplement the built-in content.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-blue-600 py-16">
        <div className="container-responsive text-center">
          <h3 className="text-3xl font-bold text-white mb-6">Ready to Pass the PMP Exam?</h3>
          <p className="text-blue-100 mb-8 text-lg max-w-2xl mx-auto">
            Join thousands of professionals preparing for the PMP certification exam.
          </p>
          <Link href="/signup" className="inline-block bg-white text-blue-600 px-8 py-3 rounded-lg font-bold hover:bg-blue-50 transition-colors">
            Start Free Today
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 dark:bg-black text-gray-400 dark:text-gray-500 py-8">
        <div className="container-responsive flex flex-col md:flex-row justify-between items-center">
          <p>&copy; 2025 PMP Study App. All rights reserved.</p>
          <div className="flex gap-6 mt-4 md:mt-0">
            <Link href="#" className="hover:text-white dark:hover:text-gray-300">
              Privacy Policy
            </Link>
            <Link href="#" className="hover:text-white dark:hover:text-gray-300">
              Terms of Service
            </Link>
            <Link href="#" className="hover:text-white dark:hover:text-gray-300">
              Contact
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
