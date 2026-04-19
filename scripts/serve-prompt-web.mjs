import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.env.PORT ?? 4173);

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
};

function resolvePath(urlPath) {
  const trimmedPath = decodeURIComponent(urlPath.split("?")[0]);

  if (trimmedPath === "/") {
    return path.join(rootDir, "apps", "prompt-web", "index.html");
  }

  const candidate = path.normalize(path.join(rootDir, trimmedPath));

  if (!candidate.startsWith(rootDir)) {
    return undefined;
  }

  if (candidate.endsWith(path.sep)) {
    return path.join(candidate, "index.html");
  }

  return candidate;
}

const server = createServer(async (request, response) => {
  const filePath = resolvePath(request.url ?? "/");

  if (!filePath) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  try {
    const file = await readFile(filePath);
    const extension = path.extname(filePath);
    response.writeHead(200, {
      "content-type":
        contentTypes[extension] ?? "application/octet-stream",
    });
    response.end(file);
  } catch {
    response.writeHead(404, {
      "content-type": "text/plain; charset=utf-8",
    });
    response.end("Not Found");
  }
});

server.listen(port, () => {
  console.log(`Thin app available at http://127.0.0.1:${port}/apps/prompt-web/`);
});
