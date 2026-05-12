import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Merchant keyword → category name mapping
// Keys are lowercase substrings to match against the merchant name
const MERCHANT_CATEGORY_MAP: Record<string, string> = {
  // Food & Dining
  swiggy: 'Food & Dining',
  zomato: 'Food & Dining',
  dunzo: 'Food & Dining',
  blinkit: 'Groceries',
  zepto: 'Groceries',
  bigbasket: 'Groceries',
  grofers: 'Groceries',
  instamart: 'Groceries',

  // Transport
  uber: 'Transport',
  ola: 'Transport',
  rapido: 'Transport',
  namma: 'Transport',
  irctc: 'Transport',
  redbus: 'Transport',
  makemytrip: 'Travel',
  goibibo: 'Travel',
  yatra: 'Travel',
  indigo: 'Travel',
  'air india': 'Travel',

  // Shopping
  amazon: 'Shopping',
  flipkart: 'Shopping',
  myntra: 'Shopping',
  ajio: 'Shopping',
  nykaa: 'Shopping',
  meesho: 'Shopping',

  // Entertainment
  netflix: 'Entertainment',
  spotify: 'Entertainment',
  youtube: 'Entertainment',
  hotstar: 'Entertainment',
  primevideo: 'Entertainment',
  bookmyshow: 'Entertainment',
  jiocinema: 'Entertainment',

  // Utilities & Bills
  electricity: 'Utilities',
  bescom: 'Utilities',
  tata: 'Utilities',
  airtel: 'Utilities',
  jio: 'Utilities',
  bsnl: 'Utilities',
  vodafone: 'Utilities',
  vi: 'Utilities',
  gas: 'Utilities',
  water: 'Utilities',

  // Health
  pharmacy: 'Health',
  medplus: 'Health',
  apollo: 'Health',
  practo: 'Health',
  '1mg': 'Health',
  netmeds: 'Health',
  hospital: 'Health',
  clinic: 'Health',

  // Finance
  insurance: 'Insurance',
  lic: 'Insurance',
  loan: 'Finance',
  emi: 'Finance',
  bank: 'Finance',

  // Education
  udemy: 'Education',
  coursera: 'Education',
  byju: 'Education',
  unacademy: 'Education',
  school: 'Education',
  college: 'Education',
  fees: 'Education',
};

// Default categories to always create in the DB
const DEFAULT_CATEGORIES = [
  { name: 'Food & Dining', icon: '🍽️' },
  { name: 'Groceries', icon: '🛒' },
  { name: 'Transport', icon: '🚗' },
  { name: 'Travel', icon: '✈️' },
  { name: 'Shopping', icon: '🛍️' },
  { name: 'Entertainment', icon: '🎬' },
  { name: 'Utilities', icon: '💡' },
  { name: 'Health', icon: '💊' },
  { name: 'Insurance', icon: '🛡️' },
  { name: 'Finance', icon: '🏦' },
  { name: 'Education', icon: '📚' },
  { name: 'Other', icon: '📦' },
];

@Injectable()
export class CategorizerService implements OnModuleInit {
  // Cache of category name → DB id, loaded once at startup
  private categoryCache: Map<string, string> = new Map();

  constructor(private prisma: PrismaService) {}

  // Called automatically when the module loads — seeds categories into DB
  async onModuleInit() {
    await this.seedCategories();
  }

  // Create default categories if they don't exist yet
  private async seedCategories() {
    for (const cat of DEFAULT_CATEGORIES) {
      const created = await this.prisma.category.upsert({
        where: { name: cat.name },
        update: {},
        create: cat,
      });
      this.categoryCache.set(cat.name, created.id);
    }
  }

  // Returns the DB category ID for a given merchant name
  // Falls back to "Other" if no match found
  getCategoryId(merchantName: string): string {
    const lower = merchantName.toLowerCase();

    for (const [keyword, categoryName] of Object.entries(MERCHANT_CATEGORY_MAP)) {
      if (lower.includes(keyword)) {
        const id = this.categoryCache.get(categoryName);
        if (id) return id;
      }
    }

    // Default to "Other"
    return this.categoryCache.get('Other') ?? '';
  }
}
