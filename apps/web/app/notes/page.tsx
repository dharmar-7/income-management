import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import AppNav from '@/components/AppNav';
import NotesManager from './NotesManager';

export default async function NotesPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  return (
    <main className="min-h-screen relative overflow-x-hidden">
      {/* Vivid background blobs — the glass cards blur these to create liquid glass effect */}
      <div className="fixed inset-0 pointer-events-none" aria-hidden>
        <div className="absolute top-16 -left-16 w-[560px] h-[560px] rounded-full blur-3xl" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.18) 0%, transparent 65%)' }} />
        <div className="absolute top-48 right-0 w-[480px] h-[480px] rounded-full blur-3xl" style={{ background: 'radial-gradient(circle, rgba(236,72,153,0.14) 0%, transparent 65%)' }} />
        <div className="absolute bottom-0 left-1/4 w-[520px] h-[520px] rounded-full blur-3xl" style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.12) 0%, transparent 65%)' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full blur-3xl" style={{ background: 'radial-gradient(circle, rgba(251,146,60,0.10) 0%, transparent 65%)' }} />
      </div>
      <AppNav />
      <div className="relative max-w-6xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Notes</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Capture ideas, checklists, and reminders.</p>
        </div>
        <NotesManager />
      </div>
    </main>
  );
}
