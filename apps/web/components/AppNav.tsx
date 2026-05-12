'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';
import PrismLogo from '@/components/PrismLogo';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/transactions', label: 'Transactions' },
  { href: '/budgets', label: 'Budgets' },
  { href: '/savings', label: 'Savings' },
  { href: '/notes', label: 'Notes' },
  { href: '/reports', label: 'Reports' },
  { href: '/import', label: 'Import' },
  { href: '/settings', label: 'Settings' },
];

export default function AppNav() {
  const pathname = usePathname();

  return (
    <nav className="bg-white/90 backdrop-blur-md border-b border-gray-200/60 px-6 py-3 flex items-center justify-between sticky top-0 z-50">
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
                  ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-medium shadow-md shadow-indigo-200'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>

      <UserButton />
    </nav>
  );
}
