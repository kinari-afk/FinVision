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
vm.runInNewContext(extractModule('DataMemory'), context, { filename: 'index.html#DataMemory' });
vm.runInNewContext(extractModule('RadarScoring'), context, { filename: 'index.html#RadarScoring' });

const { DataMemory, RadarScoring } = context;

// 自社スコアは自社の実数値から計算し、業界平均の50点固定値とは分離する。
const benchmark = { current: 100, equity: 40, opMargin: 10, roe: 8, turnover: 1 };
const comparison = RadarScoring.compare({
    currentRatio: 200,
    equityRatio: 20,
    opMargin: 5,
    roe: 16,
    turnover: 0.5
}, benchmark);
assert.deepEqual(Array.from(comparison.company), [100, 25, 25, 100, 25]);
assert.deepEqual(Array.from(comparison.industry), [50, 50, 50, 50, 50]);
assert.notDeepEqual(Array.from(comparison.company), Array.from(comparison.industry));
assert.match(html, /datasets\[0\]\.data\s*=\s*comparison\.company/);
assert.match(html, /datasets\[1\]\.data\s*=\s*comparison\.industry/);

// ブラウザ保存は3件までで、保存データは元の状態から独立したコピーになる。
let slots = [];
for (let index = 0; index < 3; index += 1) {
    const result = DataMemory.add(slots, { companyName: `企業${index + 1}`, currentPeriod: { value: index } }, `保存${index + 1}`, `2026-07-31T00:0${index}:00.000Z`);
    assert.equal(result.ok, true);
    slots = result.slots;
}
assert.equal(slots.length, 3);
assert.equal(DataMemory.add(slots, { companyName: '4社目' }, '保存4', '2026-07-31T01:00:00.000Z').ok, false);
const restored = DataMemory.stateAt(slots, slots[0].id);
restored.companyName = '変更後';
assert.equal(slots[0].state.companyName, '企業1');
slots = DataMemory.remove(slots, slots[1].id);
assert.equal(slots.length, 2);

// サンプル会社を初期表示せず、保存3枠を表示する。
assert.doesNotMatch(html, /samplePresets|loadSampleData\(/);
assert.match(html, /id="memorySlots"/);
assert.match(html, /saveCurrentToMemory\(\)/);

// 2期比較は期間全体の高さを縮小しない（極端な規模差でも親枠からはみ出さない）。
assert.doesNotMatch(html, /const pScale|const cScale|style\.height\s*=\s*`\$\{pScale/);
assert.match(html, /id="bsDiagramContainer"[^>]*overflow-hidden/);

// レポートの2ページ目に指定された3つの財務構造図を持ち、レーダーは含めない。
for (const id of ['pdfPage2', 'pdfBsStructure', 'pdfPlBlockStructure', 'pdfPlWaterfallStructure']) {
    assert.match(html, new RegExp(`id="${id}"`), `${id} is missing from the report`);
}
assert.doesNotMatch(html, /id="pdfRadar|pdfRadarImage|pdfRadarCaption|pdfRadarFallback/);
assert.match(html, /report-page-break/);

console.log('UI memory/report regression passed.');
