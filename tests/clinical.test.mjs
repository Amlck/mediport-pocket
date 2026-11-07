import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import * as calculators from '../src/shared/calculators.mjs';
import * as abg from '../src/shared/abg.mjs';
import { reviewLabs } from '../src/app/lib/lab-review.js';
import { evaluateAkiEntry } from '../src/shared/aki-entry.mjs';
import { config as aki } from '../src/shared/aki-composed.mjs';
import { config as hypoglycemia } from '../src/shared/hypoglycemia-engine.mjs';

// Regression fixtures preserve previously reviewed behavior. Passing them is
// not clinical clearance, validation for a new population, or a dosing order.
const F = calculators.CALCULATOR_FORMULAS;
const reference = JSON.parse(await readFile(new URL('../src/data/reference.json', import.meta.url)));
const confirmed = (value, unit, source = 'Reviewed fixture') => ({
  value, unit, source, observedAt: '2026-07-31T06:00:00.000Z', confirmed: true,
});
function renalInput(overrides = {}) {
  return {
    referenceTime: '2026-07-31T08:00:00.000Z',
    age: confirmed(65, 'years'), formulaSex: confirmed('male', null),
    serumCreatinine: confirmed(1.2, 'mg/dL'), height: confirmed(175, 'cm'),
    weights: [confirmed(70, 'kg')], weightMethod: 'actual',
    doseBandCutoffs: [30, 50], context: {}, ...overrides,
  };
}

test('eGFR fixtures preserve estimates and reject absent or malformed required inputs', () => {
  assert.equal(F.egfrCkdEpi2021({ creatinine: 1, age: 60, sex: 'M' }).egfr, 86.2);
  assert.equal(F.egfrCkdEpi2021({ creatinine: '1.0', age: '60', sex: 'f' }).egfr, 64.5);
  assert.equal(F.egfrCkdEpi2021({ creatinine: 0.5, age: 40, sex: 'F' }).egfr, 121.5);
  assert.equal(F.egfrCkdEpi2021({ creatinine: 1.5, age: 70, sex: 'M' }).stage.code, 'G3a');
  for (const input of [{ creatinine: 1, age: 60, sex: '' }, { creatinine: 0, age: 60, sex: 'M' }, { creatinine: 'abc', age: 60, sex: 'M' }]) {
    assert.equal(F.egfrCkdEpi2021(input), null);
  }
  const result = F.egfrCkdEpi2021({ creatinine: 1, age: 60, sex: 'M' });
  assert.ok(result.caveats.some(text => /acute kidney injury|changing creatinine/i.test(text)));
});

test('chemistry fixtures retain albumin assumptions, units and required-input guards', () => {
  const normal = F.anionGap({ sodium: 140, chloride: 104, bicarbonate: 24, albumin: 4 });
  assert.equal(normal.ag, 12); assert.equal(normal.correctedAg, 12); assert.equal(normal.pattern, 'normal');
  const assumed = F.anionGap({ sodium: 140, chloride: 100, bicarbonate: 12 });
  assert.equal(assumed.correctedAg, 28); assert.equal(assumed.deltaRatio, 1.33);
  assert.equal(assumed.albuminAssumed, true);
  assert.ok(assumed.caveats.some(text => /assumed/.test(text)));
  const lowAlbumin = F.anionGap({ sodium: 140, chloride: 106, bicarbonate: 24, albumin: 2 });
  assert.equal(lowAlbumin.ag, 10); assert.equal(lowAlbumin.correctedAg, 15);
  assert.equal(F.anionGap({ sodium: 140, chloride: 104 }), null);
  const calcium = F.correctedCalcium({ calcium: 7.8, albumin: 2.5 });
  assert.equal(calcium.correction, 1.2); assert.equal(calcium.corrected, 9);
  assert.equal(F.correctedCalcium({ calcium: 9 }), null);
  assert.equal(F.bmi({ weightKg: 70, heightCm: 175 }).bmi, 22.9);
  assert.equal(F.map({ systolicBp: 80, diastolicBp: 90 }), null);
});

test('Cockcroft-Gault preserves explicit identity, units and weight ambiguity safeguards', () => {
  const api = calculators.COCKCROFT_GAULT;
  const result = api.calculate(renalInput());
  assert.equal(result.status, 'ready'); assert.equal(result.estimate.value, 60.8);
  assert.equal(result.estimate.unit, 'mL/min');
  assert.match(result.boundary, /Do not substitute eGFR/);
  const si = api.calculate(renalInput({
    serumCreatinine: confirmed(106.08, 'umol/L'), height: confirmed(68.8976, 'in'),
    weights: [{ ...confirmed(154.324, 'lb'), method: 'actual', id: 'scale' }], weightCandidateId: 'scale',
  }));
  assert.equal(si.inputs.serumCreatinine.value, 1.2); assert.equal(si.estimate.value, 60.8);
  const unknownSex = api.calculate(renalInput({ formulaSex: undefined }));
  assert.equal(unknownSex.estimate, null);
  assert.ok(unknownSex.blockers.some(item => item.code === 'formula-sex-missing'));
  const ambiguous = api.calculate(renalInput({ weights: [
    { ...confirmed(70, 'kg'), id: 'morning', method: 'actual' },
    { ...confirmed(74, 'kg'), id: 'evening', method: 'actual' },
  ] }));
  assert.equal(ambiguous.estimate, null);
  assert.ok(ambiguous.blockers.some(item => item.code === 'weight-candidate-ambiguous'));
});

test('public steroid equivalence retains generic conversion and omits hospital product counts', () => {
  const result = F.steroidEquivalence({ drug: 'hydrocortisone', dose: 20, dosesPerDay: 4 });
  assert.equal(result.prednisoloneEquivalentDaily, 20);
  assert.equal(result.hydrocortisoneEquivalentDaily, 80);
  assert.equal(result.conversions.find(item => item.key === 'dexamethasone').dose, 0.75);
  assert.equal(result.meetsProlongedExposureDose, true);
  assert.deepEqual(result.products, []);
  assert.equal(F.steroidEquivalence({ drug: 'hydrocortisone', dose: 0, dosesPerDay: 1 }), null);
  assert.equal(F.steroidEquivalence({ drug: 'hydrocortisone', dose: 20, dosesPerDay: 25 }), null);
});

test('ABG fixtures preserve primary and mixed compensation branches without interpreting invalid inputs', () => {
  const acid = abg.computeABG({ ph: 7.25, paco2: 28, hco3: 12, na: 140, cl: 104, alb: 3 });
  assert.equal(acid.status, 'ok');
  assert.equal(acid.interpretation.primary.code, 'metabolic-acidosis');
  assert.equal(acid.interpretation.compensation.verdict, 'appropriate');
  assert.equal(acid.interpretation.anionGap.corrected, 26.5);
  assert.equal(acid.interpretation.anionGap.deltaRatio, 1.21);
  const mixed = abg.computeABG({ ph: 7.2, paco2: 40, hco3: 15, na: 138, cl: 112 });
  assert.equal(mixed.interpretation.compensation.verdict, 'concurrent-respiratory-acidosis');
  assert.equal(mixed.severity, 'danger');
  assert.equal(abg.computeABG({ ph: '', paco2: 40, hco3: 20 }).status, 'incomplete');
  const invalid = abg.computeABG({ ph: 8.2, paco2: 40, hco3: 20 });
  assert.equal(invalid.status, 'invalid'); assert.equal(invalid.issues[0].code, 'out-of-range');
  assert.equal(abg.computeABG({ ph: 7.3, paco2: 30, hco3: 15, na: 301 }).status, 'invalid');
});

test('independent urine and osmolar workups distinguish missing inputs from true zero values', () => {
  const osm = abg.computeOsmolarGap({ na: 140, glucose: 180, bun: 28, measuredOsm: 320 });
  assert.equal(osm.status, 'ok'); assert.equal(osm.result.gap, 20); assert.equal(osm.result.gapElevated, true);
  const missing = abg.computeOsmolarGap({ na: 140, measuredOsm: 300 });
  assert.equal(missing.status, 'incomplete');
  assert.deepEqual(missing.issues.map(item => [item.field, item.code]), [['glucose', 'required'], ['bun', 'required']]);
  const zero = abg.computeOsmolarGap({ na: 140, glucose: 0, bun: 0 });
  assert.equal(zero.status, 'ok'); assert.equal(zero.result.calculated, 280); assert.equal(zero.result.gap, null);
  const uag = abg.computeUrineAnionGap({ urineSodium: 20, urinePotassium: 15, urineChloride: 60 });
  assert.equal(uag.status, 'ok'); assert.equal(uag.result.uag, -25);
  assert.equal(abg.computeUrineAnionGap({ urineSodium: 20, urinePotassium: 'abc', urineChloride: 60 }).status, 'invalid');
});

test('lab review never substitutes chemistry bicarbonate for the separate blood-gas specimen', () => {
  const review = reviewLabs({ sodium: 140, chloride: 105, bicarbonate: 10, albumin: 3,
    ph: 7.4, paco2: 40, bloodGasBicarbonate: 24 }, { calculators, abg });
  assert.equal(review.results.ag.inputs.bicarbonate, 10);
  assert.equal(review.results.abg.inputs.hco3, 24);
  assert.equal(review.results.abg.inputs.na, null);
  assert.equal(review.results.abg.interpretation.anionGap.available, false);
  assert.match(review.findings.find(item => item.id === 'abg').details.join(' '), /chemistry anion gap is reviewed separately/i);
});

test('AKI entry evidence stays unknown or partial until the time-linked criteria are assessed', () => {
  assert.equal(evaluateAkiEntry({}).akiStatus, 'unknown');
  assert.equal(evaluateAkiEntry({ creatinineRise48h: 'notmet' }).akiStatus, 'possible');
  assert.equal(evaluateAkiEntry({ creatinineRise48h: 'notmet', creatinineBaseline7d: 'notmet', urineOutput6h: 'notmet' }).akiStatus, 'not-established');
  assert.equal(evaluateAkiEntry({ creatinineRise48h: 'met' }).akiStatus, 'confirmed');
  const legacy = aki.evaluate({ akiStatus: 'confirmed' });
  assert.equal(legacy.derived.akiStatus, 'unknown', 'a supplied legacy diagnosis cannot bypass visible entry evidence');
  assert.ok(legacy.entry.criteria.every(item => item.status === 'unknown'));
});

test('hypoglycemia never treats missing glucose or contradictory recovery entries as recovery', () => {
  const unknown = hypoglycemia.evaluate({});
  assert.ok(unknown.actions.some(item => item.id === 'verify-glucose'));
  assert.ok(unknown.actions.every(item => item.stage !== 'rescue' && item.stage !== 'prevent'));
  const conflict = hypoglycemia.evaluate({ glucose: 'below4', rescuePhase: 'recovered-current-above4', safety: 'safe', nutrition: 'oral' });
  assert.ok(conflict.actions.some(item => item.id === 'current-low-overrides-recovery-phase'));
  assert.ok(conflict.actions.every(item => item.stage !== 'prevent'));
  const unsafe = hypoglycemia.evaluate({ glucose: 'aboveSix', rescuePhase: 'recovered-current-above4', safety: 'unsafe', nutrition: 'oral' });
  assert.ok(unsafe.actions.some(item => item.id === 'unsafe-state-blocks-hypoglycemia-recovery'));
  assert.ok(unsafe.actions.every(item => item.stage !== 'prevent'));
});

test('public reference retains source limitations, verified public NTUH links and clinical monitoring targets', () => {
  assert.equal(Object.hasOwn(reference, 'guideResources'), false);
  assert.ok(reference.drugs.length > 100);
  assert.ok(reference.guides.some(item => item.id === 'aki'));
  const taita = reference.drugs.filter(item => item.id.startsWith('taita-'));
  assert.deepEqual(taita.map(item => item.id), ['taita-1', 'taita-2', 'taita-3', 'taita-5']);
  assert.ok(taita.every(item => item.contents?.components?.length && item.references.some(ref => ref.url === null && /Otsuka/.test(ref.text))));
  assert.ok(reference.drugs.every(item => !(item.aliases || []).some(alias => /NTUH|台大|臺大/.test(alias))));
  assert.match(reference.guides.find(item => item.id === 'aki').sourceMetadata.statusOnly, /public-review draft.*not.*final guidance/);
  assert.match(reference.guides.find(item => item.id === 'hypoglycemia').sourceMetadata.statusOnly, /does not make a refreshed-current claim/);
  assert.ok(reference.guides.every(item => Array.isArray(item.reviewLimitations) && item.sources.length > 0));
  const ntuhUrls = new Set([
    'https://reg.ntuh.gov.tw/pharmacyoutside/QueryDrug.aspx',
    'https://www.hch.gov.tw/?aid=72&iid=42&page_name=detail&pid=81',
  ]);
  const hospitalReferences = reference.drugs.flatMap(item => item.references || []).filter(item => /NTUH/i.test(item.text));
  assert.ok(hospitalReferences.length > 0);
  assert.ok(hospitalReferences.every(item => ntuhUrls.has(item.url)));
  assert.match(reference.drugs.find(item => item.id === 'vancomycin').monitoring.join(' '), /400–600/);
  assert.match(reference.drugs.find(item => item.id === 'voriconazole').monitoring.join(' '), /1–5\.5 mg\/L/);
  assert.match(reference.drugs.find(item => item.id === 'colistin').monitoring.join(' '), /2–4 mg\/L/);
});

test('all POCUS image and motion bytes retain their explicit CC BY credits and hashes', async () => {
  const licensed = new Set(['https://creativecommons.org/licenses/by/3.0/', 'https://creativecommons.org/licenses/by/4.0/']);
  assert.equal(reference.pocus.topics.length, 7);
  for (const media of [...reference.pocus.images, ...reference.pocus.videos]) {
    assert.ok(licensed.has(media.licenseUrl));
    assert.match(media.license, /^CC BY [34]\.0$/);
    assert.ok(media.credit && media.changes && media.sourceFigure);
    assert.ok(reference.pocus.sources.some(source => source.id === media.sourceId));
    const bytes = await readFile(new URL('../src/images/pocus/' + media.file, import.meta.url));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), media.sha256, media.file);
    if (media.poster) {
      const poster = await readFile(new URL('../src/images/pocus/' + media.poster, import.meta.url));
      assert.equal(createHash('sha256').update(poster).digest('hex'), media.posterSha256, media.poster);
    }
  }
});
