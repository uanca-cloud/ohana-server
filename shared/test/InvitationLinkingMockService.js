const FAKE_URL = 'http://vf.hrdev.io';
const FAKE_TIMEOUT = 200;

async function generateMockUrl(registrationToken) {
    // emulate a short delay to the service
    await new Promise((resolve) => {
        setTimeout(resolve, FAKE_TIMEOUT);
    });

    return `${FAKE_URL}?invite=${registrationToken}`;
}

module.exports = {generateMockUrl};
