import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import BudgetManager from './BudgetManager';
import AppNav from '@/components/AppNav';

export default async function BudgetsPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  return (
    <main className="min-h-screen">
      <AppNav />
      <div className="max-w-3xl mx-auto px-6 py-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Monthly Budgets</h2>
        <BudgetManager />
      </div>
    </main>
  );
}
