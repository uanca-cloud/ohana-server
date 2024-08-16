async function findTestAuditEventByDeviceId(database, deviceId) {
    return database.query(
        `
        SELECT 
            event_id, 
            created_at, 
            patient_id, 
            performing_user_id,
            performing_user_type,
            performing_user_display_name,
            performing_user_title,
            device_model,
            os_version,
            app_version,
            update_id,
            location_id
        FROM audit_events 
        WHERE device_id = $1;
    `,
        [deviceId]
    );
}

function insertTestAuditEvent(database, auditEvent) {
    const {
        tenantId,
        eventId,
        patientId,
        performingUserEmail,
        userType,
        userDisplayName,
        deviceId,
        deviceModel,
        osVersion,
        scanStatus = null,
        updateContent = null,
        updateId = null,
        invitationType = null,
        familyDisplayName = null,
        familyRelation = null,
        familyLanguage = null,
        familyContactNumber = null,
        familyMemberType = null,
        locationId = null,
        performingUserTitle = null,
        version = null,
        buildNumber = null,
        qmUpdate = null,
        freeTextUpdate = null,
        externalId = null,
        messageContent = null
    } = auditEvent;

    const createAuditEventQuery = `INSERT INTO audit_events(
        tenant_id,
        event_id,
        created_at,
        patient_id,
        performing_user_id,
        performing_user_type,
        performing_user_display_name,
        device_id,
        device_model,
        os_version,
        app_version,
        scan_status,
        update_content,
        update_id,
        invitation_type,
        family_display_name,
        family_relation,
        family_language,
        family_contact_number,
        family_member_type,
        location_id,
        performing_user_title,
        quick_message,
        free_text_translation,
        external_id,
        message_content
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26);`;

    return database.query(createAuditEventQuery, [
        tenantId,
        eventId,
        new Date(),
        patientId,
        performingUserEmail,
        userType,
        userDisplayName,
        deviceId,
        deviceModel,
        osVersion,
        version + ', ' + buildNumber,
        scanStatus,
        updateContent,
        updateId,
        invitationType,
        familyDisplayName,
        familyRelation,
        familyLanguage,
        familyContactNumber,
        familyMemberType,
        locationId,
        performingUserTitle,
        qmUpdate,
        freeTextUpdate,
        externalId,
        messageContent
    ]);
}

module.exports = {findTestAuditEventByDeviceId, insertTestAuditEvent};
