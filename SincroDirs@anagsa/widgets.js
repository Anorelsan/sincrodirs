/**
* Widgets and other functions
* Text, buttons etc. for the extension
**/

const St = imports.gi.St;
const Lang = imports.lang;
const PopupMenu = imports.ui.popupMenu;
const Shell = imports.gi.Shell;

const Me = imports.misc.extensionUtils.getCurrentExtension();

let metadata = Me.metadata;

const LabelWidget = new Lang.Class({
    Name: "LabelWidget",
    Extends: PopupMenu.PopupBaseMenuItem,

    _init: function(text,type){
        this.parent({
            reactive: false //can't be focussed or clicked
        });

        this._label = new St.Label({
            text: text,
        });
        
        this._label.add_style_class_name(type); //add type to css to define style
        this.actor.add_child(this._label);
    },

    setText: function(text){
        this._label.text = text.toString();
    }
});

const ControlButton = new Lang.Class({
    Name: 'ControlButton',
    actor: {},

    _init: function(icon, callback){
        this.icon = new St.Icon({
            icon_name: icon + "-symbolic", // Get the symbol-icons.
            icon_size: 20
        });

        this.actor = new St.Button({
            style_class: 'notification-icon-button control-button', // buttons styled like in Rhythmbox-notifications
            child: this.icon
        });
        this.icon.set_style('padding: 0px');
        this.actor.set_style('padding: 8px'); // Put less space between buttons

        if (callback != undefined || callback != null){
            this.actor.connect('clicked', callback);
        }
    },

    setIcon: function(icon){
        this.icon.icon_name = icon+'-symbolic';
    }
});

function openConfigWidget () {
	let _appSys = Shell.AppSystem.get_default();
	let _gsmPrefs = _appSys.lookup_app('gnome-shell-extension-prefs.desktop');
	
	if (_gsmPrefs.get_state() == _gsmPrefs.SHELL_APP_STATE_RUNNING){
		_gsmPrefs.activate();
	} else {
		let info = _gsmPrefs.get_app_info();
		let timestamp = global.display.get_current_time_roundtrip();
		info.launch_uris([metadata.uuid], global.create_app_launch_context(timestamp, -1));
	}
}
