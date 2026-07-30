import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const start = html.indexOf('const FinReader = (() => {');
const endMarker = '\n        })();';
const end = html.indexOf(endMarker, start);

assert.notEqual(start, -1, 'FinReader source was not found in index.html');
assert.notEqual(end, -1, 'FinReader source terminator was not found in index.html');

const source = html
    .slice(start, end + endMarker.length)
    .replace('const FinReader =', 'globalThis.FinReader =');
const context = { console };
vm.runInNewContext(source, context, { filename: 'index.html#FinReader' });

const { FinReader } = context;
const page = (pageNumber, kind, lines) => ({
    page: pageNumber,
    kind,
    lines: FinReader.linesFromPlainText(lines.join('\n'))
});

// Synthetic transcript that reproduces the Tesseract failure shape. The OCR has
// read nearly all digits, but thousands groups are separate tokens on many lines.
const pages = [
    page(2, 'bs', [
        '令 和 7 年 5 月 31 日 現在 (単位 : 円 )',
        '現 預 金 計 12, 345, 678',
        '当 座 資 産 計 12, 345, 678',
        '棚 人 卸 資 産 計 ーー 37.246',
        'その 他 流 動 資 産 計 9, 876, 543',
        '流 動 資 産 計 22, 259, 467',
        '固 定 資 産 計 60,000',
        '資産 の 部 合計 22, 319, 467'
    ]),
    page(3, 'bs', [
        '流 動 負 債 計 13, 111, 222',
        '固 定 負 債 計 4 333, 000',
        '負債 の 部 合計 17, 444, 222',
        '株 主 資 本 計 4, 875, 245',
        '純資産 の 部 計 45, 875, 245',
        '負債 ・ 純 資産 の 部 計 22, 319, 467'
    ]),
    page(4, 'pl', [
        '純 ” 売 上 高 54. 321.098',
        '売 上 総 利益 54,.321, 098',
        '販売 費 ・ 一 般 管理 費 計 49, 876, 543',
        '営業 利 益 4, 444, 555',
        '営業 外 損 益 計 123, 456',
        '法人 税 ・ 住 民 税 ・ 事 業 税 987,654'
    ])
];

const result = FinReader.reconcile(FinReader.extract(pages));
const actual = Object.fromEntries(result.rows.map(row => [row.key, row.value]));
const expected = {
    quickAssets: 12345678,
    cash: 12345678,
    inventory: 37246,
    otherCurrentAssets: 9876543,
    fixedAssets: 60000,
    currentLiabilities: 13111222,
    fixedLiabilities: 4333000,
    equity: 4875245,
    revenue: 54321098,
    sga: 49876543,
    nonOpIncome: 123456,
    taxes: 987654
};

const mismatches = Object.entries(expected)
    .filter(([key, value]) => actual[key] !== value)
    .map(([key, value]) => ({ key, expected: value, actual: actual[key] ?? null }));

assert.deepEqual(mismatches, [], `OCR regression mismatches:\n${JSON.stringify(mismatches, null, 2)}`);
console.log('OCR regression passed:', JSON.stringify(expected));

