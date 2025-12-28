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

export default function RegisterPage() {
    const router = useRouter();
    const { setUser, setToken, anonymousId, setLoading } = useUserStore();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [localError, setLocalError] = useState<string | null>(null);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLocalError(null);

        if (password !== confirmPassword) {
            setLocalError('Passwords do not match');
            return;
        }

        setLoading(true);

        try {
            const response = await post<unknown, AuthResponse>('/api/auth/register', {
                anonymous_id: anonymousId,
                email,
                password,
                display_name: displayName || undefined,
            });

            // Update store
            setToken(response.access_token);
            setUser({
                id: response.user_id,
                anonymous_id: response.anonymous_id,
                email: response.email,
                display_name: response.display_name,
                created_at: '',
                updated_at: '',
            });

            router.push('/');
        } catch (err: unknown) {
            const apiError = (err as { data: ApiError })?.data;
            setLocalError(apiError?.detail || 'An error occurred during registration');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[80vh] flex items-center justify-center p-4">
            <Card className="w-full max-w-md p-8 shadow-xl">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Create Account</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-2">Save your progress permanently</p>
                </div>

                {localError && (
                    <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900 rounded-lg text-red-600 dark:text-red-400 text-sm">
                        {localError}
                    </div>
                )}

                <form onSubmit={handleRegister} className="space-y-4">
                    <Input
                        label="Display Name"
                        type="text"
                        value={displayName}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDisplayName(e.target.value)}
                        placeholder="John Doe"
                        fullWidth
                    />
                    <Input
                        label="Email Address"
                        type="email"
                        value={email}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                        required
                        placeholder="you@example.com"
                        fullWidth
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                            label="Password"
                            type="password"
                            value={password}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                            required
                            placeholder="••••••••"
                            fullWidth
                        />
                        <Input
                            label="Confirm"
                            type="password"
                            value={confirmPassword}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
                            required
                            placeholder="••••••••"
                            fullWidth
                        />
                    </div>

                    <div className="pt-2">
                        <Button type="submit" fullWidth size="lg">
                            Create Account
                        </Button>
                    </div>
                </form>

                <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800 text-center">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Already have an account?{' '}
                        <Link href="/auth/login" className="text-blue-600 hover:text-blue-500 font-semibold">
                            Log in here
                        </Link>
                    </p>
                    <div className="mt-4">
                        <Link href="/" className="text-xs text-gray-400 hover:text-gray-600 transition-colors underline underline-offset-4">
                            Continue Guest Session
                        </Link>
                    </div>
                </div>
            </Card>
        </div>
    );
}
