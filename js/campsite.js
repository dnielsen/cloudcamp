"use strict";

var DOCUMENT_DFD = $(document).ready().promise();
var BASE_HOST = "http://api.campsite.org";
var COMMUNITY_ID = 20;

//Create utility module to give utility functions a namespace
var UTIL = (function(){
    var my = {};

    // private attributes or functions are just local to this scope
    // public attributes or functions are assigned to the return value 'my'

    my.monthNames = [ "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec" ];

    my.campsite = function ( resourcePath, queryParams ) {
        var qp_string = _.map(queryParams, function(v,k){
            return k + '=' + v;
        }).join('&');
        return $.getJSON(BASE_HOST + '/' + resourcePath + '?' + qp_string ).promise();
    };

    my.getParameterByName = function (name) {
        name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
        var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
            results = regex.exec(location.search);
        return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
    };

    my.getDate = function (timestamp) {
        var date_obj = new Date(timestamp);
        var date_str = date_obj.getUTCDate() < 10 ? "0" + date_obj.getUTCDate() : date_obj.getUTCDate().toString();
        return my.monthNames[date_obj.getUTCMonth()]+' '+date_str;
    };

    /**
     * Takes starts_at and ends_at timestamps
     * Returns a pretty date range string
     */
    my.getDateRangeString = function (starts_at, ends_at) {
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
    };

    /**
     * Takes starts_at and ends_at timestamps
     * Returns a pretty time range string
     */
    my.getTimeRangeString = function (starts_at, ends_at) {
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
    };

    return my;
}());

var CAMPSITE = (function(){
    var my = {};

    var events_dfd = null;

    //private function caches request to use later
    var load_events = function (queryParameters) {
        if(events_dfd) {
            return events_dfd;
        }

        return UTIL.campsite('groups/'+COMMUNITY_ID+'/events', queryParameters);
    }

    my.load_community = function (fields, render_dfd) {
        UTIL.campsite('groups/'+COMMUNITY_ID, { 'fields': fields })
        .then(DOCUMENT_DFD)
        .then(render_dfd);
    }

    // name_selector: Any text input tag class/id like div or span to hold community name
    // desc_selector: Any text input tag class/id like div or span to hold community description
    // img_selector: An image tag class/id to display the community logo
    my.process_community = function (name_selector, desc_selector, img_selector, set_title, render_callback) {
        if( !render_callback ) {
            render_callback = function(community_info) {
                $(name_selector).html(community_info.name);
                $(desc_selector).html(community_info.description);
                if(_.has(community_info,"groupAvatar") && _.has(community_info.groupAvatar,"uri")) {
                    $(img_selector).attr("src", community_info.groupAvatar.uri);
                }
                
                if(set_title) {
                    document.title = community_info.name;
                }
            };
        }

        this.load_community("name,description,groupAvatar.filename", render_callback);
    };

    //Inserts list items for each sponsor with image tags inside the sponsors_selector
    //To reuse an existing events api call pass in the 'events_dfd' deferrend object
    //Template will replace {sponsor_url} with the url of the sponsors home page
    // and {image_url} with the path to sponsor logo image
    my.process_sponsors = function (sponsors_selector, template) {

        var getSponsorships = function (events) {
            var event_ids = '';
            var first_iteration = true;

            _.each(events, function (event) {
                event_ids = event.id + (first_iteration ? '' : ',') + event_ids;
                first_iteration = false;
            });
            return UTIL.campsite('sponsorships', { 'event_id': event_ids, 'fields': 'level,sponsor', 'sort_by': 'level', 'status': 'sponsoring' });
        };

        var renderSponsorships = function(sponsors_data) {
            var unique_sponsors = _.uniq(sponsors_data, false, function(sponsor_data) { return sponsor_data.sponsor.id; });
            
            var sponsors_html = '';
            _.each(unique_sponsors, function(sponsorship) {
                var sponsor_row = template;
                sponsor_row = sponsor_row.replace(/{sponsor_url}/, sponsorship.sponsor.url);
                sponsor_row = sponsor_row.replace(/{image_url}/, sponsorship.sponsor.image_uri);

                sponsors_html += sponsor_row;
            });
            $(sponsors_selector).html(sponsors_html);
        };

        if(!template) {
            template = '<li><a href="{sponsor_url}"><img src="{image_url}"></a></li>';
        }

        // Once event data is returned use that data to construct sponsorship request
        // after sponsorship data is returned wait for page to load (if necessary) then render the sponsors
        load_events()
        .then( getSponsorships )
        .then( DOCUMENT_DFD )
        .then( renderSponsorships );
    };

    // Renders three column table rows in the table indicated by the selector string
    // The table row template knows {name}, {date}, {link}, {location} for each event of the community.
    my.show_upcoming_events = function (table_selector, template) {

        var render = function (events) {
            var now = new Date();

            if( !template ) {
                template = "<tr class=\"eventListGroup_online\"><td>{date}</td><td><a href=\"{link}\">{name}</a></td><td>{location}</td></tr>";
            }

            var selector = $(table_selector);
            _.each(events, function (event) {

                var starts_at = new Date(event.starts_at);
                var ends_at = new Date(event.ends_at);
                if(ends_at.getTime() < now.getTime()) {
                    return;
                }

                var evt_temp = template.replace(/{date}/, UTIL.getDate(starts_at));
                    evt_temp = evt_temp.replace(/{name}/, event.name);
                    evt_temp = evt_temp.replace(/{location}/, event.location);
                    evt_temp = evt_temp.replace(/{link}/, "event.html?id="+event.id);
                selector.prepend(evt_temp);
            });
        };

        load_events()
        .then( DOCUMENT_DFD )
        .then( render );
    };
    // my.makeTable = function (tag_id, resource, template, queryParameters) {
    //     var render = function(api_data) {
    //         var selector = $('.' . tag_id );
    //         _.each(api_data, function (element) {
    //             _.each( -- template parameter --, function(param, function() {
    //                 template.replace(/{param}/, element[param]);
    //             }));

    //             selector.append(evt_temp);
    //         });

    //     };

    //     UTIL.campsite(resource, queryParameters)
    //     .then(this.DOCUMENT_DFD)
    //     .then(render);
    // }



    // my.makeSpeakersTable(tag_id, template, queryParameters) {
    //     if ( !template ) {
    //         var template = "<tr class=\"eventListGroup_online\"><td>{date}</td><td><a href=\"{link}\">{name}</a></td><td>{location}</td></tr>";
    //     }

    //     this.makeTable(tag_id, "session_speakers", template, queryParameters);
    // }


    // var getEvents = function () {
    //     return UTIL.campsite('groups/'+COMMUNITY_ID+'/events');
    // };

    // var renderEvents = function (events) {
    //     var now = new Date();
    //     var template = "<tr class=\"eventListGroup_online\"><td>{date}</td><td><a href=\"{link}\">{name}</a></td><td>{location}</td></tr>";

    //     var selector = $("#upcoming");
    //     _.each(events, function (event) {

    //         var starts_at = new Date(event.starts_at);
    //         var ends_at = new Date(event.ends_at);
    //         if(ends_at.getTime() < now.getTime()) {
    //             return;
    //         }

    //         var evt_temp = template.replace(/{date}/, UTIL.getDate(starts_at));
    //             evt_temp = evt_temp.replace(/{name}/, event.name);
    //             evt_temp = evt_temp.replace(/{location}/, event.location);
    //             evt_temp = evt_temp.replace(/{link}/, "event.html?id="+event.id);
    //         selector.prepend(evt_temp);
    //     });
    // };

    // var getSponsorships = function (events) {
    //     var event_ids = '';
    //     var first_iteration = true;

    //     _.each(events, function (event) {
    //         event_ids = event.id + (first_iteration ? '' : ',') + event_ids;
    //         first_iteration = false;
    //     });
    //     return UTIL.campsite('sponsorships', { 'event_id': event_ids, 'fields': 'level,sponsor', 'sort_by': 'level', 'status': 'sponsoring' });
    // };

    // var renderSponsorships = function(sponsors_data) {
    //     var unique_sponsors = _.uniq(sponsors_data, false, function(sponsor_data) { return sponsor_data.sponsor.id; });
        
    //     var sponsorsHtml = '';
    //     _.each(unique_sponsors, function(sponsorship) {
    //         sponsorsHtml += '<li><a href="'+sponsorship.sponsor.url+'"><img src="'+sponsorship.sponsor.image_uri+'"></a></li>';
    //     });
    //     $('#sponsors-sidebar').html(sponsorsHtml);
    // };


    // // var dom_dfd = $(document).ready().promise(); // resolved on page load

    // // // Retrieve group details then wait for page to load (if necessary) and render the group data
    // // getGroupInfo()
    // // .then(dom_dfd)
    // // .then(renderGroupInfo);


    // //Retrieve event details, remember the deferred instance
    //var events_dfd = getEvents();

    // Once event data is returned wait for the page to load (if necessary) then render the event data
    // load_events()
    // .then( DOCUMENT_DFD )
    // .then( renderEvents );

    // Once event data is returned use that data to construct sponsorship request
    // after sponsorship data is returned wait for page to load (if necessary) then render the sponsors
    // events_dfd
    // .then( getSponsorships )
    // .then( DOCUMENT_DFD )
    // .then( renderSponsorships );













    return my;
}());