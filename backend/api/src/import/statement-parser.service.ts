import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { TransactionType } from '@prisma/client';

// pdf-parse is CommonJS with no usable ESM default; require it directly.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfParse = require('pdf-parse') as (b: Buffer) => Promise<{ text: string }>;

export interface ParsedStatementTxn {
  date: string; // YYYY-MM-DD
  merchant: string;
  amount: number;
  type: TransactionType; // the parser only ever emits DEBIT or CREDIT
  description?: string;
  upiRef?: string;
  balance?: number;
}

/**
 * Free, offline bank-statement reader.
 *  - Text PDFs  → extracted with pdf-parse.
 *  - Images/photos/screenshots → OCR'd with Tesseract (open-source, on-server).
 * The extracted text is then parsed into transaction rows with heuristics tuned
 * for Indian bank statements. Extraction is best-effort — the mobile app shows a
 * review screen so the user fixes/deselects rows before anything is saved.
 */
@Injectable()
export class StatementParserService {
  private readonly logger = new Logger(StatementParserService.name);

  private readonly MONTHS: Record<string, number> = {
    jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
    jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
  };

  // Finds the first date-like token in a line (dd-MMM-yy, dd/mm/yyyy, yyyy-mm-dd…).
  private readonly DATE_FIND =
    /\b(\d{1,2}[-/][A-Za-z]{3,4}[-/]\d{2,4}|\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4})\b/;
  // Money: requires commas (1,234) or 2 decimals (1234.56) so it never matches dates/refs.
  private readonly AMOUNT_FIND = /\d{1,3}(?:,\d{2,3})+(?:\.\d{1,2})?|\d+\.\d{2}/g;

  async parse(buffer: Buffer, mimetype: string): Promise<ParsedStatementTxn[]> {
    const text = await this.extractText(buffer, mimetype);
    if (!text || text.replace(/\s/g, '').length < 20) {
      throw new BadRequestException(
        'Could not read any text from the file. If this is a scanned PDF, upload a clear photo/screenshot of the statement instead.',
      );
    }
    const rows = this.parseRows(text);
    if (rows.length === 0) {
      throw new BadRequestException(
        "Couldn't find any transactions in the file. Make sure it's a bank statement with a dated transaction table.",
      );
    }
    return rows;
  }

  // ── text extraction ──────────────────────────────────────────────────────────
  private async extractText(buffer: Buffer, mimetype: string): Promise<string> {
    if (mimetype === 'application/pdf') {
      const data = await pdfParse(buffer);
      return data.text ?? '';
    }
    if (mimetype.startsWith('image/')) {
      return this.ocr(buffer);
    }
    throw new BadRequestException('Unsupported file type. Upload a PDF or an image (PNG/JPG).');
  }

  private async ocr(buffer: Buffer): Promise<string> {
    // Lazy-load Tesseract so it only spins up when an image is actually uploaded.
    const { createWorker } = await import('tesseract.js');
    const worker = await createWorker('eng');
    try {
      const { data } = await worker.recognize(buffer);
      return data.text ?? '';
    } catch (err) {
      this.logger.error('OCR failed', err as Error);
      throw new BadRequestException('Could not read the image. Try a clearer, straight-on photo.');
    } finally {
      await worker.terminate();
    }
  }

  // ── date helpers ───────────────────────────────────────────────────────────────
  private iso(y: number, mo: number, d: number): string | null {
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
    return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  private parseDate(token: string): string | null {
    const t = token.trim();
    let m = /^(\d{1,2})[-/]([A-Za-z]{3,4})[-/](\d{2,4})$/.exec(t); // 13-Jun-26
    if (m) {
      const mo = this.MONTHS[m[2].toLowerCase()];
      let y = +m[3];
      if (mo) { if (y < 100) y += 2000; return this.iso(y, mo, +m[1]); }
    }
    m = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/.exec(t); // 2026-06-13
    if (m) return this.iso(+m[1], +m[2], +m[3]);
    m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/.exec(t); // 13/06/2026
    if (m) { let y = +m[3]; if (y < 100) y += 2000; return this.iso(y, +m[2], +m[1]); }
    return null;
  }

  // ── row parsing ──────────────────────────────────────────────────────────────
  private parseRows(text: string): ParsedStatementTxn[] {
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.replace(/\s+/g, ' ').trim())
      .filter(Boolean);

    const txns: ParsedStatementTxn[] = [];
    let prevBalance: number | null = null;

    for (const line of lines) {
      const lower = line.toLowerCase();
      // Skip headers / summaries / footers that aren't transaction rows.
      if (/(opening balance|closing balance|statement|account (no|number)|ifsc|branch|page \d+ of|^date\b)/.test(lower)) {
        continue;
      }

      const dateMatch = this.DATE_FIND.exec(line);
      if (!dateMatch) continue;
      const date = this.parseDate(dateMatch[1]);
      if (!date) continue;

      const afterDate = line.slice(dateMatch.index + dateMatch[0].length);
      const amountStrs = afterDate.match(this.AMOUNT_FIND) ?? [];
      if (amountStrs.length === 0) continue;
      const amounts = amountStrs.map((a) => parseFloat(a.replace(/,/g, '')));

      // Reference number (UPI/cheque) — a long digit/alnum run, used for dedup.
      // Captured from the raw line BEFORE we scrub numbers out of the merchant.
      const refMatch = /\b([A-Z]{2,6}\d{6,}|\d{8,})\b/.exec(afterDate);
      const upiRef = refMatch ? refMatch[1].slice(0, 60) : undefined;

      // Merchant = text between the date and the first amount, cleaned up:
      // drop a stacked value-date, rail keywords, long ref/account numbers, and separators.
      const firstAmtIdx = afterDate.search(this.AMOUNT_FIND);
      let merchant = (firstAmtIdx > 0 ? afterDate.slice(0, firstAmtIdx) : afterDate)
        .replace(this.DATE_FIND, ' ')
        .replace(/\b(transfer|upi|neft|imps|rtgs|dr|cr|ref|no)\b/gi, ' ')
        .replace(/\b[a-z]?\d{6,}\b/gi, ' ') // strip ref / account / UPI numbers
        .replace(/[*|:/\\]+/g, ' ')
        .replace(/\s+/g, ' ')
        .replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, '') // trim stray separators
        .trim();
      if (!merchant) merchant = 'Bank transaction';
      merchant = merchant.slice(0, 200);

      // Amount + DEBIT/CREDIT classification.
      const drcr = /\b(DR|CR)\b/i.exec(line);
      let amount: number;
      let balance: number | undefined;
      let type: TransactionType = TransactionType.DEBIT;

      if (amounts.length >= 2) {
        balance = amounts[amounts.length - 1];
        amount = amounts[amounts.length - 2];
        if (drcr) {
          type = drcr[1].toUpperCase() === 'CR' ? TransactionType.CREDIT : TransactionType.DEBIT;
        } else if (prevBalance != null) {
          // Balance went down → money out (debit); up → money in (credit).
          type = balance < prevBalance ? TransactionType.DEBIT : TransactionType.CREDIT;
        }
        prevBalance = balance;
      } else {
        amount = amounts[0];
        if (drcr) {
          type = drcr[1].toUpperCase() === 'CR' ? TransactionType.CREDIT : TransactionType.DEBIT;
        }
      }

      if (!isFinite(amount) || amount <= 0) continue;
      txns.push({ date, merchant, amount, type, upiRef, balance });
    }

    return txns;
  }
}
