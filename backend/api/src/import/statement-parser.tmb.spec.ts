import { StatementParserService } from './statement-parser.service';
import { TransactionType } from '@prisma/client';

/**
 * Regression test from a REAL TMB (Tamilnad Mercantile Bank) statement. Differs from
 * IOB in three ways the parser must handle: numeric dates (29-05-2026), no Dr/Cr
 * placeholder columns (just "<amount> <balance>", so direction comes from the running
 * balance), and UPI strings without a DR/CR segment (UPI/<id>/<name>/<bank>/UPI).
 * Ascending chronological order, chained from the Opening Balance. 26 transactions.
 */
const TMB_TEXT = `Statement for A/c 073100050313679 Between 29-05-2026 and 17-06-2026
Never share your Card Number, OTP, CVV, PIN with anyone to avoid financial loss!
Date Particulars Chq. No. Withdrawals Deposits Balance(INR)
Opening Balance 742.88
29-05-2026 UPI/651580764670/SHANMUGARAJ
V/BKID/UPI
70.00 672.88
30-05-2026 UPI/651632906796/ANUPRIYA
P/YESB/UPI
138.00 534.88
31-05-2026 UPI/651733020227/BALASUBRAMANI
K/TMBL/UPI
280.00 254.88
31-05-2026 UPI/651716236842/KANAGHARAAJH
BA/CNRB/UPI
100.00 154.88
31-05-2026 UPI/651719841693/K S
MURUGESWARI/YESB/UPI
15.00 139.88
03-06-2026 UPI/615423639641/NAMEETHA
K/SBIN/UPI
500.00 639.88
05-06-2026 UPI/615690816152/MANI BALAJI
S/SBIN/UPI
275.00 364.88
05-06-2026 UPI/615688605802/akarunpro@okaxi/B
ARB/UPI
50.00 314.88
05-06-2026 UPI/615682330755/UBER INDIA
SYST/AIRP/UberRide
22.50 292.38
05-06-2026 UPI/615685438585/Muthu
Pavvithra/SBIN/UPI
500.00 792.38
06-06-2026 UPI/615731051841/SURESHKUMAR
MAN/YESB/UPI
20.00 772.38
07-06-2026 UPI/652499930231/Mr
Veeraputhira/IDIB/UPI
600.00 1,372.38
Page 1 of 2
Date Particulars Chq. No. Withdrawals Deposits Balance(INR)
07-06-2026 UPI/652452575447/Mr MELSON
I/UTIB/UPI
20.00 1,352.38
08-06-2026 UPI/615965248442/KSR Co/YESB/UPI 100.00 1,252.38
11-06-2026 UPI/652842660220/Mr
Veeraputhira/IDIB/UPI
80.00 1,332.38
13-06-2026 UPI/653054821725/Mr
Veeraputhira/IDIB/UPI
3,000.00 4,332.38
13-06-2026 UPI/653021982356/Mr
Veeraputhira/IDIB/UPI
500.00 4,832.38
15-06-2026 UPI/616642408424/AIRTEL
PAYMENTS/INDB/AirtelBroadb
27.97 4,804.41
16-06-2026 UPI/616745143870/Krishna
Motors/UTIB/UPI
1,000.00 3,804.41
16-06-2026 UPI/616707148893/SHANKARGANESH
V/YESB/UPI
56.00 3,748.41
16-06-2026 UPI/616722446767/KSR Co/YESB/UPI 100.00 3,648.41
16-06-2026 UPI/616741760737/Mr
Veeraputhira/IDIB/UPI
25,000.00 28,648.41
17-06-2026 ATM/CASH/004770/616810004770 10,000.00 18,648.41
17-06-2026 ATM/CASH/004820/616810004820 10,000.00 8,648.41
17-06-2026 ATM/CASH/011442/616810011442 5,000.00 3,648.41
17-06-2026 UPI/653440325610/NAZEER
M/BARB/UPI
100.00 3,548.41
Closing Balance 3,548.41
*This is an auto generated e-statement and does not require any signature.`;

describe('StatementParserService — real TMB statement (numeric dates, balance-delta)', () => {
  const svc = new StatementParserService();
  const rows = svc.parseText(TMB_TEXT);
  const byAmount = (a: number) => rows.find((r) => r.amount === a);

  it('extracts all 26 transactions', () => {
    expect(rows.length).toBe(26);
  });

  it('parses numeric dd-mm-yyyy dates to ISO', () => {
    expect(rows[0].date).toBe('2026-05-29');
    expect(rows[rows.length - 1].date).toBe('2026-06-17');
  });

  it('derives debit vs credit from the running balance (no Dr/Cr column)', () => {
    const credits = rows.filter((r) => r.type === TransactionType.CREDIT);
    expect(credits.length).toBe(7); // the 7 deposits
    expect(byAmount(70)?.type).toBe(TransactionType.DEBIT);   // first row, balance fell
    expect(byAmount(600)?.type).toBe(TransactionType.CREDIT); // deposit, balance rose
    expect(byAmount(25000)?.type).toBe(TransactionType.CREDIT);
    expect(byAmount(3000)?.type).toBe(TransactionType.CREDIT);
    expect(byAmount(27.97)?.type).toBe(TransactionType.DEBIT);
  });

  it('extracts clean payee names from TMB UPI strings (no DR/CR segment)', () => {
    expect(byAmount(70)?.merchant).toBe('SHANMUGARAJ V');
    expect(byAmount(138)?.merchant).toBe('ANUPRIYA P');
    expect(byAmount(15)?.merchant).toBe('K S MURUGESWARI');
    expect(byAmount(22.5)?.merchant).toBe('UBER INDIA SYST');
    expect(byAmount(27.97)?.merchant).toBe('AIRTEL PAYMENTS');
    expect(byAmount(56)?.merchant).toBe('SHANKARGANESH V');
    expect(byAmount(600)?.merchant).toBe('Mr Veeraputhira');
    // never leak the UPI prefix / long ids into the name
    expect(rows.every((r) => !/UPI\/|\d{6,}/.test(r.merchant))).toBe(true);
  });

  it('handles single-line rows (date + particulars + amounts together)', () => {
    // The two "KSR Co" rows are single-line ("…/KSR Co/YESB/UPI 100.00 1,252.38").
    const ksr = rows.filter((r) => r.merchant === 'KSR Co');
    expect(ksr.length).toBe(2);
    expect(ksr.every((r) => r.amount === 100 && r.type === TransactionType.DEBIT)).toBe(true);
  });

  it('reads ATM withdrawals and ignores Opening/Closing balance lines', () => {
    expect(byAmount(5000)?.type).toBe(TransactionType.DEBIT);
    expect(byAmount(5000)?.merchant).toMatch(/ATM/i);
    expect(byAmount(742.88)).toBeUndefined(); // opening balance, not a txn
    expect(byAmount(3548.41)).toBeUndefined(); // closing balance, not a txn
  });
});
