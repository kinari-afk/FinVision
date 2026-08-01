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
vm.runInNewContext(extractModule('ReportMetrics'), context, { filename: 'index.html#ReportMetrics' });

const period3 = context.FinancialSamples.get('period3').period;
const period4 = context.FinancialSamples.get('period4').period;
const comparison = context.ReportMetrics.compare(period4, period3);

assert.equal(context.ReportMetrics.operatingProfit({ revenue: 10, costOfSales: 3, sga: 2, operatingProfit: null, operatingProfitMode: 'reported' }), 5);

assert.ok(Math.abs(comparison.previous.totalAssets - 26.086746) < 1e-9);
assert.ok(Math.abs(comparison.current.totalAssets - 63.983914) < 1e-9);
assert.equal(comparison.previous.operatingProfit, 4.688844);
assert.equal(comparison.current.operatingProfit, 25.90119);
assert.equal(comparison.previous.netProfit, 3.904991);
assert.equal(comparison.current.netProfit, 19.369407);
assert.ok(Math.abs(comparison.changes.revenue.pct - 305.39567349973265) < 1e-9);
assert.ok(Math.abs(comparison.changes.operatingProfit.pct - 452.40033577572643) < 1e-9);
assert.ok(Math.abs(comparison.changes.totalAssets.amount - 37.897168) < 1e-9);
assert.ok(comparison.changes.equityRatioPoints > 14 && comparison.changes.equityRatioPoints < 15);

assert.doesNotMatch(html, /id="pdfRadar|pdfRadarImage|pdfRadarCaption|pdfRadarFallback/);
assert.match(html, /id="pdfReportModeLabel"/);
assert.match(html, /id="pdfBsHeader"/);
assert.match(html, /id="pdfPlHeader"/);
assert.match(html, /renderPdfVisualPage\(comparison/);

console.log('Two-period report regression passed.');
