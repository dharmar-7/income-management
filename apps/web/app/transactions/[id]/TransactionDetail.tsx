'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import CustomSelect from '@/components/CustomSelect';

interface Category {
  id: string;
  name: string;
  icon: string;
}

interface Transaction {
  id: string;
  merchant: string;
  amount: number;
  date: string;
  type: 'DEBIT' | 'CREDIT';
  description: string | null;
  source: string;
  category: Category | null;
}

function formatINR(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function TransactionDetail({ id }: { id: string }) {
  const { getToken } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);

  // Fetch transaction
  const { data: tx, isLoading, error } = useQuery({
    queryKey: ['transaction', id],
    queryFn: async () => {
      const token = await getToken();
      const result = await apiFetch<Transaction>(`/transactions/${id}`, token!);
      // Pre-fill edit fields with current values
      setSelectedCategory(result.category?.id ?? '');
      setNote(result.description ?? '');
      return result;
    },
  });

  // Fetch categories for dropdown
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const token = await getToken();
      return apiFetch<Category[]>('/transactions/categories', token!);
    },
  });

  // Save mutation
  const mutation = useMutation({
    mutationFn: async (body: { categoryId?: string; description?: string }) => {
      const token = await getToken();
      return apiFetch<Transaction>(`/transactions/${id}`, token!, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
    },
    onSuccess: () => {
      // Invalidate so the list + detail both refresh
      queryClient.invalidateQueries({ queryKey: ['transaction', id] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['by-category'] });
      setIsEditing(false);
    },
  });

  function handleSave() {
    mutation.mutate({
      categoryId: selectedCategory || undefined,
      description: note || undefined,
    });
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-8 animate-pulse space-y-4">
        <div className="h-6 bg-gray-100 rounded w-48" />
        <div className="h-10 bg-gray-100 rounded w-32" />
        <div className="h-4 bg-gray-100 rounded w-24" />
      </div>
    );
  }

  if (error || !tx) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
        <p className="text-gray-400 text-sm">Transaction not found.</p>
        <button
          onClick={() => router.back()}
          className="mt-4 text-sm text-gray-500 hover:text-gray-900 underline"
        >
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header card */}
      <div className="bg-white rounded-2xl border border-gray-200 p-8">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center text-2xl flex-shrink-0">
            {tx.category?.icon ?? '📦'}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-gray-900">{tx.merchant}</h2>
            <p className="text-sm text-gray-400 mt-0.5">{formatDate(tx.date)}</p>
          </div>
          <div className={`text-2xl font-bold flex-shrink-0 ${tx.type === 'CREDIT' ? 'text-emerald-600' : 'text-rose-600'}`}>
            {tx.type === 'CREDIT' ? '+' : '-'}{formatINR(tx.amount)}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-400">Type</p>
            <p className="font-medium mt-0.5">
              {tx.type === 'CREDIT' ? 'Income' : 'Expense'}
            </p>
          </div>
          <div>
            <p className="text-gray-400">Category</p>
            <p className="font-medium mt-0.5">
              {tx.category ? `${tx.category.icon} ${tx.category.name}` : 'Uncategorized'}
            </p>
          </div>
          <div>
            <p className="text-gray-400">Source</p>
            <p className="font-medium mt-0.5 capitalize">{tx.source.toLowerCase().replace('_', ' ')}</p>
          </div>
          <div>
            <p className="text-gray-400">Note</p>
            <p className="font-medium mt-0.5 text-gray-700">
              {tx.description ?? <span className="text-gray-400 font-normal">None</span>}
            </p>
          </div>
        </div>
      </div>

      {/* Edit card */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800">Edit Details</h3>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="text-sm text-gray-500 hover:text-gray-900 border border-gray-200 rounded-full px-3 py-1"
            >
              Edit
            </button>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-500 mb-1">Category</label>
              <CustomSelect
                value={selectedCategory}
                onChange={v => setSelectedCategory(v)}
                placeholder="Uncategorized"
                options={[
                  { value: '', label: 'Uncategorized', icon: '📦' },
                  ...(categories ?? []).map(c => ({ value: c.id, label: c.name, icon: c.icon })),
                ]}
              />
            </div>

            <div>
              <label className="block text-sm text-gray-500 mb-1">Note</label>
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                rows={3}
                placeholder="Add a note..."
                className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-gray-400 resize-none"
              />
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setSelectedCategory(tx.category?.id ?? '');
                  setNote(tx.description ?? '');
                  setIsEditing(false);
                }}
                className="rounded-full border border-gray-200 px-4 py-2 text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={mutation.isPending}
                className="rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2 text-sm text-white hover:opacity-90 disabled:opacity-50 shadow-md shadow-indigo-200"
              >
                {mutation.isPending ? 'Saving...' : 'Save'}
              </button>
            </div>

            {mutation.isError && (
              <p className="text-sm text-red-500 text-center">Failed to save. Try again.</p>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-400">
            Click Edit to update the category or add a note to this transaction.
          </p>
        )}
      </div>
    </div>
  );
}
