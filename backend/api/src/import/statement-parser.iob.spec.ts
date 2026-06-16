import { StatementParserService } from './statement-parser.service';
import { TransactionType } from '@prisma/client';

/**
 * Regression test built from a REAL IOB statement (the exact text pdf-parse emits):
 * each transaction is spread over a date line, a "(value date)" line, one or two
 * particulars lines, and a final "…Ref Transfer <debit> <credit> <balance>" line,
 * where exactly one of debit/credit is a number and the other is "-". 33 transactions.
 */
const IOB_TEXT = `Page 1 of 2
Report Generation Date & Time : 15-06-2026 10:45:36
STATEMENT OF THE ACCOUNT FOR THE PERIOD OF : 2026-05-29 to 2026-06-15
Account No : 00909090889805
IFS Code : IOBkk9001749
Date(Value
Date) Particulars Ref No.
/Cheque No
Transaction
Type Debit(Rs) Credit(Rs) Balance(Rs)
14-Jun-26
(14-Jun-26)
UPI/103481250943/CR/ NPCI BHIM
/HDF/BHIMCASHB S46063125 Transfer - 6.00 7,948.80
13-Jun-26
(13-Jun-26)
UPI/616418687383/DR/SUPER
SARAVANA/YES/UPI S21173212 Transfer 100.00 - 7,942.80
13-Jun-26
(13-Jun-26)
UPI/616433093834/DR/SUPER
SARAVANA/HDF/UPI S20690260 Transfer 273.00 - 8,042.80
13-Jun-26
(13-Jun-26)
UPI/616452296757/DR/SUPER
SARAVANA/HDF/UPI S20170301 Transfer 2,683.00 - 8,315.80
13-Jun-26
(13-Jun-26)
UPI/616445167791/DR/ Mrs NATHIYA
K/IDI/UPI S19711973 Transfer 890.00 - 10,998.80
13-Jun-26
(13-Jun-26)
UPI/616420368912/DR/GOWRI
SANKAR S/CNR/UPI S17817787 Transfer 50.00 - 11,888.80
13-Jun-26
(13-Jun-26)
UPI/616427770086/DR/ DINESH C/YES
/UPI S17675727 Transfer 65.00 - 11,938.80
13-Jun-26
(13-Jun-26)
UPI/616414274097/DR/ LENSKART/UTI
/Payment f S17196235 Transfer 5,179.00 - 12,003.80
13-Jun-26
(13-Jun-26)
UPI/616401580681/DR/ LENSKART/UTI
/Payment f S16907640 Transfer 49.00 - 17,182.80
13-Jun-26
(13-Jun-26)
UPI/616428574242/DR/ Mr A SURESH
/IDI/UPI S15477636 Transfer 110.00 - 17,231.80
13-Jun-26
(13-Jun-26)
UPI/616447450594/DR/ MURUGAN A
/IOB/UPI S14402838 Transfer 90.00 - 17,341.80
13-Jun-26
(13-Jun-26) UPI/616410650051/DR/ JTC/YES/UPI S13959152 Transfer 50.00 - 17,431.80
13-Jun-26
(13-Jun-26)
UPI/073509431357/DR/Indian Railway
/SBI/NO REMARK S10707759 Transfer 106.70 - 17,481.80
12-Jun-26
(12-Jun-26)
UPI/103469948613/CR/ NPCI BHIM
/HDF/BHIMCASHB S76642005 Transfer - 10.00 17,588.50
12-Jun-26
(12-Jun-26)
UPI/100638282886/DR/Flipkart Payme
/YES/NO REMARK S76641374 Transfer 1,387.00 - 17,578.50
11-Jun-26
(11-Jun-26)
UPI/652889412805/DR/Sri Vinayaga M
/YES/UPI S51132986 Transfer 78.00 - 18,965.50
11-Jun-26
(11-Jun-26)
UPI/616298093320/DR/ RIYAS N/UTI
/UPI S50541641 Transfer 200.00 - 19,043.50
10-Jun-26
(10-Jun-26)
UPI/616109867719/DR/ SHAJAHAN S
/YES/UPI S38218037 Transfer 40.00 - 19,243.50
08-Jun-26
(08-Jun-26)
UPI/615939670735/DR/K A S TEXTILES
/UTI/UPI S59589638 Transfer 35.00 - 19,283.50
08-Jun-26
(08-Jun-26)
UPI/615927983541/DR/
PARAMASIVAN M/UTI/UPI S59464053 Transfer 69.00 - 19,318.50
08-Jun-26
(08-Jun-26)
UPI/615910949386/DR/M S SAFA
TRADE/ICI/UPI S59004832 Transfer 250.00 - 19,387.50
06-Jun-26
(06-Jun-26)
NEFT-UTIB-AXNH261570204425-
GR0WW INVE-M220916073 S17833710 Transfer - 4,065.76 19,637.50
Page 2 of 2
04-Jun-26
(04-Jun-26)
UPI/615549111591/DR/ GOIBIBO/UTI
/UPI S56066606 Transfer 658.25 - 15,571.74
02-Jun-26
(02-Jun-26)
UPI/615340462053/DR/nameetha08@oki
/SBI/UPI S94447575 Transfer 500.00 - 16,229.99
02-Jun-26
(02-Jun-26)
UPI/651916731054/DR/MUTUAL
FUNDS I/HDF/Paid Via S91441847 Transfer 500.00 - 16,729.99
02-Jun-26
(02-Jun-26)
UPI/615307841428/DR/Mr Veeraputhir
/IDI/UPI S79856735 Transfer 30,000.00 - 17,229.99
01-Jun-26
(01-Jun-26)
UPI/651809841394/DR/UBER INDIA
SYS/HDF/UberRide S44267498 Transfer 14.00 - 47,229.99
01-Jun-26
(01-Jun-26)
UPI/104041429754/DR/Indian Railway
/SBI/NO REMARK S43482595 Transfer 4.85 - 47,243.99
31-May-26
(31-May-26)
UPI/651896317315/DR/PRAVEEN
KARTHI/IOB/UPI S38764733 Transfer 83.00 - 47,248.84
31-May-26
(31-May-26)
UPI/651777124869/DR/Euronet Servic
/UTI/UPI S38279285 Transfer 22.00 - 47,331.84
31-May-26
(31-May-26)
UPI/651749316520/DR/sbipmopad.02pl
/SBI/UPI S38264603 Transfer 55.00 - 47,353.84
31-May-26
(31-May-26)
UPI/615124787962/DR/S Sahul Hameed
/SBI/UPI S24710479 Transfer 2,500.00 - 47,408.84
29-May-26
(29-May-26)
NEFT-ICIC-IN42614957630484-
BRIMMA TEC-MAY2026SAL S59898384 Transfer - 45,817.00 49,908.84
46,041.80 49,898.76
Effective available balance as on 15-06-2026 10:45:36 is INR 7,948.80
**This is a computer generated statement and does not require a signature.`;

describe('StatementParserService — real IOB statement (multi-line rows)', () => {
  const svc = new StatementParserService();
  const rows = svc.parseText(IOB_TEXT);
  const byAmount = (a: number) => rows.find((r) => r.amount === a);

  it('extracts all 33 transactions (not just the 2 that collapsed onto one line)', () => {
    expect(rows.length).toBe(33);
  });

  it('ignores the header rows and the totals line', () => {
    expect(byAmount(46041.8)).toBeUndefined(); // totals row
    expect(rows.every((r) => /[A-Za-z]/.test(r.merchant))).toBe(true);
  });

  it('classifies debit vs credit from the column that holds the number', () => {
    const credits = rows.filter((r) => r.type === TransactionType.CREDIT);
    expect(credits.length).toBe(4); // two NPCI BHIM, Groww, salary
    expect(byAmount(6)?.type).toBe(TransactionType.CREDIT);
    expect(byAmount(45817)?.type).toBe(TransactionType.CREDIT);
    expect(byAmount(2683)?.type).toBe(TransactionType.DEBIT);
    expect(byAmount(30000)?.type).toBe(TransactionType.DEBIT);
  });

  it('reads the transaction amount, never the running balance', () => {
    expect(rows[0]).toMatchObject({ amount: 6, balance: 7948.8, date: '2026-06-14' });
    expect(byAmount(5179)?.type).toBe(TransactionType.DEBIT);
    expect(byAmount(106.7)).toBeDefined();
  });

  it('extracts clean payee names across UPI and NEFT, even when split over two lines', () => {
    expect(rows[0].merchant).toBe('NPCI BHIM');
    expect(byAmount(2683)?.merchant).toBe('SUPER SARAVANA');
    expect(byAmount(890)?.merchant).toBe('Mrs NATHIYA K');
    expect(byAmount(69)?.merchant).toBe('PARAMASIVAN M');
    expect(byAmount(30000)?.merchant).toBe('Mr Veeraputhir');
    expect(byAmount(4065.76)?.merchant).toBe('GR0WW INVE');
    expect(byAmount(45817)?.merchant).toBe('BRIMMA TEC');
    // never leak the ref number or type word into the name
    expect(rows.every((r) => !/S\d{6,}|Transfer/i.test(r.merchant))).toBe(true);
  });

  it('captures the bank Ref No for dedup', () => {
    expect(rows[0].upiRef).toBe('S46063125');
  });
});
