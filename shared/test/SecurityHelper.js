const crypto = require('crypto'),
    {encodeBinary} = require('../SecurityService'),
    {PUSH_NOTIFICATIONS_ENCRYPTION_ALGORITHM} = require('../constants');

function decrypt(text, iv, userId, partialKey) {
    let encryptedText = Buffer.from(text, 'base64');
    let encryptedIv = Buffer.from(iv, 'base64');
    let key = encodeBinary(userId, partialKey);
    let decipher = crypto.createDecipheriv(
        PUSH_NOTIFICATIONS_ENCRYPTION_ALGORITHM,
        key,
        encryptedIv
    );
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
}

module.exports = {decrypt};
