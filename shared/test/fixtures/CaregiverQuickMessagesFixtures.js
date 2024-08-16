const caregiverQuickMessagesFixtures = {
    caregiver1: {
        quickMessages: ['Hello test', 'Hello test 2']
    },
    caregiver2: {
        quickMessages: ['Hello test 3', 'Hello test 4']
    }
};
function insertTestCaregiverQuickMessages(database, entry) {
    const parameters = [entry.userId, entry.quickMessages];

    return database.query(
        `INSERT INTO
        caregiver_quick_messages(user_id,quick_messages)
        VALUES($2,$1)`,
        parameters
    );
}

function getTestCaregiverQuickMessagesByUserId(database, userId) {
    return database.query(`SELECT quick_messages FROM caregiver_quick_messages WHERE id = $1;`, [
        userId
    ]);
}

module.exports = {
    caregiverQuickMessagesFixtures,
    getTestCaregiverQuickMessagesByUserId,
    insertTestCaregiverQuickMessages
};
