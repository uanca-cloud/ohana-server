const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const {workingDir} = require('./constants');

async function downloadAzurePgCaCert() {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

    const response = await fetch('https://dl.cacerts.digicert.com/DigiCertGlobalRootCA.crt.pem');
    const contents = await response.text();

    fs.writeFileSync(path.join(workingDir, 'DigiCertGlobalRootCA.crt.pem'), contents);

    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '1';
}

if (require.main === module) {
    downloadAzurePgCaCert();
}

module.exports = downloadAzurePgCaCert;
