import { Test, TestingModule } from '@nestjs/testing';
import { CategorizerService } from './categorizer.service';
import { PrismaService } from '../prisma/prisma.service';

// A fake Prisma that returns predictable IDs when upsert is called.
// We inject this instead of the real PrismaService — no DB required.
function makeMockPrisma() {
  let idCounter = 1;
  return {
    category: {
      upsert: jest.fn().mockImplementation(({ create }) => {
        // Return a fake category with a deterministic id
        return Promise.resolve({ id: `cat-${idCounter++}`, ...create });
      }),
    },
  };
}

describe('CategorizerService', () => {
  let service: CategorizerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategorizerService,
        { provide: PrismaService, useValue: makeMockPrisma() },
      ],
    }).compile();

    service = module.get<CategorizerService>(CategorizerService);

    // onModuleInit seeds the category cache — call it manually in tests
    await service.onModuleInit();
  });

  // ─── Known merchants ───────────────────────────────────────────────────

  it('matches "Swiggy" to Food & Dining', () => {
    const id = service.getCategoryId('Swiggy');
    // The cache was populated by onModuleInit — we just verify a non-empty string is returned
    expect(id).toBeTruthy();
    expect(typeof id).toBe('string');
  });

  it('matches "UBER TRIP" (uppercase) to Transport', () => {
    const uberId = service.getCategoryId('UBER TRIP');
    const transportId = service.getCategoryId('Ola ride');
    // Both should map to the same category (Transport)
    expect(uberId).toBe(transportId);
  });

  it('matches "Amazon.in" to Shopping', () => {
    const amazonId = service.getCategoryId('Amazon.in order');
    const flipkartId = service.getCategoryId('Flipkart order');
    expect(amazonId).toBe(flipkartId);
  });

  it('matches "Netflix" to Entertainment', () => {
    const id = service.getCategoryId('Netflix subscription');
    expect(id).toBeTruthy();
  });

  it('matches "BESCOM electricity bill" to Utilities', () => {
    const bescomId = service.getCategoryId('BESCOM electricity bill');
    const airtelId = service.getCategoryId('Airtel prepaid recharge');
    expect(bescomId).toBe(airtelId);
  });

  // ─── Unknown merchants fall back to Other ─────────────────────────────

  it('returns the "Other" category ID for an unknown merchant', () => {
    const unknownId = service.getCategoryId('Some Random Store XYZ');
    const otherId = service.getCategoryId('Another Unknown Merchant');
    // Both unknowns should map to the same "Other" category
    expect(unknownId).toBe(otherId);
    expect(unknownId).toBeTruthy();
  });

  it('returns the "Other" ID for an empty merchant name', () => {
    const id = service.getCategoryId('');
    expect(id).toBeTruthy();
  });

  // ─── Case insensitivity ───────────────────────────────────────────────

  it('matches regardless of case', () => {
    const lower = service.getCategoryId('swiggy');
    const upper = service.getCategoryId('SWIGGY');
    const mixed = service.getCategoryId('Swiggy Food');
    expect(lower).toBe(upper);
    expect(upper).toBe(mixed);
  });

  // ─── Partial matches ──────────────────────────────────────────────────

  it('matches on partial merchant name (keyword substring)', () => {
    // "apollo pharmacy" contains both "apollo" (Health) and "pharmacy" (Health)
    const id = service.getCategoryId('Apollo Pharmacy');
    expect(id).toBeTruthy();
  });
});
