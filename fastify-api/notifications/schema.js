module.exports = {
    type: 'object',
    properties: {
        type: {type: 'string', enum: ['register', 'send']},
        payload: {
            type: 'object',
            properties: {
                userId: {type: 'string'},
                notificationPlatform: {type: 'string', enum: ['gcm', 'apns']},
                deviceToken: {type: 'string'},
                message: {
                    type: 'object',
                    oneOf: [
                        {
                            properties: {
                                data: {
                                    type: 'object',
                                    properties: {
                                        message: {type: 'string'}
                                    },
                                    required: ['message']
                                }
                            },
                            required: ['data']
                        },
                        {
                            properties: {
                                apns: {
                                    type: 'object',
                                    properties: {
                                        alert: {type: 'string'}
                                    },
                                    required: ['alert']
                                }
                            },
                            required: ['apns']
                        }
                    ]
                }
            },
            required: ['userId', 'notificationPlatform'],
            anyOf: [
                {
                    required: ['message']
                },
                {
                    required: ['deviceToken']
                }
            ]
        }
    },
    required: ['type', 'payload']
};
