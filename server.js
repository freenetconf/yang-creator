#!/usr/bin/env node

var args = process.argv.slice(2)

var port = args[0] || 8888

var yang_modules_dir = __dirname + "/public/yangs/"
var leveldb_dir = __dirname + "/db/"

var pyang_import_path = __dirname + "/ietf-yangs/"

var express = require('express')
var bodyParser = require('body-parser')
var fs = require('fs')

var validator = require('validator')
var exec = require('child_process').execFile
var compressor = require('node-minify')
var compress = require('compression')
var multer = require('multer')

var yang_parser = require('yang-parser')

var logging = function (action, user) {
	console.log(action, user, new Date())
}

var app = express()
app.use(compress())
app.use(multer({
	rename: function(filedname, filename) {
		return filename
	}
}))
app.use(bodyParser.urlencoded({
	extended: false
}))
app.use(express.static(__dirname + '/public', {
	maxAge: 25920000000
}))

console.log("minifying css/js files")

new compressor.minify({
	type: 'clean-css',
	fileIn: [
		__dirname + '/css/bootstrap.css',
		__dirname + '/css/bootstrap-theme.css',
		__dirname + '/css/main.css'
	],
	fileOut: __dirname + '/public/main.css',
	callback: function(error, min) {
		if (error) throw error

		console.log('css minified')
	}
})

new compressor.minify({
	type: 'uglifyjs',
	fileIn: [
		__dirname + '/js/jquery.js',
		__dirname + '/js/sha256.js',
		__dirname + '/js/ZeroClipboard.min.js',
		__dirname + '/js/bootstrap.js',
		__dirname + '/js/json2.js',
		__dirname + '/js/jstorage.js',
		__dirname + '/js/jquery.form.min.js',
		__dirname + '/js/main.js',
		__dirname + '/js/yang.js',
		__dirname + '/js/editor.js'
	],
	fileOut: __dirname + '/public/main.js',
	callback: function(error, _m) {
		if (error) throw error

		console.log('js minified')
	}
})

var levelup = require('level')

/*
 * unified function for writing json response
 *
 * @res - response object itself
 * @error - error message
 * @data - object or string with response data
 */
var response = function(res, error, data) {
	var resp = {}
	resp.error = typeof error === 'undefined' ? '' : error
	resp.data = typeof data === 'undefined' ? '' : data

	res.json(resp)
	res.end()
}

/*
 * validate username, password (SHA256 hash)
 *
 * @username - username of the user
 * @userpass_hash - sha256 has of the user
 */

function user_is_valid(email, userpass_hash) {
	if (!validator.isEmail(email) ||
		!userpass_hash ||
		userpass_hash.length !== 64 ||
		new RegExp(/^[A-z0-9]{64}$/).test(userpass_hash) === false) {
		return false
	}

	return true
}

/*
 * function that we use to get 'uniq' user id
 */

function uniq_n(email, userpass_hash) {
	return email + "_" + userpass_hash
}

/*
 * check yang module name if matches identifier
 * https://tools.ietf.org/html/rfc6020#page-163
 *
 * client side and pyang will handle yang validation in more detail
 *
 * @identifier - yang identifier - mostly yang module name
 */

function identifier_valid(identifier) {
	if (!identifier)
		return false

	return new RegExp(/([A-z]|'_')+([A-z0-9]|\_|\-|\.)*/).test(identifier)
}

function get_dir_name(email, userpass_hash) {
	var dir_name = uniq_n(email, userpass_hash)
	if (dir_name.length > 254)
		dir_name = dir_name.substr(0, 254)

	dir_name = yang_modules_dir + dir_name
	dir_name += "/"

	return dir_name
}

/*
 * save yang module content to database for user
 */

var rmdir = require('rimraf')

var initial_yang_load = function(email, userpass_hash, res) {
	var db = levelup(leveldb_dir + uniq_n(email, userpass_hash), function(error, db) {
		if (error) {
			console.error("unable to save YANG module to database for user:%s", email)
			console.error(error)

			return response(res, error.toString())
		}

		var dir = "./ietf-yangs"
		fs.readdir(dir, function(err, files) {
			if (err) {
				console.error("can't read default yang dir")
				return response(res, err.toString())
			}
			files.forEach(function(yang_module_name) {
				fs.readFile(dir + '/' + yang_module_name, 'utf-8', function(err, yang_module_content) {
					if (err) {
						console.log("can't read default yang file", yang_module_name, err)
					}
					db.put(yang_module_name, yang_module_content, function(error) {
						db.close()

						if (error) {
							console.error("unable to save yang module to database for user:%s", email)
							console.error(error)
						}
					})
				})
			})
			response(res)
		})


	})
}


var AdmZip = require('adm-zip')

app.post('/register/:email/:userpass_hash', function(req, res) {
	var userpass_hash = req.params.userpass_hash
	var email = req.params.email
	var key = uniq_n(email, userpass_hash)

	fs.exists(leveldb_dir + uniq_n(email, userpass_hash), function(exists) {
		if (!exists) {
			initial_yang_load(email, userpass_hash, res)
		} else {
			response(res)
		}
	})
})

app.get("/backup/:email/:userpass_hash", function(req, res) {
	var userpass_hash = req.params.userpass_hash
	var email = req.params.email
	var key = uniq_n(email, userpass_hash)

	var db = levelup(leveldb_dir + uniq_n(email, userpass_hash), function(error, db) {
		if (error) {
			logging('unable to create backup', email)
			return
		}
		var zip = new AdmZip()
		db.createReadStream().on('data', function(entry) {
			zip.addFile(entry.key, new Buffer(entry.value))
		}).on('close', function() {
			db.close()
			var willSendThis = zip.toBuffer()
			var filename = 'yang_creator_' + new Date().toISOString() + '.zip'
			res.writeHead(200, {
				'Content-Type': 'application/octet-stream',
				'Content-Length': willSendThis.length,
				'Content-Disposition': 'attachment; filename=' + filename
			})
			res.write(willSendThis)
			res.end()

		})
	})
})

app.get("/yang/reset/:email/:userpass_hash", function(req, res) {
	var userpass_hash = req.params.userpass_hash
	var email = req.params.email

	logging('reseting users yang database', email)

	rmdir('./db/' + uniq_n(email, userpass_hash), function(err) {
		if (err) {
			console.log(err);
			return response(res, err.toString())
		}
		initial_yang_load(email, userpass_hash, res)
	})
})

app.put("/yang/:email/:userpass_hash/:yang_module_name", function(req, res) {
	var userpass_hash = req.params.userpass_hash
	var email = req.params.email
	var yang_module_name = req.params.yang_module_name
	var yang_module_content = req.body.yang_module_content

	if (!user_is_valid(email, userpass_hash))
		return response(res, "invalid username or password")

	if (!identifier_valid(yang_module_name))
		return response(res, "invalid YANG module name")

	if (!yang_module_content || yang_module_content.length < 10)
		return response(res, "invalid YANG module content")

	logging("saving yang module: " + yang_module_name, email)

	var db = levelup(leveldb_dir + uniq_n(email, userpass_hash), function(error, db) {
		if (error) {
			console.error("unable to save yang module to database for user:%s", email)
			console.error(error)

			return response(res, error.toString())
		}

		db.put(yang_module_name, yang_module_content, function(error) {
			db.close()

			if (error) {
				console.error("unable to save yang module to database for user:%s", email)
				console.error(error)

				return response(res, error.toString())
			}

			return response(res)
		})
	})
})

/*
 * get yang module content from database for user
 */

app.get("/yang/:email/:userpass_hash/:yang_module_name?", function(req, res) {
	var userpass_hash = req.params.userpass_hash
	var email = req.params.email
	var yang_module_name = req.params.yang_module_name

	if (!user_is_valid(email, userpass_hash))
		return response(res, "invalid username or password")

	var db = levelup(leveldb_dir + uniq_n(email, userpass_hash), function(error, db) {
		if (error) {
			console.error("unable to get YANG module from database for user:%s", email)
			console.error(error)

			return response(res, error.toString())
		}

		if (yang_module_name) {
			db.get(yang_module_name, function(error, value) {
				db.close()

				if (error) {
					console.error("unable to get yang module from database for user:%s", email)
					console.error(error)

					return response(res, error.toString())
				}

				try {
					response(res, null, JSON.stringify(yang_parser.parse(value)))
				} catch (e) {
					return response(res, e)
				}
			})
		} else {
			var keys = []

			db.createReadStream({
					values: false
				})
				.on('data', function(key) {
					keys.push(key)
				})
				.on('error', function(error) {
					console.error("database error when reading yang files for user: %s", email)
					console.error(error)

					db.close()
				})
				.on('end', function() {
					response(res, null, keys)
				})
				.on('close', function() {
					db.close()
				})
		}
	})

})

/*
 * delete stored yang module from database for user by module name
 */

app.delete("/yang/:email/:userpass_hash/:yang_module_name", function(req, res) {
	var userpass_hash = req.params.userpass_hash
	var email = req.params.email
	var yang_module_name = req.params.yang_module_name

	if (!user_is_valid(email, userpass_hash))
		return response(res, "invalid username or password")

	if (!identifier_valid(yang_module_name))
		return response(res, "invalid YANG module name")

	var db = levelup(leveldb_dir + uniq_n(email, userpass_hash), function(error, db) {
		if (error) {
			console.error("database error when deleting yang files for user: %s", email)
			console.error(error)

			return response(res, error.toString())
		}

		db.del(yang_module_name, function(error) {
			db.close()

			if (error) {
				console.error("database error when deleting yang files for user: %s", email)
				console.error(error)

				return response(res, error.toString())
			}

			response(res)
		})
	})
})


/*
 * create and validate yang module using pyang
 *
 * file name must match yang module name
 * we create directory per user and save modules there
 *
 * @output: specifies if we should return generated yang module
 */

app.post("/yang_validate/:output?", function(req, res) {
	var userpass_hash = req.body.userpass_hash
	var email = req.body.email
	var yang_module_name = req.body.yang_module_name
	var yang_module_content = req.body.yang_module_content
	var output = req.params.output

	if (!user_is_valid(email, userpass_hash))
		return response(res, "invalid username or password")

	if (!identifier_valid(yang_module_name))
		return response(res, "invalid YANG module name")

	logging("validating yang module: " + yang_module_name, email)

	/* max common dir length is 255 chars */
	var dir_name = get_dir_name(email, userpass_hash)

	var file_name = yang_module_name

	write_file(dir_name, file_name, yang_module_content, function(error) {
		if (error) {
			console.error("error when writing yang files for user: %s", email)
			console.error(error)

			return response(res, error)
		}

		exec('pyang', ['-f', 'yang', '-p', pyang_import_path, file_name], {
			cwd: dir_name
		}, function(error, stdout, stderr) {
			var data = {
				"error": stderr
			}
			output && (data.yang = stdout)
			response(res, (error && error.killed) ? error : '', data)

			/* overwrite current yang file with validated */
			write_file(dir_name, file_name, stdout.replace(/^\s*$/gm, ''))
		})
	})
})

/*
 * download existing yang file from server
 */

app.get("/file/:email/:userpass_hash/:yang_module_name?", function(req, res) {
	var email = req.params.email
	var userpass_hash = req.params.userpass_hash
	var yang_module_name = req.params.yang_module_name

	if (!user_is_valid(email, userpass_hash))
		return response(res, "invalid username or password")

	if (!identifier_valid(yang_module_name))
		return response(res, "invalid YANG module name")

	var dir_name = get_dir_name(email, userpass_hash)
	var file_path = dir_name + yang_module_name

	fs.readFile(file_path, "binary", function(error, file) {
		if (error) {
			res.writeHead(error.code === 'ENOENT' ? 404 : 500, {
				"Content-Type": "text/plain"
			})
			res.write(error + "\n")
			res.end()
		} else {
			res.writeHead(200, {
				'Content-Type': 'application/octet-stream'
			})
			res.write(file, "binary")
			res.end()
		}
	})
})

/*
 * upload yang file
 */

app.post("/file/", function(req, res) {
	logging('uploading yang model')

	var file = req.files.import_file
	if (file.extension !== 'yang')
		return response(res, 'invalid file')

	fs.readFile(file.path, {
		encoding: 'utf8'
	}, function(error, data) {
		if (error) {
			console.error("error when uploading yang file: %s", file.path)
			console.error(error)

			return response(res, error)
		}

		try {
			response(res, null, JSON.stringify(yang_parser.parse(data)))
		} catch (e) {
			return response(res, e)
		}

	})
})

/* create file with content, creates directory if doesn't exist
 *
 * because of the nodejs asnyc nature it's recommended to create and check
 * errors instead of using 'fs.exists'
 * we can change this when user validation is added
 */

function write_file(dir_name, file_name, file_content, callback) {
	fs.mkdir(dir_name, function(error) {
		/* check if already exists or some other kind of error */

		if (error && error.code != 'EEXIST') {
			callback && callback(error)
			return
		}

		var file_path = dir_name + file_name

		/* save yang file and validate it using pyang
		 * we set 'cwd' so that pyang can find multiple yang files easily
		 */

		fs.writeFile(file_path, file_content, function(error) {
			if (error) {
				callback && callback(error)
				return
			}

			callback && callback()

		})
	})
}

app.listen(port)
console.log('server listening on port: ' + port)
