locals {
  app_service_logs  = ["AppServiceConsoleLogs"]
  function_app_logs = ["FunctionAppLogs"]
  pg_logs           = local.var.INFRASTRUCTURE.ENVIRONMENT == "HFX" ? ["PostgreSQLFlexQueryStoreRuntime", "PostgreSQLFlexQueryStoreWaitStats", "PostgreSQLFlexDatabaseXacts", "PostgreSQLFlexSessions", "PostgreSQLLogs"] : ["PostgreSQLFlexSessions", "PostgreSQLLogs"]

}

resource "azurerm_monitor_diagnostic_setting" "appservicediagnosticsetting" {
  name                       = "app-service-diagnostic-setting"
  target_resource_id         = azurerm_linux_web_app.ohana-web-app.id
  storage_account_id         = azurerm_storage_account.storageaccohanalogs.id
  log_analytics_workspace_id = azurerm_log_analytics_workspace.log-analytics.id

  dynamic "enabled_log" {
    iterator = entry
    for_each = local.app_service_logs
    content {
      category = entry.value

      retention_policy {
        enabled = true
        days    = 30
      }
    }
  }

  metric {
    category = "AllMetrics"

    retention_policy {
      enabled = false
      days    = 7
    }
  }
  lifecycle {
    ignore_changes = [log_analytics_destination_type]
  }
}

resource "azurerm_monitor_diagnostic_setting" "azurefunctionsdiagnosticsetting" {
  name                       = "azure-functions-diagnostic-setting"
  target_resource_id         = azurerm_linux_function_app.ohana-function-app.id
  storage_account_id         = azurerm_storage_account.storageaccohanalogs.id
  log_analytics_workspace_id = azurerm_log_analytics_workspace.log-analytics.id

  enabled_log {
    category = "FunctionAppLogs"

    retention_policy {
      enabled = false
    }
  }

  metric {
    category = "AllMetrics"

    retention_policy {
      enabled = false
      days    = 7
    }
  }
  lifecycle {
    ignore_changes = [log_analytics_destination_type]
  }
}

resource "azurerm_monitor_diagnostic_setting" "pg" {
  name                       = "pg-diagnostic-setting"
  target_resource_id         = azurerm_postgresql_flexible_server.postgres-ohana.id
  storage_account_id         = azurerm_storage_account.storageaccohanalogs.id
  log_analytics_workspace_id = azurerm_log_analytics_workspace.log-analytics.id

  dynamic "enabled_log" {
    iterator = entry
    for_each = local.pg_logs
    content {
      category = entry.value

      retention_policy {
        enabled = true
      }
    }
  }

  metric {
    category = "AllMetrics"

    retention_policy {
      enabled = false
    }
  }
  lifecycle {
    ignore_changes = [log_analytics_destination_type]
  }
}
