const {
    AuthenticationError,
    ForbiddenError,
    UserInputError,
    ServiceError,
    getLogger,
    CONSTANTS: {
        OHANA_ROLES: {CAREGIVER, FAMILY_MEMBER},
        DISABLE_CSA_INTEGRATION
    },
    watchReadReceipt,
    setChatReadReceiptsSubscriptionId,
    getChatReadReceiptsSubscriptionId,
    unWatchReadReceipt,
    getReadReceiptsAsyncIterator
} = require('ohana-shared');

const WatchReadReceiptsResolver = {
    resolve: async (payload, _args, context, _info) => {
        const {userId, deviceId, role} = context;
        const logger = getLogger('WatchReadReceiptsResolver', context);

        if (!userId) {
            logger.error('User does not exist');
            throw new AuthenticationError({message: 'User does not exist'});
        }

        if (DISABLE_CSA_INTEGRATION) {
            logger.error('CSA integration disabled');
            throw new ServiceError({message: 'CSA integration disabled'});
        }

        if (role !== CAREGIVER && role !== FAMILY_MEMBER) {
            logger.error('User does not have sufficient permissions');
            throw new ForbiddenError({message: 'User does not have sufficient permissions'});
        }

        if (!deviceId) {
            logger.warn('Missing device from session');
            throw new UserInputError({message: 'Missing device from session'});
        }

        if (payload) {
            return payload;
        }
    },
    subscribe: async (_resolver, _args, context) => {
        const logger = getLogger('WatchReadReceiptsResolver', context);
        if (!context || !context?.deviceId) {
            logger.error('User does not exist');
            throw new AuthenticationError({message: 'User does not exist'});
        }

        const {userId, tenantShortCode} = context;
        const subscriptionId = await getChatReadReceiptsSubscriptionId(userId);

        if (subscriptionId) {
            await unWatchReadReceipt(subscriptionId, tenantShortCode, userId);
        }

        const readReceiptResponse = await watchReadReceipt(tenantShortCode, userId);

        if (readReceiptResponse?.subscriptionId) {
            await setChatReadReceiptsSubscriptionId(userId, readReceiptResponse.subscriptionId);
        }

        return getReadReceiptsAsyncIterator(context.deviceId);
    }
};

module.exports = WatchReadReceiptsResolver;
