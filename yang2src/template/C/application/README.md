To run the program inside docker simply run the bash script run.sh:

bash run.sh

The bash script will pull the docker images sartura/sysrepo-netopeer2 and
sartura/tesconf.

When the bash script executes 'docker run' it will bind this folder and the folder ../../ietf-yangs
to the docker container, after that it will pass current username and groupname in order to preserve
folder ownership once docker closes.

The default name of the docker container is sysrepo, it can be set to anything.

For the entry point it uses the bash script entrypoint.sh

The script compiles the program and creates a skeleton xml file
based on the yang model and its default values.


Testconf

To run testconf, run the docker image with the command:

docker run -i -t -w /opt/dev/testconf/netconf_client/tests --link sysrepo --rm sartura/testconf:latest bash

and in the docker container you can run:

node xpath.js "/{{yang_name_short}}:<container_name>//*"

If the first container has a different name than sysrepo, update the name in the docker run command
(--link sysrepo) and inside the container run:

sed -i "s/config.netconf.host = 'sysrepo'/config.netconf.host = 'new_name'/" ../../core/config.js


Video demonstration via asciinema:

https://asciinema.org/a/7bd8lc1cinjd0c982f5jujwi1

