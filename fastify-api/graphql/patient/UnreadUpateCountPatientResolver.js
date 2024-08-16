const {getUnreadUpdatesByPatientId, getLogger} = require('ohana-shared');

/**
 * Async GraphQL resolver for retrieving the count of unread updates for a specific patient by patientId.
 *
 * @async
 * @function UnreadUpdateCountPatientResolver
 * @param {object} _parent - The result returned from the resolver on the parent field, or, in this case as it's root query, `undefined`.
 * @param {string} _parent.id - The id of the patient.
 * @param _
 * @param args null
 * @param {string} ctx.userId - The id of the user.
 * @throws {Error} If there is an error fetching from the database.
 * @returns {Promise<number|null>} A promise that resolves to the count of unread updates.
 *
 * This child resolver is responsible for invoking the getUnreadUpdatesByPatientId function with patientId and userId.
 * context needs to be referenced
 *
 */
async function UnreadUpdateCountPatientResolver({id}, _, {userId}) {
    const logger = getLogger('UnreadUpdatePatientResolver');
    logger.debug({metadata: {id, userId}}, 'UnreadUpdatePatientResolver patient...');
    return getUnreadUpdatesByPatientId(id, userId);
}

module.exports = UnreadUpdateCountPatientResolver;
