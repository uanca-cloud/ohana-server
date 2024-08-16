const fetch = require('node-fetch'),
    {BASE_URL, DISABLE_CSA_INTEGRATION} = process.env;

let url, response, result;

beforeAll(async () => {
    url = `${BASE_URL}/health`;
});

describe('Given we want to verify a deployment', () => {
    describe('when checking internal connections', () => {
        beforeAll(async () => {
            response = await fetch(url, {
                method: 'get'
            });

            result = await response.json();
        });

        test('then the health endpoint should respond success', async () => {
            expect(response.status).toBe(200);
            expect(result.pass).toBe(true);
        });

        test('then the database connection should be up', async () => {
            expect(result.report.db.status).toBe('fulfilled');
        });

        test('then the redis cache connection should be up', async () => {
            expect(result.report.cache.status).toBe('fulfilled');
        });

        test('then the manifest version should be present', async () => {
            expect(result.report.version.status).toBe('fulfilled');
        });

        test('then the service bus connection should be up', async () => {
            expect(result.report.serviceBus.status).toBe('fulfilled');
        });

        test('then the branch io connection should be up', async () => {
            expect(result.report.branchIO.status).toBe('fulfilled');
        });

        test('then the azure storage connection should be up', async () => {
            expect(result.report.azureStorage.status).toBe('fulfilled');
        });

        test('then the rabbitMQ AMQP connection should be up when DISABLE_CSA_INTEGRATION is false or it should not be up', async () => {
            if (DISABLE_CSA_INTEGRATION && DISABLE_CSA_INTEGRATION !== 'true') {
                expect(result.report.rmqAMQP.status).toBe('fulfilled');
                expect(result.report.rmqAMQP.value.isUp).toBeTruthy();
            } else {
                expect(result.report.rmqAMQP).toBe(undefined);
            }
        });

        test('then the app version should be the same as the database version', async () => {
            expect(result.report.version.value.includes(result.report.db.value)).toBeTruthy();
        });
    });
});
