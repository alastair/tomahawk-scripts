// ==UserScript==
// @name           Wiki Playdar
// @namespace      http://alastair.github.com
// @include        http://en.wikipedia.org/*
// ==/UserScript==

/*
Reads song info from wikipedia infoboxes
http://en.wikipedia.org/wiki/Wikipedia:WikiProject_Songs#Infobox
Handles Songs and Singles
*/

function load_script (url) {
    // Load the playdar.js
    var s = document.createElement('script');
    s.src = url;
    document.getElementsByTagName("head")[0].appendChild(s);
}
var playdar_web_host = "www.playdar.org";
// same js is served, this is just for log-grepping ease.
load_script('http://playdarjs.org/playdar.js?greasemonkey');
load_script('http://' + playdar_web_host + '/static/soundmanager2-nodebug-jsmin.js?greasemonkey');

function GM_wait() {
    Playdar = unsafeWindow.Playdar;
    soundManager = unsafeWindow.soundManager;
    if (typeof Playdar == 'undefined' || typeof soundManager == 'undefined') {
        window.setTimeout(GM_wait, 100); 
    } else { 
        setup_playdar();
    }
}
GM_wait(); // wait for playdar.js to load.

function setup_playdar () {
    Playdar.setupClient({
        onStat: function (detected) {
            if (detected) {
                console.debug('Playdar detected');
            } else {
                console.debug('Playdar unavailable');
            }
        },

        onAuth: function () {
            console.debug('Access to Playdar authorised');
                do_search();
            },
            onAuthClear: function () {
                console.debug('User revoked authorisation');
            }
    });

    soundManager.url = 'http://' + playdar_web_host + '/static/soundmanager2_flash9.swf';
    soundManager.flashVersion = 9;
    soundManager.onload = function () {
        Playdar.setupPlayer(soundManager);
        Playdar.client.go();
    };
};

function do_search () {
    var infoBoxes = document.getElementsByClassName("infobox");
    for (var i = 0; i < infoBoxes.length; i++) {
        box = infoBoxes[i];
        var text = box.innerHTML.replace(/<(?:[^>'"]|".*?"|'.*?')+>/g, "");
        var artist = text.match(/.*?(Single|Song).+by (.*)/);
        if (artist == null) {
            continue;  // Not an infobox we recognise
        }
        var artistName = artist[2];
        
        var album = text.match(/.*?from the album (.*)/);
        albumName = "";
        if (album != null) {
            var albumName = album[1];
        }
        var trackName = text.match(/^"(.*)"$/m)[1];

        var title = box.children[0].children[0];
        var qid = Playdar.Util.generate_uuid();
        start_status(qid, title);
        Playdar.client.register_results_handler(results_handler, qid);
        Playdar.client.resolve(artistName, trackName, albumName, qid);
    }
};

function start_status (qid, node) {
    var tr = document.createElement('tr');
    var status = document.createElement('th');

    status.id = qid;
    status.style.border = 0;
    status.colSpan = node.children[0].colSpan;
    status.style.fontSize = "100%";
    status.innerHTML = '<img src="http://' + playdar_web_host + '/static/spinner_10px.gif">';
    
    tr.appendChild(status);
    var parent = node.parentNode;
    parent.insertBefore(tr, node.nextSibling);
}

var results_handler = function (response, final_answer) {
    if (final_answer) {
        var element = document.getElementById(response.qid);
        element.style.backgroundImage = 'none';
        if (response.results.length) {
            var result = choose_best_result(response);
            Playdar.player.register_stream(result);
            element.innerHTML = '<a href="#">♫ Play with Playdar</a>';
            element.addEventListener('click', function(event) {
                Playdar.player.play_stream(result.sid);
                event.stopPropagation();
                event.preventDefault();
            }, true);
        } else {
            element.style.color = "#000";
            element.innerHTML = "× Unavailable on playdar";
        }
    }
};

function choose_best_result (response) {
    if (response.results.length > 1 && response.query.album != "" ) {
        // Playdar currently doesn't seem to consider album when returning the first
        // best match.  Could be less strict...
        for (var i = 0; i < response.results.length; i++) {
            if (response.results[i].album == response.query.album) {
                return response.results[i];
            }
        }
    }
    return response.results[0];
}
