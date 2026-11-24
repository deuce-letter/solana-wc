import {
  address,
  createKeyPairSignerFromBytes,
  createKeyPairSignerFromPrivateKeyBytes,
  createSignableMessage,
  getBase58Decoder,
  getBase58Encoder,
  verifySignature,
  type Address,
  type KeyPairSigner,
} from '@solana/kit';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { z } from 'zod';
import { logger } from './logger.js';

const optionalEnvString = z
  .string()
  .trim()
  .optional()
  .transform((val) => (val === '' ? undefined : val));

const envSchema = z.object({
  SOLANA_PRIVATE_KEY: optionalEnvString,
  SOLANA_PUBLIC_KEY: optionalEnvString,
});

const env = envSchema.parse(process.env);

let walletPromise: Promise<KeyPairSigner | null> | null = null;

export function loadWallet(): Promise<KeyPairSigner | null> {
  if (!walletPromise) {
    walletPromise = loadWalletInternal();
  }
  return walletPromise;
}

async function createSignerFromSecretBytes(bytes: Uint8Array): Promise<KeyPairSigner> {
  if (bytes.length === 64) {
    return await createKeyPairSignerFromBytes(bytes);
  }
  if (bytes.length === 32) {
    return await createKeyPairSignerFromPrivateKeyBytes(bytes);
  }
  throw new Error(`Invalid secret key byte length: ${bytes.length} (expected 32 or 64)`);
}

async function validateSigner(signer: KeyPairSigner, sourceName: string): Promise<KeyPairSigner> {
  if (!(await messageSigningTest(signer))) {
    throw new Error(`Message-signing self-test failed for ${sourceName}.`);
  }

  if (env.SOLANA_PUBLIC_KEY) {
    const expectedAddress = address(env.SOLANA_PUBLIC_KEY);
    if (expectedAddress !== signer.address) {
      throw new Error(
        `SOLANA_PUBLIC_KEY (${expectedAddress}) does not match derived address (${signer.address}) from ${sourceName}.`
      );
    }
  }

  return signer;
}

async function loadWalletInternal(): Promise<KeyPairSigner | null> {
  if (env.SOLANA_PRIVATE_KEY) {
    try {
      const secretBytes = getBase58Encoder().encode(env.SOLANA_PRIVATE_KEY);
      const signer = await createSignerFromSecretBytes(new Uint8Array(secretBytes));
      return await validateSigner(signer, 'SOLANA_PRIVATE_KEY');
    } catch (e) {
      logger.error({ err: e }, '[Solana] Failed to load or validate the wallet from SOLANA_PRIVATE_KEY.');
      return null;
    }
  }

  const idJsonPath = path.join(os.homedir(), '.config/solana/id.json');
  let secretKeyBytes: Uint8Array;
  try {
    const secretKeyString = fs.readFileSync(idJsonPath, 'utf-8');
    const parsed = JSON.parse(secretKeyString);
    if (!Array.isArray(parsed)) {
      throw new Error('id.json content is not a JSON array.');
    }
    secretKeyBytes = new Uint8Array(parsed);
  } catch (e) {
    logger.warn({ err: e }, '[Solana] ⚠️ SOLANA_PRIVATE_KEY が未設定で、id.json の読み込み・パースにも失敗しました。');
    return null;
  }

  try {
    const signer = await createSignerFromSecretBytes(secretKeyBytes);
    return await validateSigner(signer, 'id.json');
  } catch (e) {
    logger.error({ err: e }, '[Solana] Failed to load or validate the wallet from id.json.');
    return null;
  }
}

async function messageSigningTest(signer: KeyPairSigner): Promise<boolean> {
  const message = `[${Date.now()}] The quick brown fox jumps over the lazy dog.`;
  const messageBytes = new TextEncoder().encode(message);

  const [signaturesMap] = await signer.signMessages([createSignableMessage(messageBytes)]);
  const signature = signaturesMap?.[signer.address];

  if (!signature) {
    throw new Error(`Signature not found for address: ${signer.address}`);
  }

  const result = await verifySignature(signer.keyPair.publicKey, signature, messageBytes);
  const base58Signature = getBase58Decoder().decode(signature);

  logger.debug({
    message,
    pubKey: signer.address,
    signature: base58Signature,
    result,
  });
  return result;
}

export async function getTakerPublicKey(): Promise<Address | undefined> {
  const wallet = await loadWallet();
  return wallet?.address;
}