import { BadRequestException } from '@nestjs/common';
import { StatementParserService } from './statement-parser.service';
import { TransactionType } from '@prisma/client';

/**
 * These exercise the pure text → rows step (parseText), which is what runs after
 * OCR. The sample mirrors the real IOB/UPI statement the user imported: a dense
 * table with a stacked value-date, an embedded /DR/ or /CR/ rail token, a long
 * UPI ref, a "Transfer" type column, then the debit/credit amount and balance.
 * With PSM 6 each table row stays on one line — exactly this shape.
 */
describe('StatementParserService.parseText', () => {
  const svc = new StatementParserService();

  const STATEMENT = [
    '14-Jun-26 (14-Jun-26) UPI/01348129/9443/CR/NPCI BHIM/HDF/BHIMCASHB S46063125 Transfer 6.00 7,946.80',
    '13-Jun-26 (13-Jun-26) UPI/0164423699443/DR/SUPER SARAVANA/YESUPI S21173212 Transfer 100.00 7,942.60',
    '13-Jun-26 (13-Jun-26) UPI/016345/9685/DR/SUPER SARAVANA/YESUPI S20670301 Transfer 273.00 8,042.60',
    '13-Jun-26 (13-Jun-26) UPI/110056789/DR/M A SURESH S15477636 Transfer 110.00 17,231.80',
    '13-Jun-26 (13-Jun-26) UPI/6107108989/CR/MERUGAN A/IOB UPI S14440238 Transfer 90.00 17,341.80',
    '12-Jun-26 (12-Jun-26) NEFT-UTIB-AXING261570204425 GRijWW INVE-M2209160173 Transfer 4,065.76 19,637.50',
  ].join('\n');

  it('extracts every transaction row', () => {
    const rows = svc.parseText(STATEMENT);
    expect(rows).toHaveLength(6);
  });

  it('reads the transaction amount, not the running balance', () => {
    const rows = svc.parseText(STATEMENT);
    // First row: amount 6.00 with a 7,946.80 balance — must pick 6, never 7946.8.
    expect(rows[0].amount).toBe(6);
    expect(rows[0].balance).toBe(7946.8);
    expect(rows[1].amount).toBe(100);
    expect(rows[2].amount).toBe(273);
    expect(rows[5].amount).toBe(4065.76);
  });

  it('parses dd-MMM-yy dates to ISO', () => {
    const rows = svc.parseText(STATEMENT);
    expect(rows[0].date).toBe('2026-06-14');
    expect(rows[1].date).toBe('2026-06-13');
    expect(rows[5].date).toBe('2026-06-12');
  });

  it('classifies DEBIT/CREDIT from the embedded /DR/ and /CR/ rail token', () => {
    const rows = svc.parseText(STATEMENT);
    expect(rows[0].type).toBe(TransactionType.CREDIT); // /CR/
    expect(rows[1].type).toBe(TransactionType.DEBIT);  // /DR/
    expect(rows[3].type).toBe(TransactionType.DEBIT);  // /DR/
    expect(rows[4].type).toBe(TransactionType.CREDIT); // /CR/
  });

  it('cleans the merchant (no dates, refs, or rail keywords left)', () => {
    const rows = svc.parseText(STATEMENT);
    expect(rows[0].merchant.length).toBeGreaterThan(0);
    expect(rows[0].merchant).not.toMatch(/14-Jun-26/);
    expect(rows[0].merchant).not.toMatch(/S46063125/);
    expect(rows[0].merchant.toLowerCase()).not.toContain('transfer');
  });

  it('tolerates OCR dropping the date hyphens (space-separated date)', () => {
    const rows = svc.parseText(
      '14 Jun 26 UPI/01348129/CR/NPCI BHIM S46063125 Transfer 6.00 7,946.80',
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].date).toBe('2026-06-14');
    expect(rows[0].amount).toBe(6);
  });

  it('throws a clear error when no dated transaction rows exist', () => {
    expect(() => svc.parseText('Account Summary\nThank you for banking with us\nTotal: 1,234.00'))
      .toThrow(BadRequestException);
  });
});
