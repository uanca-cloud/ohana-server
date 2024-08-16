resource "azurerm_app_configuration" "tenant-keystore" {
  name                       = "${local.var.OHANA.SERVICENAMESHORT}-${local.var.INFRASTRUCTURE.ENVIRONMENT}-${local.var.INFRASTRUCTURE.AZUREREGIONSHORT}-tenant-keystore"
  resource_group_name        = data.azurerm_resource_group.rg.name
  location                   = data.azurerm_resource_group.rg.location
  sku                        = "standard"
  local_auth_enabled         = true
  public_network_access      = "Enabled"
  purge_protection_enabled   = false
  soft_delete_retention_days = 1

  tags = local.tags
}

resource "azurerm_key_vault_secret" "tenant-keystore-connection-string" {
  depends_on   = [azurerm_key_vault_access_policy.ohana-gen-kv-terraform]
  name         = "tenant-keystore-connection-string"
  value        = azurerm_app_configuration.tenant-keystore.primary_read_key[0].connection_string
  key_vault_id = azurerm_key_vault.ohana-gen-kv.id
}
