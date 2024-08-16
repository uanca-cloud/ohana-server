#Regional KV
data "azurerm_key_vault" "regional-kv" {
  provider            = azurerm.CCProd
  name                = "vlt-infrastructure-us-kv"
  resource_group_name = data.azurerm_resource_group.regional-rg.name
}

#Ohana KV
data "azurerm_key_vault" "core-kv" {
  name                = "ohana-${local.NAME_PATTERN_PREFIX}-vault"
  resource_group_name = data.azurerm_resource_group.ohana-core-rg.name
}

#Digicert certificates key vault
data "azurerm_key_vault" "digicert-master" {
  provider            = azurerm.CCProd
  name                = local.var.INFRASTRUCTURE.MASTERCERTIFICATEVAULT
  resource_group_name = data.azurerm_resource_group.regional-rg.name
}

#Letsencrypt certficates key vault
data "azurerm_key_vault" "hrdev-cert-vault" {
  count               = "${local.var.INFRASTRUCTURE.IS_PRODUCTION}" == "false" ? 1 : 0
  name                = "hrdev-cert-vault"
  resource_group_name = "dev-letsencrypt-eus"
}

resource "azurerm_key_vault" "ohana-devops-kv" {
  name                            = "${local.var.OHANA.SERVICENAMESHORT}-${local.var.INFRASTRUCTURE.ENVIRONMENT}-DevOps-KV"
  location                        = data.azurerm_resource_group.rg.location
  resource_group_name             = data.azurerm_resource_group.rg.name
  tenant_id                       = local.hometenant
  soft_delete_retention_days      = 90
  purge_protection_enabled        = false
  enabled_for_deployment          = true
  enabled_for_template_deployment = true
  sku_name                        = "standard"
  tags                            = local.tags
}

#Grant Terraform rights to read into and from keyvault
resource "azurerm_key_vault_access_policy" "ohana-devops-kv-terraform" {
  key_vault_id = azurerm_key_vault.ohana-devops-kv.id
  tenant_id    = local.hometenant
  object_id    = data.azurerm_client_config.current.object_id

  certificate_permissions = [
    "Backup", "Create", "Delete", "DeleteIssuers", "Get", "GetIssuers", "Import", "List", "ListIssuers", "ManageContacts", "ManageIssuers", "Purge", "Recover", "Restore", "SetIssuers", "Update"
  ]

  secret_permissions = [
    "Backup", "Delete", "Get", "List", "Purge", "Recover", "Restore", "Set"
  ]
}

#grant pipeline access to key vault
resource "azurerm_key_vault_access_policy" "ohana-devops-kv-automation" {
  key_vault_id = azurerm_key_vault.ohana-devops-kv.id
  tenant_id    = local.hometenant
  object_id    = data.azuread_service_principal.pipelinesp.id

  secret_permissions = [
    "Get", "List"
  ]
}

#grant devops access to key vault
resource "azurerm_key_vault_access_policy" "ohana-devops-kv-devops" {
  key_vault_id = azurerm_key_vault.ohana-devops-kv.id
  tenant_id    = local.hometenant
  object_id    = data.azuread_group.RG-Owners.id

  certificate_permissions = [
    "Backup", "Create", "Delete", "DeleteIssuers", "Get", "GetIssuers", "Import", "List", "ListIssuers", "ManageContacts", "ManageIssuers", "Purge", "Recover", "Restore", "SetIssuers", "Update"
  ]

  secret_permissions = [
    "Backup", "Delete", "Get", "List", "Purge", "Recover", "Restore", "Set"
  ]
}


#Generic application key vault
resource "azurerm_key_vault" "ohana-gen-kv" {

  name                            = "${local.var.OHANA.SERVICENAMESHORT}-${local.var.INFRASTRUCTURE.ENVIRONMENT}-Gen-KV"
  location                        = data.azurerm_resource_group.rg.location
  resource_group_name             = data.azurerm_resource_group.rg.name
  tenant_id                       = local.hometenant
  soft_delete_retention_days      = 90
  purge_protection_enabled        = false
  enabled_for_deployment          = true
  enabled_for_template_deployment = true
  sku_name                        = "standard"
  tags                            = local.tags
}

#grant terraform access to key vault
resource "azurerm_key_vault_access_policy" "ohana-gen-kv-terraform" {
  key_vault_id = azurerm_key_vault.ohana-gen-kv.id
  tenant_id    = local.hometenant
  object_id    = data.azurerm_client_config.current.object_id

  certificate_permissions = [
    "Backup", "Create", "Delete", "DeleteIssuers", "Get", "GetIssuers", "Import", "List", "ListIssuers", "ManageContacts", "ManageIssuers", "Purge", "Recover", "Restore", "SetIssuers", "Update"
  ]

  secret_permissions = [
    "Backup", "Delete", "Get", "List", "Purge", "Recover", "Restore", "Set"
  ]
}

#grant devops access to key vault
resource "azurerm_key_vault_access_policy" "ohana-gen-kv-devops" {
  key_vault_id = azurerm_key_vault.ohana-gen-kv.id
  tenant_id    = local.hometenant
  object_id    = data.azuread_group.RG-Owners.id

  certificate_permissions = [
    "Backup", "Create", "Delete", "DeleteIssuers", "Get", "GetIssuers", "Import", "List", "ListIssuers", "ManageContacts", "ManageIssuers", "Purge", "Recover", "Restore", "SetIssuers", "Update"
  ]

  secret_permissions = [
    "Backup", "Delete", "Get", "List", "Purge", "Recover", "Restore", "Set"
  ]
}

#grant PROD access to PROD key vault
resource "azurerm_key_vault_access_policy" "ohana-gen-kv-prod" {
  count = local.var.INFRASTRUCTURE.IS_PRODUCTION == "true" ? 1 : 0
  key_vault_id = azurerm_key_vault.ohana-gen-kv.id
  tenant_id    = local.hometenant
  object_id    = data.azuread_group.PROD-Owners.id

  certificate_permissions = [
    "Backup", "Create", "Delete", "DeleteIssuers", "Get", "GetIssuers", "Import", "List", "ListIssuers", "ManageContacts", "ManageIssuers", "Purge", "Recover", "Restore", "SetIssuers", "Update"
  ]

  secret_permissions = [
    "Backup", "Delete", "Get", "List", "Purge", "Recover", "Restore", "Set"
  ]
}

#grant pipeline access to key vault
resource "azurerm_key_vault_access_policy" "ohana-gen-kv-automation" {
  key_vault_id = azurerm_key_vault.ohana-gen-kv.id
  tenant_id    = local.hometenant
  object_id    = data.azuread_service_principal.pipelinesp.id

  secret_permissions = [
    "Get", "List"
  ]
}

#grant developer access to key vault
resource "azurerm_key_vault_access_policy" "ohana-gen-kv-developers" {
  count = local.var.INFRASTRUCTURE.IS_PRODUCTION == "true" ? 0 : 1
  key_vault_id = azurerm_key_vault.ohana-gen-kv.id
  tenant_id    = local.hometenant
  object_id    = data.azuread_group.VFamilyDevAll.id

  secret_permissions = [
    "Get", "List"
  ]
}

resource "azurerm_key_vault_access_policy" "ohana-gen-kv-qe-manual" {
  count = local.var.INFRASTRUCTURE.IS_PRODUCTION == "true" ? 0 : 1
  key_vault_id = azurerm_key_vault.ohana-gen-kv.id
  tenant_id    = local.hometenant
  object_id    = data.azuread_group.VFamilyQEManual.id

  secret_permissions = [
    "Get", "List"
  ]
}

resource "azurerm_key_vault_access_policy" "ohana-gen-kv-qe-automation" {
  count = local.var.INFRASTRUCTURE.IS_PRODUCTION == "true" ? 0 : 1
  key_vault_id = azurerm_key_vault.ohana-gen-kv.id
  tenant_id    = local.hometenant
  object_id    = data.azuread_group.VFamilyQEAutomation.id

  secret_permissions = [
    "Get", "List"
  ]
}

#grant pipeline access to Ohana Managed Identity
resource "azurerm_key_vault_access_policy" "ohana-gen-kv-managed-identity" {
  key_vault_id = azurerm_key_vault.ohana-gen-kv.id
  tenant_id    = local.hometenant
  object_id    = data.azurerm_user_assigned_identity.ohana.principal_id


  secret_permissions = [
    "Get", "List"
  ]
}
