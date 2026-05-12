'use client';

import { useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { apiFetch } from '@/lib/api';

interface Category {
  id: string;
  name: string;
  icon: string;
}

interface Props {
  categories: Category[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddTransactionModal({ categories, onClose, onSuccess }: Props) {
  const { getToken } = useAuth();

  const [type, setType] = useState<'DEBIT' | 'CREDIT' | 'REFUND' | 'INVESTMENT'>('DEBIT');
  const [amount, setAmount] = useState('');
  const [merchant, setMerchant] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!amount || !merchant || !date) return;

    setLoading(true);
    setError('');

    try {
      const token = await getToken();
      await apiFetch('/transactions', token!, {
        method: 'POST',
        body: JSON.stringify({
          amount: parseFloat(amount),
          merchant: merchant.trim(),
          type,
          date,
          categoryId: categoryId || undefined,
          description: description.trim() || undefined,
        }),
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message ?? 'Failed to add transaction.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Add Transaction</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type toggle */}
          <div className="flex rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
            <button
              type="button"
              onClick={() => setType('DEBIT')}
              className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
                type === 'DEBIT'
                  ? 'bg-rose-500 text-white'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              💸 Expense
            </button>
            <button
              type="button"
              onClick={() => setType('CREDIT')}
              className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
                type === 'CREDIT'
                  ? 'bg-emerald-500 text-white'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              💰 Income
            </button>
            <button
              type="button"
              onClick={() => setType('REFUND')}
              className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
                type === 'REFUND'
                  ? 'bg-teal-500 text-white'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              ↩️ Refund
            </button>
            <button
              type="button"
              onClick={() => setType('INVESTMENT')}
              className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
                type === 'INVESTMENT'
                  ? 'bg-indigo-500 text-white'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              📊 Investment
            </button>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Amount (₹)</label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              required
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-violet-400"
            />
          </div>

          {/* Merchant */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              {type === 'DEBIT' ? 'Merchant / Paid to'
                : type === 'REFUND' ? 'Refunded by'
                : type === 'INVESTMENT' ? 'Platform / App'
                : 'Received from'}
            </label>
            <input
              type="text"
              placeholder={type === 'DEBIT' ? 'e.g. Electricity Board'
                : type === 'REFUND' ? 'e.g. IRCTC'
                : type === 'INVESTMENT' ? 'e.g. Groww, Zerodha'
                : 'e.g. Salary'}
              value={merchant}
              onChange={e => setMerchant(e.target.value)}
              required
              maxLength={200}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-violet-400"
            />
          </div>

          {/* Category chips */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-2">Category</label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setCategoryId('')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  !categoryId
                    ? 'bg-violet-600 text-white border-violet-600'
                    : 'bg-white text-gray-500 border-gray-200 hover:border-violet-300 hover:text-violet-600'
                }`}
              >
                📦 Uncategorized
              </button>
              {categories.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategoryId(c.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    categoryId === c.id
                      ? 'bg-violet-600 text-white border-violet-600'
                      : 'bg-white text-gray-500 border-gray-200 hover:border-violet-300 hover:text-violet-600'
                  }`}
                >
                  {c.icon} {c.name}
                </button>
              ))}
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Date</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              required
              max={new Date().toISOString().slice(0, 10)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-violet-400"
            />
          </div>

          {/* Note */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Note <span className="text-gray-300">(optional)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Q1 electricity bill"
              value={description}
              onChange={e => setDescription(e.target.value)}
              maxLength={500}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-violet-400"
            />
          </div>

          {error && (
            <p className="text-xs text-rose-500">{error}</p>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-500 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
            >
              {loading ? 'Adding…' : 'Add Transaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
