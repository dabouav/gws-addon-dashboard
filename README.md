# Instructions for creating a usage dashboard for your Google Workspace Add-on
By: Dave Abouav
Last Updated: October 16, 2023

At the moment, Add-ons in Google Workspace offer only basic usage analytics via the [Workspace Marketplace SDK](https://console.cloud.google.com/apis/api/appsmarket-component.googleapis.com/googleapps_sdk_dashboard). These include install data broken out by domains and seats (for Workspace admin installs), and end-user installs 

The code and instructions in this repo will help you gather and visualize more granular data, such as actual usage of your Add-on broken out by country, as well as logging specific events that correspond to usage you want to track (i.e. installs, use of particular features).

## Step 1: Logging Data
The code snippers included in this repository have everything you need to get started. You can copy/paste the contents of dashboard.gs into your project to get started. A few things to note:
<ul>
  <li>The code assumes you have a user's timezone and locale stored (in specific user properties). If you don't already have a way to collect or store these, you can comment out the relevant lines that retrieve them, as well as their use in the objects passed to console.log(). You'll also need to remove references to them in the BigQuery queries shown later in these instructions. Note that if you do this, you won't be able to partition your data by the user's country or language.</li>
  <li>The code calls MailApp.getRemainingDailyQuota() as part of determining if the user is a regular consumer user (i.e. @gmail.com), versus a Google Workspace user. This will result in the scope <code>https://www.googleapis.com/auth/script.send_mail</code> being requested. If you don't want your app to request this scope, you'll need to delete the code related to <code>isWorkspaceUserAccount</code>.
</li>
  <li></li>
  <li></li>
</ul>
...


## Step 2: Routing Data
To start, make sure to enable the Cloud Logging API in GCP for your project. You can find this API by searching for it in the Cloud Console, like so:
<br>
<img src="images/cloud-logging-api-search.png" width="700"/>
