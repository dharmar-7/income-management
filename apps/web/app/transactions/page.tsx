import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import TransactionList from './TransactionList';
import AppNav from '@/components/AppNav';

export default async function TransactionsPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  return (
    <main className="min-h-screen">
      <AppNav />
      <div className="max-w-5xl mx-auto px-6 py-8">
        <TransactionList />
      </div>
    </main>
  );
}
