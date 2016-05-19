#!/bin/bash

user=$USER
group=$( id -g -n ${user})
id=$(  id -u $user)

parentdir="$(dirname "$(pwd)")"
grandparentdir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# pull sysrepo
docker pull sartura/sysrepo-netopeer2:latest

# pull testconf
docker pull sartura/testconf:latest

docker run -i -t -e APP_U=$user -e APP_G=$group -e APP_UID=$id -v ${parentdir}:${parentdir} -v ${grandparentdir}/ietf-yang:${parentdir}/ietf-yang -w ${PWD} --name {{yang_name_short}} --rm --name sysrepo sartura/sysrepo-netopeer2:latest bash entrypoint.sh
