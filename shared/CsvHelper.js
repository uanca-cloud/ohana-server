const fs = require('fs'),
    {promisify} = require('util');

async function appendToCsvFile(path, row) {
    const data = row.join(',') + '\n';
    const appendFileAsync = promisify(fs.appendFile).bind(fs);

    return appendFileAsync(path, data);
}

module.exports = {appendToCsvFile};
