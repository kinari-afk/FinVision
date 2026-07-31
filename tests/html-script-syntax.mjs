import fs from 'node:fs';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
    .map(match => match[1])
    .filter(source => source.trim());

for (const [index, source] of scripts.entries()) {
    try {
        new Function(source);
    } catch (error) {
        error.message = `Inline script ${index + 1}: ${error.message}`;
        throw error;
    }
}

console.log(`HTML script syntax passed (${scripts.length} inline script).`);
