import "reflect-metadata";
import { setupContainer } from "./infrastructure/container.js";
import { createApp } from "./infrastructure/http/app.js";
import { env } from "./infrastructure/config/env.js";

async function bootstrap(): Promise<void> {
  try {
    await setupContainer();

    const app = createApp();

    const port = env.PORT || 3000;
    const server = app.listen(port, () => {
      console.log(`
        ╔══════════════════════════════════════════════╗
        ║                  CMS Headless                ║
        ╠══════════════════════════════════════════════╣
        ║  Port:      ${String(port).padEnd(32)}       ║
        ║  Env:       ${env.NODE_ENV.padEnd(32)}       ║
        ║  Driver:    ${env.DB_DRIVER.padEnd(32)}      ║
        ╚══════════════════════════════════════════════╝
      `);
    });

    const shutdown = (signal: string) => {
      console.log(`\n${signal} received. Shutting down gracefully...`);
      
      server.close(() => {
        console.log("HTTP server closed.");
        process.exit(0);
      });

      setTimeout(() => {
        console.error("Forcefully shutting down (timeout)");
        process.exit(1);
      }, 10_000);
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));

  } catch (err) {
    console.error("Fatal error during startup:", err);
    process.exit(1);
  }
}

bootstrap();