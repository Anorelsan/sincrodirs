/**
* group_source_destination manipulation
* functions
* ['group1;source1|source2|...|sourcen;destination1','group2;...']
**/

function searchGroupIndex (group_source_destination, group) {
	for (var i = 0; i < group_source_destination.length; i++) {
		let groupPosition = group_source_destination[i].indexOf(';');
		let actualGroup = group_source_destination[i].slice(0,groupPosition).toString();
		
		if (actualGroup == group) {
			return i;
		}
	}
	
	return -1;
}

function getGroups (group_source_destination) {
	let groups = [];
	
	for (var i = 0; i < group_source_destination.length; i++) {
		let groupPosition = group_source_destination[i].indexOf(';');
		let actualGroup = group_source_destination[i].slice(0,groupPosition).toString();
		
		groups.push(actualGroup);
	}
	
	return groups;
}

function getSourceFolders (group_source_destination, group) {
	let folders = [];
	let i = searchGroupIndex(group_source_destination, group);
	
	if (i != -1) {
		let groupPosition = group_source_destination[i].indexOf(';');
	
		groupPosition = groupPosition + 1;	// groupPosition + 1 to avoid the ; separator
	
		let destinationPosition = group_source_destination[i].indexOf(';', groupPosition);
		let sFolders = group_source_destination[i].slice(groupPosition,destinationPosition);
		folders = sFolders.split("|");
	}

	return folders;
}

function getDestinationFolder (group_source_destination, group) {
	let folder = "";
	let i = searchGroupIndex(group_source_destination, group);
	
	if (i != -1) {
		let groupPosition = group_source_destination[i].indexOf(';');
	
		groupPosition = groupPosition + 1;	// groupPosition + 1 to avoid the ; separator
	
		let destinationPosition = group_source_destination[i].indexOf(';', groupPosition);
		folder = group_source_destination[i].slice(destinationPosition + 1);	// same as groupPosition + 1
	}
	
	return folder;
}

function addGroup (group_source_destination, group) {
	let i = searchGroupIndex(group_source_destination, group);
	
	if (i == -1) {	// add a group only if it isn't added before
		group = group.concat(";;");
		group_source_destination.push(group);
	}
	
	return group_source_destination;
}

function addSource (group_source_destination, group, source) {
	let i = searchGroupIndex(group_source_destination, group);
		
	if (i != -1) {
		let sourceFolders = getSourceFolders(group_source_destination, group);
		let exists = sourceFolders.indexOf(source);

		if (exists == -1) {	// add a source only if it isn's added before
			if (sourceFolders.length == 1 && sourceFolders[0] == "") {	// getSourceFolders returns an empty array if there's isn't any folder
				sourceFolders[0] = source;				// to avoid empty strings, we check if the lenght is 1 and is not empty
			} else {
				sourceFolders.push(source);
			}
			let sSourceFolders = sourceFolders.join("|");
			let destinationFolder = getDestinationFolder(group_source_destination, group);
			group = group.concat(";");
			group = group.concat(sSourceFolders);
			group = group.concat(";");
			group = group.concat(destinationFolder);

			group_source_destination[i] = group;
		}
	}
	
	return group_source_destination;
}

function addChangeDestination (group_source_destination, group, destination) {
	let i = searchGroupIndex(group_source_destination, group);
	
	if (i != -1) {
		let sourceFolders = getSourceFolders(group_source_destination, group);
		
		let sSourceFolders = sourceFolders.join("|");
		group = group.concat(";");
		group = group.concat(sSourceFolders);
		group = group.concat(";");
		group = group.concat(destination);
		
		group_source_destination[i] = group;
	}
	
	return group_source_destination;
}

function removeGroup (group_source_destination, group) {
	let i = searchGroupIndex(group_source_destination, group);

	if (i >= 0) {	// remove the group only if already exists
		if (i == 0) {
			group_source_destination.shift();
		} else {
			let before = group_source_destination.slice(0, i);
			let after = group_source_destination.slice(i + 1);	// +1 to remove the group
			group_source_destination = before.concat(after);
		}
	}
	
	return group_source_destination;
}

function removeSource (group_source_destination, group, source) {
	let i = searchGroupIndex(group_source_destination,group);

	if (i != -1) {
		let sourceFolders = getSourceFolders(group_source_destination, group);
		let exists = sourceFolders.indexOf(source);

		if (exists >= 0) {	// remove source only if exists
			if (exists == 0) {
				sourceFolders.shift();
			} else {
				let before = sourceFolders.slice(0, exists);
				let after = sourceFolders.slice(exists + 1);	// +1 to remove the folder
				sourceFolders = before.concat(after);
			}
				
			let sSourceFolders = sourceFolders.join("|");
			let destinationFolder = getDestinationFolder(group_source_destination, group);
			group = group.concat(";");
			group = group.concat(sSourceFolders);
			group = group.concat(";");
			group = group.concat(destinationFolder);

			group_source_destination[i] = group;
		}
	}
	
	return group_source_destination;
}
