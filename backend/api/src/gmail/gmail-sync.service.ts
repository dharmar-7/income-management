import { Injectable, Logger } from '@nestjs/common';
import { google } from 'googleapis';
import { GmailOAuthService } from './gmail-oauth.service';
import { PrismaService } from '../prisma/prisma.service';
import { CategorizerService } from '../import/categorizer.service';
import { TransactionType, ImportSource } from '@prisma/client';

interface ParsedEmailTransaction {
  merchant: string;
  amount: number;
  date: Date;
  type: TransactionType;
  description: string | null;
  upiRef: string | null;
}

@Injectable()
export class GmailSyncService {
  private readonly logger = new Logger(GmailSyncService.name);

  constructor(
    private oauthService: GmailOAuthService,
    private prisma: PrismaService,
    private categorizer: CategorizerService,
  ) {}

  // Sync Gmail for one user — returns number of new transactions saved
  async syncUser(clerkUserId: string): Promise<number> {
    const authClient = await this.oauthService.getAuthenticatedClient(clerkUserId);
    const gmail = google.gmail({ version: 'v1', auth: authClient });

    const user = await this.prisma.user.findUnique({
      where: { clerkId: clerkUserId },
      select: { id: true, gmailSyncedAt: true },
    });

    if (!user) return 0;

    // Only fetch emails newer than the last sync (or last 90 days on first sync)
    const afterDate = user.gmailSyncedAt
      ? user.gmailSyncedAt
      : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    const afterUnix = Math.floor(afterDate.getTime() / 1000);

    // Search for Google Pay receipt emails
    const searchQuery = `from:gpay-noreply@google.com after:${afterUnix}`;

    const listRes = await gmail.users.messages.list({
      userId: 'me',
      q: searchQuery,
      maxResults: 200,
    });

    const messages = listRes.data.messages ?? [];
    if (messages.length === 0) {
      await this.updateSyncedAt(clerkUserId);
      return 0;
    }

    let saved = 0;

    for (const msg of messages) {
      if (!msg.id) continue;

      try {
        const detail = await gmail.users.messages.get({
          userId: 'me',
          id: msg.id,
          format: 'full',
        });

        const transaction = this.parseEmail(detail.data);
        if (!transaction) continue;

        const categoryId = this.categorizer.getCategoryId(transaction.merchant) || undefined;

        await this.prisma.transaction.upsert({
          where: {
            userId_merchant_amount_date: {
              userId: user.id,
              merchant: transaction.merchant,
              amount: transaction.amount,
              date: transaction.date,
            },
          },
          update: {},
          create: {
            userId: user.id,
            merchant: transaction.merchant,
            amount: transaction.amount,
            date: transaction.date,
            type: transaction.type,
            description: transaction.description,
            source: ImportSource.GMAIL,
            upiRef: transaction.upiRef ?? undefined,
            categoryId,
          },
        });

        saved++;
      } catch (err) {
        this.logger.warn(`Failed to process email ${msg.id}: ${err}`);
      }
    }

    await this.updateSyncedAt(clerkUserId);
    return saved;
  }

  // Parse a Gmail message and extract transaction details
  private parseEmail(message: any): ParsedEmailTransaction | null {
    try {
      // Get the plain text or HTML body of the email
      const body = this.extractBody(message);
      if (!body) return null;

      // Extract amount — looks for patterns like "₹349", "Rs. 349", "INR 349"
      const amountMatch = body.match(/(?:₹|Rs\.?|INR)\s*([\d,]+(?:\.\d{2})?)/i);
      if (!amountMatch) return null;
      const amount = parseFloat(amountMatch[1].replace(/,/g, ''));

      // Extract merchant — "paid to X", "you paid X", "sent to X"
      const merchantMatch = body.match(
        /(?:paid to|you paid|sent to|payment to)\s+([^\n\r<,]+)/i,
      );
      const merchant = merchantMatch
        ? merchantMatch[1].trim().replace(/\s+/g, ' ')
        : 'Unknown';

      // Extract date from email headers
      const headers: any[] = message.payload?.headers ?? [];
      const dateHeader = headers.find((h: any) => h.name === 'Date')?.value;
      const date = dateHeader ? new Date(dateHeader) : new Date();

      // Determine type — refunds/cashbacks are CREDIT, everything else DEBIT
      const lowerBody = body.toLowerCase();
      const type =
        lowerBody.includes('refund') || lowerBody.includes('received')
          ? TransactionType.CREDIT
          : TransactionType.DEBIT;

      // Extract UPI reference number — "UPI Ref: 412345678012" or "UPI/412345678012"
      const upiRefMatch = body.match(/(?:UPI\s*[Rr]ef(?:erence)?(?:\s*[Nn]o)?\.?:?\s*|UPI\/)(\d{10,})/);
      const upiRef = upiRefMatch ? upiRefMatch[1] : null;

      return { merchant, amount, date, type, description: null, upiRef };
    } catch {
      return null;
    }
  }

  // Extract readable text from a Gmail message payload
  private extractBody(message: any): string | null {
    const payload = message.payload;
    if (!payload) return null;

    // Try plain text first, then HTML
    const tryDecode = (part: any): string | null => {
      if (part?.body?.data) {
        return Buffer.from(part.body.data, 'base64').toString('utf-8');
      }
      return null;
    };

    // Single-part message
    if (payload.body?.data) {
      return tryDecode(payload);
    }

    // Multi-part message — find text/plain or text/html part
    const parts: any[] = payload.parts ?? [];
    for (const part of parts) {
      if (part.mimeType === 'text/plain') {
        const text = tryDecode(part);
        if (text) return text;
      }
    }
    for (const part of parts) {
      if (part.mimeType === 'text/html') {
        const html = tryDecode(part);
        if (html) {
          // Strip HTML tags to get plain text
          return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
        }
      }
    }

    return null;
  }

  private async updateSyncedAt(clerkUserId: string) {
    await this.prisma.user.update({
      where: { clerkId: clerkUserId },
      data: { gmailSyncedAt: new Date() },
    });
  }
}
