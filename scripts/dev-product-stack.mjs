import { spawn } from "node:child_process";
import { watch } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const cwd = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const serverEntry = "./apps/product-server/dist/server.js";
const serverDistDir = path.resolve(cwd, "apps", "product-server", "dist");

async function main() {
  await runInitialBuild();

  const children = [
    startProcess("TypeScript watch", npmCommand, ["run", "build", "--", "--watch", "--preserveWatchOutput", "false"]),
    startProcess("Product web", npmCommand, ["run", "dev:product-web"]),
  ];
  const serverController = startRestartableServer();

  const shutdown = () => {
    serverController.close();

    for (const child of children) {
      if (!child.killed) {
        child.kill("SIGINT");
      }
    }
  };

  process.on("SIGINT", () => {
    shutdown();
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    shutdown();
    process.exit(0);
  });

  for (const child of children) {
    child.on("exit", (code) => {
      if (code && code !== 0) {
        console.error(`[${child.spawnargs[0]}] exited with code ${code}`);
      }
    });
  }
}

function runInitialBuild() {
  return new Promise((resolve, reject) => {
    const child = spawn(npmCommand, ["run", "build"], {
      cwd,
      stdio: "inherit",
      shell: false,
    });

    child.on("exit", (code) => {
      if (code === 0) {
        resolve(undefined);
        return;
      }

      reject(new Error(`Initial build failed with code ${code ?? "unknown"}.`));
    });
  });
}

function startProcess(label, command, args) {
  console.log(`[stack] starting ${label}...`);

  return spawn(command, args, {
    cwd,
    stdio: "inherit",
    shell: false,
  });
}

function startRestartableServer() {
  let currentChild = launchServer();
  let restartTimer;

  const watcher = watch(serverDistDir, { recursive: true }, () => {
    if (restartTimer) {
      clearTimeout(restartTimer);
    }

    restartTimer = setTimeout(() => {
      if (!currentChild.killed) {
        currentChild.kill("SIGINT");
      }

      currentChild = launchServer();
    }, 250);
  });

  return {
    close() {
      watcher.close();

      if (restartTimer) {
        clearTimeout(restartTimer);
      }

      if (!currentChild.killed) {
        currentChild.kill("SIGINT");
      }
    },
  };
}

function launchServer() {
  return startProcess("Product server", process.execPath, [serverEntry]);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
