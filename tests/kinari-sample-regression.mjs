import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

function extractModule(name) {
    const start = html.indexOf(`const ${name} = (() => {`);
    const endMarker = '\n        })();';
    const end = html.indexOf(endMarker, start);
    assert.notEqual(start, -1, `${name} source was not found in index.html`);
    assert.notEqual(end, -1, `${name} source terminator was not found in index.html`);
    return html
        .slice(start, end + endMarker.length)
        .replace(`const ${name} =`, `globalThis.${name} =`);
}

const context = {};
vm.runInNewContext(extractModule('FinancialSamples'), context, { filename: 'index.html#FinancialSamples' });
const { FinancialSamples } = context;

const period3 = FinancialSamples.get('period3');
assert.equal(period3.companyName, '株式会社KINARI');
assert.equal(period3.periodLabel, '令和6年6月1日～令和7年5月31日');
assert.equal(period3.period.bs.cash, 15.440928);
assert.equal(period3.period.bs.cashEquiv, 15.440928);
assert.equal(period3.period.bs.inventory, 0.048137);
assert.equal(period3.period.bs.otherCurrentAssets, 10.537681);
assert.equal(period3.period.bs.fixedAssets, 0.06);
assert.equal(period3.period.bs.currentLiabilities, 14.854942);
assert.equal(period3.period.bs.fixedLiabilities, 4.408);
assert.equal(period3.period.bs.equity, 6.823804);
assert.equal(period3.period.pl.revenue, 57.642109);
assert.equal(period3.period.pl.costOfSales, 0);
assert.equal(period3.period.pl.sga, 52.953265);
assert.equal(period3.period.pl.operatingProfit, 4.688844);
assert.equal(period3.period.pl.nonOpIncome, 0.241047);
assert.equal(period3.period.pl.taxes, 1.0249);
assert.equal(
    period3.period.bs.cashEquiv + period3.period.bs.inventory + period3.period.bs.otherCurrentAssets + period3.period.bs.fixedAssets,
    period3.period.bs.currentLiabilities + period3.period.bs.fixedLiabilities + period3.period.bs.equity
);
assert.ok(Math.abs(period3.period.pl.revenue - period3.period.pl.costOfSales - period3.period.pl.sga - period3.period.pl.operatingProfit) < 1e-9);
assert.equal(period3.sgaDetail.length, 25);
assert.ok(Math.abs(period3.sgaDetail.reduce((sum, item) => sum + item.value, 0) - 52.953265) < 1e-9);

const period4 = FinancialSamples.get('period4');
assert.equal(period4.periodLabel, '令和7年6月1日～令和8年5月31日');
assert.equal(period4.period.bs.cash, 40.535018);
assert.equal(period4.period.bs.cashEquiv, 40.535018);
assert.equal(period4.period.bs.inventory, 1.401006);
assert.equal(period4.period.bs.otherCurrentAssets, 15.055555);
assert.equal(period4.period.bs.fixedAssets, 6.992335);
assert.equal(period4.period.bs.currentLiabilities, 26.944703);
assert.equal(period4.period.bs.fixedLiabilities, 10.846);
assert.equal(period4.period.bs.equity, 26.193211);
assert.equal(period4.period.pl.revenue, 233.678616);
assert.equal(period4.period.pl.costOfSales, 112.708702);
assert.equal(period4.period.pl.sga, 95.068724);
assert.equal(period4.period.pl.operatingProfit, 25.90119);
assert.equal(period4.period.pl.nonOpIncome, 1.131117);
assert.equal(period4.period.pl.taxes, 7.6629);
assert.ok(Math.abs(
    period4.period.bs.cashEquiv + period4.period.bs.inventory + period4.period.bs.otherCurrentAssets + period4.period.bs.fixedAssets
    - period4.period.bs.currentLiabilities - period4.period.bs.fixedLiabilities - period4.period.bs.equity
) < 1e-9);
assert.ok(Math.abs(period4.period.pl.revenue - period4.period.pl.costOfSales - period4.period.pl.sga - period4.period.pl.operatingProfit) < 1e-9);

const comparison = FinancialSamples.stateFor('comparison');
assert.equal(comparison.viewMode, 'compare');
assert.equal(comparison.previousPeriod.bs.equity, period3.period.bs.equity);
assert.equal(comparison.currentPeriod.bs.equity, period4.period.bs.equity);
assert.deepEqual(
    Array.from(Object.values(comparison.manualInputUnits)),
    [1000000, 1000000],
    '元資料の円単位で数値調整画面を開ける'
);

assert.match(html, /loadFinancialSample\('period3'\)/);
assert.match(html, /loadFinancialSample\('period4'\)/);
assert.match(html, /loadFinancialSample\('comparison'\)/);

console.log('KINARI sample regression passed.');
