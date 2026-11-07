let registration;
let emit = () => {};
let updateCheck = null;
let initialization = null;
let initializationGeneration = 0;
let listening = false;
const watchedWorkers = new WeakSet();
const watchedRegistrations = new WeakSet();
let statusGeneration = 0;
let verifiedActiveWorker = null;
let verifiedWaitingWorker = null;
let current = { state: 'checking', version: null, installed: null, downloaded: null, retryable: true,
  message: 'Checking downloaded references…', updateAvailable: false, update: null };
const announce = patch => { current = { ...current, ...patch }; emit(current); };
// Browser worker APIs can stay pending while a host or storage operation is
// unreachable. A deadline releases the UI; it does not cancel browser work.
// Late success may still be useful, but must not replace a newer attempt.
function bounded(pending, milliseconds, text, onLate) {
  return new Promise((resolve, reject) => {
    let expired = false;
    const timer = setTimeout(() => { expired = true; reject(new Error(text)); }, milliseconds);
    Promise.resolve(pending).then(value => {
      if (expired) { Promise.resolve().then(() => onLate?.(value)).catch(() => {}); return; }
      clearTimeout(timer); resolve(value);
    }, error => { if (!expired) { clearTimeout(timer); reject(error); } });
  });
}
function identity(status) {
  if (typeof status?.version !== 'string' || !status.version.trim()) return null;
  const notes = status.releaseNotes;
  return {
    version: status.version,
    builtAt: typeof status.builtAt === 'string' ? status.builtAt : null,
    releaseDate: typeof notes?.date === 'string' ? notes.date : null,
    releaseLabel: typeof notes?.label === 'string' ? notes.label : null,
    changes: Array.isArray(notes?.changes) ? notes.changes.filter(change => typeof change === 'string') : [],
  };
}
function message(worker, type) {
  return new Promise((resolve, reject) => {
    if (!worker) return reject(new Error('Offline worker is not active yet.'));
    const channel = new MessageChannel();
    const timer = setTimeout(() => { channel.port1.close(); reject(new Error('Offline check timed out. Check your connection and try again.')); }, type === 'REPAIR' ? 30000 : 15000);
    channel.port1.onmessage = event => { clearTimeout(timer); channel.port1.close(); resolve(event.data); };
    try { worker.postMessage({ type }, [channel.port2]); }
    catch (error) { clearTimeout(timer); channel.port1.close(); reject(error); }
  });
}
// The result of the last update check is reported apart from the offline
// status: "the offline copy is complete" and "the pack server could not be
// reached" are both true at once, and one must not borrow the other's colour.
// `update` is { tone, text } or null (nothing to say beyond the status line).
const UPDATE_CHECKING = { tone: 'info', text: 'Checking the pack server for a newer version…' };
const UPDATE_CURRENT = { tone: 'ok', text: 'Up to date. The pack server has no newer version.' };
const UPDATE_UNREACHABLE = { tone: 'attention', text: 'Update check could not finish. Check your internet connection and try again. The last verified offline status is shown; this check does not change the reference page already open.' };
const UPDATE_READY = 'A new reference version is downloaded. Close ALL Pocket windows, then reopen Pocket to install it.';
const UPDATE_DOWNLOADING = 'A new reference version was found. Downloading and verifying it… keep this page open.';
// The status message is derived from the registration every time, so a refresh
// triggered by visibility or connectivity never hides a waiting or downloading update.
function statusMessage(state, ready = current.updateAvailable) {
  if (state === 'incomplete') return 'Offline copy incomplete. Reconnect to repair it.';
  if (ready) return UPDATE_READY;
  if (registration?.installing && registration?.active) return UPDATE_DOWNLOADING;
  if (state === 'ready') return navigator.onLine ? 'Downloaded references are ready offline.' : 'Offline · using downloaded references.';
  return 'Could not verify offline completeness. Reopen while connected.';
}
async function refreshStatus() {
  const generation = ++statusGeneration;
  const active = navigator.serviceWorker.controller || registration?.active;
  if (verifiedActiveWorker && active !== verifiedActiveWorker) {
    verifiedActiveWorker = null;
    announce({ installed: null, version: null, state: 'checking' });
  }
  function clearChangedWaiting() {
    if (registration?.waiting === verifiedWaitingWorker) return;
    verifiedWaitingWorker = null;
    if (current.downloaded || current.updateAvailable) announce({ downloaded: null, updateAvailable: false,
      message: statusMessage(current.state, false) });
  }
  clearChangedWaiting();
  try {
    const result = await message(active, 'STATUS');
    if (generation !== statusGeneration || active !== (navigator.serviceWorker.controller || registration?.active)) return;
    const installed = identity(result);
    const state = !installed ? 'unavailable' : result?.complete === true ? 'ready' : result?.complete === false ? 'incomplete' : 'unavailable';
    if (installed) verifiedActiveWorker = active;
    announce({ state, installed: installed || current.installed,
      version: installed?.version || current.installed?.version || null,
      message: !installed ? 'The offline worker did not report an installed version. Try checking again.'
        : result?.complete === undefined ? 'Installed version found; offline completeness was not reported by this older copy.'
        : statusMessage(state) });
  } catch (error) {
    if (generation !== statusGeneration) return;
    announce({ state: current.installed ? current.state : 'unavailable',
      message: current.installed ? 'Could not recheck the installed copy. The last verified status is shown.' : error.message });
  }
  if (generation !== statusGeneration) return;
  const waiting = registration?.waiting || null;
  clearChangedWaiting();
  if (!waiting) return;
  try {
    const result = await message(waiting, 'STATUS');
    if (generation !== statusGeneration || waiting !== registration?.waiting) return;
    const downloaded = result?.complete === true ? identity(result) : null;
    if (downloaded) {
      verifiedWaitingWorker = waiting;
      announce({ downloaded, updateAvailable: true, message: statusMessage(current.state, true) });
    } else {
      announce({ downloaded: null, updateAvailable: false,
        message: 'The downloaded update is incomplete. Reconnect and check again.' });
    }
  } catch {
    if (generation !== statusGeneration || waiting !== registration?.waiting) return;
    // A failed repeat check must not erase an already verified waiting worker.
    if (verifiedWaitingWorker !== waiting) announce({ downloaded: null, updateAvailable: false,
      message: 'Could not verify the downloaded update. Reconnect and check again.' });
  }
}
function watch(worker, owner) {
  if (!worker || watchedWorkers.has(worker)) return;
  watchedWorkers.add(worker);
  worker.addEventListener('statechange', () => {
    if (owner !== registration) return;
    if (worker.state === 'installed') {
      refreshStatus();
    }
    if (worker.state === 'redundant') {
      if (current.updateAvailable) refreshStatus();
      else announce({ state: current.installed ? current.state : 'unavailable', retryable: true,
        message: current.installed ? 'Download did not complete. The installed version remains in use. Reconnect and check again.'
          : 'Offline download did not complete. Check your connection and try again.' });
    }
    if (worker.state === 'activated') refreshStatus();
  });
}
async function useRegistration(next, generation) {
  if (!next || generation !== initializationGeneration) return;
  registration = next;
  if (!watchedRegistrations.has(next)) {
    watchedRegistrations.add(next);
    next.addEventListener('updatefound', () => {
      if (next !== registration) return;
      // An update found while a version is already active: say so, because the
      // download and hash check of the whole pack can take a while on a phone.
      if (registration.active) announce({ message: UPDATE_DOWNLOADING, update: null });
      watch(next.installing, next);
    });
  }
  watch(next.installing, next);
  if (navigator.serviceWorker.controller || next.active || next.waiting) await refreshStatus();
  else if (next.installing) announce({ state: 'downloading', retryable: true, message: 'Downloading the complete reference pack. Keep this page open.' });
  else announce({ state: 'unavailable', retryable: true, message: 'No offline installation is running. Check your connection and try again.' });
}
function initialize() {
  if (initialization) return initialization;
  const generation = ++initializationGeneration;
  initialization = Promise.resolve().then(async () => {
    // Registration of an update must not hide an existing controller's status.
    if (navigator.serviceWorker.controller) refreshStatus();
    if (!current.installed) announce({ state: 'checking', retryable: true, update: null, message: 'Connecting to offline installation…' });
    try {
      const next = await bounded(Promise.resolve().then(() => navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' })),
        10000, 'Offline registration did not finish. Check your connection and try again.',
        late => { if (!registration) return useRegistration(late, generation); });
      await useRegistration(next, generation);
    } catch {
      if (generation !== initializationGeneration) return;
      announce({ state: current.installed ? current.state : 'unavailable', retryable: true,
        message: current.installed ? 'Offline registration could not finish. The last verified status is shown. Try checking again.'
          : 'Offline installation could not finish. Check your internet connection and try again.' });
      // A registration may already exist even if registering its update failed.
      try {
        const existing = await bounded(Promise.resolve().then(() => navigator.serviceWorker.getRegistration()),
          10000, 'Offline registration lookup did not finish.', late => { if (!registration) return useRegistration(late, generation); });
        if (existing && !registration) await useRegistration(existing, generation);
      } catch { /* The explicit retry state above remains available. */ }
    }
  }).finally(() => { initialization = null; });
  return initialization;
}
function supported() {
  if ('serviceWorker' in navigator && window.isSecureContext) return true;
  announce({ state: 'unavailable', retryable: false, message: 'Offline installation requires a browser with service workers and HTTPS or a localhost preview.' });
  return false;
}
export async function setupOffline(onState) {
  emit = onState; emit(current);
  if (!supported()) return;
  if (!listening) {
    listening = true;
    navigator.serviceWorker.addEventListener('controllerchange', refreshStatus);
    window.addEventListener('online', refreshStatus);
    window.addEventListener('offline', refreshStatus);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshStatus(); });
  }
  if (registration) await refreshStatus();
  else await initialize();
}
async function runUpdateCheck() {
  if (!supported()) return;
  if (!registration) await initialize();
  if (!registration) return;
  const target = registration;
  let repairWorker = null;
  announce({ update: UPDATE_CHECKING });
  try {
    await bounded(Promise.resolve().then(() => target.update()), 10000,
      'Update check did not finish.', () => { if (target === registration) return refreshStatus(); });
    await refreshStatus();
    if (current.state === 'incomplete' && !registration.waiting && !registration.installing) {
      repairWorker = navigator.serviceWorker.controller || registration.active;
      announce({ state: 'downloading', message: 'Repairing the installed reference download…', update: null });
      const repaired = await message(repairWorker, 'REPAIR');
      await refreshStatus();
      if (!repaired.ok) { announce({ update: { tone: 'attention', text: repaired.message } }); return; }
    }
    // A found update speaks through the status line (downloading / ready).
    announce({ update: registration.installing || registration.waiting ? null : UPDATE_CURRENT });
  } catch {
    if (repairWorker) {
      // The failed operation describes the worker it started against. A newly
      // activated controller (or a later verification) has its own evidence.
      if (repairWorker !== (navigator.serviceWorker.controller || registration?.active)) await refreshStatus();
      else if (current.state === 'downloading') announce({ state: 'incomplete', message: statusMessage('incomplete') });
    }
    announce({ update: UPDATE_UNREACHABLE });
  }
}
export async function checkForUpdates() {
  if (!updateCheck) updateCheck = Promise.resolve().then(runUpdateCheck).finally(() => { updateCheck = null; });
  return updateCheck;
}
export async function applyUpdate() {
  if (!current.updateAvailable || !registration?.waiting) await checkForUpdates();
  if (current.updateAvailable && registration?.waiting) {
    announce({
      updateAvailable: true,
      message: 'A new reference version is ready. Close ALL Pocket windows, then reopen Pocket to install it. This page will not force activation or reload.',
    });
  }
}
