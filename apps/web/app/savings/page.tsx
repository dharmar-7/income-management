import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import AppNav from '@/components/AppNav';
import SavingsManager from './SavingsManager';

export default async function SavingsPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  return (
    <main className="min-h-screen bg-gray-50">
      <AppNav />
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Investments & Savings</h1>
          <p className="text-gray-500 mt-1">
            Track your portfolio across platforms, mutual funds, post office, gold and more.
          </p>
        </div>
        <SavingsManager />
      </div>
    </main>
  );
}
