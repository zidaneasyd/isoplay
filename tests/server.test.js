import test from "node:test";
import assert from "node:assert/strict";
import { createStaticServer } from "../scripts/server.js";

async function withServer(callback) {
  const server = createStaticServer({ root: process.cwd() });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  try {
    await callback(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test("local server serves the app and JavaScript modules with browser-safe MIME types", async () => {
  await withServer(async (baseUrl) => {
    const index = await fetch(`${baseUrl}/`);
    assert.equal(index.status, 200);
    assert.match(index.headers.get("content-type"), /text\/html/);
    const html = await index.text();
    assert.match(html, /type="module"/);
    assert.match(html, /#runtime-warning/);

    for (const modulePath of ["/plane.js", "/src/interaction.js", "/src/ui.js", "/src/elevation.js"]) {
      const response = await fetch(`${baseUrl}${modulePath}`);
      assert.equal(response.status, 200, modulePath);
      assert.match(response.headers.get("content-type"), /javascript/);
      assert.ok((await response.text()).length > 20, `${modulePath} should not be empty`);
    }
  });
});

test("local server supports HEAD and rejects unsupported HTTP methods", async () => {
  await withServer(async (baseUrl) => {
    const head = await fetch(`${baseUrl}/index.html`, { method: "HEAD" });
    assert.equal(head.status, 200);
    assert.equal(await head.text(), "");
    const post = await fetch(`${baseUrl}/index.html`, { method: "POST" });
    assert.equal(post.status, 405);
    assert.match(post.headers.get("allow"), /GET/);
  });
});

test("local server rejects missing paths and traversal outside the project root", async () => {
  await withServer(async (baseUrl) => {
    const missing = await fetch(`${baseUrl}/not-a-project-file.txt`);
    assert.equal(missing.status, 404);
    const traversal = await fetch(`${baseUrl}/%2e%2e%2fpackage.json`);
    assert.ok([403, 404].includes(traversal.status));
  });
});
