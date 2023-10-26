// ==UserScript==
// @name         DHM Audio Alerts
// @namespace    http://tampermonkey.net/
// @version      1.1.7
// @description  Trigger audible alerts based on dhm variables.
// @author       Anwinity
// @require      https://code.jquery.com/jquery-3.6.0.min.js
// @match        https://dhm.idle-pixel.com/
// @grant        none
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';

    const TTS_AVAILABLE = !!(window.speechSynthesis);
	const ding = new Audio("https://github.com/Dounford-Felipe/DHM-Audio-Alerts/blob/main/ding.wav")
    const sounds = { ding: ding };
    let alerts = [];
    let alertPrevValues = [];
    let voices;
    let voice = null;
    let volume = 1;

    function playAlert(alert) {
        if($("#dhm-audio-alerts-mute").prop("checked")) {
           return;
        }
        if(alert.type == "sound") {
            playSound(alert.data);
        }
        else if(alert.type == "tts") {
            playTTS(alert.data);
        }
    }

    function playSound(uri) {
        uri = uri || "ding";
        let sound = sounds[uri];
        if(sound) {
            sound.volume = volume/100;
            sound.play();
        }
    }

    function preloadSound(uri) {
        if(uri) {
            let sound = sounds[uri];
            if(!sound) {
                sounds[uri] = new Audio(uri);
            }
        }
    }

    function playTTS(text) {
        if(TTS_AVAILABLE && text) {
            let message = new SpeechSynthesisUtterance();
            message.text = text;
            if(voice) {
                message.voice = voice;
            }
            message.volume = volume/100;
            window.speechSynthesis.speak(message);
        }
    }

    function findVoice(uri) {
        if(TTS_AVAILABLE) {
            if(!voices || voices.length == 0) {
                voices = window.speechSynthesis.getVoices();
            }
            let found = voices.find(v => v.voiceURI == uri);
            if(!found) {
                found = voices.find(v => v.default);
            }
            if(!found && voices.length>0) {
                found = voices[0];
            }
            return found;
        }
    }

    function loadAlerts() {
        let key = `dhm-audio-alerts-${window.var_username}`;
        let item = localStorage.getItem(key);
        alerts = []; // default empty config
        alertPrevValues = [];
        if(item) {
            try {
                alerts = JSON.parse(item);
            }
            catch(err) {
                log.error("Failed to load DHM Audio Alerts data - it may be corrupt.");
            }
        }
        alerts.forEach(alert => {
            if(alert.enabled !== false) {
                alert.enabled = true;
            }
            if(alert.type == "sound") {
                preloadSound(alert.data);
            }
            alertPrevValues.push("");
        });
    }

    function saveAlerts() {
        let key = `dhm-audio-alerts-${window.var_username}`;
        alerts.filter(alert => alert.triggerCondition=="eval").forEach(alert => alert.triggerVariable = "");
        localStorage.setItem(key, JSON.stringify(alerts));
        alerts.forEach(alert => {
            if(alert.type == "sound") {
                preloadSound(alert.data);
            }
        });
    }

    function loadVoice() {
        if(!TTS_AVAILABLE) {
            return;
        }
        let key = "dhm-audio-alerts-voice";
        let voiceURI = localStorage.getItem(key);
        voice = findVoice(voiceURI);
        let el = $("#dhm-audio-alerts-voice-select");
        voices.forEach(function(v) {
            el.append(`<option value="${v.voiceURI}">${v.name}</option>`);
        });
        el.val(voice.voiceURI);
    }

    function saveVoice() {
        let key = "dhm-audio-alerts-voice";
        if(voice) {
            localStorage.setItem(key, voice.voiceURI);
        }
    }

    function loadVolume() {
        let key = "dhm-audio-alerts-volume";
        let vol = localStorage.getItem(key) || "100";
        try {
            vol = parseInt(vol);
        }
        catch(err) {
            vol = 100;
        }
        volume = vol;
    }

    function saveVolume(vol) {
        let key = "dhm-audio-alerts-volume";
        volume = vol;
        localStorage.setItem(key, vol);
    }

    function blink(id, color, dur1, dur2) {
        if(typeof dur2 !== "number") {
            dur1 /= 2;
            dur2 = dur1;
        }
        let el = $(`#${id}`);
        if(el.is(":animated")) {
            return;
        }
        let bg = el.css("background-color");
        el.animate({"background-color": color}, dur1, function() {
            el.animate({"background-color": bg}, dur2);
        });
    }

    function blinkNav() {
        blink("navigation-dhm-audio-alerts-button", "#7C2F00", 500);
    }

    function blinkSave() {
        blink("dhm-audio-alerts-save-button", "green", 20, 400);
    }

    function applyAlertsToUI(alerts) {
        $(".dhm-audio-alerts-alert-row").remove();
        alerts.forEach(addAlertRow);
    }

    function buildAlertsFromUI() {
        let result = [];
        $(".dhm-audio-alerts-alert-row").each(function() {
            let row = $(this);
            let type = row.find(".dhm-audio-alerts-type").val();
            let data = row.find(".dhm-audio-alerts-data").val();
            let triggerVariable = row.find(".dhm-audio-alerts-trigger-variable").val();
            let triggerCondition = row.find(".dhm-audio-alerts-trigger-condition").val();
            let triggerValue = row.find(".dhm-audio-alerts-trigger-value").val();
            let enabled = row.find(".dhm-audio-alerts-enabled").prop("checked");
            result.push({
                type: type,
                data: data,
                triggerVariable: triggerVariable,
                triggerCondition: triggerCondition,
                triggerValue: triggerValue,
                enabled: enabled
            });
        });
        return result;
    }

    function testTrigger(value, condition, triggerValue) {
        switch(condition) {
            case "lt": {
                value = parseFloat(value);
                triggerValue = parseFloat(triggerValue);
                return value < triggerValue;
            }
            case "le": {
                value = parseFloat(value);
                triggerValue = parseFloat(triggerValue);
                return value <= triggerValue;
            }
            case "gt": {
                value = parseFloat(value);
                triggerValue = parseFloat(triggerValue);
                return value > triggerValue;
            }
            case "ge": {
                value = parseFloat(value);
                triggerValue = parseFloat(triggerValue);
                return value >= triggerValue;
            }
            case "eq": {
                return value == triggerValue;
            }
            case "ne": {
                return value != triggerValue;
            }
            case "reg": {
                let regex = new RegExp(triggerValue, "i");
                return value.match(regex);
            }
            case "nreg": {
                let regex = new RegExp(triggerValue, "i");
                return !value.match(regex);
            }
            case "eval": {
                return !!eval(triggerValue);
            }
        }
        return false;
    }

    function initUI() {
        const styles = document.createElement("style");
        styles.textContent = `
        table#dhm-audio-alerts-table {
          border-collapse: collapse;
          width: 100%;
        }
        table#dhm-audio-alerts-table tr, table#dhm-audio-alerts-table th, table#dhm-audio-alerts-table td {
          border: 1px solid rgb(50, 50, 50);
          background-color: rgba(26, 26, 26, 0.6);
          text-align: left;
        }
        table#dhm-audio-alerts-table th {
          padding-left: 0.25em;
          padding-right: 0.25em;
        }
        table#dhm-audio-alerts-tablee th, table#dhm-audio-alerts-table td {
          padding: 0.25em;
        }
        .dhm-audio-alerts-input {
          display: inline-block;
          background-color: rgb(26, 26, 26);
          color: white;
          border: 1px solid rgb(64, 64, 64);
        }
        .dhm-audio-alerts-input:disabled {
          color: #999999;
        }
        button.dhm-audio-alerts-input:disabled {
          cursor: default;
        }
        .dhm-audio-alerts-input.w-100 {
          width: 100%;
        }
        .dhm-audio-alerts-input[type="range"] {
          -webkit-appearance: none;
          height: 18px;
          background: rgb(26, 26, 26);
          outline: none;
          opacity: 0.7;
          -webkit-transition: .2s;
          transition: opacity .2s;
        }
        .dhm-audio-alerts-input[type="range"]:hover {
          opacity: 1;
        }
        .dhm-audio-alerts-input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 18px;
          background: rgb(64, 64, 64);
          cursor: pointer;
        }
        .dhm-audio-alerts-input[type="range"]::-moz-range-thumb {
          width: 16px;
          height: 18px;
          background: rgb(64, 64, 64);
          cursor: pointer;
        }
        button.dhm-audio-alerts-table-button {
          cursor: pointer;
        }
        .dhm-audio-alerts-current-value {
          font-family: "Lucida Console", Monaco, monospace;
        }
        .dhm-audio-alerts-flex-wrapper {
          display: flex;
          width: 100%;
          padding: 0;
          margin: 0;
        }
        .dhm-audio-alerts-flex-wrapper > .dhm-audio-alerts-flex-item {
          flex-basis: 100%;
        }
        .dhm-audio-alerts-flex-wrapper > .dhm-audio-alerts-flex-item:not(:first-child) {
          margin-left: 0.125em;
        }
        .dhm-audio-alerts-flex-wrapper > .dhm-audio-alerts-flex-item:not(:last-child) {
          margin-right: 0.125em;
        }
        .dhm-audio-alerts-code {
          font-family: "Lucida Console", Monaco, monospace;
          color: #DAFFCC;
          background-color: rgba(128,128,128,0.25)
        }
        .dhm-audio-alerts-blue {
          color: rgb(0, 172, 230);
        }
        `;
        $("head").append(styles);
		
		var audioAlertBar = document.createElement("div");
		let miscTab = document.querySelectorAll("#tab-misc > .main-button");
		audioAlertBar.innerHTML = `<div onclick="navigate('audioAlerts')" class="main-button" style="cursor: pointer;">
<table>
	<tbody><tr>
	<td><img src="images/soundOn.png" class="img-small"></td>
	<td style="text-align:right;padding-right:20px;font-size:12pt;">ALERTS</td>
	</tr>
</tbody></table>
</div>`;
		miscTab[2].parentNode.insertBefore(audioAlertBar,miscTab[3]);

		var audioAlertTab = document.createElement("div");
		let gameScreen = document.querySelectorAll("#game-screen")[1];
		let logoutTab = document.getElementById('tab-logout');
		
        audioAlertTab.innerHTML = `<div id="navigation-dhm-audio-alerts" style="display: none; padding: 1em;">
          <p>Add alerts below to trigger sounds or voice to be played once the condition is met. If you are not sure what to use for the variable, feel free to ask me (or other people in chat). When a condition changes from not met to met, the sound will be played. The Alerts tab will flash as long as at least one alert's condition is met. Changes in the table below will not take effect until you click save.</p>
          <p>
             The RegEx and Eval trigger options are for more advanced users who wish to implement more complicated logic for their alerts.
             The RegEx options will match the variable value against a provided regular expression <span class="dhm-audio-alerts-code">new RegExp(<span class="dhm-audio-alerts-blue">value</span>, "i")</span>
             where <span class="dhm-audio-alerts-code dhm-audio-alerts-blue">value</span> is the value of the associated text field.
             Similarly, Eval will execute javascript using <span class="dhm-audio-alerts-code">eval(<span class="dhm-audio-alerts-blue">value</span>)</span>. Any non-falsy value will trigger the alert. The variable field is not used for eval.
          </p>
          <br /><br />
          <table id="dhm-audio-alerts-table">
            <thead>
              <tr>
                <th width="8%">Enabled</th>
                <th width="17%">Variable</th>
                <th width="15%">Trigger</th>
                <th width="15%">Current Value</th>
                <th width="15%">Type</th>
                <th width="20%">Options</th>
                <th width="10%"></th>
              </tr>
            </thead>
            <tbody>
              <tr id="dhm-audio-alerts-add-alert-row">
                <td colspan="2">
                  <select id="dhm-audio-alerts-voice-select" class="dhm-audio-alerts-input w-100" ${TTS_AVAILABLE?"":"disabled"}>
                    <option disabled>${TTS_AVAILABLE?"Select Voice":"Voice Not Supported"}</option>
                  </select>
                </td>
                <td>
                  <input id="dhm-audio-alerts-mute" type="checkbox" class="dhm-audio-alerts-input"><label for="dhm-audio-alerts-mute">Mute all alerts</label>
                </td>
                <td colspan="2">
                  <div>
                    Volume:&nbsp;
                    <input type="range" min="0" max="100" value="50" class="dhm-audio-alerts-input" id="dhm-audio-alerts-volume">
                    &nbsp;<span id="dhm-audio-alerts-volume-label">50%</span>
                  </div>
                </td>
                <td>
                  <div class="dhm-audio-alerts-flex-wrapper">
                    <button id="dhm-audio-alerts-revert-button" type="button" class="dhm-audio-alerts-input dhm-audio-alerts-table-button dhm-audio-alerts-flex-item">Revert</button>
                    <button id="dhm-audio-alerts-save-button" type="button" class="dhm-audio-alerts-input dhm-audio-alerts-table-button dhm-audio-alerts-flex-item" disabled>Save</button>
                  </div>
                </td>
                <td>
                  <button id="dhm-audio-alerts-add-button" type="button" class="dhm-audio-alerts-input dhm-audio-alerts-table-button w-100">Add</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>`;
		
		gameScreen.insertBefore(audioAlertTab,logoutTab);
        $("#dhm-audio-alerts-voice-select").change(function() {
            voice = findVoice($(this).val());
            saveVoice();
        });
        $("#dhm-audio-alerts-add-button").click(() => addAlertRow());
        $("#dhm-audio-alerts-save-button").click(function() {
            alerts = buildAlertsFromUI();
            saveAlerts();
            alertPrevValues = [];
            alerts.forEach(() => alertPrevValues.push(""));
            // blinkSave();
            $("#dhm-audio-alerts-save-button").prop("disabled", true);
        });
        $("#dhm-audio-alerts-revert-button").click(function() {
            applyAlertsToUI(alerts);
            $("#dhm-audio-alerts-save-button").prop("disabled", true);
        });
        $("#dhm-audio-alerts-volume").change(function() {
            let vol = parseInt($(this).val());
            saveVolume(vol);
        });
        $("#dhm-audio-alerts-volume").on("input", function() {
            let vol = $(this).val();
            $("#dhm-audio-alerts-volume-label").text(vol+"%");
        });

        const originalNavigate = window.navigate;
        window.navigate = function(a) {
            originalNavigate.apply(this, arguments);
            if(a=="dhm-audio-alerts") {
                //
            }
            else {
                $("#navigation-dhm-audio-alerts").hide();
            }
        };

        const originalSetItems = window.setItems;
        window.setItems = function() {
            originalSetItems.apply(this, arguments);
            // update table (alerts in table may differ from saved alerts)
            $(".dhm-audio-alerts-alert-row").each(function() {
                let row = $(this);
                let varName = row.find(".dhm-audio-alerts-trigger-variable").val();
                let varValue = varName ? window[varName] : "";
                let triggerCondition = row.find(".dhm-audio-alerts-trigger-condition").val();
                let triggerValue = row.find(".dhm-audio-alerts-trigger-value").val();
                let valueElement = row.find(".dhm-audio-alerts-current-value");
                valueElement.text(`${varValue}`);
                try {
                    let triggered = testTrigger(varValue, triggerCondition, triggerValue);
                    if(triggerCondition == "eval") {
                        valueElement.text(triggered);
                    }
                    valueElement.css("color", triggered ? "red" : "white");
                }
                catch(err) {
                    valueElement.text("ERROR");
                    valueElement.css("color", "yellow");
                }
            });

            // process saved alerts
            let anyTriggered = false;
            for(let i = 0; i < alerts.length; i++) {
                try {
                    let alert = alerts[i];
                    let previous = alertPrevValues[i];
                    let current = window[alert.triggerVariable];
                    let condition = alert.triggerCondition;
                    let value = alert.triggerValue;
                    if(condition != "eval") {
                        alertPrevValues[i] = current;
                    }
                    let previousTrigger = false, currentTrigger = false;

                    try {
                        if(condition == "eval") {
                            previousTrigger = alertPrevValues[i];
                        }
                        else {
                            previousTrigger = testTrigger(previous, condition, value);
                        }
                    }
                    catch(err) {
                        console.error("DHM Audio Alerts - alert threw an error for previous tick.", err);
                    }
                    try {
                        currentTrigger = testTrigger(current, condition, value);
                        if(condition == "eval") {
                            alertPrevValues[i] = currentTrigger;
                        }
                    }
                    catch(err) {
                        console.error("DHM Audio Alerts - alert threw an error for current tick.", err);
                    }

                    if(alert.enabled && currentTrigger) {
                        anyTriggered = true;
                        if(!previousTrigger) {
                            playAlert(alert);
                        }
                    }
                }
                catch(err) {
                    log.error("Error processing alert.", err);
                }
            }
            if(anyTriggered) {
                blinkNav();
            }
        }
    }

    function addAlertRow(alert) {
        const soundOptionsPlaceholder = "URL of sound (or blank for default)";
        const ttsOptionsPlaceholder = "Message to be spoken";
        $("#dhm-audio-alerts-add-alert-row").before(`
        <tr class="dhm-audio-alerts-alert-row">
          <td>
            <input type="checkbox" class="dhm-audio-alerts-input dhm-audio-alerts-enabled" checked>
          </td>
          <td>
            <input class="dhm-audio-alerts-input dhm-audio-alerts-trigger-variable w-100" placeholder="var_whatever">
          </td>
          <td>
            <div class="dhm-audio-alerts-flex-wrapper">
              <select class="dhm-audio-alerts-input dhm-audio-alerts-trigger-condition dhm-audio-alerts-flex-item">
                <option value="lt" selected>&lt;</option>
                <option value="le" selected>&#8804;</option>
                <option value="gt">&gt;</option>
                <option value="ge">&#8805;</option>
                <option value="eq">&equals;</option>
                <option value="ne">&ne;</option>
                <option value="reg">RegEx Match</option>
                <option value="nreg">RegEx Not Match</option>
                <option value="eval">Eval</option>
              </select>
              <input class="dhm-audio-alerts-input dhm-audio-alerts-trigger-value dhm-audio-alerts-flex-item" placeholder="trigger value">
            </div>
          </td>
          <td>
            <span class="dhm-audio-alerts-current-value"></span>
          </td>
          <td>
            <select class="dhm-audio-alerts-input dhm-audio-alerts-type w-100">
              <option value="sound" selected>Audio File</option>
              <option value="tts" ${TTS_AVAILABLE?"":"disabled"}>Text To Speech</option>
            </select>
          </td>
          <td>
            <input class="dhm-audio-alerts-input dhm-audio-alerts-data w-100" placeholder="${!alert || alert.type=='sound' ? soundOptionsPlaceholder : ttsOptionsPlaceholder}">
          </td>
          <td>
            <button type="button" class="dhm-audio-alerts-input dhm-audio-alerts-table-button dhm-audio-alerts-delete-button" style="width: 100%">Delete</button>
          </td>
        </tr>
        `);
        let row =  $(".dhm-audio-alerts-alert-row").last();
        row.find(".dhm-audio-alerts-delete-button").click(function(e) {
            $(this).closest(".dhm-audio-alerts-alert-row").remove();
            $("#dhm-audio-alerts-save-button").prop("disabled", false);
        });
        row.find(".dhm-audio-alerts-trigger-condition").change(function() {
            let condition = $(this).val();
            if(condition == "eval") {
                row.find(".dhm-audio-alerts-trigger-variable").prop("disabled", true);
            }
            else {
                row.find(".dhm-audio-alerts-trigger-variable").prop("disabled", false);
            }
        });
        row.find(".dhm-audio-alerts-type").change(function() {
            let type = $(this).val();
            let dataInput = $(this).closest(".dhm-audio-alerts-alert-row").find(".dhm-audio-alerts-data");
            switch(type) {
                case "sound": {
                    dataInput.attr("placeholder", soundOptionsPlaceholder);
                    break;
                }
                case "tts": {
                    dataInput.attr("placeholder", ttsOptionsPlaceholder);
                    break;
                }
            }
        });
        row.find("select, input").change(function() {
            $("#dhm-audio-alerts-save-button").prop("disabled", false);
        });
        if(alert) {
            row.find(".dhm-audio-alerts-trigger-variable").val(alert.triggerVariable);
            row.find(".dhm-audio-alerts-trigger-condition").val(alert.triggerCondition);
            row.find(".dhm-audio-alerts-trigger-value").val(alert.triggerValue);
            row.find(".dhm-audio-alerts-type").val(alert.type);
            row.find(".dhm-audio-alerts-data").val(alert.data);
            row.find(".dhm-audio-alerts-enabled").prop("checked", !!(alert.enabled));
        }
    }

    function init() {
        if(!window.var_username) {
            window.speechSynthesis.getVoices();
            setTimeout(init, 1000);
            return;
        }
		console.log('iniciado')
        if(TTS_AVAILABLE) {
            let voices = window.speechSynthesis.getVoices();
            setTimeout(function() {
                if(!voices || voices.length == 0) {
                    voices = window.speechSynthesis.getVoices();
                }
                loadVoice();
            }, 4000);
        }
        loadVolume();
        loadAlerts();
        initUI();
        applyAlertsToUI(alerts);
    }

    if(TTS_AVAILABLE) {
        // seems to take a little time to load so getVoices() may initially return an empty array
        // call it as early as possible to decrease the chance of missing the values...
        window.speechSynthesis.getVoices();
    }
    setTimeout(function(){init()},1000);

})();