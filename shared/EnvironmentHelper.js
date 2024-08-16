const {EXTERNAL_ENVIRONMENTS, BAXTER_ENV} = require('./constants');
const isProdEnv = () => EXTERNAL_ENVIRONMENTS.includes(BAXTER_ENV);
const isHotfixEnv = () => BAXTER_ENV === 'hotfix';
const isLocal = () => BAXTER_ENV === 'local';

module.exports = {isProdEnv, isLocal, isHotfixEnv};
