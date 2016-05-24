= YANG Creator

To run the program inside docker simply run the bash script run.sh with:

----
bash run.sh
----

This bash script will pull the docker images 'sartura/sysrepo-netopeer2' and
'sartura/tesconf' which contains and runs programs needed for yang-creator.
When the docker is run it mounts the folder "above", that is, it mounts the
'sources_code' folder into docker. This enables us to access that folder as
well as edit it and the changes will be viewable in docker.

When it runs the docker will bind this folder and the folder
'../../ietf-yangs'.  After that it will pass the current username and groupname
in order to preserve folder ownership once docker closes.

The default name of the docker container is sysrepo, it can be set to anything.

For the entry point it uses the bash script 'entrypoint.sh'. This script
compiles the program if it has not been compiled yet and generates a skeleton
xml file based on the yang model and its default values.

We can get those values through _testconf_, an utility from the freenetconf
project. To run testconf, run the docker image with the command:

----
docker run -i -t -w /opt/dev/testconf/netconf_client/tests --link sysrepo --rm sartura/testconf:latest bash
----

and once we are in docker we run:

----
node xpath.js "/{{yang_name_short}}:<container_name>//*" 
----

If the first container has a different name than sysrepo, update the name in
the docker run command (--link sysrepo) and inside the container run:

----
sed -i "s/config.netconf.host = 'sysrepo'/config.netconf.host = 'new_name'/" ../../core/config.js
----

Video demonstration via asciinema:

https://asciinema.org/a/cdokggxe1ycs37axh3fwa5bcd

XPath is used for getting values. Learn more about XPath: +
link:http://www.w3schools.com/xsl/xpath_intro.asp[] +
link:https://en.wikipedia.org/wiki/XPath[] +
link:http://www.tutorialspoint.com/xpath/xpath_overview.htm.[]
