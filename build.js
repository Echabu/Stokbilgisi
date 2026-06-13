const packager = require('electron-packager');

(async () => {
  try {
    const appPaths = await packager({
      dir: '.',
      out: 'release',
      overwrite: true,
      platform: 'win32',
      arch: 'x64',
      asar: false,
      name: 'StokPlanlayici',
      appVersion: '1.0.0',
      icon: undefined,
    });
    console.log('Packaging completed:', appPaths);
  } catch (error) {
    console.error('Packaging failed:', error);
    process.exit(1);
  }
})();
