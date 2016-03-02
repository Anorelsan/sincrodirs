/**
* Preferences for the extension
* Here you can add/remove folders to sincronize
* https://live.gnome.org/GnomeShell/Extensions#Extension_Preferences
**/

const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;
const GObject = imports.gi.GObject;
const Lang = imports.lang;

const Me = imports.misc.extensionUtils.getCurrentExtension();
const Convenience = Me.imports.convenience;
const Gsd = Me.imports.gsd;

const Gettext = imports.gettext.domain('sincrodirs');
const _ = Gettext.gettext;

const Columns = {
	GROUP_NAME : 0,
	FOLDER_NAME : 1
};

const SETTINGS_GROUP_SOURCE_DESTINATION = 'group-source-destination';
const SETTINGS_ENABLED_GROUPS = 'enabled-groups';

const SincroDirsSettingsWidget = new GObject.Class({
	Name: 'SincroDirs.prefs.SincroDirsSettingsWidget',
	GTypeName: 'SincroDirsWidget',
	Extends: Gtk.Grid,
	
	_init : function(params) {
		this.parent(params);
		this.margin = 24;
		this.row_spacing = 6;
		this.orientation = Gtk.Orientation.VERTICAL;
		
		this._settings = Convenience.getSettings();
		this._settings.connect('changed', Lang.bind(this, this._refresh));
		
		// Create the Grid
		let grid = new Gtk.Grid ({
			orientation: Gtk.Orientation.VERTICAL,
			column_spacing: 6,
			row_spacing: 6 
		});
		
		// Create source label, tree, toolbar & buttons
		let sourceLabel = new Gtk.Label ({
			label: '<b>' + _("Source") + '</b>',
			use_markup: true,
			halign: Gtk.Align.START,
			margin_top: 20 
		});
		
		this._sourceStore = new Gtk.TreeStore();
		this._sourceStore.set_column_types([GObject.TYPE_STRING, GObject.TYPE_STRING]);
		
		this._sourceTreeView = new Gtk.TreeView({
			model: this._sourceStore,
			hexpand: true,
			vexpand: true,
			height_request: 55 
		});
		this._sourceTreeView.get_selection().set_mode(Gtk.SelectionMode.SINGLE);
		
		// Create a column for the groups
		let sourceGroupColumn = new Gtk.TreeViewColumn({
			expand: true,
			sort_column_id: Columns.GROUP_NAME,
			title: _("Groups") 
		});
		
		// Create the cell text that will display group's name
		let sourceGroupNameRenderer = new Gtk.CellRendererText;
		// Add cell to the column
		sourceGroupColumn.pack_start(sourceGroupNameRenderer, true);
		sourceGroupColumn.add_attribute(sourceGroupNameRenderer, "text", Columns.GROUP_NAME);
		// Add column to the treeview
		this._sourceTreeView.append_column(sourceGroupColumn);
		
		// Create a column for the folders
		let sourceFolderColumn = new Gtk.TreeViewColumn({
			expand: true,
			sort_column_id: Columns.FOLDER_NAME,
			title: _("Folders") 
		});
		
		// Create the cell text that will display folder's name
		let sourceFolderNameRenderer = new Gtk.CellRendererText;
		// Add cell to the column
		sourceFolderColumn.pack_start(sourceFolderNameRenderer, true);
		sourceFolderColumn.add_attribute(sourceFolderNameRenderer, "text", Columns.FOLDER_NAME);
		// Add column to the treeview
		this._sourceTreeView.append_column(sourceFolderColumn);
		
		let sourceToolbar = new Gtk.Toolbar ({
			icon_size: Gtk.IconSize.SMALL_TOOLBAR });
		sourceToolbar.get_style_context().add_class(Gtk.STYLE_CLASS_INLINE_TOOLBAR);
		
		this._sourceAddGroupButton = new Gtk.ToolButton({ 
			icon_name: 'document-new',
			label: _("Add group"),
			is_important: true
		});
		this._sourceAddGroupButton.connect('clicked', Lang.bind(this, this._sourceAddGroupPopover));
		
		let sourceAddButton = new Gtk.ToolButton({ 
			icon_name: 'folder-new',
			label: _("Add folder"),
			is_important: true
		});
		sourceAddButton.connect('clicked', Lang.bind(this, this._sourceAddFolderDialog));
		
		let sourceRemoveButton = new Gtk.ToolButton({ 
			icon_name: 'edit-delete',
			label: _("Remove group or folder"),
			is_important: true
		});
		sourceRemoveButton.connect('clicked', Lang.bind(this, this._sourceRemoveDialog));
		
		// Add buttons to the toolbar
		sourceToolbar.add(this._sourceAddGroupButton);
		sourceToolbar.add(sourceAddButton);
		sourceToolbar.add(sourceRemoveButton);
		
		
		// Attach the label, tree & toolbar to the grid
		grid.add (sourceLabel);
		grid.add (this._sourceTreeView);
		grid.add (sourceToolbar);
		
		// Create a destination label, tree, toolbar and button
		let destinationLabel = new Gtk.Label ({
			label: '<b>' + _("Destination") + '</b>',
			use_markup: true,
			halign: Gtk.Align.START,
			margin_top: 20 
		});
		
		this._destinationStore = new Gtk.ListStore();
		this._destinationStore.set_column_types([GObject.TYPE_STRING, GObject.TYPE_STRING]);
		
		this._destinationTreeView = new Gtk.TreeView({
			model: this._destinationStore,
			hexpand: true,
			vexpand: true,
			height_request: 55 
		});
		this._destinationTreeView.get_selection().set_mode(Gtk.SelectionMode.SINGLE);
		
		// Create a column for the groups
		let destinationGroupColumn = new Gtk.TreeViewColumn({
			expand: true,
			sort_column_id: Columns.GROUP_NAME,
			title: _("Groups") 
		});
		
		// Create the cell text that will display group's name
		let destinationGroupNameRenderer = new Gtk.CellRendererText;
		// Add cell to the column
		destinationGroupColumn.pack_start(destinationGroupNameRenderer, true);
		destinationGroupColumn.add_attribute(destinationGroupNameRenderer, "text", Columns.GROUP_NAME);
		// Add column to the treeview
		this._destinationTreeView.append_column(destinationGroupColumn);
		
		// Create a column for the folders
		let destinationFolderColumn = new Gtk.TreeViewColumn({
			expand: true,
			sort_column_id: Columns.FOLDER_NAME,
			title: _("Folders") 
		});
		
		// Create the cell text that will display folder's name
		let destinationFolderNameRenderer = new Gtk.CellRendererText;
		// Add cell to the column
		destinationFolderColumn.pack_start(destinationFolderNameRenderer, true);
		destinationFolderColumn.add_attribute(destinationFolderNameRenderer, "text", Columns.FOLDER_NAME);
		// Add column to the treeview
		this._destinationTreeView.append_column(destinationFolderColumn);
		
		let destinationToolbar = new Gtk.Toolbar ({
			icon_size: Gtk.IconSize.SMALL_TOOLBAR });
		destinationToolbar.get_style_context().add_class(Gtk.STYLE_CLASS_INLINE_TOOLBAR);
		
		this.__destinationAddChangeFolderButton = new Gtk.ToolButton({ 
			icon_name: 'folder-new',
			label: _("Add/Change folder"),
			is_important: true
		});
		this.__destinationAddChangeFolderButton.connect('clicked', Lang.bind(this, this._destinationAddChangeFolderDialog));
		
		destinationToolbar.add(this.__destinationAddChangeFolderButton);
		
		// Attach the label & entryGrid to the grid
		grid.add (destinationLabel);
		grid.add (this._destinationTreeView);
		grid.add (destinationToolbar);

		// Add the grid to the window
		this.add (grid);
		
		// Refresh the windows with the actual settings
		this._refresh();
	},
	
	_sourceAddGroupPopover: function() {
		// Create popover, grid to hold the widgets and the widgets
		this._groupPopover = new Gtk.Popover({
			relative_to: this._sourceAddGroupButton });
		this._groupPopover.set_modal(true);
		
		let popGrid = new Gtk.Grid ({
			orientation: Gtk.Orientation.HORIZONTAL,
			column_spacing: 6,
			row_spacing: 6 
		});
		
		this._popGroupEntry = new Gtk.Entry ({
			hexpand: true,
			editable: true 
		});
			
		let popAddGroupButton = new Gtk.Button ({
			label: _("Add") 
		});
		popAddGroupButton.connect('clicked', Lang.bind(this, this._addGroup));
		
		// Add widgets to the grid, and grid to the popover
		popGrid.add(this._popGroupEntry);
		popGrid.add(popAddGroupButton);
		this._groupPopover.add(popGrid);
		
		// Show the popover... all
		this._groupPopover.show_all();
	},
	
	_addGroup: function() {
		let groupEntry = this._popGroupEntry.get_text();
		let existsSemicolon = groupEntry.indexOf(";");
		let existsVerticalBar = groupEntry.indexOf("|");
		
		if (existsSemicolon == -1 && existsVerticalBar == -1) {	// ; and | cannot be used for name groups
			let groupSourceDestination = Gsd.addGroup(this._settings.get_strv(SETTINGS_GROUP_SOURCE_DESTINATION), groupEntry);
			let enabledGroups = this._settings.get_strv(SETTINGS_ENABLED_GROUPS);
			
			enabledGroups.push(groupEntry);
			
			this._settings.set_strv(SETTINGS_GROUP_SOURCE_DESTINATION, groupSourceDestination);
			this._settings.set_strv(SETTINGS_ENABLED_GROUPS, enabledGroups);	// also update the enabled groups
		}
		
		this._groupPopover.destroy();
	},
	
	_sourceAddFolderDialog: function() {
		let chooseFolderDialog = new Gtk.FileChooserDialog({
			title: _("Select folder"),
			modal: true,
			action: Gtk.FileChooserAction.SELECT_FOLDER 
		});
		chooseFolderDialog.add_button(Gtk.STOCK_CANCEL, Gtk.ResponseType.CANCEL);
		chooseFolderDialog.add_button(Gtk.STOCK_ADD, Gtk.ResponseType.OK);
		
		chooseFolderDialog.connect('response', Lang.bind(this, function(dialog, id) {
			if (id != Gtk.ResponseType.OK) {
				dialog.destroy();
			} else  {	
				// if you have a group selected, add the folder to that group
				let [any, model, iter] = this._sourceTreeView.get_selection().get_selected();
				if (any) {
					let rootLevel = this._sourceStore.iter_depth(iter);
					if (rootLevel == 0) { // and only add if you select a group, not a folder
						let group = this._sourceStore.get_value(iter, Columns.GROUP_NAME);
						let groupSourceDestination = Gsd.addSource(this._settings.get_strv(SETTINGS_GROUP_SOURCE_DESTINATION), group, dialog.get_filename());
						
						this._settings.set_strv(SETTINGS_GROUP_SOURCE_DESTINATION, groupSourceDestination);
					}
				}
				
				dialog.destroy();
			}
		}));
		
		chooseFolderDialog.run();
	},
	
	_sourceRemoveDialog: function() {
		let [any, model, iter] = this._sourceTreeView.get_selection().get_selected();
		
		if (any) {
			let rootLevel = this._sourceStore.iter_depth(iter);
			if (rootLevel == 0) {	// it if a group, delete the group and all it's folders
				let group = this._sourceStore.get_value(iter, Columns.GROUP_NAME);
				let groupSourceDestination = Gsd.removeGroup(this._settings.get_strv(SETTINGS_GROUP_SOURCE_DESTINATION), group);
				let enabledGroups = Gsd.getGroups(groupSourceDestination);	// also update the enabled groups

				this._settings.set_strv(SETTINGS_GROUP_SOURCE_DESTINATION, groupSourceDestination);
				this._settings.set_strv(SETTINGS_ENABLED_GROUPS, enabledGroups);
			} else {	// if not, then only delete the folder
				let iterParent = this._sourceStore.iter_parent(iter);
				let group = this._sourceStore.get_value(iterParent[1], Columns.GROUP_NAME);	// array [0] -> bool, [1] -> the iter
				let folderName = this._sourceStore.get_value(iter, Columns.FOLDER_NAME);
				let groupSourceDestination = Gsd.removeSource(this._settings.get_strv(SETTINGS_GROUP_SOURCE_DESTINATION), group, folderName);
				this._settings.set_strv(SETTINGS_GROUP_SOURCE_DESTINATION, groupSourceDestination);
			}
		}
	},
	
	_destinationAddChangeFolderDialog: function() {
		let chooseFolderDialog = new Gtk.FileChooserDialog({
			title: _("Select folder"),
			modal: true,
			action: Gtk.FileChooserAction.SELECT_FOLDER 
		});
		chooseFolderDialog.add_button(Gtk.STOCK_CANCEL, Gtk.ResponseType.CANCEL);
		chooseFolderDialog.add_button(Gtk.STOCK_ADD, Gtk.ResponseType.OK);
		
		chooseFolderDialog.connect('response', Lang.bind(this, function(dialog, id) {
			if (id != Gtk.ResponseType.OK) {
				dialog.destroy();
			} else  {
				let [any, model, iter] = this._destinationTreeView.get_selection().get_selected();
				let group = this._destinationStore.get_value(iter, Columns.GROUP_NAME);
				let groupSourceDestination = Gsd.addChangeDestination(this._settings.get_strv(SETTINGS_GROUP_SOURCE_DESTINATION), group, dialog.get_filename());
				this._settings.set_strv(SETTINGS_GROUP_SOURCE_DESTINATION, groupSourceDestination);
				
				dialog.destroy();
			}
		}));
		
		chooseFolderDialog.run();
	},
	
	_refresh: function() {
		let groupsList = Gsd.getGroups(this._settings.get_strv(SETTINGS_GROUP_SOURCE_DESTINATION));
		
		this._sourceStore.clear();
		this._destinationStore.clear();
		
		for (var i = 0; i < groupsList.length; i++) {
			let groupSourceIter = this._sourceStore.append(null);
			let sourceFoldersList = Gsd.getSourceFolders(this._settings.get_strv(SETTINGS_GROUP_SOURCE_DESTINATION), groupsList[i]);
		
			this._sourceStore.set(groupSourceIter, [Columns.GROUP_NAME, Columns.FOLDER_NAME], [groupsList[i], ""]);
		
			for (var j = 0; j < sourceFoldersList.length; j++) {
				if (sourceFoldersList[j] != "") {	// getSourceFolders returns empty array when empty
					let childrenSourceIter = this._sourceStore.append(groupSourceIter);
					this._sourceStore.set(childrenSourceIter, [Columns.GROUP_NAME, Columns.FOLDER_NAME], ["", sourceFoldersList[j]]);
				}
			}
		
			let destinationIter = this._destinationStore.append();
			let destinationFolder = Gsd.getDestinationFolder(this._settings.get_strv(SETTINGS_GROUP_SOURCE_DESTINATION), groupsList[i]);
			this._destinationStore.set(destinationIter, [Columns.GROUP_NAME, Columns.FOLDER_NAME], [groupsList[i], destinationFolder]);
		}
	}
});

function init(){
	//Convenience.initTranslations();
}

function buildPrefsWidget(){
	let widget = new SincroDirsSettingsWidget();
	widget.show_all();
	
	return widget;
}
