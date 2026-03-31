import { createServer } from 'node:http';

function html(body) {
  return `<!doctype html><html><body>${body}</body></html>`;
}

function createAbortError() {
  const error = new Error('OAuth authorization was cancelled.');
  error.name = 'AbortError';
  return error;
}

export function waitForOAuthAuthorizationCode({
  host = '127.0.0.1',
  port,
  pathname = '/callback',
  logger = console,
  signal,
}) {
  return new Promise((resolve, reject) => {
    let settled = false;

    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      signal?.removeEventListener?.('abort', handleAbort);
      try {
        server.close(() => fn(value));
      } catch {
        fn(value);
      }
    };

    const handleAbort = () => {
      finish(reject, createAbortError());
    };

    const server = createServer((req, res) => {
      if (req.url === '/favicon.ico') {
        res.writeHead(404);
        res.end();
        return;
      }

      const url = new URL(req.url || '', `http://${host}:${port}`);

      if (url.pathname !== pathname) {
        res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
        res.end('Not found');
        return;
      }

      const code = url.searchParams.get('code');
      const error = url.searchParams.get('error');

      if (code) {
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
        res.end(html('<h1>Authorization complete</h1><p>You can close this window.</p>'));
        finish(resolve, code);
        return;
      }

      if (error) {
        res.writeHead(400, { 'content-type': 'text/html; charset=utf-8' });
        res.end(html(`<h1>Authorization failed</h1><p>${error}</p>`));
        finish(reject, new Error(`OAuth authorization failed: ${error}`));
        return;
      }

      res.writeHead(400, { 'content-type': 'text/html; charset=utf-8' });
      res.end(html('<h1>Authorization failed</h1><p>Missing code parameter.</p>'));
      finish(reject, new Error('OAuth callback did not contain an authorization code.'));
    });

    server.on('error', (error) => {
      finish(reject, error);
    });

    if (signal?.aborted) {
      handleAbort();
      return;
    }

    signal?.addEventListener?.('abort', handleAbort, { once: true });

    server.listen(port, host, () => {
      logger.error(
        `[preq-dispatch-channel] Waiting for OAuth callback at http://${host}:${port}${pathname}`,
      );
    });
  });
}
