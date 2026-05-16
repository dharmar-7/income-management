import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import TakeoutUploader from './TakeoutUploader';
import AppNav from '@/components/AppNav';

export default async function ImportPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  return (
    <main className="min-h-screen">
      <AppNav />
      <div className="max-w-2xl mx-auto py-8 px-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Import Transactions
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8">
          Upload your Google Takeout JSON file to import your full transaction history.
        </p>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 mb-6">
          <h2 className="font-semibold text-gray-700 dark:text-gray-200 mb-4">
            How to get your Takeout file
          </h2>
          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600 dark:text-gray-300">
            <li>Go to <span className="font-mono bg-gray-100 dark:bg-gray-700 dark:text-gray-200 px-1 rounded">takeout.google.com</span></li>
            <li>Click <strong>Deselect all</strong>, then select <strong>Google Pay</strong></li>
            <li>Click <strong>Next step</strong> → <strong>Create export</strong></li>
            <li>Download the ZIP and extract the <strong>.json</strong> file inside</li>
            <li>Upload the JSON file below</li>
          </ol>
        </div>

        <TakeoutUploader />
      </div>
    </main>
  );
}
