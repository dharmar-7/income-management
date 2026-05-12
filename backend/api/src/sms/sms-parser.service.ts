import { Injectable } from '@nestjs/common';
import { TransactionType, ImportSource } from '@prisma/client';

export interface ParsedSmsTransaction {
  merchant: string;
  amount: number;
  type: TransactionType;
  date: Date;
  source: ImportSource;
  upiRef: string | null;
  balance: number | null;   // null for IOB/TMB that don't include it
  isAtm: boolean;
  rawSms: string;
}

export interface RawSms {
  body: string;
  date: number;   // epoch ms from Android
  address: string; // sender ID e.g. "IOB-BANK"
}

@Injectable()
export class SmsParserService {

  parse(messages: RawSms[]): ParsedSmsTransaction[] {
    const results: ParsedSmsTransaction[] = [];

    for (const sms of messages) {
      const parsed = this.parseSingle(sms);
      if (parsed) results.push(parsed);
    }

    return results;
  }

  private parseSingle(sms: RawSms): ParsedSmsTransaction | null {
    const body = sms.body;
    const lower = body.toLowerCase();

    // Only process bank transaction SMS — must contain debit, credit, or refund keyword
    if (!lower.includes('debit') && !lower.includes('credit') &&
        !lower.includes('debited') && !lower.includes('credited') &&
        !lower.includes('withdrawn') && !lower.includes('withdrawal') &&
        !lower.includes('refund') && !lower.includes('reversed') &&
        !lower.includes('reversal') && !lower.includes('tdr') &&
        !lower.includes('cashback')) {
      return null;
    }

    const amount = this.extractAmount(body);
    if (!amount || amount <= 0) return null;

    const isRefund = this.detectRefund(lower);
    const type = isRefund ? TransactionType.REFUND : this.extractType(lower);
    const date = new Date(sms.date);
    const upiRef = this.extractUpiRef(body);
    const balance = this.extractBalance(body);
    const isAtm = this.detectAtm(lower);
    const merchant = this.extractMerchant(body, lower, isAtm, upiRef);

    return {
      merchant,
      amount,
      type,
      date,
      source: ImportSource.SMS,
      upiRef,
      balance,
      isAtm,
      rawSms: body,
    };
  }

  // ─── Field extractors ──────────────────────────────────────────

  private extractAmount(body: string): number | null {
    // Patterns: "Rs.1,000.00", "Rs 1000", "INR 1,000", "₹1000", "by Rs.500/-"
    const patterns = [
      /(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{1,2})?)/i,
      /(?:debited|credited|withdrawn)\s+(?:by\s+)?(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{1,2})?)/i,
      /([\d,]+(?:\.\d{1,2})?)\s*(?:Rs\.?|INR|₹)/i,
    ];

    for (const pattern of patterns) {
      const match = body.match(pattern);
      if (match) {
        const value = parseFloat(match[1].replace(/,/g, ''));
        if (!isNaN(value) && value > 0) return value;
      }
    }
    return null;
  }

  private extractType(lower: string): TransactionType {
    if (
      lower.includes('credited') ||
      lower.includes('credit') ||
      lower.includes('received') ||
      lower.includes('deposited')
    ) {
      return TransactionType.CREDIT;
    }
    return TransactionType.DEBIT;
  }

  private extractUpiRef(body: string): string | null {
    // "UPI Ref: 412345678012", "UPI Ref No: 412345678012", "UPI/412345678012"
    const match = body.match(
      /(?:UPI\s*[Rr]ef(?:erence)?(?:\s*[Nn]o)?\.?:?\s*|UPI\/)(\d{10,})/
    );
    return match ? match[1] : null;
  }

  private extractBalance(body: string): number | null {
    // "Avl Bal: Rs.40,000", "Available Balance: Rs 40000", "Bal:40000"
    const match = body.match(
      /(?:Avl\.?\s*Bal(?:ance)?|Available\s*Bal(?:ance)?|Bal)\s*:?\s*(?:Rs\.?|INR|₹)?\s*([\d,]+(?:\.\d{1,2})?)/i
    );
    if (!match) return null;

    // IOB sometimes returns "NA" — ignore
    if (match[1].toLowerCase() === 'na') return null;

    const value = parseFloat(match[1].replace(/,/g, ''));
    return isNaN(value) ? null : value;
  }

  private detectRefund(lower: string): boolean {
    return (
      lower.includes('refund') ||
      lower.includes('reversed') ||
      lower.includes('reversal') ||
      lower.includes('tdr') ||          // IRCTC ticket deposit refund
      lower.includes('cancellation refund') ||
      lower.includes('cashback')
    );
  }

  private detectAtm(lower: string): boolean {
    return (
      lower.includes('atm') ||
      lower.includes('cash withdrawal') ||
      lower.includes('cash withd') ||
      lower.includes('atm withdrawal')
    );
  }

  private extractMerchant(
    body: string,
    lower: string,
    isAtm: boolean,
    upiRef: string | null,
  ): string {
    if (isAtm) return 'ATM Withdrawal';

    // Try to extract VPA (virtual payment address): "to merchant@bank"
    const vpaMatch = body.match(/(?:to|at)\s+([\w.\-]+@[\w.\-]+)/i);
    if (vpaMatch) {
      // Convert "swiggy@icici" → "Swiggy"
      const vpa = vpaMatch[1].split('@')[0];
      return vpa.charAt(0).toUpperCase() + vpa.slice(1);
    }

    // ICICI format: "amount UPI ref 123 - MERCHANT NAME"
    const dashMerchant = body.match(/UPI\s+ref\s+\d+\s+-\s+([^\n.]+)/i);
    if (dashMerchant) return dashMerchant[1].trim();

    // "transfer to NAME" or "payment to NAME"
    const toMatch = body.match(/(?:transfer|payment|paid)\s+to\s+([A-Z][A-Za-z\s]+?)(?:\s+via|\s+on|\s+ref|\.|\n|$)/i);
    if (toMatch) return toMatch[1].trim();

    // Fallback labels based on type
    if (lower.includes('neft')) return 'NEFT Transfer';
    if (lower.includes('rtgs')) return 'RTGS Transfer';
    if (lower.includes('imps')) return 'IMPS Transfer';
    if (upiRef) return 'UPI Payment';
    return 'Bank Transaction';
  }
}
