const shell = require('shelljs');
const path = require('path');
const fs = require('fs');
const AdmZip = require('adm-zip');

const {baseDir, distDir, workingDir, manifest} = require('./constants');

function bundleReleaseInfrastructure() {
    shell.cp('-R', path.join(baseDir, 'iac'), path.join(distDir, 'iac'));

    const file = new AdmZip();
    file.addLocalFolder(path.join(baseDir, 'iac'), '');
    const filePath = path.join(workingDir, `infrastructure-ohana-server-${manifest.version}.zip`);
    fs.writeFileSync(filePath, file.toBuffer());

    console.log(`Infrastructure Bundle created @ ${filePath}`);
}

if (require.main === module) {
    bundleReleaseInfrastructure();
}

module.exports = bundleReleaseInfrastructure;
