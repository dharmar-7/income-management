'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import { apiFetch } from '@/lib/api';

export interface DashboardOverview {
  summary: {
    month: number;
    year: number;
    totalIncome: number;
    totalExpenses: number;
    totalRefunds: number;
    totalInvestments: number;
    netSavings: number;
  };
  categories: {
    category: { name: string; icon: string };
    total: number;
  }[];
  monthly: {
    month: string;
    year: number;
    income: number;
    expenses: number;
  }[];
  budgets: {
    data: {
      id: string;
      amount: number;
      month: number;
      year: number;
      category: { name: string; icon: string };
      spent: number;
      remaining: number;
      percentUsed: number;
    }[];
    month: number;
    year: number;
  };
  cash: { balance: number; totalIn: number; totalOut: number };
  savings: {
    totalNetCost: number;
    totalCurrentValue: number;
    totalGainLoss: number;
    totalGainPercent: number;
    count: number;
  };
  networth: {
    cash: number;
    investments: number;
    netWorth: number;
    history: { year: number; month: number; netWorth: number }[];
  };
  streaks: {
    currentStreak: number;
    longestStreak: number;
    activeToday: boolean;
    unlockedCount: number;
    total: number;
    achievements: {
      key: string;
      title: string;
      icon: string;
      unlocked: boolean;
      hint: string;
    }[];
  };
}

export const DASHBOARD_KEY = ['dashboard'] as const;

export function useDashboard() {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: DASHBOARD_KEY,
    queryFn: async () => {
      const token = await getToken();
      return apiFetch<DashboardOverview>('/dashboard/overview', token!);
    },
    staleTime: 2 * 60 * 1000,
  });
}

export function useInvalidateDashboard() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: DASHBOARD_KEY });
}
