import cluster from 'cluster';
import os from 'os';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Number of CPU cores available
const numCPUs = os.cpus().length;

if (cluster.isPrimary) {
  console.log(`🚀 Master process ${process.pid} is running`);
  console.log(`🔥 Forking ${numCPUs} worker processes for maximum performance...`);

  // Fork workers for each CPU core
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  // Handle worker crashes - restart automatically
  cluster.on('exit', (worker, code, signal) => {
    console.log(`⚠️  Worker ${worker.process.pid} died. Restarting...`);
    cluster.fork();
  });

  // Log when workers are online
  cluster.on('online', (worker) => {
    console.log(`✅ Worker ${worker.process.pid} is online`);
  });

} else {
  // Workers share the same port - load balancing handled by OS
  import('./server.js');
  console.log(`👷 Worker ${process.pid} started`);
}
