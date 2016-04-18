var levelup = require('level')
var fs = require('fs')
var Promise = require('promise')
var rmdir = require('rimraf')
var yang_parser = require('yang-parser')

var Yang

Yang = (function(db_file) {
	function Yang() {}

	var db
	var ensureDbOpen = function() {
		db = levelup(db_file)
	}

	/*
	 * check yang module name if matches identifier
	 * https://tools.ietf.org/html/rfc6020#page-163
	 *
	 * client side and pyang will handle yang validation in more detail
	 *
	 * @identifier - yang identifier - mostly yang module name
	 */
	Yang.identifier_valid = function(identifier) {
		if (!identifier)
			return false

		return new RegExp(/([A-z]|'_')+([A-z0-9]|\_|\-|\.)*/).test(identifier)
	}

	Yang.initial_yang_load = function() {
		return new Promise(function(resolve, reject) {
			ensureDbOpen()

			var dir = "./ietf-yangs"
			var files
			try {
				files = fs.readdirSync(dir)
			}
			catch (e) {
				console.error(e.toString())
				return reject("can't read default yang dir")
			}

			var batch = db.batch()

			for (var i = 0, len = files.length; i < len; i++) {
				var yang_module_name = files[i]

				var yang_module_content
				try {
					yang_module_content = fs.readFileSync(dir + '/' + yang_module_name, 'utf-8')
				} catch (e) {
					console.error(e.toString())
					console.log("can't read default yang file", yang_module_name)
				}
				batch = batch.put(yang_module_name, yang_module_content, { "sync": true })
			}

			batch.write(function(error) {
				db.close()

				if (error) {
					console.error(error)
					return reject("unable to save yang module to database")
				}

				resolve()
			})
		})
	}

	Yang.register = function() {
		return new Promise(function(resolve, reject) {
			try {
				fs.statSync(db_file)
			}
			catch (e) {
				console.log('db not found. registering user')
				Yang.initial_yang_load().then(resolve, reject)
			}

			resolve()
		})
	}

	Yang.all_names = function() {
		return new Promise(function(resolve, reject) {
			ensureDbOpen()

			var keys = []
			db.createReadStream({
					values: false
				})
				.on('data', function(key) {
					keys.push(key)
				})
				.on('error', function(error) {
					console.error("database error when reading yang files")
					console.error(error)

					db.close()
				})
				.on('end', function() {
					resolve(keys)
				})
				.on('close', function() {
					db.close()
				})

		})
	}

	Yang.find = function(yang_module_name) {
		if (!Yang.identifier_valid(yang_module_name)) {
			return Promise.reject("invalid YANG module name")
		}

		return new Promise(function(resolve, reject) {
			ensureDbOpen()

			db.get(yang_module_name, function(error, value) {
				db.close()

				if (error) {
					console.error("unable to get yang module from database")
					console.error(error)

					return reject(error.toString())
				}

				try {
					return resolve(yang_parser.parse(value))
				} catch (e) {
					console.error(e)
					return reject(e)
				}
			})
		})
	}

	Yang.update = function(yang_module_name, yang_module_content) {
		if (!Yang.identifier_valid(yang_module_name)) {
			return Promise.reject("invalid YANG module name")
		}
		if (!yang_module_content || yang_module_content.length < 10) {
			return Promise.reject("invalid YANG module content")
		}

		return new Promise(function(resolve, reject) {
			console.log("saving yang module: " + yang_module_name)
			ensureDbOpen()

			db.put(yang_module_name, yang_module_content, function(error) {
				db.close()

				if (error) {
					console.error(error)
					return reject(res, error)
				}

				return resolve()
			})
		})
	}

	Yang.reset_db = function() {
		return new Promise(function(resolve, reject) {
			rmdir(db_file, function(error) {
				if (error) {
					return reject(error)
				}
				return Yang.initial_yang_load().then(resolve, reject)
			})
		})
	}

	Yang.delete = function(name) {
		if (!Yang.identifier_valid(name)) {
			return Promise.reject("invalid YANG module name")
		}

		return new Promise(function(resolve, reject) {
			ensureDbOpen()

			db.del(name, function(error) {
				db.close()
				if (error) {
					console.error("database error when deleting yang files")
					console.error(error)

					return reject(error)
				}

				resolve()
			})
		})
	}

	return Yang
});

var YangFactory
YangFactory = (function() {
	function YangFactory() {}

	/*
	 * function that we use to get 'uniq' user id
	 */
	function uniq_n(email, userpass_hash) {
		return email + "_" + userpass_hash
	}

	YangFactory.setup = function(leveldb_dir) {
		this.leveldb_dir = leveldb_dir
	}

	YangFactory.createYang = function (email, userpass_hash) {
		var user_id = uniq_n(email, userpass_hash)
		return Yang(this.leveldb_dir + user_id)
	}

	return YangFactory
})()

module.exports = YangFactory
