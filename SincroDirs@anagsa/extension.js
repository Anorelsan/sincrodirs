/* -*- Mode: js2; indent-tabs-mode: t; c-basic-offset: 4; tab-width: 4 -*-  */
/*
 * extension.js
 * Copyright (C) 2016 Antonio Aguilar <>
 * 
 * SincroDirs is free software: you can redistribute it and/or modify it
 * under the terms of the GNU General Public License as published by the
 * Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * SincroDirs is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License along
 * with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

const St = imports.gi.St;
const Main = imports.ui.main;
const Lang = imports.lang;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;

const Me = imports.misc.extensionUtils.getCurrentExtension();
const Widgets = Me.imports.widgets;
const Convenience = Me.imports.convenience;
const Gsd = Me.imports.gsd;
const Scheduler = Me.imports.scheduler;

const Gettext = imports.gettext.domain('sincrodirs');
const _ = Gettext.gettext;

const SETTINGS_GROUP_SOURCE_DESTINATION = 'group-source-destination';
const SETTINGS_ENABLED_GROUPS = 'enabled-groups';
const SETTINGS_LAST_SYNC = 'last-sync';
const SETTINGS_LAST_ERRORS = 'last-errors';
const SETTINGS_CUSTOM_OPTIONS = 'custom-options';
const SETTINGS_DELETE = 'delete';
const SETTINGS_COMPRESS = 'compress';
const SETTINGS_CUSTOM_RSYNC = 'custom-rsync';

let _settings;
let _indicator;
let _schedulerUtils;
let _sincroButtons;

const SincroButtons = new Lang.Class({  //if there is folders, the buttons
	Name: 'SincroButtons',
	Extends: PopupMenu.PopupBaseMenuItem,
	
	_init : function() {
		this.parent({
			reactive: false
		});
		
		this.box = new St.BoxLayout({
			style_class: "sincroButtons"
		});
		
		this.actor.add_actor(this.box, {
			expand: true 
		});
		this.box.add_actor(new Widgets.ControlButton("media-playback-start", this.sincroDir).actor);
		this.box.add_actor(new Widgets.ControlButton("list-add", Widgets.openConfigWidget).actor);
	},
	
	sincroDir : function() {
		let enabledGroups = _settings.get_strv(SETTINGS_ENABLED_GROUPS);
		let groupSourceDestination = _settings.get_strv(SETTINGS_GROUP_SOURCE_DESTINATION);
		let rsyncPath = GLib.find_program_in_path("rsync");
		let errors = [];
		
		_settings.set_strv(SETTINGS_LAST_ERRORS, errors);

		if (rsyncPath != null) {	
			//Start notification
			Main.notify("SincroDirs",_("Start synchronization"));
			
			this._totalChilds = 0;
			this._childsEnded = 0;  //to count childs with childWatch
			
			this._errorReader = new Array();
			this._childWatch = new Array(); //arrays to track the childs and the error stream
			
			for (var i = 0; i < enabledGroups.length; i++) {
				let groupSources = Gsd.getSourceFolders(groupSourceDestination, enabledGroups[i]);
				let groupDestination = Gsd.getDestinationFolder(groupSourceDestination, enabledGroups[i]);
			
				if (groupDestination != "") {   // some destination ...
					for (var j = 0; j < groupSources.length; j++) {
						if (groupSources[j] != "") {	// and some sources ...
							this._totalChilds ++;   // counts the number of children, but also is a index to indentify them
							
							let rsyncOptions = '-rlptq';	// rsync options and ...
							let customOptions = _settings.get_boolean(SETTINGS_CUSTOM_OPTIONS);
							
							if (customOptions) {	// custom options
								rsyncOptions = _settings.get_string(SETTINGS_CUSTOM_RSYNC);
							} else {
								let deleteOption = _settings.get_boolean(SETTINGS_DELETE);
								let compressOption = _settings.get_boolean(SETTINGS_COMPRESS);
								
								if (compressOption) {   // first the options with a letter
									rsyncOptions = rsyncOptions.concat('z');
								}
								if (deleteOption) { // last the options with word
									rsyncOptions = rsyncOptions.concat(' --delete');
								}
							}   // now we have a correct rsync options string
							
							let argv = [];  // an array for spawn_async with...
							argv.push(rsyncPath);   //rsync path...
							argv = argv.concat(rsyncOptions.split(" "));	//and all it's options
							argv.push(groupSources[j]);
							argv.push(groupDestination);
							
							let [res, pid, in_fd, out_fd, err_fd] = GLib.spawn_async_with_pipes(null, argv, null, GLib.SpawnFlags.DO_NOT_REAP_CHILD, null);
						
							this._errorReader[this._totalChilds] = new Gio.DataInputStream({
								base_stream: new Gio.UnixInputStream({fd: err_fd})
							});
							
							this._errorReader[this._totalChilds].read_line_async(0, null, readError);
							
							this._childWatch[this._totalChilds] = GLib.child_watch_add(GLib.PRIORITY_DEFAULT, pid, Lang.bind(this, function(childWatch, state, nChild) {
								this._childsEnded++;
								
								if (this._totalChilds == this._childsEnded) {
									//End notification
									let endErrors = _settings.get_strv(SETTINGS_LAST_ERRORS);
									if (endErrors.length == 0) {
										Main.notify("SincroDirs",_("Synchronization ended"));
									} else {
										Main.notify("SincroDirs",_("Synchronization ended with errors!"));
									}
								}
								
								GLib.source_remove(this._childWatch[nChild]);
								this._errorReader[nChild].close(null);
							}, this._totalChilds));
						}
					}
				}
			}
		} else {
			errors.push(_("rsync not found!"));
			_settings.set_strv(SETTINGS_LAST_ERRORS, errors);
			
			Main.notify("SincroDirs",_("rsync not found!"));
		}
		
		let date = new GLib.DateTime(); // Update the last-sync date after synchro
		let actualDate = "";
		actualDate = actualDate.concat(date.get_day_of_month());
		actualDate = actualDate.concat("/");
		actualDate = actualDate.concat(date.get_month());
		actualDate = actualDate.concat("/");
		actualDate = actualDate.concat(date.get_year());
		_settings.set_string(SETTINGS_LAST_SYNC, actualDate);
	}
});

function readError (gobject, async_res, user_data) {   // function needed por read_line_async callback
	let [lineout, charlength, error] = gobject.read_line_finish(async_res);
	let err = lineout;
	let errors = _settings.get_strv(SETTINGS_LAST_ERRORS);
	
	if (err != null) {
		let start = err.toString().indexOf("failed: ");
		let errTrimmed = err.toString().slice(start + 8);
		errors.push(errTrimmed);
	}
	
	_settings.set_strv(SETTINGS_LAST_ERRORS, errors);
}

const ConfigButton = new Lang.Class({ //if not folders, only config button
	Name: 'ConfigButton',
	Extends: PopupMenu.PopupBaseMenuItem,
	
	_init : function() {
		this.parent({
			reactive: false
		});
		
		this.box = new St.BoxLayout({
			style_class: "sincroButtons"
		});
		
		this.actor.add_actor(this.box,{
			expand: true 
		});
		this.box.add_actor(new Widgets.ControlButton("list-add", Widgets.openConfigWidget).actor);
	}

});

const SincroDirsMenu = new Lang.Class({ //the main menu
	Name: 'SincroDirsMenu',
	Extends: PanelMenu.Button,

	_init : function() {
		this.parent(0.0,"sincrodirs");
		let hbox = new St.BoxLayout({ 
			style_class: 'panel-status-menu-box' 
		});
		let icon = new St.Icon({ 
			style_class: 'sincroDirs-icon' 
		});
		hbox.add_child(icon);
		hbox.add_child(PopupMenu.arrowIcon(St.Side.BOTTOM));
		this.actor.add_actor(hbox);
		
		let groupsList = Gsd.getGroups(_settings.get_strv(SETTINGS_GROUP_SOURCE_DESTINATION));
		if (groupsList.length == 0) {   // if there isn't any folder, messages + config button
			this.menu.addMenuItem(new Widgets.LabelWidget(_("There's no folders to synchronize!"),"errorText"));
			this.menu.addMenuItem(new Widgets.LabelWidget(_("Please, add folders in options menu."),"normalText"));
			this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
			this.menu.addMenuItem(new ConfigButton());
		} else {	// if there are groups, list them and put their switch's
			this.menu.addMenuItem(new Widgets.LabelWidget(_("GROUPS"),"titleText"));
			this._groupSwitch = new Array();
			for (var i = 0; i < groupsList.length; i++) {
				this._groupSwitch[i] = new PopupMenu.PopupSwitchMenuItem(groupsList[i]);
				this._groupSwitch[i].connect('toggled', Lang.bind(this, this._toogleStatusGroup, groupsList[i]));
				this.menu.addMenuItem(this._groupSwitch[i]);
			}
			
			this._enableGroups();
			this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
			this.menu.addMenuItem(new Widgets.LabelWidget(_("Last synchronization:"), "infoText"));
			let lastSync = _settings.get_string(SETTINGS_LAST_SYNC);
			if (lastSync == "") {
				this.menu.addMenuItem(new Widgets.LabelWidget(_("No synchronization yet!"), "infoText"));
			} else {
				this.menu.addMenuItem(new Widgets.LabelWidget(lastSync, "infoText"));
			}
			this.menu.addMenuItem(new Widgets.LabelWidget(_("Last errors:"), "infoText"));
			let errors = _settings.get_strv(SETTINGS_LAST_ERRORS);
			if (errors.length == 0) {
				this.menu.addMenuItem(new Widgets.LabelWidget(_("No errors"), "infoText"));
			} else {
				for (var i = 0; i < errors.length; i++) {
					this.menu.addMenuItem(new Widgets.LabelWidget(errors[i], "infoText"));
				}
			}
			_sincroButtons = new SincroButtons();
			this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
			this.menu.addMenuItem(_sincroButtons);
		}
	},
	
	_enableGroups : function() {
		let enabledGroups = _settings.get_strv(SETTINGS_ENABLED_GROUPS);
		let groupsList = Gsd.getGroups(_settings.get_strv(SETTINGS_GROUP_SOURCE_DESTINATION)); 
		
		for (var i = 0; i < enabledGroups.length; i++) {
			for (var j = 0; j < groupsList.length; j++) {   // if we found the enabledGroups in the groupsList
				if (enabledGroups[i] == groupsList[j]) {	// it's position is the same that in groupSwitch array
					this._groupSwitch[j].setToggleState(true);
				}
			}
		}
	},
	
	_toogleStatusGroup : function(groupSwitch, state, group) {
		let enabledGroups = _settings.get_strv(SETTINGS_ENABLED_GROUPS);
		
		if (state == true) {
			enabledGroups.push(group);
		} else {
				let i = enabledGroups.indexOf(group);
				if (i == 0) {
					enabledGroups.shift();
				} else {
					let before = enabledGroups.slice(0, i);
					let after = enabledGroups.slice(i + 1);
					enabledGroups = before.concat(after);
				}
		}
		
		_settings.set_strv(SETTINGS_ENABLED_GROUPS, enabledGroups);
	},
	
	destroy : function() {
		this.parent();
	},
	close : function() {
		this.menu.close;
	}

});

function applyChanges() {   // reload the indicator when settings change
	if (!_indicator) {
		return;
	}
	
	_indicator.destroy();
	_indicator = new SincroDirsMenu();
	Main.panel.addToStatusArea('sincrodirs', _indicator, 1, 'right');
}

function init() {
	_settings = Convenience.getSettings();
	Convenience.initTranslations();
	
	_schedulerUtils = new Scheduler.SchedulerUtils(_settings);
	if (_schedulerUtils.daysSelected().length > 0) {
		_schedulerUtils.schedulerTimerInit();
		_schedulerUtils.setCallback(function() {
			_sincroButtons.sincroDir();
			
			_schedulerUtils.stop();
			_schedulerUtils.schedulerTimerInit();
			_schedulerUtils.start();
			
			return true;
		});
		_schedulerUtils.start();
	} else {
		_schedulerUtils.stop();
	}
}

function enable() {
	_indicator = new SincroDirsMenu();
	Main.panel.addToStatusArea('sincrodirs', _indicator, 1, 'right');
	
	_settings.connect('changed::' + SETTINGS_GROUP_SOURCE_DESTINATION, Lang.bind(this, applyChanges));
	_settings.connect('changed::' + SETTINGS_ENABLED_GROUPS, Lang.bind(this, applyChanges));
	_settings.connect('changed::' + SETTINGS_LAST_SYNC, Lang.bind(this, applyChanges));
	_settings.connect('changed::' + SETTINGS_LAST_ERRORS, Lang.bind(this, applyChanges));
}

function disable() {
	_indicator.destroy();
}
