import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { config as delirium } from '../src/shared/delirium-engine.mjs';
import { config as fever } from '../src/shared/new-inpatient-fever-engine.mjs';

const reference = JSON.parse(await readFile(new URL('../src/data/reference.json', import.meta.url)));

test('the delirium limitation states this guide\'s validation scope without dismissing current protocols', () => {
  const limit = delirium.reviewLimitations.find(text => /order sets/.test(text));
  assert.match(limit, /This guide has not validated/);
  assert.match(limit, /current source, version and patient-specific suitability/);
  assert.doesNotMatch(limit, /are not current prescribing guidance/);
  assert.deepEqual(reference.guides.find(guide => guide.id === 'delirium').reviewLimitations, [...delirium.reviewLimitations]);
});

test('stable ICU fever source branches retain their clinical distinctions without unavailable row references', () => {
  const base = { temperatureEvidence: '38_3Reliable', careSetting: 'icu', deterioration: 'absent', anticancerRisk: 'absent', heatEmergency: 'absent', episodePhase: 'initial', comfortMedication: 'notRequested' };
  for (const [focus, id, expected] of [
    ['respiratory', 'respiratory-source-evaluation', /chest radiography.*viral NAAT/],
    ['urinary', 'urinary-source-evaluation', /replacing an indwelling urinary catheter.*newly placed catheter/],
    ['diarrhea', 'enteric-source-evaluation', /Culture, toxin, antigen and PCR tests answer different questions/],
  ]) {
    const action = fever.evaluate({ ...base, focus }).actions.find(action => action.id === id);
    assert.ok(action, focus);
    const text = JSON.stringify(action);
    assert.match(text, expected, focus);
    assert.doesNotMatch(text, /\blocal (?:[\w/-]+\s+){0,3}rows?\b/i, focus);
  }
});

test('wording-reviewed modules and their transformation records match the shipped hashes', async () => {
  for (const name of ['delirium-engine.mjs', 'new-inpatient-fever-engine.mjs']) {
    const digest = createHash('sha256').update(await readFile(new URL('../src/shared/' + name, import.meta.url))).digest('hex');
    const guide = reference.guides.find(guide => guide.engine?.module?.endsWith('/' + name));
    const transform = reference.sources.transformations.find(item => item.sourcePath?.endsWith('/' + name));
    assert.equal(guide.engine.sha256, digest, name);
    assert.equal(guide.engine.files.find(file => file.path.endsWith('/' + name)).sha256, digest, name);
    assert.equal(transform.outputSha256, digest, name);
    assert.equal(transform.originalSha256, reference.sources.hashes[transform.sourcePath], name);
  }
});
