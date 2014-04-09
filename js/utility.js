var monthNames = [ "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec" ];

function getParameterByName(name) {
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
        results = regex.exec(location.search);
    return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}

function getDate(timestamp) {
    var date_obj = new Date(timestamp);
    var date_str = date_obj.getUTCDate() < 10 ? "0" + date_obj.getUTCDate() : date_obj.getUTCDate().toString();
    
    return monthNames[date_obj.getUTCMonth()]+' '+date_str;
}

/**
 * Takes starts_at and ends_at timestamps
 * Returns a pretty date range string
 */
function getDateRangeString(starts_at, ends_at) {
    var start = new Date(starts_at);
    var end   = new Date(ends_at);

    var startDate = monthNames[start.getUTCMonth()]+' '+start.getUTCDate();
    var startYear = start.getUTCFullYear();

    var endDate = monthNames[end.getUTCMonth()]+' '+end.getUTCDate();
    var endYear  = end.getUTCFullYear();

    if (startYear == endYear) {
        return (startDate == endDate) ? startDate+', '+startYear : startDate+' - '+endDate+', '+startYear;
    } else {
        return startDate+', '+startYear+' - '+endDate+', '+endYear;
    }
}

/**
 * Takes starts_at and ends_at timestamps
 * Returns a pretty time range string
 */
function getTimeRangeString(starts_at, ends_at) {

    var start       = new Date(starts_at);
    var end         = new Date(ends_at);

    var startHours  = start.getUTCHours();
    var endHours    = end.getUTCHours();
    var startSuffix = 'am';
    var endSuffix   = 'am';

    if (startHours > 12) {
        startHours -= 12;
        startSuffix = 'pm';
    }
    if (endHours > 12) {
        endHours -= 12;
        endSuffix = 'pm';
    }

    var startMinutes = start.getUTCMinutes();
    var endMinutes   = end.getUTCMinutes();

    if (startMinutes < 10) {
        startMinutes = '0' + startMinutes;
    }
    if (endMinutes < 10) {
        endMinutes = '0' + endMinutes;
    }

    return startHours+':'+startMinutes+startSuffix+' - '+endHours+':'+endMinutes+endSuffix;
}
 
