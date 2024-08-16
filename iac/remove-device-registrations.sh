

SHARED_ACCESS_KEY_NAME=$(echo $TF_VAR_NOTIFICATION_HUB_CONNECTION_STRING | sed 's/.*SharedAccessKeyName=\([a-zA-Z]*\);SharedAccessKey=.*/\1/')
SHARED_ACCESS_KEY=$(echo $TF_VAR_NOTIFICATION_HUB_CONNECTION_STRING | sed 's/.*SharedAccessKey=\([a-zA-Z]*\)/\1/')
EVENTHUB_URI="https://$TF_VAR_NOTIFICATION_HUB_NAMESPACE_NAME.servicebus.windows.net/$TF_VAR_NOTIFICATION_HUB_NAME"
EXPIRY=${EXPIRY:=$((60 * 60 * 24 * 7))}

ENCODED_URI=$(echo -n $EVENTHUB_URI | jq -s -R -r @uri)
TTL=$(($(date +%s) + $EXPIRY))
UTF8_SIGNATURE=$(printf "%s\n%s" $ENCODED_URI $TTL | iconv -t utf8)

HASH=$(echo -n "$UTF8_SIGNATURE" | openssl sha256 -hmac $SHARED_ACCESS_KEY -binary | base64)
ENCODED_HASH=$(echo -n $HASH | jq -s -R -r @uri)

TOKEN=$(echo -n "SharedAccessSignature sr=$ENCODED_URI&sig=$ENCODED_HASH&se=$TTL&skn=$SHARED_ACCESS_KEY_NAME")

URL="https://$TF_VAR_NOTIFICATION_HUB_NAMESPACE_NAME.servicebus.windows.net/$TF_VAR_NOTIFICATION_HUB_NAME/registrations/?api-version=2015-01"

COUNTER=1
# output something to output.txt to ensure the file exists
echo $COUNTER > output.txt

# While the output file is not empty, so while we have a response from Microsoft for registered devices
# Try a maximum of 5 runs to avoid a continuous loop, since maximum number of devices is 500 and 100 devices are returned per request
while [ $COUNTER -le 5 ] && [ ! -z "$(cat output.txt)" ]
do
  # Get the list of all notification hub registrations
  curl --location --request GET "$URL" \
  --header 'Content-Type: application/atom+xml;type=entry;charset=utf-8' \
  --header "Authorization: ${TOKEN}" > output.txt

  grep -o -E '<RegistrationId>[0-9-]+<\/RegistrationId>' output.txt > output2.txt
  # alternatives for running on a mac
  # grep -o -Ei '<RegistrationId>[0-9-]+<\/RegistrationId>' output.txt > output2.txt

  sed -i "s|<RegistrationId>|url=https://$TF_VAR_NOTIFICATION_HUB_NAMESPACE_NAME.servicebus.windows.net/$TF_VAR_NOTIFICATION_HUB_NAME/registrations/|" ./output2.txt
  sed -i "s|<\/RegistrationId>|/?api-version=2015-01|" ./output2.txt
  # alternatives for running on a mac
  # sed -i '' -e "s|<RegistrationId>|url=https://$TF_VAR_NOTIFICATION_HUB_NAMESPACE_NAME.servicebus.windows.net/$TF_VAR_NOTIFICATION_HUB_NAME/registrations/|" ./output2.txt
  # sed -i '' -e "s|<\/RegistrationId>|/?api-version=2015-01|" ./output2.txt

  curl --request DELETE -K output2.txt  --header 'Content-Type: application/xml;type=entry;charset=utf-8' --header "Authorization: ${TOKEN}" --header 'If-Match: *'

  COUNTER=$(( $COUNTER + 1 ))
done
