let resolver = null,
    ohanaSharedPackage = null,
    rateLimit = null;

const {
    CONSTANTS: {
        MEDIA_TYPES: {TEXT}
    }
} = require('ohana-shared');

beforeEach(() => {
    jest.mock('ohana-shared', () => ({
        ...jest.requireActual('ohana-shared'),
        getRedisCollectionData: jest.fn(() => {
            return {encounterId: 1, userId: 1};
        }),
        delRedisCollectionData: jest.fn(() => true),
        // eslint-disable-next-line camelcase
        createUpdate: jest.fn(() => ({rows: [{created_at: '2021-06-15T18:22:15.548Z'}]})),
        createAuditEvent: jest.fn(() => true),
        getPatientByEncounterId: jest.fn(() => {
            return {
                id: 1
            };
        }),
        createNotificationHub: jest.fn(() => {}),
        validateUpdate: jest.fn(),
        sendPushNotification: jest.fn(() => true),
        findDeviceByUserId: jest.fn(() => {
            return {
                notificationPlatform: 'gcm',
                iv: 'YWFhYWFhYWFhYWFhYWFhYQ=='
            };
        }),
        getFamilyMemberDevices: jest.fn(() => null),
        getFamilyMembersByPatientId: jest.fn(() => null),
        getAttachmentsByUpdateId: jest.fn(() => [
            {
                id: '2323232232',
                updateId: '411242114212',
                thumbUrl: 'thumbnailurl',
                originalUrl: 'originalurl',
                filename: 'filename',
                type: 'image/jpeg'
            }
        ]),
        writeLog: jest.fn(() => {}),
        translateText: jest.fn(() => [{text: 'testtest', locale: 'es_ES'}]),
        createAttachment: jest.fn(() => {
            return {rows: [{id: '1234'}]};
        }),
        getTenantSetting: jest.fn(() => ({key: 'enableFreeTextTranslation', value: 'true'})),
        encrypt: jest.fn(() => 'encryptedText'),
        generatePushNotificationPayload: jest.fn(() => ({
            notification: {
                title: 'test',
                body: {}
            },
            data: {
                message: 'test',
                sender: 'test',
                type: 'text',
                mediaType: 'text'
            },
            priority: 'high',
            badge: 2
        })),
        getChatCountForPatientId: jest.fn(() => Promise.resolve(1)),
        getUnreadUpdatesByPatientId: jest.fn(() => Promise.resolve(1))
    }));

    jest.mock('../RateLimit', () => ({
        fixed: jest.fn()
    }));

    jest.mock('uuid', () => ({
        v4: jest.fn(() => '1234')
    }));
    rateLimit = require('../RateLimit');
    ohanaSharedPackage = require('ohana-shared');
    resolver = require('./CommitUpdateResolver');
});

afterEach(() => {
    jest.unmock('ohana-shared');
    jest.unmock('../RateLimit');
});

describe('Given we want to resolve a GQL mutation to commit an update', () => {
    describe('when valid input is provided', () => {
        test('then it should return the update', async () => {
            const result = await resolver(
                null,
                {
                    input: {
                        encounterId: 1,
                        updateId: '411242114212',
                        text: 'testtest'
                    }
                },
                {
                    userId: 1,
                    sessionId: '82b4a340-7856-4cb4-ad23-7486626b63c7',
                    deviceId: 1,
                    firstName: 'Vlad',
                    lastName: 'Doe',
                    role: 'ApprovedUser',
                    assignedRoles: ['ApprovedUser'],
                    title: 'RN',
                    eulaAcceptTimestamp: new Date()
                }
            );

            expect(result).toEqual(
                expect.objectContaining({
                    id: '411242114212',
                    text: 'testtest',
                    attachments: [
                        {
                            id: '2323232232',
                            updateId: '411242114212',
                            thumbUrl: 'thumbnailurl',
                            originalUrl: 'originalurl',
                            filename: 'filename',
                            type: 'image/jpeg'
                        }
                    ],
                    createdAt: '2021-06-15T18:22:15.548Z',
                    caregiver: {
                        id: 1,
                        tenant: {id: undefined},
                        role: 'ApprovedUser',
                        assignedRoles: ['ApprovedUser'],
                        firstName: 'Vlad',
                        lastName: 'Doe',
                        title: 'RN',
                        acceptedEula: true,
                        renewEula: true
                    }
                })
            );
        });
        test(`then it should be rate limited if the input type is ${TEXT}`, async () => {
            await resolver(
                null,
                {
                    input: {
                        encounterId: 1,
                        updateId: '411242114212',
                        text: 'testtest',
                        type: TEXT
                    }
                },
                {
                    userId: 1,
                    sessionId: '82b4a340-7856-4cb4-ad23-7486626b63c7',
                    deviceId: 1,
                    firstName: 'Vlad',
                    lastName: 'Doe',
                    role: 'ApprovedUser',
                    title: 'RN',
                    eulaAcceptTimestamp: new Date()
                }
            );
            expect(rateLimit.fixed).toHaveBeenCalled();
        });
        test(`then it shouldn't be rate limited if the input type is not ${TEXT}`, async () => {
            await resolver(
                null,
                {
                    input: {
                        encounterId: 1,
                        updateId: '411242114212',
                        text: 'testtest',
                        type: 'not' + TEXT
                    }
                },
                {
                    userId: 1,
                    sessionId: '82b4a340-7856-4cb4-ad23-7486626b63c7',
                    deviceId: 1,
                    firstName: 'Vlad',
                    lastName: 'Doe',
                    role: 'ApprovedUser',
                    title: 'RN',
                    eulaAcceptTimestamp: new Date()
                }
            );
            expect(rateLimit.fixed).not.toHaveBeenCalled();
        });
    });

    describe('when encounter id is incorrect', () => {
        test('then it should throw', async () => {
            ohanaSharedPackage.getRedisCollectionData.mockImplementationOnce(() => ({
                encounterId: 2,
                userId: 1
            }));
            try {
                await resolver(
                    null,
                    {
                        input: {
                            encounterId: 1,
                            updateId: '411242114212',
                            text: 'testtest'
                        }
                    },
                    {userId: 1}
                );
            } catch (err) {
                expect(err.extensions.description).toBe('Invalid encounter id or user id');
                expect(err.message).toBe('Validation Error');
            }
        });
    });

    describe('when user id is incorrect', () => {
        test('then it should throw', async () => {
            ohanaSharedPackage.getRedisCollectionData.mockImplementationOnce(() => ({
                encounterId: 1,
                userId: 2
            }));
            try {
                await resolver(
                    null,
                    {
                        input: {
                            encounterId: 1,
                            updateId: '411242114212',
                            text: 'testtest'
                        }
                    },
                    {userId: 1}
                );
            } catch (err) {
                expect(err.extensions.description).toBe('Invalid encounter id or user id');
                expect(err.message).toBe('Validation Error');
            }
        });
    });

    describe('when attachment has photos', () => {
        test('then it should return the update with photo attachment', async () => {
            ohanaSharedPackage.getAttachmentsByUpdateId.mockImplementationOnce(() => [
                {
                    id: '2323232232',
                    updateId: '411242114212',
                    thumbUrl: 'thumbnailurl',
                    originalUrl: 'originalurl',
                    filename: 'filename',
                    type: 'photo'
                }
            ]);

            const result = await resolver(
                null,
                {
                    input: {
                        encounterId: 1,
                        updateId: '411242114212',
                        text: 'testtest'
                    }
                },
                {
                    userId: 1,
                    sessionId: '82b4a340-7856-4cb4-ad23-7486626b63c7',
                    deviceId: 1,
                    firstName: 'Vlad',
                    lastName: 'Doe',
                    role: 'ApprovedUser',
                    title: 'RN',
                    eulaAcceptTimestamp: new Date(),
                    version: '1.6.0'
                }
            );

            expect(result).toEqual(
                expect.objectContaining({
                    id: '411242114212',
                    text: 'testtest',
                    attachments: [
                        {
                            id: '2323232232',
                            updateId: '411242114212',
                            thumbUrl: 'thumbnailurl',
                            originalUrl: 'originalurl',
                            filename: 'filename',
                            type: 'photo'
                        }
                    ],
                    createdAt: '2021-06-15T18:22:15.548Z',
                    caregiver: {
                        id: 1,
                        tenant: {id: undefined},
                        role: 'ApprovedUser',
                        firstName: 'Vlad',
                        lastName: 'Doe',
                        title: 'RN',
                        acceptedEula: true,
                        renewEula: true
                    }
                })
            );
        });
    });

    describe('when attachment does not have photos', () => {
        test('then it should return the update with text attachment', async () => {
            ohanaSharedPackage.getAttachmentsByUpdateId.mockImplementationOnce(() => [
                {
                    id: '2323232232',
                    updateId: '411242114212',
                    type: 'text'
                }
            ]);

            const result = await resolver(
                null,
                {
                    input: {
                        encounterId: 1,
                        updateId: '411242114212',
                        text: 'testtest'
                    }
                },
                {
                    userId: 1,
                    sessionId: '82b4a340-7856-4cb4-ad23-7486626b63c7',
                    deviceId: 1,
                    firstName: 'Vlad',
                    lastName: 'Doe',
                    role: 'ApprovedUser',
                    title: 'RN',
                    eulaAcceptTimestamp: new Date(),
                    version: '1.6.0'
                }
            );

            expect(result).toEqual(
                expect.objectContaining({
                    id: '411242114212',
                    text: 'testtest',
                    attachments: [
                        {
                            id: '2323232232',
                            updateId: '411242114212',
                            type: 'text'
                        }
                    ],
                    createdAt: '2021-06-15T18:22:15.548Z',
                    caregiver: {
                        id: 1,
                        tenant: {id: undefined},
                        role: 'ApprovedUser',
                        firstName: 'Vlad',
                        lastName: 'Doe',
                        title: 'RN',
                        acceptedEula: true,
                        renewEula: true
                    }
                })
            );
        });
    });

    describe('when patient id is incorrect', () => {
        test('then it should throw', async () => {
            ohanaSharedPackage.getPatientByEncounterId.mockImplementationOnce(() => null);
            try {
                await resolver(
                    null,
                    {
                        input: {
                            encounterId: 1,
                            updateId: '411242114212',
                            text: 'testtest'
                        }
                    },
                    {userId: 1, version: '1.6.0'}
                );
            } catch (err) {
                expect(err.extensions.description).toBe('Patient not found');
                expect(err.message).toBe('Not Found Error');
            }
        });
    });

    describe('when an update cannot be created', () => {
        test('then it should throw', async () => {
            ohanaSharedPackage.createUpdate.mockImplementationOnce(() => null);
            await resolver(
                null,
                {
                    input: {
                        encounterId: 1,
                        updateId: '411242114212',
                        text: 'testtest'
                    }
                },
                {userId: 1, version: '1.6.0'}
            )
                .then(() => {
                    fail('Error should occur');
                })
                .catch((e) => {
                    expect(e.name).toBe('Error');
                });
        });
    });

    describe('when update type is text and app version is 1.6.0', () => {
        describe('when free text translation is not allowed', () => {
            test('then it should not return the translation', async () => {
                ohanaSharedPackage.getTenantSetting.mockImplementationOnce(() => ({
                    key: 'enableFreeTextTranslation',
                    value: 'false'
                }));

                const result = await resolver(
                    null,
                    {
                        input: {
                            encounterId: 1,
                            updateId: '411242114212',
                            text: 'testtest',
                            type: 'text'
                        }
                    },
                    {
                        userId: 1,
                        sessionId: '82b4a340-7856-4cb4-ad23-7486626b63c7',
                        deviceId: 1,
                        firstName: 'Vlad',
                        lastName: 'Doe',
                        role: 'ApprovedUser',
                        title: 'RN',
                        eulaAcceptTimestamp: new Date(),
                        version: '1.6.0'
                    }
                );

                expect(result).toEqual(
                    expect.objectContaining({
                        id: '411242114212',
                        text: 'testtest',
                        attachments: [
                            {
                                id: '2323232232',
                                updateId: '411242114212',
                                thumbUrl: 'thumbnailurl',
                                originalUrl: 'originalurl',
                                filename: 'filename',
                                type: 'image/jpeg'
                            }
                        ],
                        createdAt: '2021-06-15T18:22:15.548Z',
                        caregiver: {
                            id: 1,
                            tenant: {id: undefined},
                            role: 'ApprovedUser',
                            firstName: 'Vlad',
                            lastName: 'Doe',
                            title: 'RN',
                            acceptedEula: true,
                            renewEula: true
                        }
                    })
                );
                expect(ohanaSharedPackage.createAttachment).toHaveBeenCalledWith(
                    expect.objectContaining({
                        id: '1234',
                        updateId: '411242114212',
                        patientId: 1,
                        metadata: [],
                        type: 'text'
                    })
                );
            });
        });

        describe('when free text translation is allowed', () => {
            describe('when no family members are linked to the patient', () => {
                test('then it should not return the translation', async () => {
                    const result = await resolver(
                        null,
                        {
                            input: {
                                encounterId: 1,
                                updateId: '411242114212',
                                text: 'testtest',
                                type: 'text'
                            }
                        },
                        {
                            userId: 1,
                            sessionId: '82b4a340-7856-4cb4-ad23-7486626b63c7',
                            deviceId: 1,
                            firstName: 'Vlad',
                            lastName: 'Doe',
                            role: 'ApprovedUser',
                            title: 'RN',
                            eulaAcceptTimestamp: new Date(),
                            version: '1.6.0'
                        }
                    );

                    expect(result).toEqual(
                        expect.objectContaining({
                            id: '411242114212',
                            text: 'testtest',
                            attachments: [
                                {
                                    id: '2323232232',
                                    updateId: '411242114212',
                                    thumbUrl: 'thumbnailurl',
                                    originalUrl: 'originalurl',
                                    filename: 'filename',
                                    type: 'image/jpeg'
                                }
                            ],
                            createdAt: '2021-06-15T18:22:15.548Z',
                            caregiver: {
                                id: 1,
                                tenant: {id: undefined},
                                role: 'ApprovedUser',
                                firstName: 'Vlad',
                                lastName: 'Doe',
                                title: 'RN',
                                acceptedEula: true,
                                renewEula: true
                            }
                        })
                    );

                    expect(ohanaSharedPackage.createAttachment).toHaveBeenCalledWith(
                        expect.objectContaining({
                            id: '1234',
                            updateId: '411242114212',
                            patientId: 1,
                            metadata: [],
                            type: 'text'
                        })
                    );
                });
            });

            describe('when family members are linked to the patient', () => {
                describe('when the language is not the default language', () => {
                    test('then it should return the translation', async () => {
                        ohanaSharedPackage.getFamilyMembersByPatientId.mockImplementationOnce(
                            () => [{patientId: 2, userId: 1, preferredLocale: 'es_ES'}]
                        );

                        const result = await resolver(
                            null,
                            {
                                input: {
                                    encounterId: 1,
                                    updateId: '411242114212',
                                    text: 'testtest',
                                    type: 'text'
                                }
                            },
                            {
                                userId: 1,
                                sessionId: '82b4a340-7856-4cb4-ad23-7486626b63c7',
                                deviceId: 1,
                                firstName: 'Vlad',
                                lastName: 'Doe',
                                role: 'ApprovedUser',
                                title: 'RN',
                                eulaAcceptTimestamp: new Date(),
                                version: '1.6.0'
                            }
                        );

                        expect(result).toEqual(
                            expect.objectContaining({
                                id: '411242114212',
                                text: 'testtest',
                                attachments: [
                                    {
                                        id: '2323232232',
                                        updateId: '411242114212',
                                        thumbUrl: 'thumbnailurl',
                                        originalUrl: 'originalurl',
                                        filename: 'filename',
                                        type: 'image/jpeg'
                                    }
                                ],
                                createdAt: '2021-06-15T18:22:15.548Z',
                                caregiver: {
                                    id: 1,
                                    tenant: {id: undefined},
                                    role: 'ApprovedUser',
                                    firstName: 'Vlad',
                                    lastName: 'Doe',
                                    title: 'RN',
                                    acceptedEula: true,
                                    renewEula: true
                                }
                            })
                        );

                        expect(ohanaSharedPackage.createAttachment).toHaveBeenCalledWith(
                            expect.objectContaining({
                                id: '1234',
                                updateId: '411242114212',
                                patientId: 1,
                                metadata: [{text: 'testtest', locale: 'es_ES'}],
                                type: 'text'
                            })
                        );
                    });
                });
            });
        });

        describe('when family member devices are found', () => {
            test('then it should send the notifications', async () => {
                ohanaSharedPackage.getFamilyMemberDevices.mockImplementationOnce(() => [
                    {
                        encounterId: 2,
                        userId: 1,
                        preferredLocale: 'es_ES',
                        firstName: 'test',
                        lastName: 'test',
                        id: '12',
                        iv: '12345',
                        notificationPlatform: 'gcm',
                        partialKey: 'abcdef1234',
                        title: 'test',
                        deviceToken: '123'
                    }
                ]);

                const result = await resolver(
                    null,
                    {
                        input: {
                            encounterId: 1,
                            updateId: '411242114212',
                            text: 'testtest'
                        }
                    },
                    {
                        userId: 1,
                        sessionId: '82b4a340-7856-4cb4-ad23-7486626b63c7',
                        deviceId: 1,
                        firstName: 'Vlad',
                        lastName: 'Doe',
                        role: 'ApprovedUser',
                        title: 'RN',
                        eulaAcceptTimestamp: new Date(),
                        version: '1.6.0'
                    }
                );

                expect(result).toEqual(
                    expect.objectContaining({
                        id: '411242114212',
                        text: 'testtest',
                        attachments: [
                            {
                                id: '2323232232',
                                updateId: '411242114212',
                                thumbUrl: 'thumbnailurl',
                                originalUrl: 'originalurl',
                                filename: 'filename',
                                type: 'image/jpeg'
                            }
                        ],
                        createdAt: '2021-06-15T18:22:15.548Z',
                        caregiver: {
                            id: 1,
                            tenant: {id: undefined},
                            role: 'ApprovedUser',
                            firstName: 'Vlad',
                            lastName: 'Doe',
                            title: 'RN',
                            acceptedEula: true,
                            renewEula: true
                        }
                    })
                );

                expect(ohanaSharedPackage.sendPushNotification).toHaveBeenCalledWith(
                    undefined,
                    '12',
                    {
                        notification: {
                            title: 'test',
                            body: {}
                        },
                        data: {
                            message: 'test',
                            sender: 'test',
                            type: 'text',
                            mediaType: 'text'
                        },
                        priority: 'high',
                        badge: 2
                    }
                );
            });
        });
    });

    describe('when update type is not text', () => {
        test('then it should not create an attachment or translate the text', async () => {
            const result = await resolver(
                null,
                {
                    input: {
                        encounterId: 1,
                        updateId: '411242114212',
                        text: 'testtest',
                        type: 'quickMessage'
                    }
                },
                {
                    userId: 1,
                    sessionId: '82b4a340-7856-4cb4-ad23-7486626b63c7',
                    deviceId: 1,
                    firstName: 'Vlad',
                    lastName: 'Doe',
                    role: 'ApprovedUser',
                    assignedRoles: ['ApprovedUser'],
                    title: 'RN',
                    eulaAcceptTimestamp: new Date(),
                    version: '1.6.0'
                }
            );

            expect(result).toEqual(
                expect.objectContaining({
                    id: '411242114212',
                    text: 'testtest',
                    attachments: [
                        {
                            id: '2323232232',
                            updateId: '411242114212',
                            thumbUrl: 'thumbnailurl',
                            originalUrl: 'originalurl',
                            filename: 'filename',
                            type: 'image/jpeg'
                        }
                    ],
                    createdAt: '2021-06-15T18:22:15.548Z',
                    caregiver: {
                        id: 1,
                        tenant: {id: undefined},
                        role: 'ApprovedUser',
                        assignedRoles: ['ApprovedUser'],
                        firstName: 'Vlad',
                        lastName: 'Doe',
                        title: 'RN',
                        acceptedEula: true,
                        renewEula: true
                    }
                })
            );

            expect(ohanaSharedPackage.createAttachment).toHaveBeenCalledTimes(0);
            expect(ohanaSharedPackage.translateText).toHaveBeenCalledTimes(0);
        });
    });
});
