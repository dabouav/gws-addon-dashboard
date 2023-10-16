# Instructions for creating a usage dashboard for your Google Workspace Add-on
By: Dave Abouav

At the moment, Add-ons in Google Workspace offer only basic usage analytics via the [Workspace Marketplace SDK](https://console.cloud.google.com/apis/api/appsmarket-component.googleapis.com/googleapps_sdk_dashboard). These include install data broken out by domains and seats (for Workspace admin installs), and end-user installs 

The code and instructions in this repo will help you gather and visualize more granular data, such as actual usage of your Add-on broken out by country, as well as logging specific events that correspond to usage you want to track (i.e. installs, use of particular features).

Step 1: Logging Data
...
...


Step 2: Routing Data
To start, make sure to enable the Cloud Logging API in GCP for your project. You can find this API by searching for it in the Cloud Console, like so:
<br>
<img src="images/cloud-logging-api-search.png" width="700"/>
