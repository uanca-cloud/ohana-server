const fetch = require('node-fetch');

let headers;

const {BASE_URL} = process.env;

describe('Given we want to verify a deployment', () => {
    describe('when checking HTTP header rules', () => {
        beforeAll(async () => {
            const response = await fetch(`${BASE_URL}/schema`, {
                method: 'get'
            });

            headers = response.headers;
        });

        // These can only be tested with a live environment at the moment
        test('then the x-content-type-options header should be retrieved', async () => {
            expect(headers.get('x-content-type-options')).toBe("'nosniff'");
        });

        test('then the referrer-policy header should be retrieved', async () => {
            expect(headers.get('referrer-policy')).toBe('strict-origin');
        });

        test('then the feature-policy header should be retrieved', async () => {
            expect(headers.get('feature-policy')).toBe(
                "microphone 'none'; camera 'none'; geolocation 'none'; usb 'none'"
            );
        });

        test('then the strict-transport-security header should be retrieved', async () => {
            expect(headers.get('strict-transport-security')).toBe(
                'max-age=31536000, includeSubdomains'
            );
        });

        test('then the x-frame-options header should be retrieved', async () => {
            expect(headers.get('x-frame-options')).toBe('sameorigin');
        });

        test('then the content-security-policy header should be retrieved', async () => {
            expect(headers.get('content-security-policy')).toBe(
                "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
            );
        });
    });
});
