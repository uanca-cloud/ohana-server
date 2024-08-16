module.exports = {
    globals: {
        fail: false
    },
    parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'script',
        requireConfigFile: false
    },
    env: {
        browser: true,
        jest: true,
        es6: true,
        node: true
    },
    extends: ['eslint:recommended'],
    rules: {
        'comma-dangle': ['error', 'never'],
        'no-bitwise': 2,
        camelcase: 'off',
        'no-proto': 2,
        curly: 2,
        eqeqeq: 2,
        'no-extend-native': 2,
        'wrap-iife': [2, 'any'],
        'no-use-before-define': [
            2,
            {
                functions: false
            }
        ],
        'new-cap': 2,
        'no-caller': 2,
        'no-new': 2,
        quotes: [
            2,
            'single',
            {
                allowTemplateLiterals: true,
                avoidEscape: true
            }
        ],
        strict: [0, 'global'],
        'dot-notation': 0,
        'no-undef': 2,
        'no-unused-vars': [
            'error',
            {
                args: 'all',
                varsIgnorePattern: '^_',
                argsIgnorePattern: '^_'
            }
        ]
    }
};
