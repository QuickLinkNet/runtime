import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const root = process.cwd();
const sourceRoot = path.join(root, 'src');

function sourceFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(fullPath);
    return /\.tsx?$/.test(entry.name) ? [fullPath] : [];
  });
}

function propertyName(node) {
  return node && (ts.isStringLiteral(node) || ts.isIdentifier(node)) ? node.text : null;
}

function objectProperty(object, name) {
  return object.properties.find((property) => ts.isPropertyAssignment(property) && propertyName(property.name) === name);
}

const files = sourceFiles(sourceRoot);
const catalogKeys = new Set();
const usedKeys = new Map();
const dynamicPatterns = [];
let uncheckedDynamicUsages = 0;
const failures = [];
const allowedJsxText = new Set([
  'RUNTIME', 'R_01', 'R_', 'Compute', 'C ·', 'DEBUG · 1', 'vs', 'pp', 's',
  'Overclock +', 'P', 'RESET ALL', 'DELETE GUESTS', '1V1', 'A', 'B',
]);
const allowedJsxAttributes = new Set(['RUNTIME // Boot Sequence', 'ABCDE']);

function collectMessageExpression(node, file) {
  if (ts.isStringLiteralLike(node)) {
    usedKeys.set(node.text, path.relative(root, file));
    return;
  }
  if (ts.isConditionalExpression(node)) {
    collectMessageExpression(node.whenTrue, file);
    collectMessageExpression(node.whenFalse, file);
    return;
  }
  if (ts.isParenthesizedExpression(node)) {
    collectMessageExpression(node.expression, file);
    return;
  }
  if (ts.isTemplateExpression(node)) {
    dynamicPatterns.push({
      prefix: node.head.text,
      suffix: node.templateSpans.at(-1)?.literal.text ?? '',
      file: path.relative(root, file),
    });
    return;
  }
  uncheckedDynamicUsages += 1;
}

for (const file of files) {
  const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
  const visit = (node) => {
    if (file.includes(`${path.sep}i18n${path.sep}messages${path.sep}`) && ts.isPropertyAssignment(node)) {
      const key = propertyName(node.name);
      const isMessageHelper = ts.isCallExpression(node.initializer) && ts.isIdentifier(node.initializer.expression) && node.initializer.expression.text === 'm';
      const localeProperties = ts.isObjectLiteralExpression(node.initializer)
        ? ['de', 'en', 'nl'].map((locale) => objectProperty(node.initializer, locale))
        : [];
      if (key && (isMessageHelper || localeProperties.some(Boolean))) {
        catalogKeys.add(key);
        if (isMessageHelper) {
          for (const [index, locale] of ['de', 'en', 'nl'].entries()) {
            const value = node.initializer.arguments[index];
            if (!value || !ts.isStringLiteralLike(value) || value.text.trim() === '') failures.push(`${path.relative(root, file)}: ${key} has no non-empty ${locale} translation`);
          }
        } else {
          for (const [index, locale] of ['de', 'en', 'nl'].entries()) {
            const property = localeProperties[index];
            if (!property || !ts.isPropertyAssignment(property) || !ts.isStringLiteralLike(property.initializer) || property.initializer.text.trim() === '') {
              failures.push(`${path.relative(root, file)}: ${key} has no non-empty ${locale} translation`);
            }
          }
        }
      }
    }
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 't') {
      const first = node.arguments[0];
      if (first) collectMessageExpression(first, file);
    }
    if (ts.isJsxText(node)) {
      const text = node.text.replace(/\s+/g, ' ').trim();
      if (/[A-Za-zÄÖÜäöüß]/.test(text) && !allowedJsxText.has(text)) {
        failures.push(`${path.relative(root, file)}: hard-coded JSX text ${JSON.stringify(text)}`);
      }
    }
    if (ts.isJsxAttribute(node) && node.initializer && ts.isStringLiteral(node.initializer)) {
      const name = propertyName(node.name);
      const text = node.initializer.text.trim();
      if (['title', 'aria-label', 'placeholder', 'alt'].includes(name) && /[A-Za-zÄÖÜäöüß]/.test(text) && !allowedJsxAttributes.has(text)) {
        failures.push(`${path.relative(root, file)}: hard-coded ${name} ${JSON.stringify(text)}`);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
}

for (const [key, file] of usedKeys) {
  if (!catalogKeys.has(key)) failures.push(`${file}: missing message key ${key}`);
}
for (const pattern of dynamicPatterns) {
  if (![...catalogKeys].some((key) => key.startsWith(pattern.prefix) && key.endsWith(pattern.suffix))) {
    failures.push(`${pattern.file}: no message key matches dynamic pattern ${pattern.prefix}…${pattern.suffix}`);
  }
}

const cardSourcePath = path.join(sourceRoot, 'i18n', 'cardTranslations.ts');
const cardSource = ts.createSourceFile(cardSourcePath, fs.readFileSync(cardSourcePath, 'utf8'), ts.ScriptTarget.Latest, true);
const translatedCardIds = { en: new Set(), nl: new Set() };
for (const statement of cardSource.statements) {
  if (!ts.isVariableStatement(statement)) continue;
  for (const declaration of statement.declarationList.declarations) {
    if (!ts.isIdentifier(declaration.name) || !['en', 'nl'].includes(declaration.name.text) || !declaration.initializer || !ts.isObjectLiteralExpression(declaration.initializer)) continue;
    const locale = declaration.name.text;
    for (const card of declaration.initializer.properties) {
      if (!ts.isPropertyAssignment(card) || !ts.isArrayLiteralExpression(card.initializer)) continue;
      const id = propertyName(card.name) ?? 'unknown-card';
      translatedCardIds[locale].add(id);
      if (card.initializer.elements.length < 3 || card.initializer.elements.some((value) => !ts.isStringLiteralLike(value) || value.text.trim() === '')) {
        failures.push(`cardTranslations.ts: ${id}.${locale} requires non-empty name, text, and flavor text`);
      }
    }
  }
}

const rawCards = JSON.parse(fs.readFileSync(path.join(root, 'shared', 'cards.json'), 'utf8'));
const rawCardIds = new Set(rawCards.map((card) => card.id));
for (const locale of ['en', 'nl']) {
  const missing = [...rawCardIds].filter((id) => !translatedCardIds[locale].has(id));
  const extras = [...translatedCardIds[locale]].filter((id) => !rawCardIds.has(id));
  if (missing.length) failures.push(`cardTranslations.ts: ${locale} misses ${missing.join(', ')}`);
  if (extras.length) failures.push(`cardTranslations.ts: ${locale} has unknown cards ${extras.join(', ')}`);
}

if (failures.length) {
  console.error(`i18n check failed with ${failures.length} issue(s):\n- ${failures.join('\n- ')}`);
  process.exit(1);
}

console.log(`i18n check passed: ${catalogKeys.size} messages, ${usedKeys.size} literal usages, ${dynamicPatterns.length} dynamic families, ${uncheckedDynamicUsages} runtime keys, ${translatedCardIds.en.size}/${rawCards.length} cards.`);
