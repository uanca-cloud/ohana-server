const crypto = require('crypto'),
    {
        AUTHENTICATION_HASHING_ALGORITHM,
        CHALLENGE_LENGTH,
        PUSH_NOTIFICATIONS_BYTE_SIZE,
        BITS_PER_CHARACTER,
        PUSH_NOTIFICATIONS_HASHING_ALGORITHM,
        PUSH_NOTIFICATIONS_ENCRYPTION_ALGORITHM,
        PUSH_NOTIFICATIONS_IV_SIZE,
        ENABLE_STATIC_FM_AUTH_CHALLENGE,
        STATIC_FM_AUTH_CHALLENGE_STRING
    } = require('./constants'),
    {getLogger} = require('./logs/LoggingService');

const logger = getLogger('SecurityService');

function getChallenge() {
    let challenge;

    if (ENABLE_STATIC_FM_AUTH_CHALLENGE) {
        logger.debug('Challenge string generated with predetermined bytes...');
        challenge = STATIC_FM_AUTH_CHALLENGE_STRING;
    } else {
        logger.debug('Generating random challenge string...');
        challenge = crypto.randomBytes(parseInt(CHALLENGE_LENGTH)).toString('base64');
    }

    return challenge;
}

function verifySignature(challengeString, challengeStringSigned, publicKey) {
    logger.debug('Checking signature...');
    const publicKeyArmored = `-----BEGIN PUBLIC KEY-----\n${publicKey}\n-----END PUBLIC KEY-----`;
    const verifier = crypto.createVerify(AUTHENTICATION_HASHING_ALGORITHM);
    verifier.update(challengeString);
    return verifier.verify(publicKeyArmored, challengeStringSigned, 'base64');
}

function encodeBinary(userId, partialKey) {
    logger.debug('Encoding userId...');
    const bufferUserId = Buffer.from(userId);
    const bufferPartialKey = Buffer.from(partialKey, 'base64');
    const hashByteSize = getEncryptionKeyByteSize() - PUSH_NOTIFICATIONS_BYTE_SIZE;
    const hash = crypto.createHash(PUSH_NOTIFICATIONS_HASHING_ALGORITHM);
    hash.update(bufferUserId);
    return Buffer.concat([bufferPartialKey, hash.digest().subarray(0, hashByteSize)]);
}

function encrypt(text, iv, userId, partialKey) {
    logger.debug('Encrypting push notification message...');
    const ivs = Buffer.from(iv, 'base64');
    let encodedKey = encodeBinary(userId, partialKey);
    let cipher = crypto.createCipheriv(PUSH_NOTIFICATIONS_ENCRYPTION_ALGORITHM, encodedKey, ivs);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return encrypted.toString('base64');
}

function getEncryptionKeyByteSize() {
    //Only AES algorithms are supported
    const encryptionKeyBitSize = PUSH_NOTIFICATIONS_ENCRYPTION_ALGORITHM.match(/\d/g).join('');
    return encryptionKeyBitSize / BITS_PER_CHARACTER;
}

function generateIv() {
    logger.debug('Generating random IV string...');
    return crypto.randomBytes(parseInt(PUSH_NOTIFICATIONS_IV_SIZE)).toString('base64');
}

module.exports = {getChallenge, verifySignature, encrypt, generateIv, encodeBinary};
