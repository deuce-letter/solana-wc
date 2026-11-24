import { WalletKit } from '@reown/walletkit';
import { Core } from '@walletconnect/core';
import type { ICore } from '@walletconnect/types';
import { ConfKeyValueStorage } from './ConfKeyValueStorage.js';
import { buildApprovedNamespaces, getSdkError } from '@walletconnect/utils';
import {
  getBase58Encoder,
  getBase58Decoder,
  getBase64Encoder,
  getBase64EncodedWireTransaction,
  getTransactionDecoder,
  partiallySignTransaction,
  createSignableMessage,
} from '@solana/kit';
import { ioServer } from './socket-server.js';
import { loadWallet, getTakerPublicKey } from './solana-wallet.js';
import { logger } from './logger.js';
import type { WcSessionSummary, PendingSignRequest } from '@solana-wc/shared/socket';

const SOLANA_MAINNET_CHAIN = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';

let walletKit: InstanceType<typeof WalletKit> | null = null;

interface PendingEntry {
  request: PendingSignRequest;
  resolve: (approved: boolean) => void;
  timer: NodeJS.Timeout;
}

const pendingRequests = new Map<number, PendingEntry>();

export async function initWalletKit() {
  if (walletKit) return;

  const address = await getTakerPublicKey();
  if (!address) {
    throw new Error('Wallet is not available. Cannot initialize WalletKit.');
  }

  const core = new Core({
    projectId: process.env.REOWN_PROJECT_ID!,
    relayUrl: 'wss://relay.walletconnect.com',
    storage: new ConfKeyValueStorage(),
  });

  const instance = await WalletKit.init({
    core: core as unknown as ICore,
    metadata: {
      name: 'My Awesome Engine',
      description: 'Headless Solana Signer',
      url: 'http://localhost',
      icons: [],
    },
  });

  instance.on('session_proposal', async (proposal) => {
    try {
      const approvedNamespaces = buildApprovedNamespaces({
        proposal: proposal.params,
        supportedNamespaces: {
          solana: {
            chains: [SOLANA_MAINNET_CHAIN],
            methods: [
              'solana_signTransaction',
              'solana_signMessage',
              // TODO
              // 'solana_signAndSendTransaction',
            ],
            events: [],
            accounts: [`${SOLANA_MAINNET_CHAIN}:${address}`],
          },
        },
      });

      const session = await instance.approveSession({
        id: proposal.id,
        namespaces: approvedNamespaces,
      });
      logger.info({ peer: session.peer.metadata.name, address }, '[WalletKit] Session approved');
      ioServer.emit('wc:sessions', getActiveWcSessions());
    } catch (err) {
      logger.error({ err }, '[WalletKit] Failed to approve session');
      await instance.rejectSession({
        id: proposal.id,
        reason: getSdkError('USER_REJECTED'),
      });
    }
  });

  instance.on('session_request', async (event) => {
    const { topic, params, id } = event;
    const { request } = params;

    try {
      const signer = await loadWallet();
      if (!signer) throw new Error('Signer unavailable');

      const session = instance.getActiveSessions()[topic];

      const approved = await waitForFrontendApproval({
        id,
        topic,
        dappName: session?.peer.metadata.name ?? 'Unknown DApp',
        dappUrl: session?.peer.metadata.url ?? '',
        method: request.method as PendingSignRequest['method'],
        params: request.params,
      });

      if (!approved) {
        throw new Error('Rejected by user on Frontend');
      }

      if (request.method === 'solana_signTransaction') {
        const txBytes = getBase64Encoder().encode(request.params.transaction);
        const decodedTx = getTransactionDecoder().decode(txBytes);
        const signedTx = await partiallySignTransaction([signer.keyPair], decodedTx);

        const sigBytes = signedTx.signatures[signer.address];
        if (!sigBytes) throw new Error('Signature missing');

        await instance.respondSessionRequest({
          topic,
          response: {
            id,
            jsonrpc: '2.0',
            result: {
              signature: getBase58Decoder().decode(sigBytes),
              transaction: getBase64EncodedWireTransaction(signedTx),
            },
          },
        });
      } else if (request.method === 'solana_signMessage') {
        const msgBytes = getBase58Encoder().encode(request.params.message);
        const [sigMap] = await signer.signMessages([createSignableMessage(new Uint8Array(msgBytes))]);
        const sigBytes = sigMap?.[signer.address];
        if (!sigBytes) throw new Error('Message signature missing');

        await instance.respondSessionRequest({
          topic,
          response: {
            id,
            jsonrpc: '2.0',
            result: {
              signature: getBase58Decoder().decode(sigBytes),
            },
          },
        });
      } else {
        throw new Error(`Unsupported method: ${request.method}`);
      }
    } catch (err) {
      logger.error({ err, id }, '[WalletKit] Request rejected or failed');
      await instance.respondSessionRequest({
        topic,
        response: {
          id,
          jsonrpc: '2.0',
          error: getSdkError('USER_REJECTED'),
        },
      });
    }
  });

  instance.on('session_delete', () => {
    ioServer.emit('wc:sessions', getActiveWcSessions());
  });

  walletKit = instance;
}

export async function pairWalletConnect(uri: string) {
  if (!walletKit) throw new Error('WalletKit is not initialized');
  await walletKit.pair({ uri });
}

export function getActiveWcSessions(): WcSessionSummary[] {
  if (!walletKit) return [];

  return Object.values(walletKit.getActiveSessions()).map((session) => ({
    topic: session.topic,
    peerName: session.peer.metadata.name,
    peerUrl: session.peer.metadata.url,
    expiry: session.expiry,
  }));
}

export function getPendingWcRequests(): PendingSignRequest[] {
  return Array.from(pendingRequests.values()).map((entry) => entry.request);
}

export async function disconnectWcSession(topic: string) {
  if (!walletKit) throw new Error('WalletKit is not initialized');
  await walletKit.disconnectSession({
    topic,
    reason: getSdkError('USER_DISCONNECTED'),
  });
}

export function flushPendingWcRequests(): number {
  const count = pendingRequests.size;
  for (const [id, pending] of pendingRequests.entries()) {
    clearTimeout(pending.timer);
    pending.resolve(false);
    pendingRequests.delete(id);
  }
  return count;
}

function waitForFrontendApproval(
  req: PendingSignRequest,
  timeoutMs = 120_000
): Promise<boolean> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      pendingRequests.delete(req.id);
      resolve(false);
    }, timeoutMs);

    pendingRequests.set(req.id, { request: req, resolve, timer });
    ioServer.emit('wc:session_request', req);
  });
}

export function resolveFrontendApproval(id: number, approved: boolean) {
  const pending = pendingRequests.get(id);
  if (!pending) return;
  clearTimeout(pending.timer);
  pendingRequests.delete(id);
  pending.resolve(approved);
}