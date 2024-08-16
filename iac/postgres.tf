resource "random_password" "superadmin" {
  length           = 32
  special          = true
  numeric          = true
  lower            = true
  upper            = true
  override_special = "#%&*-_=+[]{}?"
}

resource "azurerm_postgresql_flexible_server" "postgres-ohana" {
  name                         = "postgres-${local.NAME_PATTERN}"
  resource_group_name          = data.azurerm_resource_group.rg.name
  location                     = data.azurerm_resource_group.rg.location
  administrator_login          = "pgadmin"
  administrator_password       = random_password.superadmin.result
  sku_name                     = local.var.OHANA.POSTGRESQL_SKU
  version                      = "12"
  storage_mb                   = local.var.OHANA.POSTGRESQL_DBSIZE
  geo_redundant_backup_enabled = false
  tags                         = local.tags

  lifecycle {
    ignore_changes = [zone]
  }
}

locals {
  psql_connection_string_superadmin = "host=${azurerm_postgresql_flexible_server.postgres-ohana.fqdn} port=5432 dbname=ohana user=${azurerm_postgresql_flexible_server.postgres-ohana.administrator_login} password=${azurerm_postgresql_flexible_server.postgres-ohana.administrator_password} sslmode=require"
}

resource "azurerm_key_vault_secret" "postgresql-connection-string-superadmin" {
  depends_on   = [azurerm_key_vault_access_policy.ohana-gen-kv-terraform]
  name         = "postgresql-connection-string-superadmin"
  value        = local.psql_connection_string_superadmin
  key_vault_id = azurerm_key_vault.ohana-gen-kv.id
}

#Allow access to Azure services
resource "azurerm_postgresql_flexible_server_firewall_rule" "azureaccess" {
  name             = "azure"
  server_id        = azurerm_postgresql_flexible_server.postgres-ohana.id
  start_ip_address = "0.0.0.0"
  end_ip_address   = "0.0.0.0"
}
