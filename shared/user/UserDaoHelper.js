const {
        createUserTemplate,
        createCaregiverTemplate,
        createFamilyMemberTemplate
    } = require('../EntitiesFactory'),
    {
        OHANA_ROLES: {CAREGIVER, FAMILY_MEMBER},
        CAREGIVER_EULA_LAST_CHANGED_DATE,
        FAMILY_MEMBER_EULA_LAST_CHANGED_DATE
    } = require('../constants'),
    {differenceInMilliseconds} = require('date-fns');

function getInvitedByUser(row) {
    const user = createUserTemplate({
        id: row.invited_by_user_id,
        tenant: {
            id: row.invited_by_user_tenant_id
        },
        firstName: row.invited_by_user_first_name,
        lastName: row.invited_by_user_last_name,
        role: row.invited_by_user_role,
        assignedRoles: row.invited_by_user_assigned_roles
    });

    let invitedByUser = null;

    if (user.role === CAREGIVER) {
        invitedByUser = createCaregiverTemplate({
            ...user,
            title: row.invited_by_user_title,
            acceptedEula:
                differenceInMilliseconds(
                    new Date(row.invited_by_last_eula_acceptance_timestamp),
                    new Date(CAREGIVER_EULA_LAST_CHANGED_DATE)
                ) >= 0,
            renewEula: !!row.invited_by_last_eula_acceptance_timestamp
        });
    } else if (user.role === FAMILY_MEMBER) {
        invitedByUser = createFamilyMemberTemplate({
            ...user,
            phoneNumber: row.invited_by_phone_number,
            acceptedEula:
                differenceInMilliseconds(
                    new Date(row.invited_by_last_eula_acceptance_timestamp),
                    new Date(FAMILY_MEMBER_EULA_LAST_CHANGED_DATE)
                ) >= 0,
            renewEula: !!row.invited_by_last_eula_acceptance_timestamp
        });
    }

    return invitedByUser;
}

module.exports = {
    getInvitedByUser
};
