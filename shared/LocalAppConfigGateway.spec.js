const {getKeysByGlob} = require('./LocalAppConfigGateway'),
    additionalTestEnvVars = require('./test/testEnv');

afterAll(() => {});

describe('Given we want to load tenant credentials', () => {
    describe('when we communicate with the local env', () => {
        test('then it returns the credentials for tenant', () => {
            process.env = {
                ...process.env,
                ...additionalTestEnvVars
            };
            expect(getKeysByGlob('CSA_00JL_')).resolves.toEqual({
                http: {credential: 'ohanahttp123credential1', secret: 'ohanahttp123secret1'},
                rmq: {credential: 'ohanarmq456credential1', secret: 'ohanarmq456secret1'}
            });
        });

        test('then it returns empty values for missing tenant', () => {
            expect(getKeysByGlob('CSA_00JK_')).resolves.toEqual({
                http: {credential: null, secret: null},
                rmq: {credential: null, secret: null}
            });
        });
    });
});
