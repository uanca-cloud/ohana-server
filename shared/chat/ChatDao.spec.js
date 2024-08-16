const {CSA_PRODUCT_OID} = require('../constants');
let generateMembersListForCreateChannel = null,
    createChatChannel = null,
    sendChatMessage = null,
    addChatMembers = null,
    removeChatMembers = null,
    getChatHistory = null,
    initialHistory = null,
    getChatMembers = null,
    getChatChannelInformation = null,
    markChatMessagesAsRead = null,
    watchReadReceipt = null,
    unWatchReadReceipt = null,
    unWatchAllChatSubscriptions = null,
    deleteChatChannel = null,
    updateChannelNotificationLevel = null;

const patientUlid = '01HKA8YK4KBFBXBXZH1GXBKQNQ',
    tenantId = '0000',
    members = [
        {
            id: '123',
            role: 'FamilyMember'
        },
        {
            id: '124',
            role: 'ApprovedUser'
        }
    ],
    userId = '123456',
    text = 'test',
    metadata = '"{"1.3.6.1.4.1.50624.1.2.6": {"mobileMessageId": "1234"}}"',
    limit = 10,
    cursor = 'order:123',
    subscriptionId = '01HKA8YK4KBFBXBXZH1GXBKQNG';

const mockMakeCsaHttpRequest = (mockData, mockOk, mockStatus) => {
    jest.mock('../csa/CsaHttpGateway', () => ({
        makeCsaHttpRequest: jest.fn(() =>
            Promise.resolve({
                json: () => Promise.resolve(mockData),
                ok: mockOk,
                status: mockStatus
            })
        )
    }));
};

beforeEach(() => {
    jest.resetAllMocks();
    jest.resetModules();
});

describe('Given we want to obtain the list of members for create channel mutation', () => {
    beforeEach(() => {
        generateMembersListForCreateChannel =
            require('./ChatDao').generateMembersListForCreateChannel;
    });

    describe('When the list of users is empty', () => {
        test('Then an empty list should be returned', () => {
            expect(generateMembersListForCreateChannel([])).toStrictEqual([]);
        });
    });

    describe('When the list of users contains one user', () => {
        test('Then a list of members should be returned', () => {
            const metadata = {};
            metadata[`${CSA_PRODUCT_OID}`] = `{"isChatAdmin": "true"}}`;

            const userMetadata = {};
            userMetadata[`${CSA_PRODUCT_OID}`] = `{"familyMember": "true"}}`;

            expect(
                generateMembersListForCreateChannel([
                    {
                        id: '123',
                        role: 'FamilyMember'
                    }
                ])
            ).toStrictEqual([
                {
                    identity: `hrc:${CSA_PRODUCT_OID}:123`,
                    metadata: JSON.stringify(userMetadata)
                }
            ]);
        });
    });
});

describe('Given we want to create a chat channel', () => {
    describe('When response from CSA is successful', () => {
        it('should return the response from CSA', async () => {
            const csaResponse = {data: {createChannel: {id: '1234'}}};
            mockMakeCsaHttpRequest(csaResponse, true, 200);

            createChatChannel = require('./ChatDao').createChatChannel;

            const response = await createChatChannel(patientUlid, userId, tenantId, members);

            expect(response).toStrictEqual(csaResponse);
        });
    });

    describe('When response from CSA is not successful', () => {
        it('should throw a CSA error', async () => {
            mockMakeCsaHttpRequest({}, false, 400);

            createChatChannel = require('./ChatDao').createChatChannel;

            await expect(createChatChannel(patientUlid, userId, tenantId, members)).rejects.toThrow(
                'Creating a chat channel on CSA failed'
            );
        });
    });

    describe('When a graphql error is returned from CSA', () => {
        it('should throw a CSA error', async () => {
            const csaError = {errors: [{extensions: {code: 'NOT_FOUND'}}]};
            mockMakeCsaHttpRequest(csaError, true, 200);

            createChatChannel = require('./ChatDao').createChatChannel;

            await expect(createChatChannel(patientUlid, userId, tenantId, members)).rejects.toThrow(
                'Creating a chat channel on CSA failed'
            );
        });
    });
});

describe('Given we want to send a chat message', () => {
    describe('When response from CSA is successful', () => {
        it('should return the response from CSA', async () => {
            const csaResponse = {data: {sendChat: {id: '1234', message: text}}};
            mockMakeCsaHttpRequest(csaResponse, true, 200);

            sendChatMessage = require('./ChatDao').sendChatMessage;

            const response = await sendChatMessage(patientUlid, tenantId, userId, text, metadata);

            expect(response).toStrictEqual(csaResponse.data.sendChat.message);
        });
    });

    describe('When response from CSA is not successful', () => {
        it('should throw a CSA error', async () => {
            mockMakeCsaHttpRequest({}, false, 400);

            sendChatMessage = require('./ChatDao').sendChatMessage;

            await expect(
                sendChatMessage(patientUlid, tenantId, userId, text, metadata)
            ).rejects.toThrow('Sending a message to CSA failed');
        });
    });

    describe('When a graphql error is returned from CSA', () => {
        it('should throw a CSA error', async () => {
            const csaError = {errors: [{extensions: {code: 'NOT_FOUND'}}]};
            mockMakeCsaHttpRequest(csaError, true, 200);

            sendChatMessage = require('./ChatDao').sendChatMessage;

            await expect(
                sendChatMessage(patientUlid, tenantId, userId, text, metadata)
            ).rejects.toThrow('Sending a message to CSA failed');
        });
    });
});

describe('Given we want to add a chat member', () => {
    describe('When response from CSA is successful', () => {
        it('should return the response from CSA', async () => {
            const csaResponse = {
                data: {
                    addMembersToChannel: {membersAdded: [`hrc:1.3.6.1.4.1.50624.1.2.6:${userId}`]}
                }
            };
            mockMakeCsaHttpRequest(csaResponse, true, 200);

            addChatMembers = require('./ChatDao').addChatMembers;

            const response = await addChatMembers(patientUlid, tenantId, members);

            expect(response).toStrictEqual(csaResponse.data.addMembersToChannel.membersAdded);
        });
    });

    describe('When response from CSA is not successful', () => {
        it('should throw a CSA error', async () => {
            mockMakeCsaHttpRequest({}, false, 400);

            addChatMembers = require('./ChatDao').addChatMembers;

            await expect(addChatMembers(patientUlid, tenantId, members)).rejects.toThrow(
                'Adding members to Chat Channel in CSA failed'
            );
        });
    });

    describe('When a graphql error is returned from CSA', () => {
        it('should throw a CSA error', async () => {
            const csaError = {errors: [{extensions: {code: 'NOT_FOUND'}}]};
            mockMakeCsaHttpRequest(csaError, true, 200);

            addChatMembers = require('./ChatDao').addChatMembers;

            await expect(addChatMembers(patientUlid, tenantId, members)).rejects.toThrow(
                'Adding members to Chat Channel in CSA failed'
            );
        });
    });
});

describe('Given we want to remove a chat member', () => {
    describe('When response from CSA is successful', () => {
        it('should return the response from CSA', async () => {
            const csaResponse = {
                data: {
                    removeMembersFromChannel: {
                        membersRemoved: [
                            `hrc:1.3.6.1.4.1.50624.1.2.6:${members[0].id}`,
                            `hrc:1.3.6.1.4.1.50624.1.2.6:${members[1].id}`
                        ]
                    }
                }
            };
            mockMakeCsaHttpRequest(csaResponse, true, 200);

            removeChatMembers = require('./ChatDao').removeChatMembers;

            const response = await removeChatMembers(patientUlid, tenantId, userId, members);

            expect(response).toStrictEqual(
                csaResponse.data.removeMembersFromChannel.membersRemoved
            );
        });
    });

    describe('When response from CSA is not successful', () => {
        it('should throw a CSA error', async () => {
            mockMakeCsaHttpRequest({}, false, 400);

            removeChatMembers = require('./ChatDao').removeChatMembers;

            await expect(removeChatMembers(patientUlid, tenantId, userId, members)).rejects.toThrow(
                'Removing members from Chat Channel in CSA failed'
            );
        });
    });

    describe('When a graphql error is returned from CSA', () => {
        it('should throw a CSA error', async () => {
            const csaError = {errors: [{extensions: {code: 'NOT_FOUND'}}]};
            mockMakeCsaHttpRequest(csaError, true, 200);

            removeChatMembers = require('./ChatDao').removeChatMembers;

            await expect(removeChatMembers(patientUlid, tenantId, userId, members)).rejects.toThrow(
                'Removing members from Chat Channel in CSA failed'
            );
        });
    });

    describe('When not all members were removed', () => {
        it('should throw a CSA error', async () => {
            const csaResponse = {
                data: {
                    removeMembersFromChannel: {
                        membersRemoved: [`hrc:1.3.6.1.4.1.50624.1.2.6:${members[0].id}`]
                    }
                }
            };

            mockMakeCsaHttpRequest(csaResponse, true, 200);

            removeChatMembers = require('./ChatDao').removeChatMembers;

            await expect(removeChatMembers(patientUlid, tenantId, userId, members)).rejects.toThrow(
                'Removing members from Chat Channel in CSA failed as not all members were removed'
            );
        });
    });
});

describe('Given we want to retrieve a chat channel history', () => {
    describe('When response from CSA is successful', () => {
        it('should return the response from CSA', async () => {
            const csaResponse = {data: {channelBySeed: {chats: []}}};
            mockMakeCsaHttpRequest(csaResponse, true, 200);

            getChatHistory = require('./ChatDao').getChatHistory;

            const response = await getChatHistory(patientUlid, tenantId, userId, limit, cursor);

            expect(response).toStrictEqual(csaResponse.data.channelBySeed.chats);
        });
    });

    describe('When response from CSA is not successful', () => {
        it('should throw a CSA error', async () => {
            mockMakeCsaHttpRequest({}, false, 400);

            getChatHistory = require('./ChatDao').getChatHistory;

            await expect(
                getChatHistory(patientUlid, tenantId, userId, limit, cursor)
            ).rejects.toThrow('Getting a channel by seed from CSA failed');
        });
    });

    describe('When a graphql error is returned from CSA', () => {
        it('should throw a CSA error', async () => {
            const csaError = {errors: [{extensions: {code: 'NOT_FOUND'}}]};
            mockMakeCsaHttpRequest(csaError, true, 200);

            getChatHistory = require('./ChatDao').getChatHistory;

            await expect(
                getChatHistory(patientUlid, tenantId, userId, limit, cursor)
            ).rejects.toThrow('Getting a channel by seed from CSA failed');
        });
    });
});

describe('Given we want to retrieve the initial chat history', () => {
    describe('When response from CSA is successful', () => {
        it('should return the response from CSA', async () => {
            const csaResponse = {data: {channels: []}};
            mockMakeCsaHttpRequest(csaResponse, true, 200);

            initialHistory = require('./ChatDao').initialHistory;

            const response = await initialHistory(tenantId, userId);

            expect(response).toStrictEqual(csaResponse.data.channels);
        });
    });

    describe('When response from CSA is not successful', () => {
        it('should throw a CSA error', async () => {
            mockMakeCsaHttpRequest({}, false, 400);

            initialHistory = require('./ChatDao').initialHistory;

            await expect(initialHistory(tenantId, userId)).rejects.toThrow(
                'Retrieving channels from CSA failed'
            );
        });
    });

    describe('When a graphql error is returned from CSA', () => {
        it('should throw a CSA error', async () => {
            const csaError = {errors: [{extensions: {code: 'NOT_FOUND'}}]};
            mockMakeCsaHttpRequest(csaError, true, 200);

            initialHistory = require('./ChatDao').initialHistory;

            await expect(initialHistory(tenantId, userId)).rejects.toThrow(
                'Retrieving channels from CSA failed'
            );
        });
    });
});

describe('Given we want to retrieve a chat channel`s list of members', () => {
    describe('When response from CSA is successful', () => {
        it('should return the response from CSA', async () => {
            const csaResponse = {
                data: {
                    channelBySeed: {
                        members: [
                            `hrc:1.3.6.1.4.1.50624.1.2.6:${members[0].id}`,
                            `hrc:1.3.6.1.4.1.50624.1.2.6:${members[1].id}`
                        ]
                    }
                }
            };
            mockMakeCsaHttpRequest(csaResponse, true, 200);

            getChatMembers = require('./ChatDao').getChatMembers;

            const response = await getChatMembers(patientUlid, tenantId, userId, limit, cursor);

            expect(response).toStrictEqual(csaResponse.data.channelBySeed.members);
        });
    });

    describe('When response from CSA is not successful', () => {
        it('should throw a CSA error', async () => {
            mockMakeCsaHttpRequest({}, false, 400);

            getChatMembers = require('./ChatDao').getChatMembers;

            await expect(
                getChatMembers(tenantId, userId, patientUlid, limit, cursor)
            ).rejects.toThrow('Retrieving chat members from CSA failed');
        });
    });

    describe('When a graphql error is returned from CSA', () => {
        it('should throw a CSA error', async () => {
            const csaError = {errors: [{extensions: {code: 'NOT_FOUND'}}]};
            mockMakeCsaHttpRequest(csaError, true, 200);

            getChatMembers = require('./ChatDao').getChatMembers;

            await expect(
                getChatMembers(tenantId, userId, patientUlid, limit, cursor)
            ).rejects.toThrow('Retrieving chat members from CSA failed');
        });
    });
});

describe('Given we want to retrieve a chat channel`s information', () => {
    describe('When response from CSA is successful', () => {
        it('should return the response from CSA', async () => {
            const csaResponse = {
                data: {
                    channelBySeed: {
                        id: '01HKA8YK4KBFBXBXZH1GXBKQNQ',
                        seed: 'vf:patient:01HKA8YK4KBFBXBXZH1GXBKQNQ',
                        notificationLevel: 'loud',
                        initialChats: {
                            edges: [
                                {
                                    node: {
                                        id: '01HKA8YK4KBFBXBXZH1GXBKQNG',
                                        order: 12,
                                        text: 'test',
                                        createdAt: '2024-02-22T13:33:57.155Z',
                                        status: 'read',
                                        sentBy: {
                                            identity: 'hrc:1.3.6.1.4.1.50624.1.2.6:1234'
                                        },
                                        metadata:
                                            '{"1.3.6.1.4.1.50624.1.2.6": {"mobileMessageId": "1234"}}'
                                    },
                                    cursor: 'order:12'
                                }
                            ],
                            unreadCount: 1
                        }
                    }
                }
            };
            mockMakeCsaHttpRequest(csaResponse, true, 200);

            getChatChannelInformation = require('./ChatDao').getChatChannelInformation;

            const response = await getChatChannelInformation(patientUlid, tenantId, userId);

            expect(response).toStrictEqual(csaResponse.data.channelBySeed);
        });
    });

    describe('When response from CSA is not successful', () => {
        it('should throw a CSA error', async () => {
            mockMakeCsaHttpRequest({}, false, 400);

            getChatChannelInformation = require('./ChatDao').getChatChannelInformation;

            await expect(getChatChannelInformation(patientUlid, tenantId, userId)).rejects.toThrow(
                'Retrieving chat channel information from CSA failed'
            );
        });
    });

    describe('When a graphql error is returned from CSA', () => {
        it('should throw a CSA error', async () => {
            const csaError = {errors: [{extensions: {code: 'NOT_FOUND'}}]};
            mockMakeCsaHttpRequest(csaError, true, 200);

            getChatChannelInformation = require('./ChatDao').getChatChannelInformation;

            await expect(getChatChannelInformation(patientUlid, tenantId, userId)).rejects.toThrow(
                'Retrieving chat channel information from CSA failed'
            );
        });
    });
});

describe('Given we want to mark chat messages as read using the markChatMessagesAsRead mutation', () => {
    describe('When response from CSA is successful', () => {
        it('should return the response from CSA', async () => {
            const csaResponse = {
                data: {
                    markChatsAsRead: {
                        chats: [
                            {
                                id: '1234',
                                order: 123,
                                text: 'test',
                                sentBy: 'hrc:1.3.6.1.4.1.50624.1.2.6:1234',
                                createdAt: new Date('2024-03-26T00:00:00.000Z').toISOString(),
                                metadata: '{"1.3.6.1.4.1.50624.1.2.6": {"mobileMessageId": "1234"}}'
                            }
                        ]
                    }
                }
            };
            mockMakeCsaHttpRequest(csaResponse, true, 200);

            markChatMessagesAsRead = require('./ChatDao').markChatMessagesAsRead;

            const response = await markChatMessagesAsRead(patientUlid, tenantId, userId);

            expect(response).toStrictEqual(csaResponse.data.markChatsAsRead.chats);
        });
    });

    describe('When response from CSA is not successful', () => {
        it('should throw a CSA error', async () => {
            mockMakeCsaHttpRequest({}, false, 400);

            markChatMessagesAsRead = require('./ChatDao').markChatMessagesAsRead;

            await expect(markChatMessagesAsRead(patientUlid, tenantId, userId)).rejects.toThrow(
                'Marking chat messages as read on CSA failed'
            );
        });
    });

    describe('When a graphql error is returned from CSA', () => {
        it('should throw a CSA error', async () => {
            const csaError = {errors: [{extensions: {code: 'NOT_FOUND'}}]};
            mockMakeCsaHttpRequest(csaError, true, 200);

            markChatMessagesAsRead = require('./ChatDao').markChatMessagesAsRead;

            await expect(markChatMessagesAsRead(patientUlid, tenantId, userId)).rejects.toThrow(
                'Marking chat messages as read on CSA failed'
            );
        });
    });
});

describe('Given we want to subscribe to watch read receipts', () => {
    describe('When response from CSA is successful', () => {
        it('should return the response from CSA', async () => {
            const csaResponse = {
                data: {
                    watchReadReceipt: {
                        subscriptionId
                    }
                }
            };
            mockMakeCsaHttpRequest(csaResponse, true, 200);

            watchReadReceipt = require('./ChatDao').watchReadReceipt;

            const response = await watchReadReceipt(tenantId, userId);

            expect(response).toStrictEqual(csaResponse.data.watchReadReceipt);
        });
    });

    describe('When response from CSA is not successful', () => {
        it('should throw a CSA error', async () => {
            mockMakeCsaHttpRequest({}, false, 400);

            watchReadReceipt = require('./ChatDao').watchReadReceipt;

            await expect(watchReadReceipt(tenantId, userId)).rejects.toThrow(
                'Registering to watch read receipts on CSA failed'
            );
        });
    });

    describe('When a graphql error is returned from CSA', () => {
        it('should throw a CSA error', async () => {
            const csaError = {errors: [{extensions: {code: 'NOT_FOUND'}}]};
            mockMakeCsaHttpRequest(csaError, true, 200);

            watchReadReceipt = require('./ChatDao').watchReadReceipt;

            await expect(watchReadReceipt(tenantId, userId)).rejects.toThrow(
                'Registering to watch read receipts on CSA failed'
            );
        });
    });
});

describe('Given we want to unsubscribe from read receipts for a specific subscription id', () => {
    describe('When response from CSA is successful', () => {
        it('should return the response from CSA', async () => {
            const csaResponse = {
                data: {
                    unWatchReadReceipt: true
                }
            };
            mockMakeCsaHttpRequest(csaResponse, true, 200);

            unWatchReadReceipt = require('./ChatDao').unWatchReadReceipt;

            const response = await unWatchReadReceipt(subscriptionId, tenantId, userId);

            expect(response).toStrictEqual(csaResponse.data.unWatchReadReceipt);
        });
    });

    describe('When response from CSA is not successful', () => {
        it('should throw a CSA error', async () => {
            mockMakeCsaHttpRequest({}, false, 400);

            unWatchReadReceipt = require('./ChatDao').unWatchReadReceipt;

            await expect(unWatchReadReceipt(subscriptionId, tenantId, userId)).rejects.toThrow(
                'Un-watching read receipts on CSA failed'
            );
        });
    });

    describe('When a graphql error is returned from CSA', () => {
        it('should throw a CSA error', async () => {
            const csaError = {errors: [{extensions: {code: 'NOT_FOUND'}}]};
            mockMakeCsaHttpRequest(csaError, true, 200);

            unWatchReadReceipt = require('./ChatDao').unWatchReadReceipt;

            await expect(unWatchReadReceipt(subscriptionId, tenantId, userId)).rejects.toThrow(
                'Un-watching read receipts on CSA failed'
            );
        });
    });
});

describe('Given we want to unsubscribe from all subscriptions', () => {
    describe('When response from CSA is successful', () => {
        it('should return the response from CSA', async () => {
            const csaResponse = {
                data: {
                    unWatchAllChatSubscriptions: true
                }
            };
            mockMakeCsaHttpRequest(csaResponse, true, 200);

            unWatchAllChatSubscriptions = require('./ChatDao').unWatchAllChatSubscriptions;

            const response = await unWatchAllChatSubscriptions(subscriptionId, tenantId, userId);

            expect(response).toStrictEqual(csaResponse.data.unWatchAllChatSubscriptions);
        });
    });

    describe('When response from CSA is not successful', () => {
        it('should throw a CSA error', async () => {
            mockMakeCsaHttpRequest({}, false, 400);

            unWatchAllChatSubscriptions = require('./ChatDao').unWatchAllChatSubscriptions;

            await expect(
                unWatchAllChatSubscriptions(subscriptionId, tenantId, userId)
            ).rejects.toThrow('Un-watching all chat subscriptions on CSA failed');
        });
    });

    describe('When a graphql error is returned from CSA', () => {
        it('should throw a CSA error', async () => {
            const csaError = {errors: [{extensions: {code: 'NOT_FOUND'}}]};
            mockMakeCsaHttpRequest(csaError, true, 200);

            unWatchAllChatSubscriptions = require('./ChatDao').unWatchAllChatSubscriptions;

            await expect(
                unWatchAllChatSubscriptions(subscriptionId, tenantId, userId)
            ).rejects.toThrow('Un-watching all chat subscriptions on CSA failed');
        });
    });
});

describe('Given we want to delete a chat channel', () => {
    describe('When response from CSA is successful', () => {
        it('should return the response from CSA', async () => {
            const csaResponse = {
                data: {
                    deleteChannel: true
                }
            };
            mockMakeCsaHttpRequest(csaResponse, true, 200);

            deleteChatChannel = require('./ChatDao').deleteChatChannel;

            const response = await deleteChatChannel(patientUlid, userId, tenantId);

            expect(response).toStrictEqual(csaResponse);
        });
    });

    describe('When response from CSA is not successful', () => {
        it('should throw a CSA error', async () => {
            mockMakeCsaHttpRequest({}, false, 400);

            deleteChatChannel = require('./ChatDao').deleteChatChannel;

            await expect(deleteChatChannel(patientUlid, userId, tenantId)).rejects.toThrow(
                'Deleting a chat channel on CSA failed'
            );
        });
    });

    describe('When a graphql error is returned from CSA', () => {
        it('should throw a CSA error', async () => {
            const csaError = {errors: [{extensions: {code: 'NOT_FOUND'}}]};
            mockMakeCsaHttpRequest(csaError, true, 200);

            deleteChatChannel = require('./ChatDao').deleteChatChannel;

            await expect(deleteChatChannel(patientUlid, userId, tenantId)).rejects.toThrow(
                'Deleting a chat channel on CSA failed'
            );
        });
    });
});

describe('Given we want to update the chat channel notification level', () => {
    describe('When response from CSA is successful', () => {
        it('should return the response from CSA', async () => {
            const csaResponse = {
                data: {
                    updateChannelNotificationLevel: true
                }
            };
            mockMakeCsaHttpRequest(csaResponse, true, 200);

            updateChannelNotificationLevel = require('./ChatDao').updateChannelNotificationLevel;

            const response = await updateChannelNotificationLevel(subscriptionId, tenantId, userId);

            expect(response).toStrictEqual(csaResponse.data.updateChannelNotificationLevel);
        });
    });

    describe('When response from CSA is not successful', () => {
        it('should throw a CSA error', async () => {
            mockMakeCsaHttpRequest({}, false, 400);

            updateChannelNotificationLevel = require('./ChatDao').updateChannelNotificationLevel;

            await expect(
                updateChannelNotificationLevel(subscriptionId, tenantId, userId)
            ).rejects.toThrow('Updating channel notification level on CSA failed');
        });
    });

    describe('When a graphql error is returned from CSA', () => {
        it('should throw a CSA error', async () => {
            const csaError = {errors: [{extensions: {code: 'NOT_FOUND'}}]};
            mockMakeCsaHttpRequest(csaError, true, 200);

            updateChannelNotificationLevel = require('./ChatDao').updateChannelNotificationLevel;

            await expect(
                updateChannelNotificationLevel(subscriptionId, tenantId, userId)
            ).rejects.toThrow('Updating channel notification level on CSA failed');
        });
    });
});
