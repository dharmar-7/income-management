import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import TransactionDetail from './TransactionDetail';
import AppNav from '@/components/AppNav';

export default async function TransactionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const { id } = await params;

  return (
    <main className="min-h-screen">
      <AppNav />
      <div className="max-w-2xl mx-auto px-6 py-8">
        <TransactionDetail id={id} />
      </div>
    </main>
  );
}
