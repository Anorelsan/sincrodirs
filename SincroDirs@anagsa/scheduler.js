/**
* scheduler functions
*/

const Lang = imports.lang;
const GLib = imports.gi.GLib;

const SETTINGS_MONDAY = 'monday';
const SETTINGS_TUESDAY = 'tuesday';
const SETTINGS_WEDNESDAY = 'wednesday';
const SETTINGS_THURSDAY = 'thursday';
const SETTINGS_FRIDAY = 'friday';
const SETTINGS_SATURDAY = 'saturday';
const SETTINGS_SUNDAY = 'sunday';
const SETTINGS_HOUR = 'hour';
const SETTINGS_MINUTES = 'minutes';
const SETTINGS_NEXT_SYNC = 'next-sync';

const SchedulerUtils = new Lang.Class({
	Name: "SchedulerUtils",
	
	_settings: null,
	_timeout: 0,
	_callback: null,
	_timerId: null,
	
	_init: function (settings, indicator) {
		this._settings = settings;
	},
	
	daysSelected: function() {	// returns an array with the days selected in number: 1 monday, 2 tuesday etc.
		let monday = this._settings.get_boolean(SETTINGS_MONDAY);
		let tuesday = this._settings.get_boolean(SETTINGS_TUESDAY);
		let wednesday = this._settings.get_boolean(SETTINGS_WEDNESDAY);
		let thursday = this._settings.get_boolean(SETTINGS_THURSDAY);
		let friday = this._settings.get_boolean(SETTINGS_FRIDAY);
		let saturday = this._settings.get_boolean(SETTINGS_SATURDAY);
		let sunday = this._settings.get_boolean(SETTINGS_SUNDAY);
		let daysSelected = [];
		
		if (monday) {
			daysSelected.push(1);
		}
		
		if (tuesday) {
			daysSelected.push(2);
		}
		
		if (wednesday) {
			daysSelected.push(3);
		}
		
		if (thursday) {
			daysSelected.push(4);
		}
		
		if (friday) {
			daysSelected.push(5);
		}
		
		if (saturday) {
			daysSelected.push(6);
		}
		
		if (sunday) {
			daysSelected.push(7);
		}
		
		return daysSelected;
	},
	
	nextSincroScheduleMinutes: function() {	// returns the next scheduled synchro in minutes
		let synchroDays = this.daysSelected();
		let synchroHour = this._settings.get_int(SETTINGS_HOUR);
		let synchroMinutes = this._settings.get_int(SETTINGS_MINUTES);
		let minutesLeft = -1;
		
		if (synchroDays.length > 0) {
			let date = new GLib.DateTime();
			let actualDay = date.get_day_of_week();
			let actualHour = date.get_hour();
			let actualMinutes = date.get_minute();
			
			// calculate the minutes left for the next synchro, order and returns are important!
			if (synchroDays.indexOf(actualDay) != -1) {	//first, if we are in the same day
				if (actualHour < synchroHour) {
					let hoursLeft = synchroHour - actualHour;
		
					minutesLeft = (hoursLeft * 60 - actualMinutes) + synchroMinutes;

					return minutesLeft;
				} else if (actualHour == synchroHour) {
					if (actualMinutes < synchroMinutes) {
						minutesLeft = synchroMinutes - actualMinutes;

						return minutesLeft;
					}
				} else {	// same weekday of the next week
					let hoursLeft = synchroHour - actualHour;
			
					minutesLeft = (7 * 24 * 60) + (hoursLeft * 60 - actualMinutes) + synchroMinutes;

					return minutesLeft;
				}
			}
		
			for (var i = 0; i < synchroDays.length; i++) {	//second, not the same day, but days + 1 of the same week
				if (synchroDays[i] > actualDay) {
					let numberDaysBeetween = synchroDays[i] - actualDay;
					let hoursLeft = synchroHour - actualHour;
			
					minutesLeft = (numberDaysBeetween * 24 * 60) + (hoursLeft * 60 - actualMinutes) + synchroMinutes;

					return minutesLeft;
				}
			}
		
			for (var i = 0; i < synchroDays.length; i++) {	//last, if the days + 1 aren't on the left of the week, next week
				let numberDaysBeetween = 7 - actualDay + synchroDays[i];
				let hoursLeft = synchroHour - actualHour;
			
				minutesLeft = (numberDaysBeetween * 24 * 60) + (hoursLeft * 60 - actualMinutes) + synchroMinutes;

				return minutesLeft;
			}
		}
		
		return minutesLeft;
	},
	
	schedulerTimerInit: function() {	// timer function inspired by randwall timer (https://github.com/rodakorn/randwall/)
		this._timeout = this.nextSincroScheduleMinutes();
		
		if (this._timeout == -1) {
			this._timeout == 0;
			this.stop();
		}
		
		this._timeout = this._timeout * 60000;
		
		this._settings.connect('changed::' + SETTINGS_MONDAY, Lang.bind(this, this.newSchedulerTimer));
		this._settings.connect('changed::' + SETTINGS_TUESDAY, Lang.bind(this, this.newSchedulerTimer));
		this._settings.connect('changed::' + SETTINGS_WEDNESDAY, Lang.bind(this, this.newSchedulerTimer));
		this._settings.connect('changed::' + SETTINGS_THURSDAY, Lang.bind(this, this.newSchedulerTimer));
		this._settings.connect('changed::' + SETTINGS_FRIDAY, Lang.bind(this, this.newSchedulerTimer));
		this._settings.connect('changed::' + SETTINGS_SATURDAY, Lang.bind(this, this.newSchedulerTimer));
		this._settings.connect('changed::' + SETTINGS_SUNDAY, Lang.bind(this, this.newSchedulerTimer));
		this._settings.connect('changed::' + SETTINGS_HOUR, Lang.bind(this, this.newSchedulerTimer));
		this._settings.connect('changed::' + SETTINGS_MINUTES, Lang.bind(this, this.newSchedulerTimer));
	},
	
	newSchedulerTimer: function() {
		let newValue = this.nextSincroScheduleMinutes();
		
		if (newValue != -1) {
			if((this._timeout != newValue) && (newValue >= 1)) {
				this._timeout = newValue * 60000;
				this.start();
			}
		} else {
			this._timeout = 0;
			this.stop();
		}
	},
	
	setCallback: function(callback) {
		if (callback === undefined || callback === null || typeof callback !== "function"){
    			throw TypeError("'callback' needs to be a function.");
        	}
        	
        	this._callback = callback;
	},
	
	start: function() {
		this.stop();
		this._timerId = GLib.timeout_add(GLib.PRIORITY_DEFAULT,this._timeout, this._callback);
		
		// update the next date for synchro for the next synchronization label
		let date = new GLib.DateTime();
		let nextDate = date.add_minutes(this._timeout / 60000);
		let nextSynchro = "";
	
		nextSynchro = nextSynchro.concat(nextDate.get_day_of_month());
		nextSynchro = nextSynchro.concat("/");
		nextSynchro = nextSynchro.concat(nextDate.get_month());
		nextSynchro = nextSynchro.concat("/");
		nextSynchro = nextSynchro.concat(nextDate.get_year());
		nextSynchro = nextSynchro.concat(" - ");
		nextSynchro = nextSynchro.concat(this._settings.get_int(SETTINGS_HOUR));
		nextSynchro = nextSynchro.concat(":");
		let minutes = this._settings.get_int(SETTINGS_MINUTES);
		minutes = (minutes < 9 ) ? "0" + minutes : minutes;
		nextSynchro = nextSynchro.concat(minutes);
	
		this._settings.set_string(SETTINGS_NEXT_SYNC, nextSynchro);
	},
	
	stop: function() {
		//If timerId is not set we don't do anything
		if (this._timerId !== null) {
			GLib.source_remove(this._timerId);
			this._timerId = null;
		}
		
		this._settings.set_string(SETTINGS_NEXT_SYNC, "");
	}
});
