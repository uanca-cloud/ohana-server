const {getDatabasePool} = require('../DatabasePoolFactory'),
    {
        DB_CONNECTION_POOLS,
        OHANA_ROLES: {CAREGIVER, FAMILY_MEMBER},
        AUDIT_REPORT_ROLES: {AUDIT_CAREGIVER, AUDIT_FAMILY_MEMBER}
    } = require('../constants'),
    {
        invitationTypeColumnFormatter,
        escapeQuotationMarks,
        formatPhoneNumber
    } = require('../AuditEventsHelper'),
    {getLogger} = require('../logs/LoggingService'),
    {createAuditEventResultTemplate} = require('../EntitiesFactory');

const logger = getLogger('AuditEventsDao');

/**
 *
 * @param args
 * @param dbClient
 * @returns {Promise<*>}
 */
async function createAuditEvent(args, dbClient) {
    logger.debug('Creating audit event...');
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
    } = args;

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

    const pool = dbClient || getDatabasePool(DB_CONNECTION_POOLS.DEFAULT);
    await pool.query(createAuditEventQuery, [
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

    return true;
}

async function deleteTenantAuditEvents({tenantId, deleteUntil}, dbClient) {
    logger.debug('Deleting audit event...');
    const deleteTenantAuditEventsQuery = `
        DELETE FROM audit_events
        USING encounters
        WHERE audit_events.patient_id = encounters.patient_id AND audit_events.tenant_id = $1
        AND audit_events.created_at <= $2 AND encounters.ended_at IS NOT NULL
    `;
    const client = dbClient || getDatabasePool(DB_CONNECTION_POOLS.DEFAULT);

    return client.query(deleteTenantAuditEventsQuery, [tenantId, deleteUntil]);
}

async function selectAuditReportData(auditReport) {
    logger.debug('Getting audit report data...');
    const {tenantId, startDate, endDate} = auditReport;

    const selectAuditReportDataQuery = `
        SELECT event_id,
            ev.created_at,
            p.external_id as patient_external_id,
            ev.external_id,
            l.label as label,
            CASE
                 WHEN performing_user_type = '${CAREGIVER}' THEN '${AUDIT_CAREGIVER}'
                 WHEN performing_user_type = '${FAMILY_MEMBER}' THEN '${AUDIT_FAMILY_MEMBER}'
                 ELSE performing_user_type
            END,
            performing_user_display_name,
            performing_user_id,
            performing_user_title,
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
            ev.location_id,
            ev.quick_message,
            ev.free_text_translation,
            ev.message_content
        FROM audit_events ev
        INNER JOIN patients p ON ev.patient_id = p.id
        LEFT JOIN locations l ON l.id = ev.location_id
        WHERE ev.tenant_id = $1 AND ev.created_at::DATE BETWEEN $2 AND $3
        ORDER BY ev.created_at;
    `;

    const client = getDatabasePool(DB_CONNECTION_POOLS.DEFAULT);
    const results = await client.query(selectAuditReportDataQuery, [tenantId, startDate, endDate]);

    if (!results.rowCount) {
        logger.info({metadata: {tenantId}}, 'No audit events found.');
        return {templates: [], updateIds: []};
    }

    return results.rows.reduce(
        (acc, result) => {
            const template = createAuditEventResultTemplate({
                eventId: result.event_id,
                createdAt: result.created_at.toISOString(),
                externalId: escapeQuotationMarks(result.external_id ?? result.patient_external_id),
                patientLocation: escapeQuotationMarks(result.label),
                performingUserType: result.performing_user_type ?? 'n/a',
                performingUserDisplayName: escapeQuotationMarks(
                    result.performing_user_display_name
                ),
                performingUserId: result.performing_user_id ?? 'n/a',
                title: escapeQuotationMarks(result.performing_user_title),
                deviceId: result.device_id ?? 'n/a',
                deviceModel: escapeQuotationMarks(result.device_model),
                osVersion: result.os_version ?? 'n/a',
                appVersion: escapeQuotationMarks(result.app_version),
                scanStatus: result.scan_status ?? 'n/a',
                updateContent: escapeQuotationMarks(result.update_content),
                qmUpdate: escapeQuotationMarks(result.quick_message),
                freeTextUpdate: escapeQuotationMarks(result.free_text_translation),
                updateId: result.update_id ?? 'n/a',
                invitationType: invitationTypeColumnFormatter(result.invitation_type),
                familyDisplayName: escapeQuotationMarks(result.family_display_name),
                familyRelation: result.family_relation ?? 'n/a',
                familyLanguage: result.family_language ?? 'n/a',
                familyContactNumber: result.family_contact_number
                    ? formatPhoneNumber(result.family_contact_number)
                    : 'n/a',
                familyMemberType: result.family_member_type ?? 'n/a',
                messageContent: result.message_content ?? 'n/a'
            });

            acc.templates.push(template);
            if (template.updateId) {
                acc.updateIds.push(template.updateId);
            }

            return acc;
        },
        {templates: [], updateIds: []}
    );
}

module.exports = {createAuditEvent, deleteTenantAuditEvents, selectAuditReportData};
