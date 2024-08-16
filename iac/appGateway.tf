
locals {
  applicationGatewayBackendHttpProbeName                      = "Http"
  applicationGatewayBackendHttpsProbeName                     = "Https"
  applicationGatewayDefaultBackendHTTPSettingsName            = "Http443"
  applicationGatewayDefaultBackendPoolFunctionAddressPoolName = "BackendPool_Func"
  applicationGatewayDefaultBackendPoolStorageAddressPoolName  = "BackendPool_Storage"
  applicationGatewayDefaultRewriteRuleSetName                 = "rewrite-set"
  applicationGatewayForwardIp                                 = azurerm_public_ip.public-ip-ohana.id
  applicationGatewayForwardIpListenerName                     = "appgwfip"
  applicationGatewayForwardIpListenerPortBaseName             = "frontport"
  applicationGatewayRequestRoutingListenerName                = "appgwhttpslistener"
  applicationGatewayRequestRoutingPathMapName                 = "pathMap1"
}

resource "azurerm_application_gateway" "ohana-app-gateway" {
  name                = "application-gateway-${local.NAME_PATTERN}"
  resource_group_name = data.azurerm_resource_group.rg.name
  location            = data.azurerm_resource_group.rg.location

  sku {
    name     = "Standard_v2"
    tier     = "Standard_v2"
    capacity = 3
  }

  gateway_ip_configuration {
    name      = "appgwipc"
    subnet_id = local.var.OHANA.APPGW_SUBNET
  }

  frontend_port {
    name = "${local.applicationGatewayForwardIpListenerPortBaseName}80"
    port = 80
  }

  frontend_port {
    name = "${local.applicationGatewayForwardIpListenerPortBaseName}443"
    port = 443
  }

  frontend_ip_configuration {
    name                 = local.applicationGatewayForwardIpListenerName
    public_ip_address_id = local.applicationGatewayForwardIp
  }

  backend_address_pool {
    fqdns = [azurerm_linux_web_app.ohana-web-app.default_hostname]
    name  = local.applicationGatewayDefaultBackendPoolFunctionAddressPoolName
  }

  backend_address_pool {
    fqdns = [azurerm_linux_function_app.ohana-function-app.default_hostname]
    name  = "${local.applicationGatewayDefaultBackendPoolFunctionAddressPoolName}_logs"
  }

  backend_address_pool {
    name  = local.applicationGatewayDefaultBackendPoolStorageAddressPoolName
    fqdns = ["${azurerm_storage_account.storageaccohana.name}.z13.web.core.windows.net"]
  }

  ssl_certificate {
    name                = "sslcert"
    key_vault_secret_id = local.var.OHANA.SSL_CERT
  }

  ssl_policy {
    min_protocol_version = "TLSv1_2"
    policy_type          = "Custom"
    cipher_suites = [
      "TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384",
      "TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384",
      "TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256",
      "TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256"
    ]
  }

  backend_http_settings {
    name                  = "Http80"
    cookie_based_affinity = "Disabled"
    # path                  = "/path1/"
    port                                = 80
    protocol                            = "Http"
    request_timeout                     = 30
    pick_host_name_from_backend_address = true
    probe_name                          = local.applicationGatewayBackendHttpProbeName
  }

  probe {
    interval                                  = 30
    name                                      = local.applicationGatewayBackendHttpProbeName
    pick_host_name_from_backend_http_settings = true
    path                                      = "/"
    protocol                                  = "Http"
    port                                      = 80
    minimum_servers                           = 0
    timeout                                   = 30
    unhealthy_threshold                       = 3
    match {
      body        = ""
      status_code = ["200-399"]
    }
  }

  backend_http_settings {
    name                  = local.applicationGatewayDefaultBackendHTTPSettingsName
    cookie_based_affinity = "Disabled"
    # path                  = "/path1/"
    port                                = 443
    protocol                            = "Https"
    request_timeout                     = 30
    pick_host_name_from_backend_address = true
    probe_name                          = local.applicationGatewayBackendHttpsProbeName
  }

  probe {
    interval                                  = 30
    name                                      = local.applicationGatewayBackendHttpsProbeName
    pick_host_name_from_backend_http_settings = true
    path                                      = "/"
    protocol                                  = "Https"
    port                                      = 443
    minimum_servers                           = 0
    timeout                                   = 30
    unhealthy_threshold                       = 3
    match {
      body        = ""
      status_code = ["200-399"]
    }
  }

  http_listener {
    name                           = local.applicationGatewayRequestRoutingListenerName
    frontend_ip_configuration_name = local.applicationGatewayForwardIpListenerName
    frontend_port_name             = "${local.applicationGatewayForwardIpListenerPortBaseName}443"
    protocol                       = "Https"
    ssl_certificate_name           = "sslcert"
    require_sni                    = false
  }

  http_listener {
    name                           = "appgwhttplistener"
    frontend_ip_configuration_name = local.applicationGatewayForwardIpListenerName
    frontend_port_name             = "${local.applicationGatewayForwardIpListenerPortBaseName}80"
    protocol                       = "Http"
    require_sni                    = false
  }

  identity {
    type         = "UserAssigned"
    identity_ids = [data.azurerm_user_assigned_identity.ohana.id]
  }

  request_routing_rule {
    name               = "appgwPathBasedRule"
    rule_type          = "PathBasedRouting"
    priority           = 20
    http_listener_name = local.applicationGatewayRequestRoutingListenerName
    url_path_map_name  = local.applicationGatewayRequestRoutingPathMapName
  }

  rewrite_rule_set {
    name = local.applicationGatewayDefaultRewriteRuleSetName

    rewrite_rule {
      name          = "rewrite_rule"
      rule_sequence = 100
      response_header_configuration {
        header_name  = "X-Content-Type-Options"
        header_value = "'nosniff'"
      }
      response_header_configuration {
        header_name  = "Referrer-Policy"
        header_value = "strict-origin"
      }
      response_header_configuration {
        header_name  = "Feature-Policy"
        header_value = "microphone 'none'; camera 'none'; geolocation 'none'; usb 'none'"
      }
      response_header_configuration {
        header_name  = "Strict-Transport-Security"
        header_value = "max-age=31536000, includeSubdomains"
      }
      response_header_configuration {
        header_name  = "X-Frame-Options"
        header_value = "sameorigin"
      }
      response_header_configuration {
        header_name  = "Content-Security-Policy"
        header_value = "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
      }
    }

    rewrite_rule {
      name          = "admin_rule"
      rule_sequence = 200
      condition {
        pattern     = "/admin(/(config.json|index.html))?"
        variable    = "var_uri_path"
        negate      = false
        ignore_case = true
      }
      response_header_configuration {
        header_name  = "Pragma"
        header_value = "no-cache"
      }
      response_header_configuration {
        header_name  = "Cache-Control"
        header_value = "private, no-cache, no-store, must-revalidate, max-age=0"
      }
      response_header_configuration {
        header_name  = "Expires"
        header_value = "Thu, 01 Jan 1970 00:00:00 +0000"
      }
    }

    rewrite_rule {
      name          = "admin_media_rule"
      rule_sequence = 201
      condition {
        negate      = false
        ignore_case = true
        pattern     = "/admin/.*\\.(js|css|svg|png|woff)"
        variable    = "var_uri_path"
      }
      response_header_configuration {
        header_name  = "Cache-Control"
        header_value = "public, max-age=31536000"
      }
    }

    rewrite_rule {
      name          = "media_storage"
      rule_sequence = 300
      condition {
        negate      = false
        ignore_case = true
        pattern     = "/attachment/.*\\.(jpg|mp4)"
        variable    = "var_uri_path"
      }
      response_header_configuration {
        header_name  = "Pragma"
        header_value = "no-cache"
      }
      response_header_configuration {
        header_name  = "Cache-Control"
        header_value = "private, no-cache, no-store, must-revalidate, max-age=0"
      }
      response_header_configuration {
        header_name  = "Expires"
        header_value = "Thu, 01 Jan 1970 00:00:00 +0000"
      }
    }

    rewrite_rule {
      name          = "audit_rule"
      rule_sequence = 400
      condition {
        negate      = false
        ignore_case = true
        pattern     = "/audit/.*\\.tar"
        variable    = "var_uri_path"
      }
      response_header_configuration {
        header_name  = "Pragma"
        header_value = "no-cache"
      }
      response_header_configuration {
        header_name  = "Cache-Control"
        header_value = "private, no-cache, no-store, must-revalidate, max-age=0"
      }
      response_header_configuration {
        header_name  = "Expires"
        header_value = "Thu, 01 Jan 1970 00:00:00 +0000"
      }
    }

    rewrite_rule {
      name          = "well_known_rule"
      rule_sequence = 500
      condition {
        pattern     = "/.well-known/.+"
        variable    = "var_uri_path"
        ignore_case = true
      }
      response_header_configuration {
        header_name  = "Content-Type"
        header_value = "application/json"
      }
    }
  }

  url_path_map {
    name                               = local.applicationGatewayRequestRoutingPathMapName
    default_backend_address_pool_name  = local.applicationGatewayDefaultBackendPoolFunctionAddressPoolName
    default_backend_http_settings_name = local.applicationGatewayDefaultBackendHTTPSettingsName
    default_rewrite_rule_set_name      = local.applicationGatewayDefaultRewriteRuleSetName

    path_rule {
      name                       = "Https_target"
      backend_address_pool_name  = local.applicationGatewayDefaultBackendPoolFunctionAddressPoolName
      backend_http_settings_name = local.applicationGatewayDefaultBackendHTTPSettingsName
      paths                      = ["/*"]
      rewrite_rule_set_name      = local.applicationGatewayDefaultRewriteRuleSetName
    }

    path_rule {
      name                       = "admin_target"
      backend_address_pool_name  = local.applicationGatewayDefaultBackendPoolStorageAddressPoolName
      backend_http_settings_name = local.applicationGatewayDefaultBackendHTTPSettingsName
      paths                      = ["/admin"]
      rewrite_rule_set_name      = local.applicationGatewayDefaultRewriteRuleSetName
    }

    path_rule {
      name                       = "subAdmin"
      backend_address_pool_name  = local.applicationGatewayDefaultBackendPoolStorageAddressPoolName
      backend_http_settings_name = local.applicationGatewayDefaultBackendHTTPSettingsName
      paths                      = ["/admin/*"]
      rewrite_rule_set_name      = local.applicationGatewayDefaultRewriteRuleSetName
    }

    path_rule {
      name                       = "audit_target"
      backend_address_pool_name  = local.applicationGatewayDefaultBackendPoolStorageAddressPoolName
      backend_http_settings_name = local.applicationGatewayDefaultBackendHTTPSettingsName
      paths                      = ["/audit/*"]
      rewrite_rule_set_name      = local.applicationGatewayDefaultRewriteRuleSetName
    }

    path_rule {
      name                       = "media_target"
      backend_address_pool_name  = local.applicationGatewayDefaultBackendPoolStorageAddressPoolName
      backend_http_settings_name = local.applicationGatewayDefaultBackendHTTPSettingsName
      paths                      = ["/media/*"]
      rewrite_rule_set_name      = local.applicationGatewayDefaultRewriteRuleSetName
    }

    path_rule {
      name                       = "well_known"
      backend_address_pool_name  = local.applicationGatewayDefaultBackendPoolStorageAddressPoolName
      backend_http_settings_name = local.applicationGatewayDefaultBackendHTTPSettingsName
      paths                      = ["/.well-known/*"]
      rewrite_rule_set_name      = local.applicationGatewayDefaultRewriteRuleSetName
    }

    path_rule {
      name                       = "clientLogs_target"
      backend_address_pool_name  = "${local.applicationGatewayDefaultBackendPoolFunctionAddressPoolName}_logs"
      backend_http_settings_name = local.applicationGatewayDefaultBackendHTTPSettingsName
      paths                      = ["/clientLogs"]
      rewrite_rule_set_name      = local.applicationGatewayDefaultRewriteRuleSetName
    }
  }
  tags = local.tags
}
