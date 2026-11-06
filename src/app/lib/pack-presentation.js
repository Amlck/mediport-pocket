// A fetched shell is not proof of the version installed by the service worker.
// Older workers report only a version; enrich it only on an exact match.
export function installedRelease(state, shellRelease) {
  const installed = state.installed || (state.version ? { version: state.version } : null);
  if (!installed) return null;
  if (installed.version !== shellRelease?.version) return installed;
  const notes = shellRelease.releaseNotes || {};
  return {
    ...installed,
    builtAt: installed.builtAt || shellRelease.builtAt || null,
    releaseDate: installed.releaseDate || notes.date || null,
    releaseLabel: installed.releaseLabel || notes.label || null,
    changes: installed.changes?.length ? installed.changes : notes.changes || [],
  };
}
