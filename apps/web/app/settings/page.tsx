import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import GmailSettings from './GmailSettings';
import AppNav from '@/components/AppNav';

export default async function SettingsPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  return (
    <main className="min-h-screen bg-gray-50">
      <AppNav />
      <div className="max-w-2xl mx-auto py-8 px-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Settings</h1>
        <GmailSettings />
      </div>
    </main>
  );
}
