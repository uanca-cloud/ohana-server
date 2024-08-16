const fetch = require('node-fetch');

const {BASE_URL} = process.env,
    appVersion = '2.0.0';

describe('Given we want to verify a deployment', () => {
    describe('when checking external urls', () => {
        describe('when checking the config endpoint', () => {
            let response;

            beforeAll(async () => {
                response = await fetch(`${BASE_URL}/config`, {
                    method: 'get',
                    headers: {'x-ohana-version': appVersion}
                });
            });

            test('then it should respond success', async () => {
                expect(response.status).toBe(200);
            });

            test('then the app name should be valid', async () => {
                const responseBody = await response.json();
                expect(responseBody.appName).toBe('Voalte Family');
            });
        });

        test('then the schema endpoint should respond success', async () => {
            const response = await fetch(`${BASE_URL}/schema`, {
                method: 'get',
                headers: {'x-ohana-version': appVersion}
            });

            if (
                BASE_URL.includes('stage') ||
                BASE_URL.includes('demo') ||
                BASE_URL.includes('sbx') ||
                BASE_URL.includes('prod')
            ) {
                expect(response.status).toBe(404);
            } else {
                expect(response.status).toBe(200);
            }
        });

        test('then the graphql endpoint should respond success', async () => {
            const body = {
                operationName: 'patientRelationships',
                query: 'query patientRelationships {\n  patientRelationships\n}\n'
            };

            const response = await fetch(`${BASE_URL}/graphql`, {
                method: 'post',
                body: JSON.stringify(body),
                headers: {
                    'Content-Type': 'application/json',
                    'x-ohana-version': appVersion
                }
            });

            const responseBody = await response.json();

            expect(response.status).toBe(200);
            expect(responseBody.data).toBeDefined();
            expect(responseBody.errors).not.toBeDefined();
        });

        test('then the attach media endpoint should respond success', async () => {
            const response = await fetch(`${BASE_URL}/attachMedia`, {
                method: 'head',
                headers: {'x-ohana-version': appVersion}
            });

            expect(response.status).toBe(200);
        });

        test('then the attachment endpoint should respond success', async () => {
            const response = await fetch(`${BASE_URL}/attachment/1/1`, {
                method: 'head',
                headers: {'x-ohana-version': appVersion}
            });

            expect(response.status).toBe(200);
        });
    });
});
