data "azurerm_container_registry" "acr" {
  provider            = azurerm.CCProd
  name                = "VLTPRODUSacr"
  resource_group_name = data.azurerm_resource_group.regional-rg.name
}
