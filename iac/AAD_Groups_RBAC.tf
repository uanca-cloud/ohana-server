locals {
  ohana_qe_contributor_resources = [
    azurerm_linux_web_app.ohana-web-app.id,
    azurerm_postgresql_flexible_server.postgres-ohana.id,
    azurerm_linux_function_app.ohana-function-app.id,
    azurerm_redis_cache.redis-ohana.id,
    azurerm_notification_hub.ohana-notification-hub.id
  ]

  sp_contributor_resources = [
    azurerm_linux_web_app.ohana-web-app.id,
    azurerm_postgresql_flexible_server.postgres-ohana.id,
    azurerm_linux_function_app.ohana-function-app.id,
    azurerm_storage_account.storageaccohana.id,
    azurerm_notification_hub.ohana-notification-hub.id
  ]
}

#VFamily QE Permissions
resource "azurerm_role_assignment" "VFamilyQEManual-Contributor" {
  count                = contains(["STAGE", "TEST", "AUT"], local.var.INFRASTRUCTURE.ENVIRONMENT) ? length(local.ohana_qe_contributor_resources) : 0
  scope                = local.ohana_qe_contributor_resources[count.index]
  role_definition_name = "Contributor"
  principal_id         = data.azuread_group.VFamilyQEManual.id
}

resource "azurerm_role_assignment" "VFamilyQEAutomation-Contributor" {
  count                = contains(["STAGE", "TEST", "AUT"], local.var.INFRASTRUCTURE.ENVIRONMENT) ? length(local.ohana_qe_contributor_resources) : 0
  scope                = local.ohana_qe_contributor_resources[count.index]
  role_definition_name = "Contributor"
  principal_id         = data.azuread_group.VFamilyQEAutomation.id
}

#Service Principal Permissions

resource "azurerm_role_assignment" "sp-Contributor" {
  count                = length(local.sp_contributor_resources)
  scope                = local.sp_contributor_resources[count.index]
  role_definition_name = "Contributor"
  principal_id         = data.azuread_service_principal.pipelinesp.id
}