# Instructions for creating a usage dashboard for your Google Workspace Add-on
By: Dave Abouav
<br>
Last Updated: October 16, 2023

At the moment, Add-ons in Google Workspace offer only basic usage analytics via the [Workspace Marketplace SDK](https://console.cloud.google.com/apis/api/appsmarket-component.googleapis.com/googleapps_sdk_dashboard). These include install data broken out by domains and seats (for Add-ons installed by Workspace admins), and individual end-user installs. This is useful information, but doesn't tell you much about who is actively using your Add-on, nor give you the ability to breakdown that usage by different dimensions.

The code and instructions in this repo will help you gather and visualize Add-on usage data, such as active usage of your Add-on broken out by user characteristics. It also shows you how to log specific events that correspond to use you want to track (i.e. new installs, uses of particular features, etc). You can copy the contents of <code>dashboard.gs</code> into your Apps Script project to get started. This project was developed to help me study use of my [open-source](https://github.com/edcodeorg/flubaroo), Sheets Add-on [Flubaroo](https://workspace.google.com/marketplace/app/flubaroo/817638980086), which lets teachers grade assignments. Hence you'll see references to "grading assignments" in my description below when discussing app-specific logging. The majority of the code and examples given are generic though, and can be used for any Add-on.

## Step 1: Requirements and Initial Setup

### Requirements
We make the assumption here that you already have a published Add-on in the Workspace Marketplace, and hence also a GCP project with billing enabled. You should also have access to a Google Cloud Identity or Workspace account that has access to the [Google Cloud Console](https://console.cloud.google.com).

This project requires use of Google BigQuery, which is not free to use (unlike Workspace APIs). While the cost is not typically high (a few dollars a month in my experience), you should be aware that it is not free and your billing account should be up-to-date as it will be charged. Note that Google Cloud sometimes offers up to $300 in free credits, which you could apply towards this accured cost. While in general there _can_ be costs associated with long-term logs storage, we'll be using the default log expiration window of 30 days, which is free.

You will also need Google Cloud IAM permissions in this GCP project to enable the Cloud Logging API, create Logging Sinks, and create a BigQuery dataset in which you can create and write to tables, as well as create and schedule queries. If you don't have this type of GCP access, you can ask someone who does to follow these steps on your behalf. You will only need to be granted read access to the final BigQuery tables that are used to generate dashboards in Looker Studio. A list of the required IAM permissions are shown below:

<ul>
  <li>one</li>
  <li>two</li>

</ul>

### Initial Setup
To start, make sure to enable the Cloud Logging API in GCP for your project. You can find this API by searching for it in the Cloud Console, like so:
<br><br>
<img src="images/cloud-logging-api-search.png" width="700"/>


## Step 2: Add Logging to Your Add-on

### Customize the Code
You should copy <code>dashboard.gs</code> into your project and customize it according to the instructions below:
<ul>
  <li>Change the const variable <code>addOnName</code> to be a string that identifies your Add-on. This string will appear in Cloud Logging, and will be needed to distinguish this Add-on from any others you may have that you wish to have a separate dashboard for. </li>
  <li>The code in <code>dashboard.gs</code> assumes you have a user's timezone and locale accessible (stored in user properties). If you don't already have a way to collect or store these, you can comment out the relevant lines that retrieve them, as well as their use in the objects passed to console.log(). You'll also need to remove references to them in the BigQuery queries shown later in these instructions. Note that if you do this, you won't be able to partition your data by the user's country.</li>
  <li>The code calls MailApp.getRemainingDailyQuota() as part of determining if the user is a regular consumer user (i.e. @gmail.com), versus a Google Workspace user. This will result in the scope <code>https://www.googleapis.com/auth/script.send_mail</code> being requested. If you don't want your app to request this scope, you'll need to delete the code related to <code>isWorkspaceUserAccount</code>, as well as references to the in the BigQuery queries shown later in these instructions.
</li>
</ul>

### Add Active Usage Logging
Place a call to <code>logDailyPing()</code> somewhere in your code. The function takes no arguments. Because this is used to track daily active usage, you should consider what "active usage" means for your app and place it in a related part of your code. For example, in Flubaroo I consider "active usage" to be only when an assignment gets graded, versus just when a user loads the Sheet or clicks a menu. Hence I placed my call to logDailyPing() in the function that's called when grading takes place. This same function is called both when the teacher grades the assignment by clicking a menu item, as well as when grading happens automatically (on Google Form submission). Hence anytime an assignment gets graded, regardless of what triggered it, that usage is tracked. You may wish to track active usage differently, and may even choose to place calls <code>logDailyPing()</code> in more than one location, which is fine. The tracking that results from <code>logDailyPing()</code> will only happen once per 24 hour period, so there is no problem if it gets called multiple times per day.

### Add Event Logging
The function <code>logEvent(eventName, eventSpecificDetails)</code> logs details about a specific event that took place during the execution of your Add-on, so call it wherever and whenever you wish to track an event. For example, you could call it to record when a user first installs your Add-on, or when they take a certain action like making a selection or processing a file. For example, in Flubaroo I call it to track the first time a user installs Flubaroo, and whenever an assignment is graded.

The first argument <code>eventName</code> is a string that identifies the event being logged. The string can be anything, but be sure you use it for this event type only. That is, have a unique event name for each type of event you wish to log, and use it consistently.

The second argument <code>eventSpecificDetails</code> is an optional object with details you wish to log related to the specific event. If no details are to be logged, pass the second argument as null, or simply don't pass at all. <b>Note</b>: Only object fields of type 'string', 'number', and 'boolean' are supported for logging purposes (others are skipped).

Here's an example of how you might log an event that takes place when a user first installs your Add-on (i.e. a new user):
<code>logEvent('EVENT_FIRST_INSTALL')</code>

Here's an example of how you might log an event that takes place when your Add-on has successfully processed a file:
<code>logEvent('EVENT_FILE_PROCESSED', {'fileName': 'report.pdf', 'fileSizeKB': 68.8})</code> 

Once your calls are in place, you should confirm see the corresponding logs entries in Google Cloud [Logs Explorer](https://console.cloud.google.com/logs/query). If you don't see them, be sure you're checking logs for the correct GCP project, and have waited a minute or two for the logs entries to show up. As an example, a Flubaroo log entry from <code>logDailyPing()</code> is shown in the image below. Note that the actual usage data is in the jsonPayload object:
<br><br>
<img src="images/logs-explorer-example.png" width="700"/>


## Step 3: Route Logs to BigQuery
In order for your Active Usage and Event Logging to end-up in BigQuery for analysis, we'll need to setup Log Routing. This is done from the Google Cloud [Log Router](https://console.cloud.google.com/logs/router).

### Route Active Usage Logs
On the Log Router page, click "Create sink". For the information requested, enter the following information in each of the sections:
<ul>
  <li><b>Sink details:</b>
    <ul>
      <li><b>Sink name:</b> <code>addOnName</code> + "UsageLogSink" (i.e. <code>flubarooUsageLogSink</code>)</li>      
    </ul>
  </li>
  <li><b>Sink destination:</b>
    <ul>
      <li><b>Select sink service:</b> BigQuery dataset</li>
      <li><b>Select BigQuery dataset:</b></li>
      <ul>
        <li>Select "Create new BigQuery dataset"</li>
        <li>In the "Create dataset" panel that opens, enter a dataset ID such as <code>addOnName</code> + "UsageData"</code> (i.e. <code>flubarooUsageData</code>)</li>
        <li>Ensure "Enable table expiration" is <b>not</b> checked.</li>
        <li>Accept all other defaults and create the dataset.</li>
      </ul>
    </ul>
  </li>
  <li><b>Choose logs to include in sink:</b>
    <br>Copy/paste the following filter into the "inclusion filter" box, but replace "flubarooDailyPing" with <code>addOnName</code> + "DailyPing", and replace "&lt;project-id-your-project-id-here&gt;" with the ID of your GCP project:
  <br>
    <code>"flubarooDailyPing"<br>
resource.type="app_script_function"<br>
logName="projects/&lt;project-id-your-project-id-here&gt;/logs/script.googleapis.com%2Fconsole_logs"<br>
severity=DEBUG</code>
  </li>
</ul>

Click "Create Sink". If you encounter errors trying to create the BigQuery dataset, or the new sink, ensure that you have all of the necessary IAM permissions, and have enabled Cloud Logging API in your project.<br>


### Route Event Logs
Repeat the same exact steps in "Route Active Usage Logs" above, but with these changes:
<ul>
  <li>For "Sink name", use <code>addOnName</code> + "EventLogSink" (i.e. <code>flubarooEventLogSink</code>)</li>      
  <li>When creating a new BigQuery dataset, enter a dataset ID such as <code>addOnName</code> + "EventData"</code> (i.e. <code>flubarooEventData</code>)</li>
  <li>For the inclusion filter, change the first line from "flubarooDailyPing" to <code>addOnName</code> + "EventLog" (i.e. <code>flubarooEventLog</code>)</li>                      </ul>

Here is an example of Flubaroo's Active Usage log routing sink:
<br><br>
<img src="images/logs-routing-example.png" width="500"/>


## Step 4: Create and Schedule BigQuery Queries

### Active Usage BigQuery Query

### Event BigQuery Query


## Step 5: Creating Dashboards in Looker Studio

### Active Usage Dashboard Page

### Event Dashboard Page

### Specific Event Drilldown Dashboard Page


