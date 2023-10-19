/**
 * @fileoverview Helpfup code for logging user data to Cloud Logging, 
 * which is in turn used to generate dashboards for Active Users
 * and Events.
 */

/** @constant {string}
 * Replace this with identifier for your Add-on. Used for identifying
 * logs that belong to this specific Add-on (vs others you have)
 */
const addOnName = 'flubaroo';

/** @constant {string}
 * USER_PROP_LAST_DAILY_PING: User property that records when the last
 * daily ping was done.
 */ 
const USER_PROP_LAST_DAILY_PING = 'userPropLastDailyPing';

/** @constant {string}
 * User property that stores the user's timezone. This is inferred
 * from their browser in client-side Javascript via a calls to:
       Intl.DateTimeFormat().resolvedOptions().timeZone;
 * The value is then passed to your Add-on's server-side code and 
 * stored as user properties.
 *
 * If creating a Workspace Add-on (vs Editor Add-on), instead see:
 *   https://developers.google.com/apps-script/add-ons/how-tos/access-user-locale
 */ 
const USER_PROP_TIMEZONE = 'userPropTimezone';

/** @constant {string}
 * User property that stores the user's locale. This is inferred
 * from their browser in client-side Javascript via a calls to:
       Intl.DateTimeFormat().resolvedOptions().locale;
 * The value is then passed to your Add-on's server-side code and 
 * stored as user properties.    
 *
 * If creating a Workspace Add-on (vs Editor Add-on), instead see:
 *   https://developers.google.com/apps-script/add-ons/how-tos/access-user-locale
 */ 
const USER_PROP_LOCALE = 'userPropLocale';

/**
 * Returns an identifier that is (mostly) unique to each user of this Add-on.
 * This uid is passed to Cloud Logging, which helps in disambiguating users
 * so that metrics like monthly active users can be calculated.
 * 
 * @returns {string}
 */
function getUid() {
  var up = PropertiesService.getUserProperties();

  var addOnUid = up.getProperty('addOnUid');
  if (!addOnUid) {
    var userEmail = Session.getEffectiveUser().getEmail();
    addOnUid = _computeUidFromEmail(userEmail);

    up.setProperty('addonUid', addOnUid);
  }

  return addOnUid;
}

/**
 * This function logs details about your Add-on's user to Cloud Logging
 * for later analysis and use in a dasboard. Note that a call to this
 * function will only actually result in data being logged if more than
 * 24 hours have passed since it last logged data. If called prior to that
 * time period, nothing will be logged.
 */
function logDailyPing()
{
  var up = PropertiesService.getUserProperties();

  var lastDp = up.getProperty(USER_PROP_LAST_DAILY_PING);
  var doDpNow = false;

  var dt = new Date();
  var timeMs = dt.getTime();

  if (!lastDp)
    {
      doDpNow = true;
    }
  else
    {
      var lastDpMs = Number(lastDp);
      var diffMs = timeMs - lastDpMs;
      var diffHrs = diffMs / 3600000;

      if (diffHrs > 24)
        {
          doDpNow = true;
        }
    }
  
  if (!doDpNow)
    {
      return false;
    }

  // Gather some specific details for this user
  var uid = getUid();
  var email = Session.getEffectiveUser().getEmail();  
  var isWorkspaceUserAccount;

  if ((email.indexOf('@gmail.com') !== -1)|| (email.indexOf('@googlemail.com') !== -1)) {
    isWorkspaceUserAccount = false;
  }
  else {
    var quota_rem = MailApp.getRemainingDailyQuota();
    isWorkspaceUserAccount = (quota_rem > 100) ? true : false;
  }

  var timezone = up.getProperty(USER_PROP_TIMEZONE);
  var locale = up.getProperty(USER_PROP_LOCALE);

  // Gather any metrics specific to users of this Add-on that we want to also
  // log. In this case, we'll log the total number of times this user has initiated
  // assignment grading from the menu. For easier grouping in the dashboard, we'll
  // round to the nearest 100.
  var lifetimeGradeCount = up.getProperty(USER_PROP_GRADE_LIFETIME_COUNT);
  if (!lifetimeGradeCount) {
    lifetimeGradeCount = 0;
  }
  lifetimeGradeCount = (lifetimeGradeCount % 100) * 100;

  var parameters =
    {
      timestamp: timeMs,
      uid: uid,
      timezone: timezone,
      locale: locale,
      isWorkspaceUserAccount: isWorkspaceUserAccount,

      // add any user fields specific to your add-on below:
      lifetimeGradeCount: lifetimeGradeCount,
    };
      
  up.setProperty(USER_PROP_LAST_DAILY_PING, timeMs.toString());  
  console.log({message: addOnName + 'DailyPing', pingData: parameters});
}

/**
 * This function logs details about a specific event that took place
 * during execution of your Add-on. For example, you could call it to 
 * record when a user first installs your Add-on, or when they take
 * a certain action. Logs are sent to Cloud Logging for later analysis
 * and use in a dashboard.
 * 
 * @param {string} - Name you want to assiciate with the event 
 *   being logged (i.e. 'EVENT_INSTALL', or 'EVENT_FILE_PROCESSED')
 * @param {Object} - Object with details you wish to record related to
 *   your event. Pass null if no details being logged (only eventName).
 *   Note: Only fields of type 'string', 'number', and 'boolean' are
 *   supported (others are skipped).
 * 
 *   Example: logEvent('EVENT_FILE_PROCESSED',
 *                     {'fileName': 'report.pdf', 'fileSizeKB': 68.8})
 */
function logEvent(eventName, eventSpecificDetails)
{
  var uid = getUid();
  var eventSpecificDetailsStr;

  var dt = new Date();
  var timeMs = dt.getTime();

  // Next, turn eventSpecificDetails JSON into stringified JSON.
  // Note: We don't use JSON.stringify() though to *ensure* that the
  // order of the fields in the JSON is always consistent, which is needed 
  // for proper grouping in BigQuery. So we instead create our own JSON string
  // in which the fields are always sorted.
  if (!eventSpecificDetails)
    {
      eventSpecificDetailsStr = '""';
    }
  else
    { 
      eventSpecificDetailsStr = '{';
      var esdKeys = Object.keys(eventSpecificDetails);
      esdKeys.sort(function(f1, f2) {return (f1 > f2 ? 1 : -1) });

      for (var i=0; i < esdKeys.length; i++)
        {
          var fieldName = esdKeys[i]; 
          if (typeof eventSpecificDetails[fieldName] === 'string') {
            eventSpecificDetailsStr += '"' + fieldName + '": "'  + eventSpecificDetails[fieldName] + '"';
            if (i !== (esdKeys.length -1))
              {
                eventSpecificDetailsStr += ',';
              }
          } else if ((typeof eventSpecificDetails[fieldName] === 'number')
                     || (typeof eventSpecificDetails[fieldName] === 'boolean')) {
            eventSpecificDetailsStr += '"' + fieldName + '": ' + eventSpecificDetails[fieldName];
            if (i !== (esdKeys.length -1))
              {
                eventSpecificDetailsStr += ',';
              }
          }
        }
      eventSpecificDetailsStr += '}';
    }
  
  var up = PropertiesService.getUserProperties();
  var timezone = up.getProperty(USER_PROP_TIMEZONE);

  var parameters =
    {
      eventName: eventName,
      timestamp: timeMs,
      uid: uid,
      timezone: timezone,
      eventSpecificDetails: eventSpecificDetailsStr
    };

  console.log({message: addOnName + 'EventLog', eventData: parameters});
}

/**
 * Private method that converts an email into a hash string that can be
 * used as a semi-unique user id.
 *  
 * @param {string} - email of user using Add-on
 * 
 * @returns {string}
 */
function _computeUidFromEmail(email) {
  var signatureStr = '';
  var signature = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, email, 
    Utilities.Charset.US_ASCII);

  // convert digest byte array to printable stirng
  for (var i=0; i < signature.length; i++) {
    var byte = signature[i];
    if (byte < 0) {
      byte += 256;
    }

    var byteStr = byte.toString(16);
    if (byteStr.length == 1) {
      byteStr = '0' + byteStr;
    }

    signatureStr += byteStr;
  }

  return signatureStr;
}

