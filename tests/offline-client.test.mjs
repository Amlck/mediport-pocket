import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../src/app/lib/offline.js', import.meta.url), 'utf8');
const flush = async () => { for (let i = 0; i < 40; i++) await Promise.resolve(); };
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function events(target = {}) {
  const listeners = new Map();
  return Object.assign(target, {
    listeners,
    addEventListener(type, listener) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(listener);
    },
    dispatch(type) { for (const listener of listeners.get(type) || []) listener(); },
  });
}
function worker(version = 'installed-v1', { complete = true, answer } = {}) {
  return events({ state: 'activated', calls: [], postMessage(message, ports) {
    this.calls.push(message.type);
    if (answer) return answer(message, ports[0]);
    ports[0].postMessage({ version, complete });
  } });
}
function registration(active = worker(), update = async () => {}) {
  return events({ active, installing: null, waiting: null, update });
}
function harness({ register, getRegistration = async () => undefined, controller = null, secure = true, serviceWorkers = true } = {}) {
  let time = 0, nextTimer = 0;
  const timers = new Map();
  const states = [], calls = { register: 0, lookup: 0 }, channels = [];
  class Channel {
    constructor() {
      this.port1 = { closed: false, close() { this.closed = true; } };
      this.port2 = { postMessage: data => { if (!this.port1.closed) this.port1.onmessage?.({ data }); } };
      channels.push(this);
    }
  }
  const container = events({ controller,
    register(...args) { calls.register++; return register(...args); },
    getRegistration(...args) { calls.lookup++; return getRegistration(...args); },
  });
  const window = events({ isSecureContext: secure });
  const document = events({ hidden: false });
  const sandbox = { navigator: { onLine: true, ...(serviceWorkers ? { serviceWorker: container } : {}) }, window, document,
    setTimeout(callback, duration) { const id = ++nextTimer; timers.set(id, { callback, at: time + duration }); return id; },
    clearTimeout(id) { timers.delete(id); }, MessageChannel: Channel };
  vm.createContext(sandbox);
  vm.runInContext(source.replaceAll('export async function', 'async function') + '\nthis.api = { setupOffline, checkForUpdates, applyUpdate };', sandbox);
  async function advance(duration) {
    time += duration;
    for (;;) {
      const due = [...timers].find(([, timer]) => timer.at <= time);
      if (!due) break;
      timers.delete(due[0]); due[1].callback(); await flush();
    }
    await flush();
  }
  return { ...sandbox.api, container, window, document, calls, channels, advance,
    start: () => sandbox.api.setupOffline(value => states.push({ ...value })),
    state: () => states.at(-1), states };
}

test('pending registration settles to a retryable error and a later retry recovers', async () => {
  const stalled = deferred();
  const next = registration();
  let first = true;
  const h = harness({ register: () => first ? (first = false, stalled.promise) : Promise.resolve(next) });
  const initial = h.start(); await flush();
  assert.equal(h.state().state, 'checking');
  await h.advance(10000); await initial;
  assert.equal(h.state().state, 'unavailable');
  assert.equal(h.state().retryable, true);
  assert.match(h.state().message, /try again/i);
  await h.checkForUpdates();
  assert.equal(h.calls.register, 2);
  assert.equal(h.state().state, 'ready');
  assert.equal(h.state().installed.version, 'installed-v1');
});

test('a late successful registration recovers unless a newer attempt supersedes it', async () => {
  const late = deferred();
  const h = harness({ register: () => late.promise });
  const initial = h.start(); await flush(); await h.advance(10000); await initial;
  late.resolve(registration(worker('late-v1'))); await flush();
  assert.equal(h.state().state, 'ready');
  assert.equal(h.state().installed.version, 'late-v1');

  const obsolete = deferred();
  let first = true;
  const h2 = harness({ register: () => first ? (first = false, obsolete.promise) : Promise.resolve(registration(worker('new-v2'))) });
  const pending = h2.start(); await flush(); await h2.advance(10000); await pending;
  await h2.checkForUpdates();
  obsolete.resolve(registration(worker('obsolete-v1'))); await flush();
  assert.equal(h2.state().installed.version, 'new-v2');
});

test('setup and early update clicks coalesce registration and attach listeners once', async () => {
  const pending = deferred();
  const h = harness({ register: () => pending.promise });
  const first = h.start(), second = h.start();
  const update1 = h.checkForUpdates(), update2 = h.checkForUpdates();
  await flush();
  assert.equal(h.calls.register, 1);
  pending.resolve(registration());
  await Promise.all([first, second, update1, update2]);
  assert.equal(h.container.listeners.get('controllerchange').length, 1);
  assert.equal(h.window.listeners.get('online').length, 1);
  assert.equal(h.state().state, 'ready');
});

test('failed registration and pending fallback lookup are bounded without hiding active status', async () => {
  const active = worker();
  const h = harness({ controller: active, register: async () => { throw new Error('network'); }, getRegistration: () => new Promise(() => {}) });
  const initial = h.start(); await flush();
  assert.equal(h.state().installed.version, 'installed-v1');
  await h.advance(10000); await initial;
  assert.equal(h.calls.lookup, 1);
  assert.equal(h.state().state, 'ready');
  assert.equal(h.state().retryable, true);
  assert.match(h.state().message, /last verified/i);
});

test('a rejected fallback lookup settles explicitly and remains retryable', async () => {
  const h = harness({ register: async () => { throw new Error('network'); }, getRegistration: async () => { throw new Error('storage'); } });
  await h.start();
  assert.equal(h.state().state, 'unavailable');
  assert.equal(h.state().retryable, true);
  assert.equal(h.calls.lookup, 1);
});

test('a late fallback cannot replace the registration already recovered from its original request', async () => {
  const original = deferred(), lookup = deferred();
  const h = harness({ register: () => original.promise, getRegistration: () => lookup.promise });
  const initial = h.start(); await flush(); await h.advance(10000); await h.advance(10000); await initial;
  original.resolve(registration(worker('original'))); await flush();
  lookup.resolve(registration(worker('stale-lookup'))); await flush();
  assert.equal(h.state().installed.version, 'original');
});

test('a failed first install leaves a retryable error instead of permanent downloading', async () => {
  const installing = worker(); installing.state = 'installing';
  const target = registration(null); target.installing = installing;
  const h = harness({ register: async () => target });
  await h.start();
  assert.equal(h.state().state, 'downloading');
  installing.state = 'redundant'; installing.dispatch('statechange');
  assert.equal(h.state().state, 'unavailable');
  assert.equal(h.state().retryable, true);
});

test('an empty registration reports a retryable error rather than an imaginary download', async () => {
  const h = harness({ register: async () => registration(null) });
  await h.start();
  assert.equal(h.state().state, 'unavailable');
  assert.equal(h.state().retryable, true);
  assert.match(h.state().message, /No offline installation is running/);
});

test('pending update releases its lock at the deadline and a retry succeeds', async () => {
  const late = deferred();
  let updates = 0;
  const target = registration(worker(), () => ++updates === 1 ? late.promise : Promise.resolve());
  const h = harness({ register: async () => target });
  await h.start();
  const first = h.checkForUpdates(), joined = h.checkForUpdates(); await flush();
  assert.equal(updates, 1);
  await h.advance(10000); await Promise.all([first, joined]);
  assert.equal(h.state().state, 'ready');
  assert.equal(h.state().update.tone, 'attention');
  assert.doesNotMatch(h.state().update.text, /VPN|Mac awake|still complete/);
  await h.checkForUpdates();
  assert.equal(updates, 2);
  assert.equal(h.state().update.tone, 'ok');
  late.resolve(); await flush();
  assert.equal(h.state().update.tone, 'ok', 'late first check cannot overwrite the newer update result');
});

test('no installed identity cannot be reported as offline ready', async () => {
  const h = harness({ register: async () => registration(worker('', { complete: true })) });
  await h.start();
  assert.equal(h.state().state, 'unavailable');
  assert.equal(h.state().installed, null);
});

test('a pending repair returns to its known incomplete status and releases update checking', async () => {
  let updates = 0;
  const incomplete = worker('partial', { answer: (message, port) => {
    if (message.type === 'STATUS') port.postMessage({ version: 'partial', complete: false });
  } });
  const target = registration(incomplete, async () => { updates++; });
  const h = harness({ register: async () => target });
  await h.start();
  const first = h.checkForUpdates(); await flush();
  assert.equal(h.state().state, 'downloading');
  await h.advance(30000); await first;
  assert.equal(h.state().state, 'incomplete');
  assert.equal(h.state().update.tone, 'attention');
  const second = h.checkForUpdates(); await flush();
  assert.equal(updates, 2);
  await h.advance(30000); await second;
});

test('an old repair timeout cannot label a newly verified controller incomplete', async () => {
  const old = worker('old-partial', { answer: (message, port) => {
    if (message.type === 'STATUS') port.postMessage({ version: 'old-partial', complete: false });
  } });
  const target = registration(old);
  const h = harness({ controller: old, register: async () => target });
  await h.start();
  const update = h.checkForUpdates(); await flush();
  assert.equal(h.state().state, 'downloading');
  h.container.controller = worker('new-complete');
  h.container.dispatch('controllerchange'); await flush();
  assert.equal(h.state().state, 'ready');
  await h.advance(30000); await update;
  assert.equal(h.state().state, 'ready');
  assert.equal(h.state().installed.version, 'new-complete');
  assert.equal(h.state().update.tone, 'attention');
});

test('an old repair timeout preserves a newer complete verification of the same worker', async () => {
  let complete = false;
  const target = registration(worker('same-worker', { answer: (message, port) => {
    if (message.type === 'STATUS') port.postMessage({ version: 'same-worker', complete });
  } }));
  const h = harness({ register: async () => target });
  await h.start();
  const update = h.checkForUpdates(); await flush();
  complete = true;
  h.window.dispatch('online'); await flush();
  assert.equal(h.state().state, 'ready');
  await h.advance(30000); await update;
  assert.equal(h.state().state, 'ready');
});

test('status replies from a replaced controller cannot overwrite its successor', async () => {
  let oldReply;
  const old = worker('old', { answer: (_message, port) => { oldReply = port; } });
  const h = harness({ controller: old, register: async () => registration(old) });
  const initial = h.start(); await flush();
  h.container.controller = worker('new');
  h.container.dispatch('controllerchange'); await flush();
  oldReply.postMessage({ version: 'old', complete: true }); await flush();
  await h.advance(15000); await initial;
  assert.equal(h.state().installed.version, 'new');
  assert.equal(h.state().state, 'ready');
});

test('nonresponsive worker status is bounded and closes its reply port', async () => {
  const silent = worker('silent', { answer: () => {} });
  const h = harness({ register: async () => registration(silent) });
  const initial = h.start(); await flush(); await h.advance(15000); await initial;
  assert.equal(h.state().state, 'unavailable');
  assert.equal(h.channels[0].port1.closed, true);
});

test('unsupported or insecure browsers settle without attempting registration', async () => {
  for (const option of [{ secure: false }, { serviceWorkers: false }]) {
    const h = harness({ ...option, register: () => { throw new Error('must not run'); } });
    await h.start(); await h.checkForUpdates();
    assert.equal(h.calls.register, 0);
    assert.equal(h.state().state, 'unavailable');
    assert.equal(h.state().retryable, false);
  }
});

test('pack view retains an actionable update button after a transient registration failure', async () => {
  const view = (await readFile(new URL('../src/app/views/pack.js', import.meta.url), 'utf8')).replace(/^import .*;\n/gm, '').replace('export function packView', 'function packView');
  let publish;
  const node = (tag, attributes, ...children) => ({ tag, attributes, children: children.flat(), isConnected: true,
    replaceChildren(...next) { this.children = next; }, addEventListener() {}, getAttribute() { return null; } });
  const sandbox = { h: node, note: (_tone, text) => text, installedRelease: () => null, checkForUpdates() {} };
  vm.createContext(sandbox); vm.runInContext(view + '\nthis.offlineCard = offlineCard;', sandbox);
  const card = sandbox.offlineCard({ release: {}, offline: { subscribe(listener) { publish = listener; listener({ state: 'checking' }); return () => {}; } } });
  const button = card.children.at(-1).children[0];
  publish({ state: 'unavailable', retryable: true, message: 'Try again.' });
  assert.equal(button.hidden, false);
  publish({ state: 'unavailable', retryable: false });
  assert.equal(button.hidden, true);
});
