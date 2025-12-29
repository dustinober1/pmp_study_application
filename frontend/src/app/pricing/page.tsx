'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Card, { CardBody } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { useTelemetry } from '@/lib/telemetry';

type BillingPeriod = 'monthly' | 'annual';

interface Tier {
  id: 'public' | 'free' | 'premium';
  name: string;
  description: string;
  price: { monthly: string; annual: string; annualMonthly: string };
  features: string[];
  highlighted?: boolean;
  cta: string;
  limitations?: string[];
}

const TIERS: Tier[] = [
  {
    id: 'public',
    name: 'Public',
    description: 'Try before you commit',
    price: { monthly: 'Free', annual: 'Free', annualMonthly: 'Free' },
    features: [
      '50 flashcards per day',
      '30 questions per day',
      '1 mini-exam per day (25 questions)',
      'Basic progress tracking',
      'Study sessions',
    ],
    limitations: [
      'No full exams',
      'No AI coaching',
      'No adaptive explanations',
      'No concept graph explorer',
    ],
    cta: 'Get Started',
  },
  {
    id: 'free',
    name: 'Free',
    description: 'For registered users',
    price: { monthly: 'Free', annual: 'Free', annualMonthly: 'Free' },
    features: [
      'Unlimited flashcards',
      'Unlimited practice questions',
      '2 mini-exams per month',
      'Detailed progress tracking',
      'Study streak tracking',
      'Study sessions history',
    ],
    limitations: [
      'Limited new features',
      'No full 185-question exams',
      'No AI-powered exam coach',
      'Limited concept graph access',
    ],
    cta: 'Sign Up Free',
  },
  {
    id: 'premium',
    name: 'Premium',
    description: 'Full PMP preparation',
    price: { monthly: '$14.99/mo', annual: '$119.99/year', annualMonthly: '$9.99/mo' },
    highlighted: true,
    features: [
      'Everything in Free',
      'Unlimited full 185-question exams',
      'Real exam simulation with timer',
      'AI-powered exam day coach',
      'Adaptive explanations (Simple, Technical, Analogy, Visual)',
      'Smart study roadmap with weekly adaptation',
      'Visual concept graph explorer',
      'Micro-learning sessions (2-minute cards)',
      'Audio flashcard support',
      'PWA widget for offline study',
      'Priority support',
    ],
    cta: 'Start Premium Trial',
  },
];

const FEATURE_COMPARISON = [
  { feature: 'Flashcards', public: '50/day', free: 'Unlimited', premium: 'Unlimited' },
  { feature: 'Practice Questions', public: '30/day', free: 'Unlimited', premium: 'Unlimited' },
  { feature: 'Mini Exams (25Q)', public: '1/day', free: '2/month', premium: 'Unlimited' },
  { feature: 'Full Exams (185Q)', public: 'No', free: 'No', premium: 'Unlimited' },
  { feature: 'Progress Tracking', public: 'Basic', free: 'Full', premium: 'Advanced' },
  { feature: 'AI Exam Coach', public: 'No', free: 'No', premium: 'Yes' },
  { feature: 'Adaptive Explanations', public: 'No', free: 'No', premium: 'All Formats' },
  { feature: 'Smart Study Roadmap', public: 'No', free: 'No', premium: 'AI-Generated' },
  { feature: 'Concept Graph Explorer', public: 'No', free: 'Limited', premium: 'Full Access' },
  { feature: 'Micro-Learning Sessions', public: 'No', free: 'No', premium: 'Unlimited' },
  { feature: 'Audio Support', public: 'No', free: 'No', premium: 'Yes' },
  { feature: 'Offline Mobile (PWA)', public: 'No', free: 'No', premium: 'Yes' },
];

export default function PricingPage() {
  const router = useRouter();
  const telemetry = useTelemetry();
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('annual');
  const [selectedTier, setSelectedTier] = useState<'premium' | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Track pricing page view
  useEffect(() => {
    telemetry.trackPageView('pricing');
  }, [telemetry]);

  const handleUpgrade = (tierId: string) => {
    // Track upgrade click
    telemetry.trackUpgradeClick(`pricing_page_${tierId}`);

    if (tierId === 'premium') {
      setIsRedirecting(true);
      // In production, this would initiate PayPal checkout flow
      // For now, redirect to a placeholder or the auth flow
      router.push('/auth?checkout=premium');
    } else if (tierId === 'free') {
      router.push('/auth?register=true');
    } else {
      router.push('/flashcards');
    }
  };

  const annualSavings = billingPeriod === 'annual' ? 33 : 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </Link>

          <div className="mt-6 text-center">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
              Choose Your Study Plan
            </h1>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
              Prepare for the PMP 2026 exam with the right tools for your learning style
            </p>
          </div>

          {/* Billing Toggle */}
          <div className="mt-8 flex justify-center">
            <div className="inline-flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              <button
                onClick={() => setBillingPeriod('monthly')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  billingPeriod === 'monthly'
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingPeriod('annual')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all relative ${
                  billingPeriod === 'annual'
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Annual
                <span className="absolute -top-2 -right-2 px-1.5 py-0.5 bg-green-500 text-white text-xs rounded-full">
                  Save 33%
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {TIERS.map((tier) => (
            <Card
              key={tier.id}
              variant={tier.highlighted ? 'elevated' : 'default'}
              className={`relative ${
                tier.highlighted
                  ? 'border-2 border-blue-500 dark:border-blue-400 shadow-xl scale-105'
                  : ''
              }`}
            >
              {tier.highlighted && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center px-4 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold rounded-full shadow-lg">
                    Most Popular
                  </span>
                </div>
              )}

              <CardBody className="p-6">
                <div className="text-center mb-6">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    {tier.name}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {tier.description}
                  </p>
                </div>

                {/* Price */}
                <div className="text-center mb-6">
                  {tier.id === 'premium' ? (
                    <div>
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="text-4xl font-bold text-gray-900 dark:text-white">
                          {billingPeriod === 'annual' ? tier.price.annualMonthly : tier.price.monthly}
                        </span>
                      </div>
                      {billingPeriod === 'annual' && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          Billed annually ({tier.price.annual})
                        </p>
                      )}
                      {annualSavings > 0 && billingPeriod === 'annual' && (
                        <p className="text-sm text-green-600 dark:text-green-400 font-medium mt-2">
                          Save ${Math.round((14.99 - 9.99) * 12)} per year
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="text-4xl font-bold text-gray-900 dark:text-white">
                      {tier.price.monthly}
                    </div>
                  )}
                </div>

                {/* CTA Button */}
                <Button
                  variant={tier.highlighted ? 'primary' : tier.id === 'public' ? 'secondary' : 'outline'}
                  className="w-full mb-6"
                  onClick={() => handleUpgrade(tier.id)}
                  disabled={isRedirecting}
                >
                  {isRedirecting && selectedTier === tier.id ? 'Redirecting...' : tier.cta}
                </Button>

                {/* Features */}
                <div className="space-y-3 mb-6">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                    What's included:
                  </h4>
                  {tier.features.map((feature) => (
                    <div key={feature} className="flex items-start gap-2">
                      <svg
                        className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="text-sm text-gray-600 dark:text-gray-400">{feature}</span>
                    </div>
                  ))}
                </div>

                {/* Limitations */}
                {tier.limitations && tier.limitations.length > 0 && (
                  <div className="space-y-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                      Limitations:
                    </h4>
                    {tier.limitations.map((limitation) => (
                      <div key={limitation} className="flex items-start gap-2">
                        <svg
                          className="w-5 h-5 text-gray-400 dark:text-gray-600 flex-shrink-0 mt-0.5"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <span className="text-sm text-gray-500 dark:text-gray-500">{limitation}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>
          ))}
        </div>

        {/* Feature Comparison Table */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-8">
            Compare All Features
          </h2>
          <Card variant="default" padding="lg">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-900 dark:text-white">
                      Feature
                    </th>
                    <th className="py-3 px-4 text-center text-sm font-semibold text-gray-600 dark:text-gray-400">
                      Public
                    </th>
                    <th className="py-3 px-4 text-center text-sm font-semibold text-gray-600 dark:text-gray-400">
                      Free
                    </th>
                    <th className="py-3 px-4 text-center text-sm font-semibold text-blue-600 dark:text-blue-400">
                      Premium
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {FEATURE_COMPARISON.map((row, index) => (
                    <tr
                      key={row.feature}
                      className={`border-b border-gray-100 dark:border-gray-800 ${
                        index % 2 === 0 ? 'bg-gray-50 dark:bg-gray-800/30' : ''
                      }`}
                    >
                      <td className="py-3 px-4 text-sm font-medium text-gray-900 dark:text-white">
                        {row.feature}
                      </td>
                      <td className="py-3 px-4 text-sm text-center text-gray-600 dark:text-gray-400">
                        {row.public}
                      </td>
                      <td className="py-3 px-4 text-sm text-center text-gray-600 dark:text-gray-400">
                        {row.free}
                      </td>
                      <td className="py-3 px-4 text-sm text-center text-blue-600 dark:text-blue-400 font-medium">
                        {row.premium}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* FAQ Section */}
        <div className="mt-16 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-8">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            <Card variant="default" padding="md">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                Can I switch between plans?
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Yes! You can upgrade from Public to Free at any time by registering an account.
                You can also upgrade to Premium whenever you're ready for full access.
              </p>
            </Card>
            <Card variant="default" padding="md">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                What payment methods do you accept?
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                We accept PayPal for secure payment processing. You can pay with PayPal balance,
                credit cards, or bank accounts linked to your PayPal account.
              </p>
            </Card>
            <Card variant="default" padding="md">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                Can I cancel my Premium subscription?
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Yes, you can cancel your Premium subscription at any time. You'll continue to have
                Premium access until the end of your current billing period.
              </p>
            </Card>
            <Card variant="default" padding="md">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                Do you offer refunds?
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                If you're not satisfied with Premium, contact us within 7 days for a full refund.
                We want you to feel confident in your PMP preparation investment.
              </p>
            </Card>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-16 text-center">
          <Card
            variant="filled"
            className="max-w-2xl mx-auto bg-gradient-to-r from-blue-600 to-indigo-600 border-0"
          >
            <CardBody className="p-8">
              <h2 className="text-2xl font-bold text-white mb-4">
                Ready to Ace Your PMP Exam?
              </h2>
              <p className="text-blue-100 mb-6">
                Join thousands of students preparing for the PMP 2026 exam with our comprehensive
                study tools.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  variant="primary"
                  className="bg-white text-blue-600 hover:bg-blue-50"
                  onClick={() => handleUpgrade('premium')}
                >
                  Start Premium Free Trial
                </Button>
                <Link href="/flashcards">
                  <Button variant="secondary" className="bg-blue-700 text-white hover:bg-blue-800">
                    Try Free First
                  </Button>
                </Link>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
