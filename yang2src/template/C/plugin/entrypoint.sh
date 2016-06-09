#!/bin/bash

# compile program
if [ ! -d "build" ]; then
	mkdir build
	cd build
	cmake  -DCMAKE_INSTALL_PREFIX:PATH=/usr/lib  ..
	make -j2
	cd ..

	# perserve folder ownership
	useradd -c 'container user' -u $APP_UID -g $APP_G  $APP_U
	chown -R $APP_U:$APP_G *
fi

# create skeleton xml file
if [ ! -d "xml" ]; then
	mkdir xml
	apt-get update
	apt-get install libxml2-utils

	pyang -p ../ietf-yang --sample-xml-skeleton-annotations --sample-xml-skeleton-defaults --sample-xml-skeleton-doctype=data yang/{{yang_name_full}} --format sample-xml-skeleton | xmllint --format - >  xml/{{yang_name_full}}.data.xml

	# rmove second and last line from the xml
	head -n -1 xml/{{yang_name_full}}.data.xml | sed '2d' > xml/tmp.xml
	mv xml/tmp.xml xml/{{yang_name_full}}.data.xml

	# perserve folder ownership
	useradd -c 'container user' -u $APP_UID -g $APP_G  $APP_U
	chown -R $APP_U:$APP_G *
fi

cd build
make install
cd ..

/usr/bin/sysrepoctl --install --yang=yang/{{yang_name_full}} --search-dir ../ietf-yang
/usr/bin/sysrepoctl --import=xml --module={{yang_name_short}} < xml/{{yang_name_full}}.data.xml

/usr/bin/sysrepo-plugind
/usr/bin/netopeer2-server -d
