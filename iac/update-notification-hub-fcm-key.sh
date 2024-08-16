#!/bin/bash

URL=$(echo -n "https://management.azure.com/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RESOURCE_GROUP_NAME/providers/Microsoft.NotificationHubs/namespaces/$NOTIFICATION_HUB_NAMESPACE_NAME/notificationHubs/$NOTIFICATION_HUB_NAME?api-version=2023-10-01-preview")

TOKEN=$(az account get-access-token --query accessToken --output tsv)

BODY=$(echo -n "{
                  \"properties\": {
                    \"fcmV1Credential\": {
                      \"properties\": {
                        \"clientEmail\": \"$FCM_CLIENT_EMAIL\",
                        \"privateKey\": \"$FCM_PRIVATE_KEY\",
                        \"projectId\": \"$FCM_PROJECT_ID\"
                      }
                    }
                  }
                }")

curl --fail --location --request PATCH "$URL" \
--header 'Content-Type: application/json' \
--header "Authorization: Bearer $TOKEN" \
--data-raw "$BODY" >> output.txt
