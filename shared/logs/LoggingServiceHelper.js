function isKeywordPresent(target, keywordSet) {
    if (!target) {
        return false;
    }
    return Object.keys(target).reduce(function (matchFound, key) {
        // If a match has already been found, return it
        if (matchFound) {
            return true;
        }

        if (keywordSet.has(key)) {
            return true; // return true if found match
        }
        // If the current key's value is an object, search within this object
        else if (typeof target[key] === 'object') {
            return isKeywordPresent(target[key], keywordSet);
        }
        return false; // no match found in this iteration
    }, false);
}

module.exports = {
    isKeywordPresent
};
