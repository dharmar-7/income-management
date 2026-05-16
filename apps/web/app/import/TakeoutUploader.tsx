'use client';

import { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { useAuth } from '@clerk/nextjs';

type Status = 'idle' | 'uploading' | 'success' | 'error';

interface ImportResult {
  message: string;
  imported: number;
  skipped: number;
  failed: number;
  total: number;
}

export default function TakeoutUploader() {
  const { getToken } = useAuth();
  const [status, setStatus] = useState<Status>('idle');
  const [isDragging, setIsDragging] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function uploadFile(file: File) {
    // Validate file type on the client side too (defence in depth)
    if (!file.name.endsWith('.json') && file.type !== 'application/json') {
      setError('Please upload a .json file.');
      setStatus('error');
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setError('File is too large. Maximum size is 50MB.');
      setStatus('error');
      return;
    }

    setStatus('uploading');
    setError(null);
    setResult(null);

    try {
      // Get the Clerk JWT token to authenticate the request
      const token = await getToken();

      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/import/takeout`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        },
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Upload failed' }));
        throw new Error(err.message ?? 'Upload failed');
      }

      const data: ImportResult = await res.json();
      setResult(data);
      setStatus('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      setStatus('error');
    }
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
  }

  function reset() {
    setStatus('idle');
    setResult(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
      {/* Drop Zone */}
      {status === 'idle' && (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onClick={() => inputRef.current?.click()}
          className={`
            border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors
            ${isDragging
              ? 'border-black dark:border-white bg-gray-50 dark:bg-gray-700'
              : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700/50'
            }
          `}
        >
          <div className="text-4xl mb-3">📂</div>
          <p className="font-medium text-gray-700 dark:text-gray-200">
            Drag & drop your Takeout JSON file here
          </p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
            or click to browse — max 50MB
          </p>
          <input
            ref={inputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleChange}
            className="hidden"
          />
        </div>
      )}

      {/* Uploading State */}
      {status === 'uploading' && (
        <div className="text-center py-12">
          <div className="text-4xl mb-4 animate-pulse">⏳</div>
          <p className="font-medium text-gray-700 dark:text-gray-200">Importing your transactions...</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
            This may take a moment for large files.
          </p>
        </div>
      )}

      {/* Success State */}
      {status === 'success' && result && (
        <div>
          <div className="text-center mb-6">
            <div className="text-4xl mb-3">✅</div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Import Complete!</h3>
            <p className="text-gray-500 dark:text-gray-400 mt-1">{result.message}</p>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-green-50 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-green-700">{result.imported}</div>
              <div className="text-sm text-green-600 mt-1">Imported</div>
            </div>
            <div className="bg-yellow-50 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-yellow-700">{result.skipped}</div>
              <div className="text-sm text-yellow-600 mt-1">Already existed</div>
            </div>
            <div className="bg-red-50 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-red-700">{result.failed}</div>
              <div className="text-sm text-red-600 mt-1">Failed</div>
            </div>
          </div>

          <div className="flex gap-3">
            <a
              href="/dashboard"
              className="flex-1 text-center rounded-full bg-black py-3 text-white font-medium hover:bg-gray-800 transition-colors"
            >
              View Dashboard
            </a>
            <button
              onClick={reset}
              className="flex-1 rounded-full border border-gray-300 dark:border-gray-600 py-3 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Import Another File
            </button>
          </div>
        </div>
      )}

      {/* Error State */}
      {status === 'error' && (
        <div className="text-center py-8">
          <div className="text-4xl mb-3">❌</div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Import Failed</h3>
          <p className="text-sm text-red-600 mb-6">{error}</p>
          <button
            onClick={reset}
            className="rounded-full bg-black px-6 py-3 text-white font-medium hover:bg-gray-800 transition-colors"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}
