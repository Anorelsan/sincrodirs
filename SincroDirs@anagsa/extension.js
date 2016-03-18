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

const Gettext = imports.gettext.domain('sincrodirs');
const _ = Gettext.gettext;

const SETTINGS_GROUP_SOURCE_DESTINATION = 'group-source-destination';
const SETTINGS_ENABLED_GROUPS = 'enabled-groups';
const SETTINGS_LAST_SYNC = 'last-sync';
const SETTINGS_LAST_ERRORS = 'last-errors';

let _settings;
let _indicator;

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
		this.box.add_actor(new Widgets.ControlButton("media-playback-start", this._sincroDir).actor);
		this.box.add_actor(new Widgets.ControlButton("list-add", Widgets.openConfigWidget).actor);
	},
	
	_sincroDir : function() {
		let enabledGroups = _settings.get_strv(SETTINGS_ENABLED_GROUPS);
		let groupSourceDestination = _settings.get_strv(SETTINGS_GROUP_SOURCE_DESTINATION);
		let errors = [];
		let rsyncPath = GLib.find_program_in_path("rsync");

		if (rsyncPath != null) {
			for (var i = 0; i < enabledGroups.length; i++) {
				let groupSources = Gsd.getSourceFolders(groupSourceDestination, enabledGroups[i]);
				let groupDestination = Gsd.getDestinationFolder(groupSourceDestination, enabledGroups[i]);
			
				if (groupDestination != "") {   // some destination ...
					for (var j = 0; j < groupSources.length; j++) {
						if (groupSources[j] != "") {	// and some sources ...
							let [res, pid, in_fd, out_fd, err_fd] = GLib.spawn_async_with_pipes(null, [rsyncPath, '-rlptv', groupSources[j], groupDestination], null, 0, null);
						
							let error_reader = new Gio.DataInputStream({
								base_stream: new Gio.UnixInputStream({fd: err_fd})
							});
							
							error_reader.read_line_async(0, null, _readError);
						}
					}
				}
			}
		} else {
			errors.push(_("rsync not found!"));
		}
		
		_settings.set_strv(SETTINGS_LAST_ERRORS, errors);
		
		let date = new GLib.Date(); // Update the last-sync date after syncro
		let time = new GLib.TimeVal();
		GLib.get_current_time(time);
		date.set_time_val(time);
		let actualDate = "";
		actualDate = actualDate.concat(date.get_day());
		actualDate = actualDate.concat("/");
		actualDate = actualDate.concat(date.get_month());
		actualDate = actualDate.concat("/");
		actualDate = actualDate.concat(date.get_year());
		_settings.set_string(SETTINGS_LAST_SYNC, actualDate);
	}
});

function _readError (gobject, async_res, user_data) {   // function needed por read_line_async callback
	let [lineout, charlength, error] = gobject.read_line_finish(async_res);
	let err = lineout;
	let errors = _settings.get_strv(SETTINGS_LAST_ERRORS);;
	
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
			this.menu.addMenuItem(new Widgets.LabelWidget(_("There's no folders to sincronize!"),"errorText"));
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
			this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
			this.menu.addMenuItem(new SincroButtons());
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
		if (state == true) {
			let enabledGroups = _settings.get_strv(SETTINGS_ENABLED_GROUPS);
			
			enabledGroups.push(group);

			_settings.set_strv(SETTINGS_ENABLED_GROUPS, enabledGroups);
		} else {
				let enabledGroups = _settings.get_strv(SETTINGS_ENABLED_GROUPS);
				
				let i = enabledGroups.indexOf(group);
				if (i == 0) {
					enabledGroups.shift();
				} else {
					let before = enabledGroups.slice(0, i);
					let after = enabledGroups.slice(i + 1);
					enabledGroups = before.concat(after);
				}

				_settings.set_strv(SETTINGS_ENABLED_GROUPS, enabledGroups);
		}
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
	Main.panel.addToStatusArea('sincrodirs',_indicator,1,'right');
}

function init() {
	_settings = Convenience.getSettings();
	Convenience.initTranslations();
}

function enable() {
	_indicator = new SincroDirsMenu();
	Main.panel.addToStatusArea('sincrodirs',_indicator,1,'right');
	
	_settings.connect('changed::' + SETTINGS_GROUP_SOURCE_DESTINATION, Lang.bind(this, applyChanges));
	_settings.connect('changed::' + SETTINGS_ENABLED_GROUPS, Lang.bind(this, applyChanges));
	_settings.connect('changed::' + SETTINGS_LAST_SYNC, Lang.bind(this, applyChanges));
	_settings.connect('changed::' + SETTINGS_LAST_ERRORS, Lang.bind(this, applyChanges))
}

function disable() {
	_indicator.destroy();
}
