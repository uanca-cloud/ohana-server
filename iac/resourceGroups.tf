data "azurerm_resource_group" "regional-rg" {
  provider = azurerm.CCProd
  name     = "${local.var.INFRASTRUCTURE.AppPrefix}-devops-us-rg"
}

data "azurerm_resource_group" "ohana-core-rg" {
  name = "${local.NAME_PATTERN_PREFIX}_Ohana_Pulumi"
}

data "azurerm_resource_group" "rg" {
  name = "${local.NAME_PATTERN_PREFIX}_${local.var.OHANA.SERVICENAME}_${local.var.OHANA.ENVIRONMENT}"
}

data "azurerm_resource_group" "network-rg" {
  name = "${local.var.INFRASTRUCTURE.AppPrefix}-${local.var.INFRASTRUCTURE.ENVIRONMENT}-${local.var.INFRASTRUCTURE.AZUREREGIONSHORT}-network-rg"
}

data "azurerm_resource_group" "app-rg" {
  name = "${local.var.INFRASTRUCTURE.AppPrefix}-${local.var.INFRASTRUCTURE.ENVIRONMENT}-${local.var.INFRASTRUCTURE.AZUREREGIONSHORT}-app-rg"
}

data "azurerm_resource_group" "data-rg" {
  name = "${local.var.INFRASTRUCTURE.AppPrefix}-${local.var.INFRASTRUCTURE.ENVIRONMENT}-${local.var.INFRASTRUCTURE.AZUREREGIONSHORT}-data-rg"
}

data "azurerm_resource_group" "logs-rg" {
  name = "${local.var.INFRASTRUCTURE.AppPrefix}-${local.var.INFRASTRUCTURE.ENVIRONMENT}-${local.var.INFRASTRUCTURE.AZUREREGIONSHORT}-logs-rg"
}

data "azurerm_resource_group" "messaging-rg" {
  name = "${local.var.INFRASTRUCTURE.AppPrefix}-${local.var.INFRASTRUCTURE.ENVIRONMENT}-${local.var.INFRASTRUCTURE.AZUREREGIONSHORT}-messaging-rg"
}

data "azurerm_resource_group" "function-rg" {
  name = "${local.var.INFRASTRUCTURE.AppPrefix}-${local.var.INFRASTRUCTURE.ENVIRONMENT}-${local.var.INFRASTRUCTURE.AZUREREGIONSHORT}-function-rg"
}
