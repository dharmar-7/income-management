import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import SummaryCards from './SummaryCards';
import CashCard from './CashCard';
import MonthlyChart from './MonthlyChart';
import CategoryChart from './CategoryChart';
import BudgetProgress from './BudgetProgress';
import SavingsCard from './SavingsCard';
import AppNav from '@/components/AppNav';

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const user = await currentUser();

  return (
    <main className="min-h-screen bg-gray-50">
      <AppNav />

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Welcome back, {user?.firstName ?? 'there'}!
          </h2>
          <p className="text-gray-500 mt-1">Here's your financial summary for this month.</p>
        </div>

        {/* Summary cards — income, expenses, savings */}
        <SummaryCards />

        {/* Cash in Hand + Investments row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl">
          <CashCard />
          <SavingsCard />
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <MonthlyChart />
          <CategoryChart />
        </div>

        {/* Budget progress */}
        <BudgetProgress />
      </div>
    </main>
  );
}
