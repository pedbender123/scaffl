import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';

function getMasterKey(): Buffer {
  const mk = process.env.SCAFFL_MASTER_KEY;
  if (!mk) {
    throw new Error(
      '[secrets] SCAFFL_MASTER_KEY is not set. ' +
      'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"'
    );
  }
  const buf = Buffer.from(mk, 'base64');
  if (buf.length !== 32) {
    throw new Error(
      '[secrets] SCAFFL_MASTER_KEY must be exactly 32 bytes when base64-decoded (44-character base64 string).'
    );
  }
  return buf;
}

export interface EncryptedSecret {
  encrypted: string; // base64
  iv: string;        // base64 (12-byte GCM nonce)
  authTag: string;   // base64 (16-byte GCM auth tag)
}

/** Encrypts a plaintext string using AES-256-GCM with SCAFFL_MASTER_KEY. */
export function encryptSecret(plaintext: string): EncryptedSecret {
  const key = getMasterKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return {
    encrypted: encrypted.toString('base64'),
    iv:        iv.toString('base64'),
    authTag:   cipher.getAuthTag().toString('base64'),
  };
}

/** Decrypts an EncryptedSecret using AES-256-GCM with SCAFFL_MASTER_KEY. */
export function decryptSecret(secret: EncryptedSecret): string {
  const key = getMasterKey();
  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(secret.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(secret.authTag, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(secret.encrypted, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}
