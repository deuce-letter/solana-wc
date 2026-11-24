import './loadenv.js';
import { loadWallet } from './components/solana-wallet.js';
import { initWalletKit } from './components/walletkit.js';
import { startSocketServer, stopSocketServer } from './components/socket-server.js';
import { logger } from './components/logger.js';

async function main() {
  const wallet = await loadWallet();
  if (!wallet) {
    logger.fatal('ウォレットの読み込みに失敗したため終了します');
    process.exit(1);
  }

  await initWalletKit();
  startSocketServer();

  logger.info({ address: wallet.address }, 'Wallet backend is ready');
}

process.on('SIGINT', async () => {
  logger.info('Shutting down...');
  await stopSocketServer();
  process.exit(0);
});

main().catch((err) => {
  logger.fatal({ err }, 'Fatal startup error');
  process.exit(1);
});