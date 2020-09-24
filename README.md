# Mgmt api proxy
This meant to work as a simple proxy to handle some basic processing and does at the moment only a few things
 * returns a query for /apps as a list like so:
   ```javascript
    {
        "fooApp" : "bc10338a-fe5d-11ea-adc1-0242ac120002",
        "barApp" : "cab5dd90-fe5d-11ea-adc1-0242ac120002",
    }
    ```
 * when requesting an app it returns the app but masks the secrets in the credential sets
 * It also verifies that we've got a token and a defined organization name in the header: `x-apigee-org` (defined by the apiproxy by default)

In the future we can do more, but I wanted something to get started and show off how easy this can be.
