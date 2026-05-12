import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16; // AES block size

@Injectable()
export class EncryptionService {
  private readonly key: Buffer;

  constructor() {
    const hexKey = process.env.ENCRYPTION_KEY;
    if (!hexKey) throw new Error('ENCRYPTION_KEY is not set in environment');

    // Convert the hex string from .env into a 32-byte buffer
    this.key = Buffer.from(hexKey, 'hex');

    if (this.key.length !== 32) {
      throw new Error('ENCRYPTION_KEY must be exactly 32 bytes (64 hex characters)');
    }
  }

  // Encrypt a plain text string → returns "iv:encryptedData" (both hex encoded)
  encrypt(text: string): string {
    // A new random IV for every encryption — makes identical inputs produce different outputs
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, this.key, iv);

    const encrypted = Buffer.concat([
      cipher.update(text, 'utf8'),
      cipher.final(),
    ]);

    // Store iv + encrypted data together so we can decrypt later
    return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
  }

  // Decrypt an "iv:encryptedData" string → returns original plain text
  decrypt(encryptedText: string): string {
    const [ivHex, dataHex] = encryptedText.split(':');
    if (!ivHex || !dataHex) throw new Error('Invalid encrypted text format');

    const iv = Buffer.from(ivHex, 'hex');
    const data = Buffer.from(dataHex, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, this.key, iv);
    const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);

    return decrypted.toString('utf8');
  }
}
