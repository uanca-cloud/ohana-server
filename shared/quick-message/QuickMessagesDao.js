const {getDatabasePool} = require('../DatabasePoolFactory'),
    {
        DB_CONNECTION_POOLS,
        MAX_QUICK_MESSAGES,
        MAX_SITE_WIDE_QUICK_MESSAGES
    } = require('../constants'),
    {DBError, NotFoundError, UserInputError} = require('../custom-errors'),
    {getLocationIdByPatientId} = require('../patient/PatientDao'),
    {getLocationById} = require('../location/LocationDao'),
    {getLogger} = require('../logs/LoggingService'),
    {areEqualArrays} = require('../DaoHelper');

const logger = getLogger('QuickMessageDao');

/**
 * @typedef {Object} locationQuickMessage
 * @property {integer} messageId
 * @property {string} locationId
 * @property {json} quickMessages
 * @property {integer} messageOrder
 * @property {string} tenantId
 */

/**
 *
 * @param args
 * @returns {Promise<*>}
 */
async function updateUserQuickMessages(args) {
    const {quickMessages, userId} = args;
    const updateAdminQuickMessagesQuery = `
        INSERT INTO caregiver_quick_messages(user_id,quick_messages)
        VALUES($2,$1)
        ON CONFLICT(user_id) DO UPDATE 
        SET quick_messages = $1
        WHERE caregiver_quick_messages.user_id = $2;
    `;

    const pool = getDatabasePool(DB_CONNECTION_POOLS.DEFAULT);
    pool.query(updateAdminQuickMessagesQuery, [quickMessages, userId]);

    return quickMessages;
}

async function createLocationQuickMessage(locationQuickMessage) {
    logger.debug('Creating location quick message...');
    const {locationId, quickMessages, tenantId} = locationQuickMessage;
    const pool = getDatabasePool(DB_CONNECTION_POOLS.DEFAULT);

    const location = await getLocationById(locationId);

    if (!location) {
        logger.error({metadata: {locationId, tenantId}}, 'Invalid location');
        throw new UserInputError({message: 'Invalid location'});
    }

    const locationMessagesQuery = `
        SELECT id, message_order 
        FROM location_quick_messages 
        WHERE location_id = $1 AND tenant_id = $2;
    `;

    let messageOrder = 1;
    const locationQuickMessages = await pool.query(locationMessagesQuery, [locationId, tenantId]);

    if (locationQuickMessages.rowCount >= parseInt(MAX_QUICK_MESSAGES)) {
        logger.error({metadata: {locationId, tenantId}}, 'Number of quick messages exceeded');
        throw new UserInputError({message: 'Number of quick messages exceeded'});
    }

    if (locationQuickMessages.rowCount > 0) {
        let values = locationQuickMessages.rows
            .map((row) => `(${row.id}, ${row.message_order + 1})`)
            .join(',');

        const locationQuickMessagesOrderUpdateQuery = `
            UPDATE location_quick_messages as l 
            SET message_order = c.message_order
            FROM (values ${values}) as c(id, message_order) \
            WHERE c.id = l.id AND tenant_id = $1;
        `;
        await pool.query(locationQuickMessagesOrderUpdateQuery, [tenantId]);
    }

    const locationInsertQuery = `
        INSERT INTO location_quick_messages (location_id, quick_messages, tenant_id, message_order)
        VALUES($1, $2, $3, $4) 
        RETURNING id;
    `;

    const messages = quickMessages.map((element) => {
        return {
            text: element.text,
            locale: element.locale
        };
    });

    const result = await pool.query(locationInsertQuery, [
        locationId,
        JSON.stringify(messages),
        tenantId,
        messageOrder
    ]);

    return {
        messageId: result.rows[0].id,
        quickMessages: messages,
        locationId
    };
}

async function createSiteWideQuickMessage(locationQuickMessage) {
    logger.debug('Creating site wide quick message...');
    const {quickMessages, tenantId} = locationQuickMessage;
    const pool = getDatabasePool(DB_CONNECTION_POOLS.DEFAULT);

    const locationMessagesQuery = `
        SELECT id, message_order 
        FROM location_quick_messages 
        WHERE location_id IS NULL AND tenant_id = $1;
    `;

    let messageOrder = 1;
    const siteWideQuickMessages = await pool.query(locationMessagesQuery, [tenantId]);

    if (siteWideQuickMessages.rowCount >= parseInt(MAX_SITE_WIDE_QUICK_MESSAGES)) {
        logger.error({metadata: {tenantId}}, 'Number of site wide quick messages exceeded');
        throw new UserInputError({message: 'Number of site wide quick messages exceeded'});
    }

    if (siteWideQuickMessages.rowCount > 0) {
        let values = siteWideQuickMessages.rows
            .map((row) => `(${row.id}, ${row.message_order + 1})`)
            .join(',');

        const siteWideQuickMessagesOrderUpdateQuery = `
            UPDATE location_quick_messages as l 
            SET message_order = c.message_order
            FROM (values ${values}) as c(id, message_order) 
            WHERE c.id = l.id AND tenant_id = $1;
        `;
        await pool.query(siteWideQuickMessagesOrderUpdateQuery, [tenantId]);
    }

    const locationInsertQuery = `
        INSERT INTO location_quick_messages (quick_messages, tenant_id, message_order)
        VALUES($1, $2, $3) 
        RETURNING id;
    `;

    const messages = quickMessages.map((element) => {
        return {
            text: element.text,
            locale: element.locale
        };
    });

    const result = await pool.query(locationInsertQuery, [
        JSON.stringify(messages),
        tenantId,
        messageOrder
    ]);

    return {
        messageId: result.rows[0].id,
        quickMessages: messages,
        locationId: null
    };
}

async function updateLocationQuickMessage(locationQuickMessage) {
    logger.debug('Updating location quick messages...');
    const {messageId, quickMessages, tenantId} = locationQuickMessage;
    const locationUpdateQuery = `
        UPDATE location_quick_messages 
        SET quick_messages = $1 
        WHERE id = $2 and tenant_id = $3;
    `;
    const pool = getDatabasePool(DB_CONNECTION_POOLS.DEFAULT);

    const messages = quickMessages.map((element) => {
        return {
            text: element.text,
            locale: element.locale
        };
    });

    const result = await pool.query(locationUpdateQuery, [
        JSON.stringify(messages),
        messageId,
        tenantId
    ]);
    if (!result.rowCount) {
        logger.error({metadata: {quickMessageId: messageId, tenantId}}, 'Message does not exist');
        throw new DBError({message: 'invalidMessage', description: 'Message does not exist'});
    }

    return {
        messageId,
        quickMessages: messages
    };
}

async function updateLocationQuickMessagesOrder(locationQuickMessage) {
    logger.debug('Updating location quick messages order...');
    const {locationId, quickMessagesIds, tenantId} = locationQuickMessage;
    const pool = getDatabasePool(DB_CONNECTION_POOLS.DEFAULT);
    const locationQuickMessages = await getLocationQuickMessages({locationId, tenantId});
    const locationQuickMessagesIds = locationQuickMessages.map((element) => `${element.messageId}`);

    if (!areEqualArrays(quickMessagesIds, locationQuickMessagesIds)) {
        logger.error({metadata: {locationId, quickMessagesIds, tenantId}}, 'Message ids mismatch');
        throw new DBError({message: 'invalidIds', description: 'Message ids mismatch'});
    }
    // map messageIds to a message order, ordering starts from 1
    let values = '';
    quickMessagesIds.forEach((current, index) => {
        values += `(${current}, ${index + 1}),`;
    });
    values = values.slice(0, -1);

    const locationQuickMessagesOrderUpdateQuery = `
        UPDATE location_quick_messages as l 
        SET message_order = c.message_order 
        FROM (values ${values}) as c(id, message_order) 
        WHERE c.id = l.id AND tenant_id = $1 
        RETURNING l.id
    `;
    const result = await pool.query(locationQuickMessagesOrderUpdateQuery, [tenantId]);

    if (!result.rowCount) {
        logger.info(
            {metadata: {locationId, quickMessagesIds, tenantId}},
            'No quick message updated'
        );
        return null;
    }

    return getLocationQuickMessages({locationId, tenantId});
}

async function deleteLocationQuickMessage(locationQuickMessage) {
    logger.debug('Deleting location quick message...');
    const {messageId, tenantId} = locationQuickMessage;

    const locationDeleteQuery = `
        DELETE FROM location_quick_messages 
        WHERE id = $1 and tenant_id = $2;
    `;
    const pool = getDatabasePool(DB_CONNECTION_POOLS.DEFAULT);
    const result = await pool.query(locationDeleteQuery, [messageId, tenantId]);

    return Boolean(result.rowCount);
}

async function getLocationQuickMessages(locationQuickMessage) {
    logger.debug('Getting location quick messages...');
    const {locationId, tenantId} = locationQuickMessage;
    const pool = getDatabasePool(DB_CONNECTION_POOLS.DEFAULT);

    let locationQuickMessagesQuery = `
        SELECT 
           id, 
           quick_messages,
           location_id
        FROM location_quick_messages 
        WHERE location_id IS NULL AND tenant_id = $1 
        ORDER BY message_order ASC;`;
    let params = [tenantId];

    if (locationId) {
        locationQuickMessagesQuery = `
            SELECT 
               id, 
               quick_messages,
               location_id
           FROM location_quick_messages 
           WHERE tenant_id = $1 AND location_id = $2 
           ORDER BY message_order ASC;`;
        params.push(locationId);
    }

    const result = await pool.query(locationQuickMessagesQuery, params);

    if (!result.rowCount) {
        logger.info({metadata: {locationId, tenantId}}, 'No quick messages found');
        return [];
    }

    return result.rows.map((element) => {
        return {
            messageId: element.id,
            quickMessages: element.quick_messages,
            locationId: element.location_id
        };
    });
}

async function getAllLocationQuickMessages(locationQuickMessage) {
    logger.debug('Getting all location quick messages...');
    const {locationId, tenantId} = locationQuickMessage;
    const locationQuickMessagesQuery = `
        SELECT 
           id, 
           quick_messages,
           location_id
        FROM location_quick_messages 
        WHERE (location_id = $1 OR location_id IS NULL) AND tenant_id = $2 
        ORDER BY location_id ASC, message_order ASC;
    `;
    const pool = getDatabasePool(DB_CONNECTION_POOLS.DEFAULT);
    const result = await pool.query(locationQuickMessagesQuery, [locationId, tenantId]);

    if (!result.rowCount) {
        logger.info({metadata: {locationId, tenantId}}, 'No quick messages found');
        return [];
    }

    return result.rows.map((element) => {
        return {
            messageId: element.id,
            quickMessages: element.quick_messages,
            locationId: element.location_id
        };
    });
}

async function getLocationQuickMessageById(id, tenantId) {
    logger.debug('Getting location quick message by id...');
    const locationQuickMessagesQuery = `
        SELECT quick_messages 
        FROM location_quick_messages 
        WHERE id = $1 and tenant_id = $2;
    `;
    const pool = getDatabasePool(DB_CONNECTION_POOLS.DEFAULT);
    const result = await pool.query(locationQuickMessagesQuery, [id, tenantId]);

    if (!result.rowCount) {
        logger.info({metadata: {locationId: id, tenantId}}, 'No quick messages found');
        return null;
    }

    return result.rows[0].quick_messages;
}

async function getQuickMessagesByPatient(patientId, tenantId) {
    const locationId = await getLocationIdByPatientId({tenantId, patientId});

    if (!locationId) {
        logger.error({metadata: {tenantId, patientId}}, 'Location not found for patient');
        throw new NotFoundError({message: 'Location not found for patient'});
    }
    return getAllLocationQuickMessages({locationId, tenantId});
}

module.exports = {
    updateLocationQuickMessagesOrder,
    updateUserQuickMessages,
    createLocationQuickMessage,
    createSiteWideQuickMessage,
    updateLocationQuickMessage,
    deleteLocationQuickMessage,
    getLocationQuickMessages,
    getAllLocationQuickMessages,
    getLocationQuickMessageById,
    getQuickMessagesByPatient
};
