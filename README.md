# SincroDirs
Gnome Shell extension for folders synchronization.

Uses rysnc as a backend.

Thanks to [randwall](https://github.com/rodakorn/randwall) extension, help me a lot to understand how to make an extension.

Features
--------
* Default options for synchronize are: -rlptq.
* Modify rsync options with two options: delete and compress.
* Create a custom rsync options string.
* Create groups of folders with one common destination.
* Enable/disable groups for synchronize.
* Synchronize a group of folders to a common destination.
* Scheduled synchronization.
* Notification support.
* Available in english and spanish.

Settings
--------
The first time the extension is executed needs to be configured. When you click on the folder with arrows icon it displays a message and a '+' button. Click the '+' button to configure the extension and add folders.

![](https://github.com/Khudsa/sincrodirs/blob/master/_screenshots/1.png)

![](https://github.com/Khudsa/sincrodirs/blob/master/_screenshots/2.png)

You can add groups of folders to synchronize, add folders to the groups and add destination folders to the groups. You can can select a folder and remove it, or select a group and remove the group and all it's folders.

![](https://github.com/Khudsa/sincrodirs/blob/master/_screenshots/3.png)

![](https://github.com/Khudsa/sincrodirs/blob/master/_screenshots/4.png)

On the next tab you can modify the default options for rsync and configure when you want to synchronize.

![](https://github.com/Khudsa/sincrodirs/blob/master/_screenshots/5.png)

The defaults options for rsync are -rlptq, but you cand modify them and add the delete or compress options or set a new ones. Warning! Must be correct rsync options string! Also you can schedule the synchronization. You can specify none (no scheduled), one or more days to synchronize at an specific hour.

![](https://github.com/Khudsa/sincrodirs/blob/master/_screenshots/6.png)

If you have configured the extension, now you can click again on the extension icon to view the groups to synchronize, when the next synchronization will happen (if scheduled), the last synchronization and errors. You can click on the switch button to activate/deactivate that group synchronization. And the play button to synchronize.

![](https://github.com/Khudsa/sincrodirs/blob/master/_screenshots/7.png)

![](https://github.com/Khudsa/sincrodirs/blob/master/_screenshots/8.png)
