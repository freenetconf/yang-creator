cmake_minimum_required(VERSION 2.6)
PROJECT({{yang_name_short}} C)

# check the supported platform
if(NOT UNIX)
	message(FATAL_ERROR "Only *nix like systems are supported.")
endif()

# set default build type if not specified by user
if(NOT CMAKE_BUILD_TYPE)
	set(CMAKE_BUILD_TYPE debug)
endif()


set(CMAKE_C_FLAGS         "${CMAKE_C_FLAGS} -Wall -Wpedantic -std=gnu11")
if(CMAKE_COMPILER_IS_GNUCC)
    # disable strict aliasing in GCC, since it produces false alarams in libev
    set(CMAKE_C_FLAGS "${CMAKE_C_FLAGS} -Wno-strict-aliasing")
endif()
set(CMAKE_C_FLAGS_RELEASE "-DNDEBUG -O2")
set(CMAKE_C_FLAGS_DEBUG   "-g -O0")

ADD_DEFINITIONS(-D_PROJECT_NAME="${PROJECT_NAME}")

SET(CMAKE_ARCHIVE_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/lib)
SET(CMAKE_LIBRARY_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/lib)
SET(CMAKE_RUNTIME_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/bin)

SET(CMAKE_INSTALL_PREFIX "/usr")

set(srcs
	src/main.c
	)

add_executable(${PROJECT_NAME} ${srcs})

set(CMAKE_MODULE_PATH ${CMAKE_MODULE_PATH} "${CMAKE_SOURCE_DIR}/CMakeModules/")

# dependencies - sysrepo
find_package(SYSREPO REQUIRED)
target_link_libraries(${PROJECT_NAME} ${SYSREPO_LIBRARIES})
include_directories(${SYSREPO_INCLUDE_DIRS})
FIND_PACKAGE(SYSREPO REQUIRED)

