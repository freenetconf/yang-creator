var fs = require('fs')
var mustache = require('mustache')

var genObject = {
    'C' : [
        {
            'application': {
                             'CMakeLists.txt': 'CMakeLists.txt',
                             'FindSYSREPO.cmake': 'CMakeModules/FindSYSREPO.cmake',
                             'main.c': 'src/main.c',
                             'entrypoint.sh': 'entrypoint.sh',
                             'run.sh': 'run.sh',
                             'README.asciidoc': 'README.asciidoc'
                         }
        }, {
            'plugin': {
                        'CMakeLists.txt': 'CMakeLists.txt',
                        'FindSYSREPO.cmake': 'CMakeModules/FindSYSREPO.cmake',
                        'main.c': 'src/main.c',
                        'entrypoint.sh': 'entrypoint.sh',
                        'run.sh': 'run.sh',
                        'README.asciidoc': 'README.asciidoc'
                      }
        }
    ]
};

function generate_yang_model(yang_name_full, language, tmp_dir) {

	var short_name = yang_name_full.split('.yang')[0].split('@')[0]

	var view = {
		yang_name_full: yang_name_full,
		yang_name_short: short_name,
	};

	var template_root = __dirname + "/template/" + language + "/"

	var app_object = genObject[language]
	Object.keys(app_object).forEach(function(num_order) {
		Object.keys(app_object[num_order]).forEach(function(app_type) {
			Object.keys(app_object[num_order][app_type]).forEach(function(item_src) {
				item_dest = app_object[num_order][app_type][item_src]
				var template_src = template_root + app_type + "/"
				var template_dest = tmp_dir + '/' + yang_name_full +  '/' + app_type + '/'

				var template = fs.readFileSync(template_src + item_src).toString();
				var content = mustache.render(template, view)

				try {
					fs.writeFileSync(template_dest + item_dest, content, 'utf8');
				} catch (e) {
					console.log("WRITE ERROR!")
					// TODO, write a response
					return
				}
			});
		});
	});
};

function create_folder_structure(yang_name, language, tmp_dir, populate) {
	fs.mkdirSync(tmp_dir + '/' + yang_name)

	if (language == "C") {
		var app_object = genObject[language]
		Object.keys(app_object).forEach(function(num_order) {
			Object.keys(app_object[num_order]).forEach(function(app_type) {
				var write_loc = tmp_dir + '/' + yang_name + '/' + app_type
				fs.mkdirSync(write_loc)
				fs.mkdirSync(write_loc + '/yang')
				fs.mkdirSync(write_loc + '/src')
				fs.mkdirSync(write_loc + '/CMakeModules')
				fs.writeFileSync(write_loc + '/yang/' + yang_name, fs.readFileSync(tmp_dir + '/ietf-yang/' + yang_name));
			});
		});
	}

	populate()
};

function start(yang_model, language, tmp_dir, callback) {

	// create folder structure
	if (yang_model == '/') {
		try { var files = fs.readdirSync(tmp_dir + '/ietf-yang'); }
		catch(e) { return; }
		if (files.length > 0)
		var totalCalls = files.length
		for (var i = 0; i < files.length; i++) {
			(function(i) {
				var populate = function() {
					generate_yang_model(files[i], language, tmp_dir)
				}
				create_folder_structure(files[i], language, tmp_dir, populate)
				totalCalls = totalCalls -1
			})(i);
		}

	} else {
		var populate = function() {
			generate_yang_model(yang_model, language, tmp_dir)
		}
		create_folder_structure(yang_model, language, tmp_dir, populate)
	}

	callback()
};

exports.generate = function (yang_model, language, tmp_dir, callback) {
	start(yang_model, language, tmp_dir, callback)
};
