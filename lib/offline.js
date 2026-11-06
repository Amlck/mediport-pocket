let registration;
let emit = () => {};
let checking = false;
let statusGeneration = 0;
let verifiedActiveWorker = null;
let verifiedWaitingWorker = null;
let current = { state: 'checking', version: null, installed: null, downloaded: null,
  message: 'Checking downloaded references…', updateAvailable: false, update: null };
const announce = patch => { current = { ...current, ...patch }; emit(current); };
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
    const timer = setTimeout(() => reject(new Error('Offline check timed out. Reopen while connected.')), type === 'REPAIR' ? 30000 : 15000);
    channel.port1.onmessage = event => { clearTimeout(timer); channel.port1.close(); resolve(event.data); };
    worker.postMessage({ type }, [channel.port2]);
  });
}
// The result of the last update check is reported apart from the offline
// status: "the offline copy is complete" and "the pack server could not be
// reached" are both true at once, and one must not borrow the other's colour.
// `update` is { tone, text } or null (nothing to say beyond the status line).
const UPDATE_CHECKING = { tone: 'info', text: 'Checking the pack server for a newer version…' };
const UPDATE_CURRENT = { tone: 'ok', text: 'Up to date. The pack server has no newer version.' };
const UPDATE_UNREACHABLE = { tone: 'attention', text: 'Update check failed: the pack server could not be reached. Nothing changed on this phone; the installed version is still complete and works offline. Check that this phone can reach the pack server (VPN connected, Mac awake), then try again.' };
const UPDATE_SLOW = { tone: 'attention', text: 'No answer from the pack server after 10 seconds. The installed version stays in use. Check that this phone can reach the pack server (VPN connected, Mac awake).' };
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
    const state = result?.complete === true ? 'ready' : result?.complete === false ? 'incomplete' : 'unavailable';
    if (installed) verifiedActiveWorker = active;
    announce({ state, installed: installed || current.installed,
      version: installed?.version || current.installed?.version || null,
      message: result?.complete === undefined ? 'Installed version found; offline completeness was not reported by this older copy.'
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
function watch(worker) {
  if (!worker) return;
  worker.addEventListener('statechange', () => {
    if (worker.state === 'installed') {
      refreshStatus();
    }
    if (worker.state === 'redundant') {
      if (current.updateAvailable) refreshStatus();
      else announce({ message: 'Download did not complete. The installed version remains in use. Reconnect and check again.' });
    }
    if (worker.state === 'activated') refreshStatus();
  });
}
export async function setupOffline(onState) {
  emit = onState; emit(current);
  if (!('serviceWorker' in navigator) || !window.isSecureContext) {
    announce({ state: 'unavailable', message: 'Offline installation requires HTTPS or a localhost preview.' }); return;
  }
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    refreshStatus();
  });
  window.addEventListener('online', refreshStatus);
  window.addEventListener('offline', refreshStatus);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshStatus(); });
  try {
    registration = await navigator.serviceWorker.register('./sw.js', { scope: './', updateViaCache: 'none' });
    registration.addEventListener('updatefound', () => {
      // An update found while a version is already active: say so, because the
      // download and hash check of the whole pack can take a while on a phone.
      if (registration.active) announce({ message: UPDATE_DOWNLOADING, update: null });
      watch(registration.installing);
    });
    watch(registration.installing);
    if (registration.active) await refreshStatus();
    else announce({ state: 'downloading', message: 'Downloading the complete reference pack. Keep this page open.' });
    if (registration.waiting) await refreshStatus();
  } catch (error) {
    if (navigator.serviceWorker.controller) {
      registration = await navigator.serviceWorker.getRegistration();
      await refreshStatus();
    } else announce({ state: 'unavailable', message: 'Offline download unavailable. Reconnect and reopen the app.' });
  }
}
export async function checkForUpdates() {
  if (checking) return;
  if (!registration) { announce({ message: 'Offline installation is not available yet. Reopen while connected.' }); return; }
  checking = true;
  announce({ update: UPDATE_CHECKING });
  // iOS lets an unreachable host hang rather than fail; say so instead of going quiet.
  const slow = setTimeout(() => announce({ update: UPDATE_SLOW }), 10000);
  try {
    await registration.update();
    clearTimeout(slow);
    await refreshStatus();
    if (current.state === 'incomplete' && !registration.waiting && !registration.installing) {
      announce({ state: 'downloading', message: 'Repairing the installed reference download…', update: null });
      const repaired = await message(navigator.serviceWorker.controller || registration.active, 'REPAIR');
      await refreshStatus();
      if (!repaired.ok) { announce({ update: { tone: 'attention', text: repaired.message } }); return; }
    }
    // A found update speaks through the status line (downloading / ready).
    announce({ update: registration.installing || registration.waiting ? null : UPDATE_CURRENT });
  } catch { announce({ update: UPDATE_UNREACHABLE }); }
  finally { clearTimeout(slow); checking = false; }
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
