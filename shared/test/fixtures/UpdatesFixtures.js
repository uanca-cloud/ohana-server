const updatesFixtures = {
    update1: {
        updateId: 'd0a6b403-3174-4497-bf04-108432821b73',
        text: 'Test text message'
    },
    update2: {
        updateId: '31530685-7142-4ff2-882c-cdc9459beba5',
        text: 'Test text message 2'
    },
    update3: {
        updateId: '31530685-7142-4ff2-882c-cdc9459beba53',
        text: 'Test text message 3'
    }
};

function getUpdateById(database, id) {
    return database.query(
        `
        SELECT u.id, u.user_id, u.encounter_id, u.message 
        FROM updates u
        WHERE id = $1;
    `,
        [id]
    );
}

function createTestUpdate(database, update) {
    const {userId, patientId, updateId, text, encounterId} = update;
    return database.query(
        `
            INSERT INTO updates (
                id,
                user_id,
                patient_id,
                encounter_id,
                message,
                created_at
            ) VALUES($1, $2, $3, $4, $5, $6) RETURNING created_at;`,
        [updateId, userId, patientId, encounterId, text, new Date()]
    );
}

module.exports = {updatesFixtures, getUpdateById, createTestUpdate};
