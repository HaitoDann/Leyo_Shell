// Bundle xterm.js + addons en un fichier local
const esbuild = require('esbuild');

esbuild.build({
  entryPoints: ['xterm-src.js'],
  bundle: true,
  outfile: 'xterm-bundle.js',
  format: 'iife',
  globalName: 'LeyoXterm',
  platform: 'browser',
  minify: false,
  sourcemap: false,
}).then(() => {
  console.log('✅ xterm.js bundlé dans xterm-bundle.js');
}).catch(() => process.exit(1));
