export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const os = await import('os');
    const { spawn } = await import('child_process');

    // Ensure we don't start multiple instances in dev mode due to HMR
    if (!(global as any).__bonjourStarted) {
      (global as any).__bonjourStarted = true;
      const port = parseInt(process.env.PORT || '3000', 10);

      // Find local IPv4 address
      const interfaces = os.networkInterfaces();
      let localIp = '127.0.0.1';
      for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name] || []) {
          if (iface.family === 'IPv4' && !iface.internal) {
             localIp = iface.address;
             break;
          }
        }
        if (localIp !== '127.0.0.1') break;
      }

      const hostBase = os.hostname().replace('.local', '');
      const desiredDomain = `rezka.${hostBase}.local`;

      // Use macOS native dns-sd to register a proxy record for the subdomain.
      // This only works if running natively on macOS (not inside Alpine Linux Docker)
      if (os.type() === 'Darwin') {
        const dnsSd = spawn('dns-sd', ['-P', 'hdrezka', '_http._tcp', '', String(port), desiredDomain, localIp]);

        dnsSd.on('error', (err) => {
          console.error('Failed to start dns-sd:', err);
        });

        dnsSd.unref();

        console.log(`\n======================================================`);
        console.log(`🧞 Bonjour Custom Subdomain Registered via dns-sd!`);
        console.log(`Local Network Access: http://${desiredDomain}:${port}`);
        console.log(`======================================================\n`);
      } else {
        console.log(`\n======================================================`);
        console.log(`🐳 Running in Docker (Linux). Native DNS-SD disabled.`);
        console.log(`Local Network Access: http://${hostBase}.local:${port}`);
        console.log(`======================================================\n`);
      }
    }
  }
}
