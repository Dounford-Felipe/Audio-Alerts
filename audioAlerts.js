//Change ding url to set default sound
let ding = 'https://raw.githubusercontent.com/Dounford-Felipe/Audio-Alerts/main/ding.wav'
//Change defaultText to set default TTS Text
let defaultText = 'Ready'
let alerts = [];
let muteAll = false;
let alertVolume = 1;
let voices = [];
let voice;

/*If you want to REMOVE EVAL remove lines 60, 182, 183 and 184 or you can search and remove the lines:
Only!)
"eval")
let command
eval(
*/

//Gets the tts voices, populate the select with them and set the current voice
function getVoices() {
	voices = speechSynthesis.getVoices();
	const voiceSelect = document.getElementById('ttsVoices');
	voices.forEach((voice, index) => {
		const option = document.createElement('option');
		option.value = index;
		option.textContent = voice.name;
		voiceSelect.appendChild(option);
	});
	// Set the current voice based on the value stored in localStorage or use the first voice
	voice = localStorage.getItem('audioAlertsVoice') ? voices[localStorage.getItem('audioAlertsVoice')] : voices[0]
	document.getElementById('ttsVoices').value = localStorage.getItem('audioAlertsVoice') ? localStorage.getItem('audioAlertsVoice') : 0
}

//Adds new alert row and a new key to alerts array
function addAlert() {
	let alertRows = document.getElementById('alertsBody').getElementsByTagName("tr")
	let totalAlerts = alertRows.length
	let alertRow = document.createElement('tr')
	alertRow.id = `alert${totalAlerts+1}`
	alertRow.innerHTML = `<td>
				<input placeholder="Variable Name" id="variableName${totalAlerts+1}" style="width:100%">
			</td>
			<td>
				<select id="variableType${totalAlerts+1}">
					<option value="lt">&lt;</option>
					<option value="le">&le;</option>
					<option value="gt">&gt;</option>
					<option value="ge">&ge;</option>
					<option value="eq">&equals;</option>
					<option value="ne">&ne;</option>
				</select>
			</td>
			<td>
				<input placeholder="Value to Trigger" id="wantedValue${totalAlerts+1}">
			</td>
			<td><span id="variableValue"></span></td>
			<td>
				<select id="audioType${totalAlerts+1}">
					<option value="audio" selected="">Audio File</option>
					<option value="tts">Text To Speech</option>
					<option value="eval">Eval (Advanced Users Only!)</option>
				</select>
			</td>
			<td>
				<input placeholder="Text to Speech or sound URL" id="soundOption${totalAlerts+1}">
			</td>
			<td>
				<input type="checkbox" id="enabled${totalAlerts+1}">
			</td>
			<td>
				<button onclick="removeAlert(this.parentNode.parentNode)">Delete</button>
			</td>`
	document.getElementById('alertsBody').append(alertRow)
	alerts[totalAlerts] = {type:'lt',variableName:'',wantedValue:'',soundType:'audio',sound:ding,enabled:false,triggered:false}
}

//Remove alert row and the array key, also changes the id of the remaining rows
function removeAlert(row) {
	let id = row.id.slice(5)
	alerts.splice(id-1,1)
	row.remove()
	let alertRows = document.getElementById('alertsBody').getElementsByTagName("tr")
	// Update remaining row IDs
	for (let i = 0; i < alertRows.length; i++) {alertRows[i].id = `alert${i+1}`}
	// Add a new alert if there are no rows remaining
	if (alertRows.length == 0) {addAlert()}
}

//Save the alerts, also sets the alerts, volume and current voice on localStorage
function saveAlerts() {
	let alertRows = document.getElementById('alertsBody').getElementsByTagName("tr")
	for (let i = 0; i < alertRows.length; i++) {
		alerts[i].type = alertRows[i].getElementsByTagName('select')[0].value
		alerts[i].variableName = alertRows[i].getElementsByTagName('input')[0].value
		alerts[i].wantedValue = alertRows[i].getElementsByTagName('input')[1].value
		alerts[i].soundType = alertRows[i].getElementsByTagName('select')[1].value
		alerts[i].sound = alertRows[i].getElementsByTagName('input')[2].value == '' ? ding : alertRows[i].getElementsByTagName('input')[2].value
		alerts[i].enabled = alertRows[i].getElementsByTagName("input")[3].checked
	}
	let key = `audioAlerts`;
	localStorage.setItem(key, JSON.stringify(alerts));
	localStorage.setItem('audioAlertsVolume', alertVolume);
	let voiceIndex = document.getElementById('ttsVoices').value
	localStorage.setItem('audioAlertsVoice', voiceIndex);
}

//Loads both volume and alerts from the localStorage
function loadAlerts() {
	let key = `audioAlerts`;
	let audioAlerts = localStorage.getItem(key);
	if (audioAlerts) {
		audioAlerts = JSON.parse(audioAlerts);
		let alertRows = document.getElementById('alertsBody').getElementsByTagName("tr")
		for (let i = 0; i < audioAlerts.length; i++) {
			addAlert()
			alertRows[i].getElementsByTagName('select')[0].value = audioAlerts[i].type
			alertRows[i].getElementsByTagName('input')[0].value = audioAlerts[i].variableName
			alertRows[i].getElementsByTagName('input')[1].value = audioAlerts[i].wantedValue
			alertRows[i].getElementsByTagName('select')[1].value = audioAlerts[i].soundType
			alertRows[i].getElementsByTagName('input')[3].checked = audioAlerts[i].enabled
			alertRows[i].getElementsByTagName('input')[2].value = audioAlerts[i].sound == ding ? '' : audioAlerts[i].sound;
		}
		alerts = audioAlerts;
	} else {addAlert()}
	alertVolume = localStorage.getItem('audioAlertsVolume') ? localStorage.getItem('audioAlertsVolume') : 100;
	document.getElementById('alertVolume').value = alertVolume
}

//Displays the current value of the alert variables
function newValue() {
	let alertRows = document.getElementById('alertsBody').getElementsByTagName("tr")
	for (let i = 0; i < alertRows.length; i++) {
		alertRows[i].getElementsByTagName('span')[0].innerText = window[alerts[i].variableName] == undefined ? '' : window[alerts[i].variableName]
	}
}

//This is were the alert happen
function alertLoop() {
	for (let i = 0; i < alerts.length; i++) {
		if (alerts[i].enabled) {
			let type = alerts[i].type
			let triggered = 0
			switch(type) {
				case "lt": {
					triggered =  window[alerts[i].variableName] < alerts[i].wantedValue ? 1 : 0
					break;
				}
				case "le": {
					triggered =  window[alerts[i].variableName] <= alerts[i].wantedValue ? 1 : 0
					break;
				}
				case "gt": {
					triggered =  window[alerts[i].variableName] > alerts[i].wantedValue ? 1 : 0
					break;
				}
				case "ge": {
					triggered =  window[alerts[i].variableName] >= alerts[i].wantedValue ? 1 : 0
					break;
				}
				case "eq": {
					triggered =  window[alerts[i].variableName] == alerts[i].wantedValue ? 1 : 0
					break;
				}
				case "ne": {
					triggered =  window[alerts[i].variableName] != alerts[i].wantedValue && typeof window[alerts[i].variableName] != 'undefined' ? 1 : 0
					break;
				}
			}
			if (triggered == 1 && alerts[i].triggered == false) {
				alerts[i].triggered = true
				if (muteAll != true) {
					if(alerts[i].soundType == "audio") {
						let sound = new Audio(alerts[i].sound)
						sound = isNaN(sound.duration) ? new Audio(ding) : sound
						sound.volume = alertVolume / 100
						sound.play()
					} else if (alerts[i].soundType == "tts") {
						const message = new SpeechSynthesisUtterance();
						message.text = alerts[i].sound == ding ? defaultText : alerts[i].sound
						message.voice = voice
						message.volume = alertVolume / 100
						window.speechSynthesis.speak(message);
					} else if (alerts[i].soundType == "eval") {// Remove from here
						let command = alerts[i].sound == 'https://raw.githubusercontent.com/Dounford-Felipe/Audio-Alerts/main/ding.wav' ? `console.log('You need to set ' + alerts[i].variableName + ' command')` : alerts[i].sound
						eval(command) // To here if you don't want eval
					}
				}
			} 
			if (triggered == 0) {
				alerts[i].triggered = false
			}
		}
	}
}

//Loop every second the alert function and the function that displays the current value of functions
const alertLoopInterval = setInterval(function(){
	newValue()
    alertLoop()
}, 1000);

//Loads the alerts when the page is loaded
window.onload = function() {
	loadAlerts()
}

//Loads the voices when the voices are ready -- this can take more time than the page load
speechSynthesis.onvoiceschanged = function () {
	getVoices()
}