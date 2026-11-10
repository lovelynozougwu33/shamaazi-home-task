import dotenv from 'dotenv';
import { createApp } from './app';
import { sequelize } from './config/database';
import './models';
import { createPaymentProviderFromEnv } from './services/payment/PaymentProvider';
import { runDonationProcessingTick } from './services/donationProcessor';

dotenv.config();

const port = Number(process.env.PORT) || 3000;
const tickMs = Number(process.env.PROCESSOR_TICK_MS) || 15_000;

async function main() {
  await sequelize.authenticate();

  const payment = createPaymentProviderFromEnv();
  const app = createApp();

  const server = app.listen(port, () => {
    console.log(`Listening on http://localhost:${port}`);
  });

  const interval = setInterval(() => {
    runDonationProcessingTick(payment).catch((e) => {
      console.error('donation processor tick failed', e);
    });
  }, tickMs);

  runDonationProcessingTick(payment).catch((e) => {
    console.error('initial donation processor tick failed', e);
  });

  const shutdown = async () => {
    clearInterval(interval);
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await sequelize.close();
    process.exit(0);
  };

  process.on('SIGINT', () => {
    void shutdown();
  });
  process.on('SIGTERM', () => {
    void shutdown();
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
