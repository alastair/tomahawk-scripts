// ==UserScript==
// @name           Fiql playdar
// @namespace      http://jherskowitz.github.com
// @include        http://fiql.com/playlists/*
// @include        http://www.fiql.com/plalists/*
// ==/UserScript==

// Catch console output. From firebugx.js
if (!window.console || !console.firebug) {
  var names = ["log", "debug", "info", "warn", "error", "assert", "dir", "dirxml", "group", "groupEnd", "time", "timeEnd", "count", "trace", "profile", "profileEnd"];
  window.console = {};
  for (var i = 0; i < names.length; ++i) {
	  window.console[names[i]] = function() {};
	}
}

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

function start_status (qid, node) {
    var status = document.createElement('span');
    status.id = qid;
    status.style.border = 0;
    status.style.margin = "0 0 0 0";
    status.style.backgroundRepeat = "no-repeat";
    status.style.backgroundImage = 'url("http://' + playdar_web_host + '/static/spinner_10px.gif")';
    status.style.color = "#fff";
    status.style.width = "13px";
    status.style.height = "13px";
    status.style.textAlign = "center";
    status.style.fontSize = "9px";
    status.innerHTML = "&nbsp; &nbsp;";
    
    var parent = node.parentNode;
    parent.insertBefore(status, node);
}

function do_search () {
    $("div.table-track-row").each(function () {
        var artistName = $(this).children('span.track-artist').children('a').text();
        var trackName = $(this).children('span.track-song').children('a').text();

//    console.debug(artistName);
//    console.debug(releaseName);

    
        var qid = Playdar.Util.generate_uuid();
        start_status(qid, anchor);
        Playdar.client.register_results_handler(results_handler, qid);
//        console.debug("artist: "+  artistName + ", release: " + releaseName + ", track: " + trackName);
        Playdar.client.resolve(artistName, trackName, releaseName, qid);
    }
};

var results_handler = function (response, final_answer) {
    if (final_answer) {
        var element = document.getElementById(response.qid);
        element.style.backgroundImage = 'none';
        if (response.results.length) {
            var sid = response.results[0].sid;
            Playdar.player.register_stream(response.results[0]);
            element.innerHTML = "<a href=\"#\">♫&nbsp;</a>";
            element.addEventListener('click', function(event) {
                Playdar.player.play_stream(sid);
                event.stopPropagation();
                event.preventDefault();
            }, true);
        } else {
            element.style.color = "#000";
            element.innerHTML = "×&nbsp;";
        }
    }
};
 
