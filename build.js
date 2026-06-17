const fs = require('fs');
const path = require('path');
const babel = require('@babel/core');

const htmlPath = path.join(__dirname, 'index.html');
const backupPath = path.join(__dirname, 'index.html.bak');
const jsOutputPath = path.join(__dirname, 'app.js');

console.log('Starting build process...');

try {
  // Read index.html
  if (!fs.existsSync(htmlPath)) {
    console.error('index.html not found!');
    process.exit(1);
  }

  const htmlContent = fs.readFileSync(htmlPath, 'utf8');

  // Extract Babel script content
  const scriptRegex = /<script\s+type="text\/babel">([\s\S]*?)<\/script>/;
  const match = htmlContent.match(scriptRegex);

  if (!match) {
    console.error('Could not find <script type="text/babel"> in index.html');
    process.exit(1);
  }

  const jsxCode = match[1];
  console.log(`Extracted ${jsxCode.length} characters of JSX code.`);

  // Transpile JSX code using Babel
  console.log('Transpiling JSX to JS...');
  const result = babel.transformSync(jsxCode, {
    presets: ['@babel/preset-react'],
    filename: 'index.html',
    compact: false,
    comments: true,
  });

  if (!result || !result.code) {
    throw new Error('Transpilation failed, no output generated.');
  }

  console.log(`Transpilation complete. Writing compiled JS to ${jsOutputPath}...`);
  fs.writeFileSync(jsOutputPath, result.code, 'utf8');

  // Create a backup of index.html if not already exists
  if (!fs.existsSync(backupPath)) {
    console.log(`Creating backup of index.html at ${backupPath}...`);
    fs.writeFileSync(backupPath, htmlContent, 'utf8');
  }

  // Update index.html:
  // 1. Remove the babel-standalone script tag:
  //    <script src="https://unpkg.com/@babel/standalone/babel.min.js" crossorigin></script>
  // 2. Replace the inline <script type="text/babel"> block with <script src="app.js"></script>
  console.log('Updating index.html...');
  let updatedHtml = htmlContent;

  // Remove babel-standalone script tag
  updatedHtml = updatedHtml.replace(
    /<script\s+src="https:\/\/unpkg\.com\/@babel\/standalone\/babel\.min\.js"\s+crossorigin><\/script>\s*/i,
    ''
  );

  // Replace inline script with external script reference
  updatedHtml = updatedHtml.replace(
    scriptRegex,
    '<script src="app.js"></script>'
  );

  fs.writeFileSync(htmlPath, updatedHtml, 'utf8');
  console.log('Build completed successfully!');

} catch (error) {
  console.error('Build failed:');
  console.error(error.stack || error.message);
  process.exit(1);
}
