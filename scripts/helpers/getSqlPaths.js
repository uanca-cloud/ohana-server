const fs = require('fs');
const semver = require('semver');
const sortBy = require('lodash.sortby');

function getSqlPaths(from, to, path) {
    const range = `>${from} <=${to}`;

    console.log(`Searching for modules applicable to ${range} ...`);

    return sortBy(fs.readdirSync(path)).filter((path) => {
        const tokens = path.split('-');
        if (tokens.length < 1) {
            throw new Error(`Cannot parse path of DB migration! ${path}`);
        }

        console.log(path);
        return semver.satisfies(tokens[0], range);
    });
}

module.exports = getSqlPaths;
