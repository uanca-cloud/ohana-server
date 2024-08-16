#Kubernetes - RabbitMQ
resource "azurerm_key_vault_certificate" "amqp-external" {
  count        = "${local.var.INFRASTRUCTURE.IS_PRODUCTION}" == "true" ? 1 : 0
  provider     = azurerm.CCProd
  name         = "${local.var.INFRASTRUCTURE.AppPrefix}-${local.var.INFRASTRUCTURE.ENVIRONMENT}-${local.var.INFRASTRUCTURE.COUNTRYCODE}-${local.var.OHANA.SERVICENAMESHORT}-AMQP"
  key_vault_id = data.azurerm_key_vault.digicert-master.id
  timeouts {
    create = "15m"
  }

  lifecycle {
    ignore_changes = [certificate_policy.0.key_properties, certificate_policy.0.x509_certificate_properties]
  }
  certificate_policy {
    issuer_parameters {
      name = ((lower("${local.dnssuffix}") == "vf.hillrom.com") ? "WebDigicertIssuerProd" : "WebDigicertIssuer")
    }

    key_properties {
      exportable = true
      key_size   = 2048
      key_type   = "RSA"
      reuse_key  = true
    }

    lifetime_action {
      action {
        action_type = "AutoRenew"
      }

      trigger {
        days_before_expiry = 60
      }
    }

    secret_properties {
      content_type = "application/x-pkcs12"
    }

    x509_certificate_properties {
      # Server Authentication = 1.3.6.1.5.5.7.3.1
      # Client Authentication = 1.3.6.1.5.5.7.3.2
      extended_key_usage = ["1.3.6.1.5.5.7.3.1", "1.3.6.1.5.5.7.3.2"]

      key_usage = [
        "digitalSignature",
        "keyEncipherment",
      ]

      subject_alternative_names {
        dns_names = [local.rabbitmq-fqdn]
      }

      subject            = "CN=${local.rabbitmq-fqdn}"
      validity_in_months = 12
    }
  }
}

locals {
  amqp_certificate_name = "${local.var.INFRASTRUCTURE.IS_PRODUCTION}" == "true" ? azurerm_key_vault_certificate.amqp-external[0].name : "internal-amqp-vf-hrdev-io"
  amqp_certificate_kv   = "${local.var.INFRASTRUCTURE.IS_PRODUCTION}" == "true" ? data.azurerm_key_vault.digicert-master.name : data.azurerm_key_vault.hrdev-cert-vault[0].name
}