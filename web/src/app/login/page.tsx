import { LoginForm } from '@/components/LoginForm'

export const metadata = {
  title: 'Sign In - PMP Study App',
  description: 'Sign in to your PMP Study App account',
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="card">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-blue-600 mb-2">PMP Study App</h1>
            <p className="text-gray-600">Continue your learning journey</p>
          </div>

          <LoginForm />
        </div>
      </div>
    </div>
  )
}
