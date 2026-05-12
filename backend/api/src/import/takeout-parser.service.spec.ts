import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { TakeoutParserService } from './takeout-parser.service';
import { TransactionType, ImportSource } from '@prisma/client';

// Helper — builds a minimal valid row
function makeRow(overrides = {}) {
  return {
    'Transaction Date': '2025-04-01T10:00:00.000Z',
    'Paid To': 'Swiggy',
    'Amount (INR)': '450',
    'Transaction Type': 'Debit',
    Status: 'Completed',
    ...overrides,
  };
}

// Helper — wraps rows in a Buffer (simulating a file upload)
function toBuffer(data: unknown): Buffer {
  return Buffer.from(JSON.stringify(data), 'utf-8');
}

describe('TakeoutParserService', () => {
  let service: TakeoutParserService;

  beforeEach(async () => {
    // TakeoutParserService has no dependencies — no mocks needed
    const module: TestingModule = await Test.createTestingModule({
      providers: [TakeoutParserService],
    }).compile();

    service = module.get<TakeoutParserService>(TakeoutParserService);
  });

  // ─── JSON structure variants ──────────────────────────────────────────────

  it('parses a direct array', () => {
    const result = service.parse(toBuffer([makeRow()]));
    expect(result).toHaveLength(1);
    expect(result[0].merchant).toBe('Swiggy');
  });

  it('parses the "Transactions" (capital) wrapper', () => {
    const result = service.parse(toBuffer({ Transactions: [makeRow()] }));
    expect(result).toHaveLength(1);
  });

  it('parses the "transactions" (lowercase) wrapper', () => {
    const result = service.parse(toBuffer({ transactions: [makeRow()] }));
    expect(result).toHaveLength(1);
  });

  it('parses the "Transaction List" wrapper', () => {
    const result = service.parse(toBuffer({ 'Transaction List': [makeRow()] }));
    expect(result).toHaveLength(1);
  });

  it('parses the "data" wrapper', () => {
    const result = service.parse(toBuffer({ data: [makeRow()] }));
    expect(result).toHaveLength(1);
  });

  it('throws BadRequestException on invalid JSON', () => {
    expect(() => service.parse(Buffer.from('not json'))).toThrow(BadRequestException);
  });

  it('throws BadRequestException when no transaction array is found', () => {
    expect(() => service.parse(toBuffer({ something: 'else' }))).toThrow(BadRequestException);
  });

  // ─── Status filtering ────────────────────────────────────────────────────

  it('skips rows with a Failed status', () => {
    const result = service.parse(toBuffer([makeRow({ Status: 'Failed' })]));
    expect(result).toHaveLength(0);
  });

  it('skips rows with a Pending status', () => {
    const result = service.parse(toBuffer([makeRow({ Status: 'Pending' })]));
    expect(result).toHaveLength(0);
  });

  it('accepts rows with "Success" status', () => {
    const result = service.parse(toBuffer([makeRow({ Status: 'Success' })]));
    expect(result).toHaveLength(1);
  });

  // ─── Amount parsing ──────────────────────────────────────────────────────

  it('strips the ₹ symbol from amounts', () => {
    const result = service.parse(toBuffer([makeRow({ 'Amount (INR)': '₹1,234' })]));
    expect(result[0].amount).toBe(1234);
  });

  it('strips commas from amounts', () => {
    const result = service.parse(toBuffer([makeRow({ 'Amount (INR)': '10,000.50' })]));
    expect(result[0].amount).toBeCloseTo(10000.5);
  });

  it('always stores amount as positive (even if negative in source)', () => {
    const result = service.parse(toBuffer([makeRow({ 'Amount (INR)': '-500' })]));
    expect(result[0].amount).toBe(500);
  });

  it('uses the "Amount" fallback field', () => {
    const row = { ...makeRow(), 'Amount (INR)': undefined, Amount: '300' };
    const result = service.parse(toBuffer([row]));
    expect(result[0].amount).toBe(300);
  });

  // ─── Type detection ──────────────────────────────────────────────────────

  it('marks debit transactions correctly', () => {
    const result = service.parse(toBuffer([makeRow({ 'Transaction Type': 'Debit' })]));
    expect(result[0].type).toBe(TransactionType.DEBIT);
  });

  it('marks credit transactions correctly', () => {
    const result = service.parse(toBuffer([makeRow({ 'Transaction Type': 'Received' })]));
    expect(result[0].type).toBe(TransactionType.CREDIT);
  });

  it('marks refund as CREDIT', () => {
    const result = service.parse(toBuffer([makeRow({ 'Transaction Type': 'Refund' })]));
    expect(result[0].type).toBe(TransactionType.CREDIT);
  });

  it('defaults unknown type to DEBIT', () => {
    const result = service.parse(toBuffer([makeRow({ 'Transaction Type': 'Unknown' })]));
    expect(result[0].type).toBe(TransactionType.DEBIT);
  });

  // ─── Merchant field variants ─────────────────────────────────────────────

  it('uses "Received From" when "Paid To" is absent', () => {
    const row = { ...makeRow(), 'Paid To': undefined, 'Received From': 'Employer Inc' };
    const result = service.parse(toBuffer([row]));
    expect(result[0].merchant).toBe('Employer Inc');
  });

  it('uses the "merchant" camelCase field', () => {
    const row = { ...makeRow(), 'Paid To': undefined, merchant: 'Zomato' };
    const result = service.parse(toBuffer([row]));
    expect(result[0].merchant).toBe('Zomato');
  });

  // ─── Source ──────────────────────────────────────────────────────────────

  it('sets source to TAKEOUT', () => {
    const result = service.parse(toBuffer([makeRow()]));
    expect(result[0].source).toBe(ImportSource.TAKEOUT);
  });

  // ─── Multiple rows ───────────────────────────────────────────────────────

  it('filters out failed rows but keeps successful ones', () => {
    const rows = [
      makeRow({ 'Paid To': 'Swiggy' }),
      makeRow({ 'Paid To': 'Amazon', Status: 'Failed' }),
      makeRow({ 'Paid To': 'Uber' }),
    ];
    const result = service.parse(toBuffer(rows));
    expect(result).toHaveLength(2);
    expect(result.map(r => r.merchant)).toEqual(['Swiggy', 'Uber']);
  });
});
