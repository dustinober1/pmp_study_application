'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/stores/userStore';
import { post } from '@/lib/api/client';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Link from 'next/link';
import type { AuthResponse, ApiError } from '@/types';

export default function LoginPage() {
    const router = useRouter();
    const { setUser, setToken, setLoading } = useUserStore();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [localError, setLocalError] = useState<string | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLocalError(null);
        setLoading(true);

        try {
            const response = await post<unknown, AuthResponse>('/api/auth/login', {
                email,
                password,
            });

            // Update store
            setToken(response.access_token);
            setUser({
                id: response.user_id,
                anonymous_id: response.anonymous_id,
                email: response.email,
                display_name: response.display_name,
                created_at: '', // Not returned by auth
                updated_at: '',
            });

            router.push('/');
        } catch (err: unknown) {
            const apiError = (err as { data: ApiError })?.data;
            setLocalError(apiError?.detail || 'Invalid email or password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[80vh] flex items-center justify-center p-4">
            <Card className="w-full max-w-md p-8 shadow-xl">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Welcome Back</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-2">Login to your PMP Study Account</p>
                </div>

                {localError && (
                    <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900 rounded-lg text-red-600 dark:text-red-400 text-sm">
                        {localError}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-4">
                    <Input
                        label="Email Address"
                        type="email"
                        value={email}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                        required
                        placeholder="you@example.com"
                        fullWidth
                    />
                    <Input
                        label="Password"
                        type="password"
                        value={password}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                        required
                        placeholder="••••••••"
                        fullWidth
                    />

                    <div className="pt-2">
                        <Button type="submit" fullWidth size="lg">
                            Sign In
                        </Button>
                    </div>
                </form>

                <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800 text-center">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Don&apos;t have a permanent account?{' '}
                        <Link href="/auth/register" className="text-blue-600 hover:text-blue-500 font-semibold">
                            Register here
                        </Link>
                    </p>
                    <div className="mt-4">
                        <Link href="/" className="text-xs text-gray-400 hover:text-gray-600 transition-colors underline underline-offset-4">
                            Continue as Guest
                        </Link>
                    </div>
                </div>
            </Card>
        </div>
    );
}
