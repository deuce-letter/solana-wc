import { Server } from 'socket.io';
import { createServer } from 'node:http';
import type { ClientToServerEvents, ServerToClientEvents } from '@solana-wc/shared/socket';
import { logger } from './logger.js'
import { getTakerPublicKey } from './solana-wallet.js';
import {
  pairWalletConnect,
  disconnectWcSession,
  resolveFrontendApproval,
  getActiveWcSessions,
  getPendingWcRequests,
} from './walletkit.js';

const httpServer = createServer();
const frontendOrigins = new Set([
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  ...(process.env.FRONTEND_ORIGIN ? [process.env.FRONTEND_ORIGIN] : []),
]);

const PORT = Number(process.env.SOCKET_PORT) || 3001;
const HOST = '127.0.0.1';

export function startSocketServer() {
  httpServer.listen(PORT, HOST, () => {
    logger.info(`[Socket.IO] Listening on http://${HOST}:${PORT}`);
  });
}

export async function stopSocketServer() {
  httpServer.closeAllConnections();
}

export const ioServer = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: [...frontendOrigins],
    methods: ['GET', 'POST'],
  },
  allowRequest: (request, callback) => {
    const origin = request.headers.origin;
    callback(null, origin !== undefined && frontendOrigins.has(origin));
  },
});

ioServer.on('connection', async (socket) => {
  logger.info({ id: socket.id }, '[Socket.IO] Frontend connected');

  const address = await getTakerPublicKey();
  socket.emit('wallet:address', address ?? null);
  socket.emit('wc:sessions', getActiveWcSessions());
  for (const req of getPendingWcRequests()) {
    socket.emit('wc:session_request', req);
  }

  socket.on('wc:pair', async (uri) => {
    try {
      await pairWalletConnect(uri);
    } catch (err) {
      logger.error({ err }, '[Socket.IO] Failed to pair');
    }
  });

  socket.on('wc:disconnect', async (topic) => {
    try {
      await disconnectWcSession(topic);
      ioServer.emit('wc:sessions', getActiveWcSessions());
    } catch (err) {
      logger.error({ err }, '[Socket.IO] Failed to disconnect');
    }
  });

  socket.on('wc:approve_request', (id) => {
    resolveFrontendApproval(id, true);
  });

  socket.on('wc:reject_request', (id) => {
    resolveFrontendApproval(id, false);
  });
});