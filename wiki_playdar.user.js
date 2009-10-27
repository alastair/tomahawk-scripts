// ==UserScript==
// @name           Wiki Playdar
// @namespace      http://alastair.githib.com
// @include        http://wikipedia.org
// ==/UserScript==

function load_script (url) {
    // Load the playdar.js
    var s = document.createElement('script');
    s.src = url;
    document.getElementsByTagName("head")[0].appendChild(s);
}
var playdar_web_host = "www.playdar.org";
// same js is served, this is just for log-grepping ease.
load_script('http://' + playdar_web_host + '/static/playdar.js?greasemonkey');
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
    Playdar.setup({
        name: "Wikipedia Greasemonkey",
        website: "http://en.wikipedia.org",
	receiverurl: ""
    });
    var listeners = {
	    onStat: function (detected) {
		if (detected) {
		    console.debug('Playdar detected');
		} else {
		    console.debug('Playdar unavailabled');
		}
	    },
	    onAuth: function () {
		console.debug('Access to Playdar authorised');
	    },
	    onAuthClear: function () {
		console.debug('User revoked authorisation');
	    }
    };

    Playdar.client.register_listeners(listeners);
    
    soundManager.url = 'http://' + playdar_web_host + '/static/soundmanager2_flash9.swf';
    soundManager.flashVersion = 9;
    soundManager.onload = function () {
    Playdar.setup_player(soundManager);
    Playdar.client.init();
	Playdar.client.register_results_handler(results_handler);

    var table = document.getElementsByClassName("infobox")[0];
    var b = table.innerHTML

    var song = b.match(/.*?<th.*?>"(.*?)"<\/th>.*/)[1];
    var artist = b.match(/.*?(Single|Song)<\/a> by <a href=".*?>(.*?)<\/a>.*?/)[2];
    var album = b.match(/.*?from the album <i><a.*?>(.*?)<\/a>.*/)[1];

    console.debug(song);
    console.debug(artist);
    console.debug(album);

	Playdar.client.resolve(artist, album, song);
    };
};

var results_handler = function (response, final_answer) {
    if (final_answer) {
        if (response.results.length) {
		var table = document.getElementsByClassName("infobox")[0];
		var first = table.rows[0]
		var element = document.createElement("tr");
        element.style.backgroundColor = "#0a0";
        var sid = response.results[0].sid;
		var an = document.createElement("a");
		an.href="#";
		an.addEventListener('click', function(event) {
			Playdar.player.play_stream(sid);
            event.stopPropagation();
            event.preventDefault();
        }, true);
		an.innerHTML = "Play from Playdar";
		var td = document.createElement("td");
		element.appendChild(td);
		td.appendChild(an);

        Playdar.player.register_stream(response.results[0]);
		first.parentNode.insertBefore(element, first.nextSibling);
    } else {
            console.debug('No results');
        }
    }
};

/*
function resolve (link, artist, track, results_handler) {
    var qid = Playdar.Util.generate_uuid();
    // add a "searching..." status :
    start_status(qid, link);
    // register results handler and resolve for this qid
    Playdar.client.register_results_handler(results_handler, qid);
    Playdar.client.resolve(artist, "", track, qid);
}
*/
