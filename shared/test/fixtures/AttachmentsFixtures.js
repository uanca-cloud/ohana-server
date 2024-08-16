const {
    MEDIA_TYPES: {QUICK_MESSAGE, PHOTO, USER_JOIN}
} = require('../../constants');

const attachmentsFixtures = {
    attachment1: {
        id: 'ec779aa6-cef9-4f91-a185-3ff912a7d831',
        updateId: 'ed5d8d1b-a634-4be0-b05f-ca3f41778adc',
        encounterId: 1,
        patientId: 1,
        metadata: {
            filename: '189479014_625181348877627_4487600698281956797_n.jpeg',
            thumbUrl:
                'https://storageaccdevohanaeus.blob.core.windows.net/media/1/ed5d8d1b-a634-4be0-b05f-ca3f41778adc/thumb_189479014_625181348877627_4487600698281956797_n.jpeg',
            originalUrl:
                'https://storageaccdevohanaeus.blob.core.windows.net/media/1/ed5d8d1b-a634-4be0-b05f-ca3f41778adc/189479014_625181348877627_4487600698281956797_n.jpeg'
        },
        type: PHOTO
    },
    attachment2: {
        id: 'c7e481da-1bab-42cb-a9b8-0bb5d472d7c6',
        updateId: 'ed5d8d1b-a634-4be0-b05f-ca3f41778adc',
        encounterId: 1,
        patientId: 1,
        metadata: {
            filename: '189479014_625181348877627_4487600698281956797_n.jpeg',
            thumbUrl:
                'https://storageaccdevohanaeus.blob.core.windows.net/media/1/ed5d8d1b-a634-4be0-b05f-ca3f41778adc/thumb_189479014_625181348877627_4487600698281956797_n.jpeg',
            originalUrl:
                'https://storageaccdevohanaeus.blob.core.windows.net/media/1/ed5d8d1b-a634-4be0-b05f-ca3f41778adc/189479014_625181348877627_4487600698281956797_n.jpeg'
        },
        type: PHOTO
    },
    attachment3: {
        id: '1',
        updateId: 'ed5d8d1b-a634-4be0-b05f-ca3f41778adc',
        encounterId: 1,
        patientId: 1,
        metadata: [
            {text: 'Smth 1', locale: 'en_US'},
            {text: 'Smth 2', locale: 'en_GB'}
        ],
        type: QUICK_MESSAGE
    },
    attachment4: {
        id: '1',
        updateId: 'ed5d8d1b-a634-4be0-b05f-ca3f41778adc',
        encounterId: 1,
        patientId: 1,
        metadata: [
            {
                inviteeName: 'John',
                inviteeRelationship: 'sibling',
                invitedByFirstName: 'Joe',
                invitedByLastName: 'Doe',
                invitedByUserType: 'FamilyMember'
            }
        ],
        type: USER_JOIN
    }
};

function insertTestAttachment(database, attachment) {
    const {id, updateId, patientId, metadata, type, encounterId} = attachment;
    return database.query(
        `INSERT INTO attachments (
            id, update_id, patient_id, metadata, type, encounter_id
        ) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id;`,
        [id, updateId, patientId, JSON.stringify(metadata), type, encounterId]
    );
}

function selectTestAttachmentById(database, id) {
    return database.query(`SELECT metadata, type, update_id FROM attachments WHERE id = $1;`, [id]);
}

module.exports = {attachmentsFixtures, insertTestAttachment, selectTestAttachmentById};
