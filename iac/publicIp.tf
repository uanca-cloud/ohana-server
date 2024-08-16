resource "azurerm_public_ip" "public-ip-ohana" {
  name                = "public-ip-${local.NAME_PATTERN}"
  resource_group_name = data.azurerm_resource_group.rg.name
  location            = data.azurerm_resource_group.rg.location
  allocation_method   = "Static"
  domain_name_label   = replace(local.NAME_PATTERN, "-", "")
  sku                 = "Standard"
  tags                = local.tags
}
