var Yang = function()
{
	// global id counter for modules
	this._ID = 1

	// main statement object
	var statement = this.statement = function (type, nameval)
	{
		this.type = type
		this.nameval = nameval
		this.id = yang._ID++
		this.parent = 0

		this.subs = []
	}

	// add new substatement
	//@type: statement type
	//@nameval: statement name/value
	//@id: optional, substatement id after which to add element
	statement.prototype.add = function(type, nameval, id)
	{
		if (typeof type == "undefined" || typeof nameval == "undefined")
		{
			return console.error("[statement:add] error: nameval="+nameval+" type="+type)
		}

		var elem = new yang.statement(type, nameval)
		elem.parent = this

		if (id)
		{
			for (var i = 0, len = this.subs.length; i < len; i++)
			{
				if (this.subs[i].id == id)
				{
					this.subs.splice(i+1, 0, elem)
					break
				}
			}
		}
		else
		{
			this.subs.push(elem)
		}

		return elem
	}

	// remove substatement from this statement by id
	statement.prototype.remove = function(id)
	{
		if (!id || this.id == id)
		{
			return
		}

		for (var i = 0, len = this.subs.length; i < len; i++)
		{
			if (this.subs[i].id == id)
				return this.subs.splice(i,1)

			this.subs[i].remove(id)
		}
	}

	// (recursive) find and return (sub)statement by id
	statement.prototype.find = function(id)
	{
		if (!id)
		{
			return console.error("[statement:find] error: id="+id)
		}

		if (this.id == id)
			return this

		for (var i = 0, len = this.subs.length; i < len; i++)
		{
			var found = this.subs[i].find(id)
			if (found)
				return found
		}

		return 0
	}

	// move subelement from index to index by from/to subelement id
	statement.prototype.move = function(from_id, to_id)
	{
		var from_index = to_index = -1
		for (var i = 0, len = this.subs.length; i < len; i++)
		{
			if (this.subs[i].id == from_id)
			{
				from_index = i
			}
			else
			if (this.subs[i].id == to_id)
			{
				to_index = i
			}
		}

		if (to_index == -1 || from_index == -1)
			return

		this.subs.splice(to_index, 0, this.subs.splice(from_index, 1)[0])
	}

	statement.prototype.get_full_name = function() {
		var yang_module_name = this.nameval

		if (!yang_module_name)
			return 0

		for (var i = 0, len = this.subs.length; i < len; i++) {
			var submodule = this.subs[i]
			if (submodule.type == "revision") {
				yang_module_name += "@" + submodule.nameval
				break
			}
		}

		yang_module_name += ".yang"

		return yang_module_name
	}

	statement.prototype.save = function(user_data, yang_module_content) {
		var yang_module_name = this.get_full_name()
		if (!yang_module_name)
			return Promise.reject("No module")

		return new Promise(function(resolve, reject) {
			$.ajax({
				type: 'PUT',
				url: '/yang/' + user_data.email + "/" + user_data.pass + "/" + yang_module_name,
				data: {
					"yang_module_content": yang_module_content
				}
			}).then(function(response) {
				if (response.error) {
					return reject(response.error)
				}
				resolve(response)
			}, reject)
		})
	}

	statement.prototype.send_to_email = function(user_data) {
		var yang_module_name = this.get_full_name()
		if (!yang_module_name)
			return Promise.reject("No module")

		return new Promise(function(resolve, reject) {
			$.ajax({
				type: 'POST',
				url: '/email/' + yang_module_name,
				dataType: 'json',
				data: {
					"userpass_hash": user_data.pass,
					"email": user_data.email
				},
			}).then(function(response) {
				if (response.error)
					return reject(response.error)

				if (response.data.error) {
					return reject(remove_server_path(response.data.error))
				}
				return resolve(response.data)
			}, reject)
		})
	}

	statement.prototype.validate = function(yang_module_content, user_data, output) {
		var yang_module_name = this.get_full_name()
		if (!yang_module_name)
			return Promise.reject("No module")

		if (output == null) {
			output = false
		}

		return new Promise(function(resolve, reject) {
			$.ajax({
				type: 'POST',
				url: '/yang_validate/' + output,
				dataType: 'json',
				data: {
					"userpass_hash": user_data.pass,
					"email": user_data.email,
					"yang_module_name": yang_module_name,
					"yang_module_content": yang_module_content
				},
			}).then(function(response) {
				if (response.error)
					return reject(response.error)

				if (response.data.error) {
					response.data.error = remove_server_path(response.data.error)
					return reject(response.data.error)
				}
				return resolve(response.data)
			}, reject)
		})
	}

	var statements = this.statements =
	{

		"type":
		{
			desc: "YANG type",
			ref: "http://tools.ietf.org/html/rfc6020#page-18",
			uniq:0,
			subs:
			[
				"bit",
				"enum",
				"length",
				"path",
				"pattern",
				"range",
				"require-instance",
				"type"
			]
		},

		"config":
		{
			default: false,
			desc: "configuration or state data",
			ref: "http://tools.ietf.org/html/rfc6020#page-105",
			uniq:1
		},

		"status":
		{
			default: "current",
			desc: "definition status",
			ref: "http://tools.ietf.org/html/rfc6020#page-105",
			uniq:1
		},

		"description":
		{
			desc: "description of this definition",
			ref: "http://tools.ietf.org/html/rfc6020#page-106",
			uniq:1
		},

		"reference":
		{
			desc: "reference to this definition",
			ref: "http://tools.ietf.org/html/rfc6020#page-106",
			uniq:1
		},

		"when":
		{
			desc: "make data definition conditional",
			ref: "http://tools.ietf.org/html/rfc6020#page-107",
			uniq:1
		},

		"module":
		{
			desc:"defines module",
			ref: "tools.ietf.org/html/rfc6020#page-38",
			uniq:1,
			subs:
			[
				"anyxml",
				"augment",
				"choice",
				"contact",
				"container",
				"description",
				"deviation",
				"extension",
				"feature",
				"grouping",
				"identity",
				"import",
				"include",
				"leaf",
				"leaf-list",
				"list",
				"namespace",
				"notification",
				"organization",
				"prefix",
				"reference",
				"revision",
				"rpc",
				"typedef",
				"uses",
				"yang-version"
			]
		},

		"yang-version":
		{
			desc: "specifies which version of the YANG language was used in developing the module",
			ref: "http://tools.ietf.org/html/rfc6020#page-40",
			uniq:1
		},

		"namespace":
		{
			desc: "defines the XML namespace that all identifiers defined by the module are qualified by",
			ref: "http://tools.ietf.org/html/rfc6020#page-41",
			uniq:1
		},

		"prefix":
		{
			desc: "define the prefix associated with the module and its namespace",
			ref: "http://tools.ietf.org/html/rfc6020#page-41",
			uniq:1
		},

		"import":
		{
			desc: "makes definitions from one module available inside another module or submodule",
			ref: "http://tools.ietf.org/html/rfc6020#page-42",
			uniq:0,
			subs:
			[
				"prefix",
				"revision-date"
			]
		},

		"revision-date":
		{
			default: '2014-12-12',
			desc: "specify the exact version of the module to import",
			ref: "http://tools.ietf.org/html/rfc6020#page-41",
			uniq:1
		},

		"include":
		{
			desc: "make content from a submodule available to that submodule's parent module, or to another submodule of that parent module",
			ref: "http://tools.ietf.org/html/rfc6020#page-42",
			uniq:0,
			subs:
			[
				"revision-date"
			]
		},

		"organization":
		{
			desc: "defines the party responsible for this module",
			ref: "http://tools.ietf.org/html/rfc6020#page-42",
			uniq:1
		},

		"contact":
		{
			desc: "provides contact information for this module",
			ref: "http://tools.ietf.org/html/rfc6020#page-42",
			uniq:1
		},

		"revision":
		{
			desc: "specifies the editorial revision history of the module, including the initial revision",
			ref: "http://tools.ietf.org/html/rfc6020#page-43",
			uniq:1,
			subs:
			[
				"description",
				"reference"
			]
		},

		"submodule":
		{
			desc: "split modules in submodules",
			ref: "http://tools.ietf.org/html/rfc6020#page-45",
			uniq:0,
			subs:
			[
				"anyxml",
				"augment",
				"belongs-to",
				"choice",
				"contact",
				"container",
				"description",
				"deviation",
				"extension",
				"feature",
				"grouping",
				"identity",
				"import",
				"include",
				"leaf",
				"leaf-list",
				"list",
				"notification",
				"organization",
				"reference",
				"revision",
				"rpc",
				"typedef",
				"uses",
				"yang-version"
			]
		},

		"belongs-to":
		{
			desc: "specifies the module to which the submodule belongs",
			ref: "http://tools.ietf.org/html/rfc6020#page-47",
			uniq:1,
			subs:
			[
				"prefix"
			]
		},

		"typedef":
		{
			desc: "defines a new type that may be used locally in the module, in modules or submodules which include it, and by other modules that import from it",
			ref: "http://tools.ietf.org/html/rfc6020#page-48",
			uniq:1,
			subs:
			[
				"default",
				"description",
				"reference",
				"status",
				"type",
				"units"
			]
		},

		"units":
		{
			desc: "textual definition of the units associated with the type",
			ref: "http://tools.ietf.org/html/rfc6020#page-49",
			uniq:1
		},

		"container":
		{
			desc: "defines an interior data node in the schema tree",
			ref: "http://tools.ietf.org/html/rfc6020#page-50",
			uniq:0,
			subs:
			[
				"anyxml",
				"choice",
				"config",
				"container",
				"description",
				"grouping",
				"if-feature",
				"leaf",
				"leaf-list",
				"list",
				"must",
				"presence",
				"reference",
				"status",
				"typedef",
				"uses",
				"when"
			]
		},

		"must":
		{
			desc:"declare a constraint on valid data",
			ref: "http://tools.ietf.org/html/rfc6020#page-53",
			uniq:1,
			subs:
			[
				"description",
				"error-app-tag",
				"error-message",
				"reference",
			]
		},

		"error-message":
		{
			desc:"passed as an error-message tag in the rpc-error",
			ref: "http://tools.ietf.org/html/rfc6020#page-54",
			uniq:1
		},

		"error-app-tag":
		{
			desc:"passed as an error-app-tag in the rpc-error",
			ref: "http://tools.ietf.org/html/rfc6020#page-54",
			uniq:1
		},

		"presence":
		{
			desc:"assigns a meaning to the presence of a container in the data tree",
			ref: "http://tools.ietf.org/html/rfc6020#page-55",
			uniq:1
		},

		"leaf":
		{
			desc: "defines leaf node",
			ref: "http://tools.ietf.org/html/rfc6020#page-58",
			subs:
			[
				"config",
				"default",
				"description",
				"if-feature",
				"mandatory",
				"must",
				"reference",
				"status",
				"type",
				"units",
				"when"
			]
		},

		"default":
		{
			desc: "defines default leaf node value",
			ref: "http://tools.ietf.org/html/rfc6020#page-58",
			uniq:1
		},

		"mandatory":
		{
			default: false,
			desc: "defines default leaf node value",
			ref: "http://tools.ietf.org/html/rfc6020#page-58",
			uniq:1
		},

		"leaf-list":
		{
			desc: "define a simple scalar variable of a particular type",
			ref: "http://tools.ietf.org/html/rfc6020#page-61",
			uniq:0,
			subs:
			[
				"config",
				"description",
				"if-feature",
				"max-elements",
				"min-elements",
				"must",
				"ordered-by",
				"reference",
				"status",
				"type",
				"units",
				"when"
			]
		},

		"min-elements":
		{
			desc: "constraint on valid list entries",
			ref: "http://tools.ietf.org/html/rfc6020#page-62",
			uniq:1
		},

		"max-elements":
		{
			desc: "constraint on valid list entries",
			ref: "http://tools.ietf.org/html/rfc6020#page-62",
			uniq:1
		},

		"ordered-by":
		{
			default: "system",
			desc: "defines whether the order of entries within a list are determined by the user or the system",
			ref: "http://tools.ietf.org/html/rfc6020#page-63",
			uniq:1
		},

		"list":
		{
			desc: "define an interior data node in the schema tree",
			ref: "http://tools.ietf.org/html/rfc6020#page-66",
			uniq:0,
			subs:
			[
				"anyxml",
				"choice",
				"config",
				"container",
				"description",
				"grouping",
				"if-feature",
				"key",
				"leaf",
				"leaf-list",
				"list",
				"max-elements",
				"min-elements",
				"must",
				"ordered-by",
				"reference",
				"status",
				"typedef",
				"unique",
				"uses",
				"when"
			]
		},

		"key":
		{
			desc:"MUST be present if the list represents configuration. Space-separated list of leaf identifiers of this list.",
			ref: "http://tools.ietf.org/html/rfc6020#page-67",
			uniq:1
		},

		"unique":
		{
			desc:"Put constraints on valid list entries. It takes as an argument a string that contains a space-separated list of schema node identifiers.",
			ref: "http://tools.ietf.org/html/rfc6020#page-69"
		},

		"choice":
		{
			desc:"Put constraints on valid list entries. It takes as an argument a string that contains a space-separated list of schema node identifiers.",
			ref: "http://tools.ietf.org/html/rfc6020#page-69",
			subs:
			[
				"anyxml",
				"case",
				"config",
				"container",
				"default",
				"description",
				"if-feature",
				"leaf",
				"leaf-list",
				"list",
				"mandatory",
				"reference",
				"status",
				"when"
			]
		},

		"case":
		{
			desc:"Define branches of the choice. It takes as an argument an identifier, followed by a block of substatements that holds detailed case information.",
			ref: "http://tools.ietf.org/html/rfc6020#page-76",
			subs:
			[
				"anyxml",
				"choice",
				"container",
				"description",
				"if-feature",
				"leaf",
				"leaf-list",
				"list",
				"reference",
				"status",
				"uses",
				"when"
			]
		},

		"mandatory":
		{
			default: "true",
			desc: "Takes as an argument the string 'true' or 'false', and puts a constraint on valid data.",
			ref: "http://tools.ietf.org/html/rfc6020#page-79"
		},

		"anyxml":
		{
			desc: "Defines an interior node in the schema tree. It takes one argument, which is an identifier, followed by a block of substatements that holds detailed anyxml information.",
			ref: "http://tools.ietf.org/html/rfc6020#page-80",
			subs:
			[
				"config",
				"description",
				"if-feature",
				"mandatory",
				"must",
				"reference",
				"status",
				"when"
			]
		},

		"grouping":
		{
			desc: "Define a reusable block of nodes, which may be used locally in the module, in modules that include it, and by other modules that import from it",
			ref: "http://tools.ietf.org/html/rfc6020#page-82",
			subs:
			[
				"anyxml",
				"choice",
				"container",
				"description",
				"grouping",
				"leaf",
				"leaf-list",
				"list",
				"reference",
				"status",
				"typedef",
				"uses"
			]
		},

		"uses":
		{
			desc: "Reference a 'grouping' definition. It takes one argument, which is the name of the grouping.",
			ref: "http://tools.ietf.org/html/rfc6020#page-84",
			subs:
			[
				"augment",
				"description",
				"if-feature",
				"refine",
				"reference",
				"status",
				"when"
			]
		},

		"refine":
		{
			desc: "Some of the properties of each node in the grouping can be refined with the 'refine' statement. The argument is a string that identifies a node in the grouping.",
			ref: "http://tools.ietf.org/html/rfc6020#page-84",
		},

		"rpc":
		{
			desc: "Define a NETCONF RPC operation.  It takes one argument, which is an identifier, followed by a block of substatements that holds detailed rpc information.",
			ref: "http://tools.ietf.org/html/rfc6020#page-86",
			subs:
			[
				"description",
				"grouping",
				"if-feature",
				"input",
				"output",
				"reference",
				"status",
				"typedef"
			]
		},

		"input":
		{
			desc: "optional, is used to define input parameters to the RPC operation.  It does not take an argument.",
			ref: "http://tools.ietf.org/html/rfc6020#page-88",
			subs:
			[
				"anyxml",
				"choice",
				"container",
				"grouping",
				"leaf",
				"leaf-list",
				"list",
				"typedef",
				"uses"
			]
		},

		"output":
		{
			desc: "optional, is used to define output parameters to the RPC operation.  It does not take an argument.",
			ref: "http://tools.ietf.org/html/rfc6020#page-89",
			subs:
			[
				"anyxml",
				"choice",
				"container",
				"grouping",
				"leaf",
				"leaf-list",
				"list",
				"typedef",
				"uses"
			]
		},

		"notification":
		{
			desc: "define a NETCONF notification.",
			ref: "http://tools.ietf.org/html/rfc6020#page-91",
			subs:
			[
				"anyxml",
				"choice",
				"container",
				"description",
				"grouping",
				"if-feature",
				"leaf",
				"leaf-list",
				"list",
				"reference",
				"status",
				"typedef",
				"uses"
			]
		},

		"augment":
		{
			desc: "allows a module or submodule to add to the schema tree defined in an external module, or the current module and its submodules, and to add to the nodes from a grouping in a 'uses' statement.",
			ref: "https://tools.ietf.org/html/rfc6020#page-93",
			subs:
			[
				"anyxml",
				"case",
				"choice",
				"container",
				"description",
				"if-feature",
				"leaf",
				"leaf-list",
				"list",
				"reference",
				"status",
				"uses",
				"when",
			]
		},

		"identity":
		{
			desc: "used to define a new globally unique, abstract, and untyped identity.",
			ref: "https://tools.ietf.org/html/rfc6020#page-97",
			subs:
			[
				"base",
				"description",
				"reference",
				"status"
			]
		},

		"base":
		{
			desc: "takes as an argument a string that is the name of an existing identity, from which the new identity is derived.",
			ref: "https://tools.ietf.org/html/rfc6020#page-97"
		},

		"extension":
		{
			desc: "allows the definition of new statements within the YANG language.",
			ref: "https://tools.ietf.org/html/rfc6020#page-98",
			subs:
			[
				"argument",
				"description",
				"reference",
				"status"
			]
		},

		"argument":
		{
			desc: "allows the definition of new statements within the YANG language.",
			ref: "https://tools.ietf.org/html/rfc6020#page-99",
			subs:
			[
				"yin-element"
			]
		},

		"yin-element":
		{
			default: "true",
			desc: "allows the definition of new statements within the YANG language.",
			ref: "https://tools.ietf.org/html/rfc6020#page-99"
		},

		"feature":
		{
			desc: "define a mechanism by which portions of the schema are marked as conditional.",
			ref: "https://tools.ietf.org/html/rfc6020#page-100",
			subs:
			[
				"description",
				"if-feature",
				"status",
				"reference"
			]
		},

		"if-feature":
		{
			desc: "makes its parent statement conditional. The argument is the name of a feature, as defined by a 'feature' statement.",
			ref: "https://tools.ietf.org/html/rfc6020#page-102"
		},

		"deviation":
		{
			desc: "defines a hierarchy of a module that the device does not implement faithfully.",
			ref: "https://tools.ietf.org/html/rfc6020#page-103",
			subs:
			[
				"description",
				"deviate",
				"reference"
			]
		},

		"deviate":
		{
			desc: "defines how the device's implementation of the target node deviates from its original definition.",
			ref: "https://tools.ietf.org/html/rfc6020#page-103",
			subs:
			[
				"config",
				"default",
				"mandatory",
				"max-elements",
				"min-elements",
				"must",
				"type",
				"unique",
				"units"
			]
		},

		"int8":
		{
			desc: "represents integer values between -128 and 127, inclusively.",
			ref: "https://tools.ietf.org/html/rfc6020#page-112"
		},

		"int16":
		{
			desc: "represents integer values between -32768 and 32767, inclusively.",
			ref: "https://tools.ietf.org/html/rfc6020#page-112"
		},

		"int32":
		{
			desc: "represents integer values between -2147483648 and 2147483647, inclusively.",
			ref: "https://tools.ietf.org/html/rfc6020#page-112"
		},

		"int64":
		{
			desc: "represents integer values between -9223372036854775808 and 9223372036854775807, inclusively.",
			ref: "https://tools.ietf.org/html/rfc6020#page-112"
		},

		"uint8":
		{
			desc: "represents integer values between 0 and 255, inclusively.",
			ref: "https://tools.ietf.org/html/rfc6020#page-112"
		},

		"uint16":
		{
			desc: "represents integer values between 0 and 65535, inclusively.",
			ref: "https://tools.ietf.org/html/rfc6020#page-112"
		},

		"uint32":
		{
			desc: "represents integer values between 0 and 4294967295, inclusively.",
			ref: "https://tools.ietf.org/html/rfc6020#page-112"
		},

		"uint64":
		{
			desc: "represents integer values between 0 and 18446744073709551615, inclusively.",
			ref: "https://tools.ietf.org/html/rfc6020#page-112"
		},

		"range":
		{
			desc: "used to restrict integer and decimal built-in types, or types derived from those",
			ref: "https://tools.ietf.org/html/rfc6020#page-114",
			subs:
			[
				"description",
				"error-app-tag",
				"error-message",
				"reference"
			]
		},

		"decimal64":
		{
			desc: "represents a subset of the real numbers, which can be represented by decimal numerals.",
			ref: "https://tools.ietf.org/html/rfc6020#page-114"
		},

		"fraction-digits":
		{
			desc: "represents a subset of the real numbers, which can be represented by decimal numerals.",
			ref: "https://tools.ietf.org/html/rfc6020#page-114"
		},

		"string":
		{
			desc: "represents human-readable strings in YANG",
			ref: "https://tools.ietf.org/html/rfc6020#page-116"
		},

		"length":
		{
			desc: "optional substatement to the 'type' statement, takes as an argument a length expression string",
			ref: "https://tools.ietf.org/html/rfc6020#page-116",
			subs:
			[
				"description",
				"error-app-tag",
				"error-message",
				"reference"
			]
		},

		"pattern":
		{
			desc:"optional substatement to the 'type' statement, takes as an argument a regular expression string",
			ref: "https://tools.ietf.org/html/rfc6020#page-119",
			subs:
			[
				"description",
				"error-app-tag",
				"error-message",
				"reference"
			]
		},

		"boolean":
		{
			desc: "represents a boolean value.",
			ref: "https://tools.ietf.org/html/rfc6020#page-120"
		},

		"enumeration":
		{
			desc: "represents values from a set of assigned names.",
			ref: "https://tools.ietf.org/html/rfc6020#page-120"
		},

		"enum":
		{
			desc: "It is repeatedly used to specify each assigned name of an enumeration type",
			ref: "https://tools.ietf.org/html/rfc6020#page-120",
			subs:
			[
			 "description",
             "reference",
             "status",
             "value"
			]
		},

		"value":
		{
			desc: "used to associate an integer value with the assigned name for the enum",
			ref: "https://tools.ietf.org/html/rfc6020#page-121"
		},

		"bits":
		{
			desc: "represents a bit set.",
			ref: "https://tools.ietf.org/html/rfc6020#page-121"
		},

		"bit":
		{
			desc: "repeatedly used to specify each assigned named bit of a bits type",
			ref: "https://tools.ietf.org/html/rfc6020#page-122",
			subs:
			[
			 "description",
             "reference",
             "status",
             "position"
			]
		},

		"position":
		{
			desc: "takes as an argument a non-negative integer value that specifies the bit's position within a hypothetical bit field.",
			ref: "https://tools.ietf.org/html/rfc6020#page-123"
		},

		"binary":
		{
			desc: "represents any binary data, i.e., a sequence of octets.",
			ref: "https://tools.ietf.org/html/rfc6020#page-123"
		},

		"leafref":
		{
			desc: "used to reference a particular leaf instance in the data tree.",
			ref: "https://tools.ietf.org/html/rfc6020#page-124"
		},

		"path":
		{
			desc: "takes as an argument a string that MUST refer to a leaf or leaf-list node.",
			ref: "https://tools.ietf.org/html/rfc6020#page-124"
		},

		"identityref":
		{
			desc: "used to reference an existing identity",
			ref: "https://tools.ietf.org/html/rfc6020#page-125"
		},

		"empty":
		{
			desc: "represents a leaf that does not have any value, it conveys information by its presence or absence.",
			ref: "https://tools.ietf.org/html/rfc6020#page-131"
		},

		"union":
		{
			desc: "represents a value that corresponds to one of its member types.",
			ref: "https://tools.ietf.org/html/rfc6020#page-132"
		},

		"instance-identifier":
		{
			desc: "used to uniquely identify a particular instance node in the data tree.",
			ref: "https://tools.ietf.org/html/rfc6020#page-133"
		},

		"require-instance":
		{
			default: "false",
			desc: "means that the instance being referred MUST or MAY exist in valid data.",
			ref: "https://tools.ietf.org/html/rfc6020#page-133"
		}

	}
}

var yang = new Yang()

Yang.get_all = function(user_data) {
	return new Promise(function(resolve, reject) {
		$.getJSON('/yang/' + user_data.email + "/" + user_data.pass).then(function(response) {
			if (!response || response.error || !response.data || !Array.isArray(response.data)) {
				return reject(response)
			}
			return resolve(response.data)
		}, reject)
	})
}

Yang.delete = function(yang_module_name, user_data) {
	return new Promise(function(resolve, reject){
		return $.ajax({
			type: 'DELETE',
			url: '/yang/' + user_data.email + "/" + user_data.pass + "/" + yang_module_name,
			dataType: 'json'
		}).then(function(result) {
			console.log(result)
			if (result.error) {
				return reject(result)
			}
			return resolve(result)
		}, reject)
	})
}

/*
 * convert parsed yang data to our structure
 */
Yang.convert_to_structure = function(yang_data, yang_root) {
	for (var i = 0, len = yang_data.substmts.length; i < len; i++) {
		var substatement = yang_data.substmts[i]
		var e = yang_root.add(substatement.kw, htmlentities(substatement.arg))
		Yang.convert_to_structure(substatement, e)
	}
}

Yang.get_module = function(yang_module_name, user_data) {
	var yang_path = '/yang/' + user_data.email + "/" + user_data.pass + "/" + yang_module_name

	return new Promise(function(resolve, reject) {
		$.getJSON(yang_path).then(function(response) {
			if (!response || response.error || !response.data)
				return reject("unable to fetch server data")

			try {
				var yang_data = JSON.parse(response.data)
				var statement = new yang.statement(yang_data.kw, yang_data.arg)
				Yang.convert_to_structure(yang_data, statement)

				return resolve(statement)
			} catch (e) {
				return reject(e)
			}
		}, reject)
	})
}

Yang.reset_database = function(user_data) {
	return $.ajax({
		type: 'GET',
		url: '/yang/reset/' + user_data.email + "/" + user_data.pass,
		dataType: 'json'
	})
}
