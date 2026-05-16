import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import ReportView from './ReportView';
import AppNav from '@/components/AppNav';

export default async function ReportsPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  return (
    <main className="min-h-screen">
      <AppNav />
      <div className="max-w-4xl mx-auto px-6 py-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Reports</h2>
        <ReportView />
      </div>
    </main>
  );
}
