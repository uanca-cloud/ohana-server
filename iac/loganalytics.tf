locals {
  #this workaround is required due to the fact that the resource is name sensitive
  NAME_PATTERN_LOG_ANALYTICS = "${local.NAME_PATTERN_PREFIX}-${title(local.var.OHANA.SERVICENAME)}-${title(local.var.OHANA.ENVIRONMENT)}"
}

resource "azurerm_log_analytics_workspace" "log-analytics" {
  name                = "log-analytics-${local.NAME_PATTERN_LOG_ANALYTICS}"
  resource_group_name = data.azurerm_resource_group.rg.name
  location            = data.azurerm_resource_group.rg.location
  sku                 = "PerGB2018"
  retention_in_days   = 30
  tags                = local.tags
}


resource "azurerm_log_analytics_query_pack" "query-pack" {
  count               = contains(["SBX", "DEV"], local.var.INFRASTRUCTURE.ENVIRONMENT) ? 1 : 0
  name                = "VLT-Ohana-Query-Pack"
  resource_group_name = data.azurerm_resource_group.rg.name
  location            = data.azurerm_resource_group.rg.location
  tags                = local.tags
}

resource "azurerm_log_analytics_query_pack_query" "ClientLookup" {
  count         = contains(["SBX", "DEV"], local.var.INFRASTRUCTURE.ENVIRONMENT) ? 1 : 0
  query_pack_id = azurerm_log_analytics_query_pack.query-pack[0].id
  body          = <<EOF
// --------------------------- Admin and Mobile  --------------------------- //
// --- Get 5 most recent logs without formatting ---
FunctionAppLogs
| extend ClientLogs = parse_json(replace_string(Message, "'", '"'))
| where Message contains "ClientLogsFunction"
| take 5
| project-away Message


// --- Find all client logs within a specific period of time ---
FunctionAppLogs
| extend json = parse_json(replace_string(Message, "'", '"'))
| extend ProcessMessage = tostring(json.message)
| project clientJson=parse_json(ProcessMessage), serverJson=json
| mv-expand clientJson
| extend
//Server
    ServerLogLevel = serverJson.level,
    ServerProcessName = serverJson.name,
    ServerSessionID = serverJson.metadata.sessionId,
//Client
    TimeCreated = unixtime_milliseconds_todatetime(tolong(clientJson['time'])),
    ClientLogLevel = clientJson.level,
    ClientMessage = clientJson.message,
//CLient metadata
    ClientDeviceID = clientJson.metadata.deviceId,
    ClientDeviceModel = clientJson.metadata.deviceModel,
    ClientAppName = clientJson.metadata.name,
    ClientOSVersion = clientJson.metadata.osVersion,
    ClientSessionID = clientJson.metadata.sessionId,
    ClientTenantID = clientJson.metadata.tenantId,
    ClientUserID = clientJson.metadata.userId,
    ClientAppVersion = clientJson.metadata.version
| where ServerProcessName == 'ClientLogsFunction'
    // and TimeCreated between (datetime(2023-05-17) .. datetime(2023-05-22))
| project-away serverJson

// --- Find all client logs and expand the results that are not errors ---
FunctionAppLogs
| extend json = parse_json(replace_string(Message, "'", '"'))
| extend ProcessMessage = tostring(json.message)
| project clientJson=parse_json(ProcessMessage), serverJson=json
| mv-expand clientJson
| extend
//Server
    ServerLogLevel = serverJson.level,
    ServerProcessName = serverJson.name,
    ServerSessionID = serverJson.metadata.sessionId,
//Client
    TimeCreated = unixtime_milliseconds_todatetime(tolong(clientJson['time'])),
    ClientLogLevel = clientJson.level,
    ClientMessage = clientJson.message,
//CLient metadata
    ClientDeviceID = clientJson.metadata.deviceId,
    ClientDeviceModel = clientJson.metadata.deviceModel,
    ClientAppName = clientJson.metadata.name,
    ClientOSVersion = clientJson.metadata.osVersion,
    ClientSessionID = clientJson.metadata.sessionId,
    ClientTenantID = clientJson.metadata.tenantId,
    ClientUserID = clientJson.metadata.userId,
    ClientAppVersion = clientJson.metadata.version
| where ServerProcessName == 'ClientLogsFunction'
    and ServerLogLevel != 'ERROR'
    and ClientLogLevel != 'ERROR'
| project-away serverJson


// --- Find all logs for a specific ID type in the metadata ( SessionID | UserID | TenantID ) ---
FunctionAppLogs
| extend json = parse_json(replace_string(Message, "'", '"'))
| extend ProcessMessage = tostring(json.message)
| project clientJson=parse_json(ProcessMessage), serverJson=json
| mv-expand clientJson
| extend
//Server
    ServerLogLevel = serverJson.level,
    ServerProcessName = serverJson.name,
    ServerSessionID = serverJson.metadata.sessionId,
//Client
    TimeCreated = unixtime_milliseconds_todatetime(tolong(clientJson['time'])),
    ClientLogLevel = clientJson.level,
    ClientMessage = clientJson.message,
//CLient metadata
    ClientDeviceID = clientJson.metadata.deviceId,
    ClientDeviceModel = clientJson.metadata.deviceModel,
    ClientAppName = clientJson.metadata.name,
    ClientOSVersion = clientJson.metadata.osVersion,
    ClientSessionID = clientJson.metadata.sessionId,
    ClientTenantID = clientJson.metadata.tenantId,
    ClientUserID = clientJson.metadata.userId,
    ClientAppVersion = clientJson.metadata.version
| where ServerProcessName == 'ClientLogsFunction'
    // and ClientSessionID contains "" //insert text between ""
    //and ClientUserID contains "" //insert text between ""
    //and ClientTenantID contains "" //insert text between ""
| project-away serverJson

// --- Find all logs for an error code ---
FunctionAppLogs
| extend json = parse_json(replace_string(Message, "'", '"'))
| extend ProcessMessage = tostring(json.message)
| project clientJson=parse_json(ProcessMessage), serverJson=json
| mv-expand clientJson
| extend
//Server
    ServerLogLevel = serverJson.level,
    ServerProcessName = serverJson.name,
    ServerSessionID = serverJson.metadata.sessionId,
//Client
    TimeCreated = unixtime_milliseconds_todatetime(tolong(clientJson['time'])),
    ClientLogLevel = clientJson.level,
    ClientMessage = clientJson.message,
//CLient metadata
    ClientDeviceID = clientJson.metadata.deviceId,
    ClientDeviceModel = clientJson.metadata.deviceModel,
    ClientAppName = clientJson.metadata.name,
    ClientOSVersion = clientJson.metadata.osVersion,
    ClientSessionID = clientJson.metadata.sessionId,
    ClientTenantID = clientJson.metadata.tenantId,
    ClientUserID = clientJson.metadata.userId,
    ClientAppVersion = clientJson.metadata.version,
//Client error
    ErrorName = clientJson.error.name,
    ErrorMessage = clientJson.error.message,
    ErrorStack = clientJson.error.stack
| where ServerProcessName == 'ClientLogsFunction'
    and ClientLogLevel contains "ERROR"
    //only errors where stack exists
    //and isnotempty(clientJson.error.stack)
| project-away serverJson

// --- Find the total counts for each log level type within a expected time period ---
FunctionAppLogs
| parse kind=regex _ResourceId with ".*[/]" AppName: string
| extend json = replace_string(Message, "'", '"')
| extend ProcessMessage = tostring(parse_json(json).message)
| project clientJson=parse_json(ProcessMessage), serverJson=parse_json(json)
| mv-expand clientJson
| extend ClientLogLevel = clientJson.level
| where  serverJson.name == 'ClientLogsFunction'
| summarize  Count=count() by tostring(ClientLogLevel)


// --------------------------- Mobile  --------------------------- //

// --- Find all logs for a specific device info ---
FunctionAppLogs
| extend json = parse_json(replace_string(Message, "'", '"'))
| extend ProcessMessage = tostring(json.message)
| project clientJson=parse_json(ProcessMessage), serverJson=json
| mv-expand clientJson
| extend
//Server
    ServerLogLevel = serverJson.level,
    ServerProcessName = serverJson.name,
    ServerSessionID = serverJson.metadata.sessionId,
//Client
    TimeCreated = unixtime_milliseconds_todatetime(tolong(clientJson['time'])),
    ClientLogLevel = clientJson.level,
    ClientMessage = clientJson.message,
//CLient metadata
    ClientDeviceID = clientJson.metadata.deviceId,
    ClientDeviceModel = clientJson.metadata.deviceModel,
    ClientAppName = clientJson.metadata.name,
    ClientOSVersion = clientJson.metadata.osVersion,
    ClientSessionID = clientJson.metadata.sessionId,
    ClientTenantID = clientJson.metadata.tenantId,
    ClientUserID = clientJson.metadata.userId,
    ClientAppVersion = clientJson.metadata.version
| where ServerProcessName == 'ClientLogsFunction'
    and clientJson has "deviceId"
    and ClientDeviceID contains ""
    and ClientOSVersion contains ""
    and ClientDeviceModel contains ""
| project-away serverJson

// --- Find all logs for a specific ID type in the metadata ( SessionID | UserID | TenantID ) ---
FunctionAppLogs
| extend json = parse_json(replace_string(Message, "'", '"'))
| extend ProcessMessage = tostring(json.message)
| project clientJson=parse_json(ProcessMessage), serverJson=json
| mv-expand clientJson
| extend
//Server
    ServerLogLevel = serverJson.level,
    ServerProcessName = serverJson.name,
    ServerSessionID = serverJson.metadata.sessionId,
//Client
    TimeCreated = unixtime_milliseconds_todatetime(tolong(clientJson['time'])),
    ClientLogLevel = clientJson.level,
    ClientMessage = clientJson.message,
//CLient metadata
    ClientDeviceID = clientJson.metadata.deviceId,
    ClientDeviceModel = clientJson.metadata.deviceModel,
    ClientAppName = clientJson.metadata.name,
    ClientOSVersion = clientJson.metadata.osVersion,
    ClientSessionID = clientJson.metadata.sessionId,
    ClientTenantID = clientJson.metadata.tenantId,
    ClientUserID = clientJson.metadata.userId,
    ClientAppVersion = clientJson.metadata.version
| where ServerProcessName == 'ClientLogsFunction'
    and clientJson has "deviceId"
    //and ClientSessionID contains "" //insert text between ""
    //and ClientUserID contains "" //insert text between ""
    //and ClientTenantID contains "" //insert text between ""
| project-away serverJson

// --- Mobile logs for errors ---
FunctionAppLogs
| extend json = parse_json(replace_string(Message, "'", '"'))
| extend ProcessMessage = tostring(json.message)
| project clientJson=parse_json(ProcessMessage), serverJson=json
| mv-expand clientJson
| extend
//Server
    ServerLogLevel = serverJson.level,
    ServerProcessName = serverJson.name,
    ServerSessionID = serverJson.metadata.sessionId,
    ServerResponse = clientJson.responseData,
    ServerRequest = clientJson.requestData,
//Client
    TimeCreated = unixtime_milliseconds_todatetime(tolong(clientJson['time'])),
    ClientLogLevel = clientJson.level,
    ClientMessage = clientJson.message,
    ClientSessionID = clientJson.metadata.sessionId,
    ClientUserID = clientJson.metadata.userId,
    ClientDeviceID = clientJson.metadata.deviceId,
    ClientDeviceModel = clientJson.metadata.deviceModel,
    ClientAppName = clientJson.metadata.name,
    ClientOSVersion = clientJson.metadata.osVersion,
    ClientTenantID = clientJson.metadata.tenantId,
    ClientAppVersion = clientJson.metadata.version,
    ClientMetadata = clientJson.metadata,
    //Client error
    ErrorName = clientJson.error.name,
    ErrorMessage = clientJson.error.message,
    ErrorStack = clientJson.error.stack
| where ServerProcessName == 'ClientLogsFunction'
    and clientJson has "deviceId"
    and ClientLogLevel contains "ERROR"
    //only errors where stack exists
    //and isnotempty(clientJson.error.stack)
| project-away serverJson


// --------------------------- Admin Web  --------------------------- //

// --- Patient data redaction ---
FunctionAppLogs
| parse kind=regex _ResourceId with ".*[/]" AppName: string
| extend json = replace_string(Message, "'", '"')
| extend ProcessMessage = tostring(parse_json(json).message)
| project clientJson=parse_json(ProcessMessage), serverJson=parse_json(json)
| extend TimeCreated = todatetime(serverJson['time'])
| mv-expand clientJson
| extend
    ServerLogLevel = serverJson.level,
    ProcessName = serverJson.name,
    ClientLogLevel = clientJson.level,
    ClientMessage = clientJson.message,
    ClientMetadata = clientJson.metadata,
    ServerSessionID = serverJson.metadata.sessionId
| where ProcessName == 'ClientLogsFunction'
    // and ServerLogLevel != 'ERROR'
    // and ClientLogLevel == "DEBUG"
    and clientJson !has "deviceId"
| project-away serverJson

// --- Admin logs for user / session /tenant id ---
FunctionAppLogs
| extend json = parse_json(replace_string(Message, "'", '"'))
| extend ProcessMessage = tostring(json.message)
| project clientJson=parse_json(ProcessMessage), serverJson=json
| mv-expand clientJson
| extend
//Server
    ServerLogLevel = serverJson.level,
    ServerProcessName = serverJson.name,
    ServerSessionID = serverJson.metadata.sessionId,
    ServerResponse = clientJson.responseData,
    ServerRequest = clientJson.requestData,
//Client
    TimeCreated = unixtime_milliseconds_todatetime(tolong(clientJson['time'])),
    ClientLogLevel = clientJson.level,
    ClientMessage = clientJson.message,
    ClientSessionID = clientJson.metadata.sessionId,
    ClientUserID = clientJson.metadata.userId,
    ClientTenantID = clientJson.metadata.tenantId,
    ClientMetadata = clientJson.metadata
| where serverJson.name == 'ClientLogsFunction'
    and clientJson !has "deviceId"
    // and ClientUserID == "" // replace with user id
    // and ClientTenantID == "" // replace with tenant id
    // and ClientSessionID == "" // replace with session id
| project-away serverJson

// --- Find all QMs with text ---
FunctionAppLogs
| extend json = parse_json(replace_string(Message, "'", '"'))
| extend ProcessMessage = tostring(json.message)
| project clientJson=parse_json(ProcessMessage), serverJson=json
| mv-expand clientJson
| extend
//Server
    ServerLogLevel = serverJson.level,
    ServerProcessName = serverJson.name,
    ServerSessionID = serverJson.metadata.sessionId,
    ServerResponse = clientJson.responseData,
    ServerRequest = clientJson.requestData,
//Client
    TimeCreated = unixtime_milliseconds_todatetime(tolong(clientJson['time'])),
    ClientLogLevel = clientJson.level,
    ClientMessage = clientJson.message,
    ClientSessionID = clientJson.metadata.sessionId,
    ClientUserID = clientJson.metadata.userId,
    ClientTenantID = clientJson.metadata.tenantId,
    ClientMetadata = clientJson.metadata,
    ClientRequestDataQuickMessages =  clientJson.requestData.quickMessages
| where (ServerProcessName == 'ClientLogsFunction'
    and clientJson !has "deviceId")
    and (
        ClientMessage contains "QuickMessage"
        or bag_has_key(ServerRequest, 'quickMessages')
        or ServerResponse contains "quickMessages"
    )
| project-away serverJson

// --- Admin logs for errors ---
FunctionAppLogs
| extend json = parse_json(replace_string(Message, "'", '"'))
| extend ProcessMessage = tostring(json.message)
| project clientJson=parse_json(ProcessMessage), serverJson=json
| mv-expand clientJson
| extend
//Server
    ServerLogLevel = serverJson.level,
    ServerProcessName = serverJson.name,
    ServerSessionID = serverJson.metadata.sessionId,
    ServerResponse = clientJson.responseData,
    ServerRequest = clientJson.requestData,
//Client
    TimeCreated = unixtime_milliseconds_todatetime(tolong(clientJson['time'])),
    ClientLogLevel = clientJson.level,
    ClientMessage = clientJson.message,
    ClientSessionID = clientJson.metadata.sessionId,
    ClientUserID = clientJson.metadata.userId,
    ClientTenantID = clientJson.metadata.tenantId,
    ClientMetadata = clientJson.metadata,
    //Client error
    ErrorName = clientJson.error.name,
    ErrorMessage = clientJson.error.message,
    ErrorStack = clientJson.error.stack
| where ServerProcessName == 'ClientLogsFunction'
    and clientJson !has "deviceId"
    and ClientLogLevel contains "ERROR"
    //only errors where stack exists
    //and isnotempty(clientJson.error.stack)
| project-away serverJson
EOF
  display_name  = "Ohana - Client - Lookup Queries"
}

resource "azurerm_log_analytics_query_pack_query" "ServerLookup" {
  count         = contains(["SBX", "DEV"], local.var.INFRASTRUCTURE.ENVIRONMENT) ? 1 : 0
  query_pack_id = azurerm_log_analytics_query_pack.query-pack[0].id
  body          = <<EOF
// --- Get 5 most recent logs without formatting ---
AppServiceConsoleLogs
| take 5

// --- Find all logs from the last 4 hours ---
AppServiceConsoleLogs
| parse ResultDescription with * '"time":"' TimeCreated '",' *
| project json=parse_json(ResultDescription), todatetime(TimeCreated)
| extend metadata=json.metadata
| extend
    LogLevel = json.level,
    ProcessName = json.name,
    ProcessMessage = json.message,
//metadata
    Version = metadata.version,
    UserID = metadata.userId,
    TenantID = metadata.tenantId,
    SessionID = metadata.sessionId,
    PatientID = metadata.patientId,
    LocationID = toint(metadata.locationId),
    UpdateID = metadata.updateId
| where isnotempty(json)
    and TimeCreated > ago(4h)
//users and their sessions
    //and isnotempty(UserID)
    //and isnotempty(SessionID)

// --- Find all logs for a userID | tenantID | sessionID | updateID | Version | locationID ---
AppServiceConsoleLogs
| parse ResultDescription with * '"time":"' TimeCreated '",' *
| project json=parse_json(ResultDescription), todatetime(TimeCreated)
| extend metadata=json.metadata
| extend
    LogLevel = json.level,
    ProcessName = json.name,
    ProcessMessage = json.message,
//metadata
    Version = metadata.version,
    UserID = metadata.userId,
    TenantID = metadata.tenantId,
    SessionID = metadata.sessionId,
    PatientID = metadata.patientId,
    LocationID = toint(metadata.locationId),
    UpdateID = metadata.updateId
| where isnotempty(json)
//Version
    // and isnotempty(metadata.version)
    // and Version contains "" //insert text between ""
//userID
    // and isnotempty(metadata.userId)
    // and UserID contains "" //insert text between ""
//tenantID
    // and isnotempty(metadata.tenantId)
    // and TenantID contains "" //insert text between ""
//sessionID
    // and isnotempty(metadata.sessionId)
    // and SessionID contains "" //insert text between ""
//updateID
    // and isnotempty(metadata.updateId)
    // and UpdateID contains "" //insert text between ""
//locationID
    // and LocationID == 1 // add the location id here (must be integer)
//patientID
    // and PatientID == 1 // add the patient id here (must be integer)

// --- Find all logs for a log level ---
AppServiceConsoleLogs
| parse ResultDescription with * '"time":"' TimeCreated '",' *
| project json=parse_json(ResultDescription), todatetime(TimeCreated)
| extend metadata=json.metadata
| extend
    LogLevel = json.level,
    ProcessName = json.name,
    ProcessMessage = json.message,
//metadata
    Version = metadata.version,
    UserID = metadata.userId,
    TenantID = metadata.tenantId,
    SessionID = metadata.sessionId,
    PatientID = metadata.patientId,
    LocationID = toint(metadata.locationId),
    UpdateID = metadata.updateId
| where isnotempty(json)
    and isnotempty(json.level)
    and LogLevel contains "" //insert text between "<DEBUG|INFO|WARN|ERROR>"

// --- Find all logs for an error code ---
AppServiceConsoleLogs
| parse ResultDescription with * '"time":"' TimeCreated '",' *
| project json=parse_json(ResultDescription), todatetime(TimeCreated)
| extend metadata=json.metadata
| extend
    LogLevel = json.level,
    ProcessName = json.name,
    ProcessMessage = json.message,
//metadata
    Version = metadata.version,
    UserID = metadata.userId,
    TenantID = metadata.tenantId,
    SessionID = metadata.sessionId,
    PatientID = metadata.patientId,
    LocationID = toint(metadata.locationId),
    UpdateID = metadata.updateId,
//error
    ErrorCode = json.error.code,
    ErrorName = json.error.name,
    ErrorMessage = json.error.message,
    ErrorStack = json.error.stack
| where isnotempty(json)
    and isnotempty(json.level)
    and LogLevel contains "ERROR"
    and ErrorCode contains ""//insert text between "<400|403|500>"
    and ErrorStack contains ""//insert text between ""

// --- Find the total counts of logs for each log level type within a expected time period ---
AppServiceConsoleLogs
| parse kind=regex _ResourceId with ".*[/]" AppName: string
| parse-where  ResultDescription with * '"level":"' LogLevel '",' *
| where TimeGenerated between (datetime(2023-05-10 04:00:00) .. datetime(2023-05-11 04:05:00))
| summarize  Count=count() by LogLevel

// --- CSA Integration Logs ---
AppServiceConsoleLogs
| project json=parse_json(ResultDescription)
| where isnotempty(json)
| where json.name has_any ("CsaHttpGateway", "DefaultSubscriptionHandler", "RabbitMQGateway", "RabbitMQHttpApiGateway", "RabbitMQPoolFactory", "TenantCsaCredentialDao", "TenantCsaDao")
| where json.level == "ERROR" // adjust log level or remove to view all logs

// --- Send message logs ---
AppServiceConsoleLogs
| project json=parse_json(ResultDescription)
| where json.name in ( 'SendChatMessageResolver', 'ChatDao', 'CsaHttpGateway')
// and not(isempty(json.metadata.text)) // add this line if you want to check for logs containing the message text, should return 0 results

// --- Receive message logs ---
AppServiceConsoleLogs
| project json=parse_json(ResultDescription)
| where json.name in ( 'NewMessageRabbitMQHandler', 'ChatDao', 'CsaHttpGateway')
// and not(isempty(json.metadata.text)) // add this line if you want to check for logs containing the message text, should return 0 results

// --- Find last 5 logs from function app ---
FunctionAppLogs
| take 5

// --- Find all logs from function app containing keyword ---
FunctionAppLogs
| parse kind=regex _ResourceId with ".*[/]" AppName: string
| extend json = replace_string(Message, "'", '"')
| extend ProcessMessage = tostring(parse_json(json).message)
| project logMessage=parse_json(ProcessMessage), serverJson=parse_json(json)
| extend TimeCreated = todatetime(serverJson['time'])
| mv-expand logMessage
| extend
    ServerLogLevel = serverJson.level,
    ProcessName = serverJson.name
| where ProcessName != 'ClientLogsFunction'
    and ProcessName != 'SessionService'
    and ProcessName contains 'KEYWORD_HERE'
EOF
  display_name  = "Ohana - Server - Lookup Queries"
}

resource "azurerm_log_analytics_query_pack_query" "ClientServerLookup" {
  count         = contains(["SBX", "DEV"], local.var.INFRASTRUCTURE.ENVIRONMENT) ? 1 : 0
  query_pack_id = azurerm_log_analytics_query_pack.query-pack[0].id
  body          = <<EOF
// --- Get logs for just web admin || mobile || server by session id ---
AppServiceConsoleLogs
| parse kind=regex _ResourceId with ".*[/]" AppName: string
| parse ResultDescription with * '"time":"' ServerTimeCreated '",' *
| project json=parse_json(ResultDescription), todatetime(ServerTimeCreated)
| extend metadata=parse_json(json.metadata)
| extend
    ServerLogLevel = json.level,
    ServerProcessName = json.name,
    ServerProcessMessage = json.message,
//metadata
    ServerVersion = metadata.version,
    ServerUserID = metadata.userId,
    ServerTenantID = metadata.tenantId,
    ServerSessionID = metadata.sessionId,
    ServerPatientID = metadata.patientId,
    ServerLocationID = toint(metadata.locationId),
    ServerUpdateID = metadata.updateId,
    SessionID = tostring(metadata.sessionId)
| where isnotempty(json)
    and isnotempty(SessionID)
| project-away json, metadata
| join kind=inner (FunctionAppLogs
    | extend json = parse_json(replace_string(Message, "'", '"'))
    | extend ProcessMessage = tostring(json.message)
    | project clientJson=parse_json(ProcessMessage), serverJson=json
    | mv-expand clientJson
    | extend
    //Server
        // ClientServerLogLevel = serverJson.level,
        ClientServerProcessName = serverJson.name,
        // ClientServerSessionID = serverJson.metadata.sessionId,
    //Client
        ClientTimeCreated = unixtime_milliseconds_todatetime(tolong(clientJson['time'])),
        ClientLogLevel = clientJson.level,
        ClientMessage = clientJson.message,
    //CLient metadata
        ClientDeviceID = clientJson.metadata.deviceId,
        ClientDeviceModel = clientJson.metadata.deviceModel,
        ClientAppName = clientJson.metadata.name,
        ClientOSVersion = clientJson.metadata.osVersion,
        ClientSessionID = clientJson.metadata.sessionId,
        ClientTenantID = clientJson.metadata.tenantId,
        ClientUserID = clientJson.metadata.userId,
        ClientAppVersion = clientJson.metadata.version,
        SessionID = tostring(clientJson.metadata.sessionId)
    | where
        ClientServerProcessName == 'ClientLogsFunction'
        and isnotempty(ClientSessionID)
) on SessionID
EOF
  display_name  = "Ohana - Client and Server - Lookup Queries"
}
