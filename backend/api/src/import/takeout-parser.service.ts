import { Injectable, BadRequestException } from '@nestjs/common';
import { TransactionType, ImportSource } from '@prisma/client';

// A single parsed transaction ready to be saved to the DB
export interface ParsedTransaction {
  merchant: string;
  amount: number;
  date: Date;
  type: TransactionType;
  description: string | null;
  source: ImportSource;
  upiRef: string | null;
}

// The raw shape of one row from Google Takeout (India/UPI format)
interface RawTakeoutRow {
  'Transaction Date'?: string;
  'Date'?: string;
  'Timestamp'?: string;
  transactionTime?: string;
  'Paid To'?: string;
  'Received From'?: string;
  'Merchant'?: string;
  merchant?: string;
  counterparty?: string;
  'Amount (INR)'?: string;
  'Amount'?: string;
  amount?: string | number;
  'Transaction Type'?: string;
  'Type'?: string;
  type?: string;
  'Status'?: string;
  status?: string;
  'Transaction ID'?: string;
  'UPI transaction ID'?: string;
  'Description'?: string;
  description?: string;
  note?: string;
}

@Injectable()
export class TakeoutParserService {

  // Main entry point — takes raw file buffer, returns parsed transactions
  parse(fileBuffer: Buffer): ParsedTransaction[] {
    const raw = this.readJson(fileBuffer);
    const rows = this.extractRows(raw);

    const results: ParsedTransaction[] = [];

    for (const row of rows) {
      // Skip failed or pending transactions
      const status = row['Status'] ?? row['status'] ?? 'Completed';
      if (!this.isCompletedStatus(status)) continue;

      const parsed = this.parseRow(row);
      if (parsed) results.push(parsed);
    }

    return results;
  }

  // Parse the JSON buffer — handles both UTF-8 and UTF-8 BOM
  private readJson(buffer: Buffer): unknown {
    try {
      let text = buffer.toString('utf-8');
      // Remove BOM if present
      if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
      return JSON.parse(text);
    } catch {
      throw new BadRequestException(
        'Invalid file format. Please upload a valid Google Takeout JSON file.',
      );
    }
  }

  // Google Takeout JSON can have different top-level structures
  // Handle all known variants
  private extractRows(raw: unknown): RawTakeoutRow[] {
    if (Array.isArray(raw)) {
      // Direct array: [{...}, {...}]
      return raw as RawTakeoutRow[];
    }

    if (raw && typeof raw === 'object') {
      const obj = raw as Record<string, unknown>;

      // Wrapped in "Transactions" key: { "Transactions": [{...}] }
      if (Array.isArray(obj['Transactions'])) {
        return obj['Transactions'] as RawTakeoutRow[];
      }

      // Wrapped in "transactions" key (camelCase)
      if (Array.isArray(obj['transactions'])) {
        return obj['transactions'] as RawTakeoutRow[];
      }

      // Google Pay India sometimes uses "Transaction List"
      if (Array.isArray(obj['Transaction List'])) {
        return obj['Transaction List'] as RawTakeoutRow[];
      }

      // Some exports wrap data in a nested "data" key
      if (Array.isArray(obj['data'])) {
        return obj['data'] as RawTakeoutRow[];
      }
    }

    throw new BadRequestException(
      'Could not find transaction data in the uploaded file. ' +
      'Please make sure this is a Google Pay Takeout JSON file.',
    );
  }

  // Parse a single transaction row
  private parseRow(row: RawTakeoutRow): ParsedTransaction | null {
    try {
      const merchant = this.extractMerchant(row);
      const amount = this.extractAmount(row);
      const date = this.extractDate(row);
      const type = this.extractType(row);
      const description = this.extractDescription(row);

      // Skip rows where we couldn't extract the key fields
      if (!merchant || !amount || !date) return null;

      const upiRef = this.extractUpiRef(row);
      return { merchant, amount, date, type, description, source: ImportSource.TAKEOUT, upiRef };
    } catch {
      // Skip malformed rows instead of crashing the whole import
      return null;
    }
  }

  // ─── Field extractors ───────────────────────────────────────────────

  private extractMerchant(row: RawTakeoutRow): string {
    // Try all known merchant field names
    const raw =
      row['Paid To'] ??
      row['Received From'] ??
      row['Merchant'] ??
      row['merchant'] ??
      row['counterparty'] ??
      '';

    return raw.trim();
  }

  private extractAmount(row: RawTakeoutRow): number {
    const raw =
      row['Amount (INR)'] ??
      row['Amount'] ??
      row['amount'] ??
      '';

    if (!raw) return 0;

    // Strip currency symbols, commas, spaces: "₹1,234.56" → 1234.56
    const cleaned = String(raw)
      .replace(/[₹$€£,\s]/g, '')
      .trim();

    const value = parseFloat(cleaned);
    return isNaN(value) ? 0 : Math.abs(value); // always store as positive
  }

  private extractDate(row: RawTakeoutRow): Date {
    const raw =
      row['Transaction Date'] ??
      row['Date'] ??
      row['Timestamp'] ??
      row['transactionTime'] ??
      '';

    if (!raw) return new Date();

    // Handle ISO format: "2025-04-01T14:30:00.000Z"
    if (raw.includes('T') && raw.includes('Z')) {
      return new Date(raw);
    }

    // Handle Indian format: "Apr 01, 2025, 7:30:00 PM IST"
    // Strip timezone abbreviation (IST, UTC, etc.) since JS Date handles it
    const cleaned = raw.replace(/\s+[A-Z]{2,5}$/, '').trim();
    const parsed = new Date(cleaned);

    return isNaN(parsed.getTime()) ? new Date() : parsed;
  }

  private extractType(row: RawTakeoutRow): TransactionType {
    const raw =
      row['Transaction Type'] ??
      row['Type'] ??
      row['type'] ??
      '';

    const lower = String(raw).toLowerCase().trim();

    // Credits (money coming in)
    if (
      lower.includes('received') ||
      lower.includes('credit') ||
      lower.includes('refund') ||
      lower.includes('cashback')
    ) {
      return TransactionType.CREDIT;
    }

    // Everything else is a debit (money going out)
    return TransactionType.DEBIT;
  }

  private extractDescription(row: RawTakeoutRow): string | null {
    const raw =
      row['Description'] ??
      row['description'] ??
      row['note'] ??
      null;

    return raw ? String(raw).trim() : null;
  }

  private extractUpiRef(row: RawTakeoutRow): string | null {
    // Google Takeout stores UPI ref in Transaction ID field
    // Formats: "412345678012", "UPI412345678012", "UPI_PAY_412345678012"
    const raw =
      row['Transaction ID'] ??
      row['UPI transaction ID'] ??
      null;

    if (!raw) return null;

    // Extract the numeric portion (UPI refs are 12-digit numbers)
    const match = String(raw).match(/\d{10,}/);
    return match ? match[0] : String(raw).trim() || null;
  }

  private isCompletedStatus(status: string): boolean {
    const lower = status.toLowerCase();
    return (
      lower.includes('completed') ||
      lower.includes('success') ||
      lower === 'complete'
    );
  }
}
