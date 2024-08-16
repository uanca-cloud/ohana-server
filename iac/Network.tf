#DNS
data "azurerm_dns_zone" "dns-internal" {
  count               = "${local.var.INFRASTRUCTURE.IS_PRODUCTION}" == "false" ? 1 : 0
  resource_group_name = "DEV_Infrastructure_EUS"
  name                = replace(local.var.INFRASTRUCTURE.DNSSUFFIX, "vlt", "vf") #small workaround because Ohana uses a different child domain
}

data "azurerm_dns_zone" "dns-external" {
  count               = "${local.var.INFRASTRUCTURE.IS_PRODUCTION}" == "true" ? 1 : 0
  resource_group_name = "prod_Ohana_DNS"
  name                = replace(local.var.INFRASTRUCTURE.DNSSUFFIX, "vlt", "vf") #small workaround because Ohana uses a different child domain
}

locals {
  dnssuffix = "${local.var.INFRASTRUCTURE.IS_PRODUCTION}" == "true" ? data.azurerm_dns_zone.dns-external[0].name : data.azurerm_dns_zone.dns-internal[0].name
  dnsrg     = "${local.var.INFRASTRUCTURE.IS_PRODUCTION}" == "true" ? data.azurerm_dns_zone.dns-external[0].resource_group_name : data.azurerm_dns_zone.dns-internal[0].resource_group_name
}

#Rabbitmq requirements

data "azurerm_public_ip" "rmq-loadbalancer-ip" {
  name                = "${local.var.INFRASTRUCTURE.AppPrefix}-${local.var.INFRASTRUCTURE.ENVIRONMENT}-${local.var.INFRASTRUCTURE.AZUREREGIONSHORT}-AKS-LoadBalancerIP-2"
  resource_group_name = data.azurerm_resource_group.network-rg.name
}

resource "azurerm_dns_a_record" "rmq-a" {
  name                = lower("${local.var.INFRASTRUCTURE.ENVIRONMENT}-${local.var.INFRASTRUCTURE.COUNTRYCODE}-amqp")
  zone_name           = local.dnssuffix
  resource_group_name = local.dnsrg
  ttl                 = 300
  records             = [data.azurerm_public_ip.rmq-loadbalancer-ip.ip_address]
}

locals {
  rabbitmq-fqdn = lower("${local.var.INFRASTRUCTURE.ENVIRONMENT}-${local.var.INFRASTRUCTURE.COUNTRYCODE}-amqp.${local.dnssuffix}")
}