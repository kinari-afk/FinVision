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

// PDF記載の営業利益と、売上高－売上原価－販管費の計算値を別々に保持する。
const reviewed = ManualEntry.periodFromReviewValues({
    revenue: 1000,
    costOfSales: 200,
    sga: 500,
    operatingProfit: 250,
    operatingProfitMode: 'reported'
}, 0.001);

assert.equal(reviewed.pl.operatingProfit, 0.25, 'PDF記載の営業利益を保持する');
assert.equal(reviewed.pl.operatingProfitMode, 'reported', 'PDF記載値を採用できる');
assert.equal(ManualEntry.calculatedOperatingProfit(reviewed.pl), 0.3);
assert.equal(ManualEntry.resolveOperatingProfit(reviewed.pl), 0.25);

const comparison = ManualEntry.compareOperatingProfit(reviewed.pl, 0.001);
assert.equal(comparison.reported, 0.25);
assert.equal(comparison.calculated, 0.3);
assert.equal(comparison.difference, -0.05);
assert.equal(comparison.hasDifference, true, '営業利益の差異を検出する');

reviewed.pl.operatingProfitMode = 'calculated';
assert.equal(ManualEntry.resolveOperatingProfit(reviewed.pl), 0.3, '計算値も選択できる');

// 連続して読み込んだ場合は、一覧表の参照元が必ず2回目の値へ置き換わる。
const baseState = {
    companyName: '旧データ',
    currentPeriod: ManualEntry.periodFromReviewValues({ revenue: 100 }, 1),
    previousPeriod: ManualEntry.periodFromReviewValues({ revenue: 80 }, 1),
    manualInputUnits: { current: 1, previous: 1 }
};
const firstPeriod = ManualEntry.periodFromReviewValues({ revenue: 111 }, 1);
const firstImport = ManualEntry.mergeImportedPeriod(baseState, firstPeriod, 'current', '1回目', 1, { fileName: 'first.pdf' });
const secondPeriod = ManualEntry.periodFromReviewValues({ revenue: 222222222 }, 0.000001);
const secondImport = ManualEntry.mergeImportedPeriod(firstImport, secondPeriod, 'current', '2回目', 1000000, { fileName: 'second.pdf' });

assert.equal(secondImport.currentPeriod.pl.revenue, 222.222222);
assert.equal(secondImport.companyName, '2回目');
assert.equal(secondImport.importMeta.fileName, 'second.pdf');
assert.equal(ManualEntry.rawValueDisplay(secondImport.currentPeriod.pl.revenue, 1000000), '222,222,222');
assert.equal(ManualEntry.rawUnitLabel(1000000), '円');

// 業界比較に訪問看護・訪問介護が選択肢と基準値の両方で存在する。
assert.match(html, /<option value="homeNursing">訪問看護<\/option>/);
assert.match(html, /<option value="homeCare">訪問介護<\/option>/);
assert.match(html, /homeNursing:\s*\{[^}]*name:\s*'訪問看護'/s);
assert.match(html, /homeCare:\s*\{[^}]*name:\s*'訪問介護'/s);

console.log('Financial workflow regression passed.');
