// @ts-check
// E2E: levanta el servidor real con una BD temporal y recorre los flujos por la interfaz.
const { defineConfig, devices } = require("@playwright/test");
const os = require("node:os"), path = require("node:path");
const PUERTO = 8790;
module.exports = defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  workers: 1,
  reporter: [["list"]],
  use: { acceptDownloads: true, baseURL: `http://localhost:${PUERTO}`, ...devices["Pixel 7"], serviceWorkers: "block", channel: process.env.CI ? undefined : "chrome" },
  webServer: {
    command: "node server/servidor.js",
    url: `http://localhost:${PUERTO}/api/salud`,
    reuseExistingServer: false,
    env: { PUERTO: String(PUERTO), BD: path.join(os.tmpdir(), `manaco-e2e-${Date.now()}.db`) },
  },
});
