'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';
import PrismLogo from '@/components/PrismLogo';
import { useTheme } from '@/context/ThemeContext';

const NAV_ITEMS = [
  { href: '/dashboard',     label: 'Dashboard' },
  { href: '/transactions',  label: 'Transactions' },
  { href: '/budgets',       label: 'Budgets' },
  { href: '/savings',       label: 'Savings' },
  { href: '/notes',         label: 'Notes' },
  { href: '/reports',       label: 'Reports' },
  { href: '/import',        label: 'Import' },
  { href: '/settings',      label: 'Settings' },
];

export default function AppNav() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();

  return (
    <nav className="bg-white/90 dark:bg-gray-950/90 backdrop-blur-md border-b border-gray-200/60 dark:border-white/8 px-6 py-3 flex items-center justify-between sticky top-0 z-50">
      <Link href="/dashboard" className="mr-8">
        <PrismLogo size={28} wordmarkSize="md" />
      </Link>

      <div className="flex items-center gap-1 flex-1">
        {NAV_ITEMS.map(item => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-medium shadow-md shadow-indigo-200 dark:shadow-indigo-900/50'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-white/10'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        {/* Dark / light mode toggle */}
        <button
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          className="w-8 h-8 rounded-full flex items-center justify-content text-lg transition-colors hover:bg-gray-100 dark:hover:bg-white/10"
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
        <UserButton />
      </div>
    </nav>
  );
}
