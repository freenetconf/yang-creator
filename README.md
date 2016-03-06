YANG Creator
============

The online YANG creator, editor, and exporter.

#### Installation
    git clone https://github.com/freenetconf/yang-creator.git
    cd yang-creator
	export PYTHON=python2 # in case you python is in fact python3
    npm install

    ./server.js

You also need to have `pyang` installed for export to work. E.g.:

    pip2 install pyang

#### Usage
Open browser url 'http://127.0.0.1:8888'

To register/login enter wanted 'username' and 'password'.
This gives you ability to manage your YANG files.

If you have module that imports another module, you need to create/import all
depended module and save them. After that you can use your module.

##### Files
Manage existing files which are saved to your account.

##### New
Create new example module/submodule.

##### Validate
Validate your YANG module using pyang.

##### Export
See your finalized YANG module which you can download or copy (copy requieres flash).

##### Save
Save your YANG files online for later usage.

#### TODO
* statements:
  * check missing or incorrect statements
  * uniq values should be set for all statements that can hold only one specific statement inside
  * default values and possible values - some statements can only have specific values
  * extension statements - dynamically created statements are not supported
* help: create help window for users where they can see how to use YANG Creator
* import/include: YANG extension statements defined in other modules are not seen
* import: depends on YANG parser work
* security, code cleanup and consolidation
