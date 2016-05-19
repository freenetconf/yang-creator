To run the program inside docker simply run the bash script run.sh:

bash run.sh

the bash script will pull the docker images sartura/sysrepo-netopeer2 and
sartura/tesconf.

Whet it runs the docker it will bind this folder and the folder ../../ietf-yangs
after that it will pass current username and password in order to preserve folder ownership
once docker closes.

For the entry point it uses the bash script entrypoint.sh

The script compiles the program and creates a skeleton xml file
based on the yang model and its default values.


To run testconf, run the docker image with the command:

docker run -i -t -w /opt/dev/testconf/netconf_client/tests --link sysrepo --rm sartura/testconf:latest bash

and in the docker you can run:

node xpath.js "/{{yang_name_short}}:<container_name>//*"
