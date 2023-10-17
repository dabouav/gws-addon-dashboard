# Instructions for creating a usage dashboard for your Google Workspace Add-on
By: Dave Abouav
<br>
Last Updated: October 16, 2023

At the moment, Add-ons in Google Workspace offer only basic usage analytics via the [Workspace Marketplace SDK](https://console.cloud.google.com/apis/api/appsmarket-component.googleapis.com/googleapps_sdk_dashboard). These include install data broken out by domains and seats (for Add-ons installed by Workspace admins), and individual end-user installs. This is useful information, but doesn't tell you much about who is actively using your Add-on, nor give you the ability to breakdown that usage by different dimensions.

The code and instructions in this repo will help you gather and visualize Add-on usage data, such as active usage of your Add-on broken out by user characteristics. It also shows you how to log specific events that correspond to use you want to track (i.e. new installs, uses of particular features, etc). You can copy/paste the contents of <code>dashboard.gs</code> into your Apps Script project to get started. This project was developed to help me study use of my Sheets Add-on [Flubaroo](https://workspace.google.com/marketplace/app/flubaroo/817638980086), which lets teachers grade assignments. Hence you'll see references to "grading assignments" in my description below when discussing app-specific logging. The majority of the code and examples given are generic though, and can be used for any Add-on.

## Step 1: Requirements and Initial Setup

### Requirements
We make the assumption here that you already have a published Add-on in the Workspace Marketplace, and hence also a GCP project with billing enabled. 

This project requires use of Google BigQuery, which is not free to use (unlike Workspace APIs). While the cost is not typically high (a few dollars a month in my experience), you should be aware that it is not free and your billing account should be up-to-date as it will be charged. Note that Google Cloud sometimes offers up to $300 in free credits, which you could apply towards this accured cost.

The code in <code>dashboard.gs</code> assumes you have a user's timezone and locale accessible (stored in user properties). If you don't already have a way to collect or store these, you can comment out the relevant lines that retrieve them, as well as their use in the objects passed to console.log(). You'll also need to remove references to them in the BigQuery queries shown later in these instructions. Note that if you do this, you won't be able to partition your data by the user's country.</li>

The code calls MailApp.getRemainingDailyQuota() as part of determining if the user is a regular consumer user (i.e. @gmail.com), versus a Google Workspace user. This will result in the scope <code>https://www.googleapis.com/auth/script.send_mail</code> being requested. If you don't want your app to request this scope, you'll need to delete the code related to <code>isWorkspaceUserAccount</code>, as well as references to the in the BigQuery queries shown later in these instructions.

### Initial Setup
To start, make sure to enable the Cloud Logging API in GCP for your project. You can find this API by searching for it in the Cloud Console, like so:
<br><br>
<img src="images/cloud-logging-api-search.png" width="700"/>


## Step 2: Add Logging to Your Add-on

### Add Active Usage Logging
Place a call to <code>logDailyPing()</code> somewhere in your code. The function takes no arguments. Because this is used to track daily active usage, you should consider what "active usage" means for your app and place it in a related part of your code. For example, in Flubaroo I consider "active usage" to be only when an assignment gets graded, versus just when a user loads the Sheet or clicks a menu. Hence I placed my call to logDailyPing() in the function that's called when grading takes place. This same function is called both when the teacher grades the assignment by clicking a menu item, as well as when grading happens automatically (on Google Form submission). Hence anytime an assignment gets graded, regardless of what triggered it, the usage is tracked. You may wish to track active usage differently, and may even choose to place calls <code>logDailyPing()</code> in more than one location, which is fine. The tracking that results from <code>logDailyPing()</code> will only happen once per 24 hour period, so there is no harm in calling it in multiple places, or multiple times per day.

### Add Event Logging
The function <code>logEvent(eventName, eventSpecificDetails)</code> logs details about a specific event that took place during the execution of your Add-on, so call it wherever and whenever you wish to track an event. For example, you could call it to record when a user first installs your Add-on, or when they take a certain action like making a selection or processing a file. For example, in Flubaroo I call it to track the first time a user installs Flubaroo, and whenever an assignment is graded.

The first argument <code>eventName</code> is a string that identifies the event being logged. The string can be anything, but be sure you use it for this event type only. That is, have a unique event name for each type of event you wish to log, and use it consistently.

The second argument <code>eventSpecificDetails</code> is an optional object with details you wish to log related to the specific event. If no details are to be logged, pass the second argument as null, or simply don't pass at all. <b>Note</b>: Only object fields of type 'string', 'number', and 'boolean' are supported for logging purposes (others are skipped).

Here's an example of how you might log an event that takes place when a user first installs your Add-on (i.e. a new user):
<code>logEvent('EVENT_FIRST_INSTALL')</code>

Here's an example of how you might log an event that takes place when your Add-on has successfully processed a file:
<code>logEvent('EVENT_FILE_PROCESSED', {'fileName': 'report.pdf', 'fileSizeKB': 68.8})</code>

## Step 3: Route Logs to BigQuery

### Route Active Usage Logs

### Route Event Logs


## Step 4: Create and Schedule BigQuery Queries

### Active Usage BigQuery Query

### Events BigQuery Query


## Step 5: Creating Dashboards in Looker Studio

### Active Usage Dashboard Page

### Events Dashboard Page

### Specific Event Drilldown Dashboard Page


