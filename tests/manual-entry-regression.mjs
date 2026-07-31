import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const start = html.indexOf('const ManualEntry = (() => {');
const endMarker = '\n        })();';
const end = html.indexOf(endMarker, start);

assert.notEqual(start, -1, 'ManualEntry source was not found in index.html');
assert.notEqual(end, -1, 'ManualEntry source terminator was not found in index.html');

const source = html
    .slice(start, end + endMarker.length)
    .replace('const ManualEntry =', 'globalThis.ManualEntry =');
const context = {};
vm.runInNewContext(source, context, { filename: 'index.html#ManualEntry' });

const { ManualEntry } = context;
const rawPdfValues = {
    quickAssets: 15440928,
    cash: 15440928,
    inventory: 48137,
    otherCurrentAssets: 10537681,
    fixedAssets: 60000,
    currentLiabilities: 14854942,
    fixedLiabilities: 4408000,
    equity: 6823804,
    revenue: 57642109,
    costOfSales: 0,
    sga: 52953265,
    nonOpIncome: 241047,
    extraordinary: 0,
    taxes: 1024900
};

const multiplier = 0.000001;
const divider = ManualEntry.dividerFromMultiplier(multiplier);
const period = ManualEntry.periodFromReviewValues(rawPdfValues, multiplier);

assert.equal(divider, 1000000, '円単位のPDFは数値調整画面も円単位にする');
assert.equal(ManualEntry.periodStateKey('current'), 'currentPeriod');
assert.equal(ManualEntry.periodStateKey('previous'), 'previousPeriod');
assert.equal(ManualEntry.formatValue(period.bs.cashEquiv, divider), '15440928');
assert.equal(ManualEntry.formatValue(period.bs.inventory, divider), '48137');
assert.equal(ManualEntry.formatValue(period.bs.fixedLiabilities, divider), '4408000');
assert.equal(ManualEntry.formatValue(period.pl.revenue, divider), '57642109');
assert.equal(ManualEntry.formatValue(period.pl.sga, divider), '52953265');
assert.equal(ManualEntry.formatValue(period.pl.taxes, divider), '1024900');

// 百万円表示でも、浮動小数点の内部誤差をそのまま入力欄へ出さない。
assert.equal(ManualEntry.formatValue(5.319999999999999, 1), '5.32');

console.log('Manual entry regression passed: imported PDF values are used as initial values.');

