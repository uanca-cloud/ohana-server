# This needs to be removed from IaC, otherwise it won't handle PG password changes, due to the dynamic provider configuration.
# provider "postgresql" {
#   host            = azurerm_postgresql_flexible_server.postgres-ohana.fqdn
#   port            = 5432
#   database        = "ohana"
#   username        = azurerm_postgresql_flexible_server.postgres-ohana.administrator_login
#   password        = azurerm_postgresql_flexible_server.postgres-ohana.administrator_password
#   sslmode         = "require"
#   connect_timeout = 15
#   superuser       = false
# }

#Server Parameters

resource "azurerm_postgresql_flexible_server_configuration" "autovacuum_max_workers" {
  name      = "autovacuum_max_workers"
  server_id = azurerm_postgresql_flexible_server.postgres-ohana.id
  lifecycle {
    ignore_changes = [server_id]
  }
  value = "1"
}

resource "azurerm_postgresql_flexible_server_configuration" "bgwriter_delay" {
  name      = "bgwriter_delay"
  server_id = azurerm_postgresql_flexible_server.postgres-ohana.id
  lifecycle {
    ignore_changes = [server_id]
  }
  value = "50"
}

resource "azurerm_postgresql_flexible_server_configuration" "max_wal_size" {
  name      = "max_wal_size"
  server_id = azurerm_postgresql_flexible_server.postgres-ohana.id
  lifecycle {
    ignore_changes = [server_id]
  }
  value = "32768"
}

resource "azurerm_postgresql_flexible_server_configuration" "extensions" {
  depends_on = [
    azurerm_postgresql_flexible_server_configuration.max_wal_size
  ]
  count     = local.var.INFRASTRUCTURE.ENVIRONMENT == "HFX" ? 1 : 0
  name      = "azure.extensions"
  server_id = azurerm_postgresql_flexible_server.postgres-ohana.id
  lifecycle {
    ignore_changes = [server_id]
  }
  value = "PG_STAT_STATEMENTS"
}

resource "azurerm_postgresql_flexible_server_configuration" "pg_qs" {
  depends_on = [
    azurerm_postgresql_flexible_server_configuration.max_wal_size
  ]
  count     = local.var.INFRASTRUCTURE.ENVIRONMENT == "HFX" ? 1 : 0
  name      = "pg_qs.query_capture_mode"
  server_id = azurerm_postgresql_flexible_server.postgres-ohana.id
  value     = "TOP"
}

resource "azurerm_postgresql_flexible_server_configuration" "pgms_wait_sampling" {
  depends_on = [
    azurerm_postgresql_flexible_server_configuration.max_wal_size
  ]
  count     = local.var.INFRASTRUCTURE.ENVIRONMENT == "HFX" ? 1 : 0
  name      = "pgms_wait_sampling.query_capture_mode"
  server_id = azurerm_postgresql_flexible_server.postgres-ohana.id
  value     = "ALL"
}

resource "azurerm_postgresql_flexible_server_configuration" "track_io_timing" {
  depends_on = [
    azurerm_postgresql_flexible_server_configuration.max_wal_size
  ]
  count     = local.var.INFRASTRUCTURE.ENVIRONMENT == "HFX" ? 1 : 0
  name      = "track_io_timing"
  server_id = azurerm_postgresql_flexible_server.postgres-ohana.id
  value     = "ON"
}

# This needs to be removed from IaC, otherwise it won't handle PG password changes, due to the dynamic provider configuration.
# resource "postgresql_extension" "pg_stat_statements" {
#   depends_on = [
#     azurerm_postgresql_flexible_server.postgres-ohana,
#     azurerm_postgresql_flexible_server_configuration.extensions[0]
#   ]
#   count    = local.var.INFRASTRUCTURE.ENVIRONMENT == "HFX" ? 1 : 0
#   name     = "pg_stat_statements"
#   database = "ohana"
# }

