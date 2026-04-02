import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

export const DEFAULT_OAUTH_CACHE_PATH = path.join(
  os.homedir(),
  '.preqstation-dispatch',
  'oauth.json',
);

function defaultClientMetadata(redirectUrl) {
  return {
    client_name: 'PREQSTATION Dispatch Channel',
    redirect_uris: [String(redirectUrl)],
    grant_types: ['authorization_code'],
    response_types: ['code'],
    token_endpoint_auth_method: 'none',
  };
}

async function readState(cachePath) {
  try {
    const raw = await readFile(cachePath, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    if (error && typeof error === 'object' && error.code === 'ENOENT') {
      return {};
    }
    throw error;
  }
}

async function writeState(cachePath, state) {
  await mkdir(path.dirname(cachePath), { recursive: true });
  await writeFile(cachePath, JSON.stringify(state, null, 2));
}

function browserOpenCommandForPlatform(platform) {
  if (platform === 'darwin') {
    return { command: 'open', args: [] };
  }

  if (platform === 'win32') {
    return { command: 'cmd', args: ['/c', 'start', ''] };
  }

  if (platform === 'linux') {
    return { command: 'xdg-open', args: [] };
  }

  return null;
}

export async function openAuthorizationUrlInBrowser(
  authorizationUrl,
  {
    platform = process.platform,
    spawnImpl = spawn,
  } = {},
) {
  const launcher = browserOpenCommandForPlatform(platform);
  if (!launcher) {
    return false;
  }

  const child = spawnImpl(launcher.command, [...launcher.args, String(authorizationUrl)], {
    detached: true,
    stdio: 'ignore',
  });

  child.unref?.();
  return true;
}

export class FileOAuthClientProvider {
  constructor({
    cachePath = DEFAULT_OAUTH_CACHE_PATH,
    redirectUrl,
    clientMetadata,
    logger = console,
    onRedirect,
  }) {
    this.cachePath = cachePath;
    this._redirectUrl = redirectUrl;
    this._clientMetadata = clientMetadata || defaultClientMetadata(redirectUrl);
    this._logger = logger;
    this._onRedirect = onRedirect;
  }

  get redirectUrl() {
    return this._redirectUrl;
  }

  get clientMetadata() {
    return this._clientMetadata;
  }

  async clientInformation() {
    return (await readState(this.cachePath)).clientInformation;
  }

  async saveClientInformation(clientInformation) {
    const state = await readState(this.cachePath);
    state.clientInformation = clientInformation;
    await writeState(this.cachePath, state);
  }

  async tokens() {
    return (await readState(this.cachePath)).tokens;
  }

  async saveTokens(tokens) {
    const state = await readState(this.cachePath);
    state.tokens = tokens;
    await writeState(this.cachePath, state);
  }

  async redirectToAuthorization(authorizationUrl) {
    this._logger.error(
      `[preq-dispatch-channel] Complete OAuth in your browser: ${authorizationUrl.toString()}`,
    );
    if (this._onRedirect) {
      await this._onRedirect(authorizationUrl);
      return;
    }

    try {
      const opened = await openAuthorizationUrlInBrowser(authorizationUrl);
      if (opened) {
        this._logger.error('[preq-dispatch-channel] Opened the PREQ OAuth page in your browser.');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error ?? 'Unknown error');
      this._logger.error(
        `[preq-dispatch-channel] Failed to open the browser automatically: ${message}`,
      );
    }
  }

  async saveCodeVerifier(codeVerifier) {
    const state = await readState(this.cachePath);
    state.codeVerifier = codeVerifier;
    await writeState(this.cachePath, state);
  }

  async codeVerifier() {
    const state = await readState(this.cachePath);
    if (!state.codeVerifier) {
      throw new Error('No OAuth code verifier saved.');
    }
    return state.codeVerifier;
  }

  async saveDiscoveryState(discoveryState) {
    const state = await readState(this.cachePath);
    state.discoveryState = discoveryState;
    await writeState(this.cachePath, state);
  }

  async discoveryState() {
    return (await readState(this.cachePath)).discoveryState;
  }

  async invalidateCredentials(scope) {
    const state = await readState(this.cachePath);

    if (scope === 'all') {
      await writeState(this.cachePath, {});
      return;
    }

    if (scope === 'client') {
      delete state.clientInformation;
    }

    if (scope === 'tokens') {
      delete state.tokens;
    }

    if (scope === 'verifier') {
      delete state.codeVerifier;
    }

    if (scope === 'discovery') {
      delete state.discoveryState;
    }

    await writeState(this.cachePath, state);
  }
}
