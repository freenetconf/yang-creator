/*
 * Yang Creator UI
 *
 * DOM elements are created from structure which corresponds to yang elements
 * structure.
 *
 * For best performance elements are only added/removed/drawn when needed (no
 * redrawing of whole tree).
 *
 * YANG ABNF Grammar
 * http://tools.ietf.org/html/rfc6020#page-143
 */

/* main yang statement root */
var yang_root = create_statement("module")
//var config = require('../../config.js')
console.log(public_config)

$(function() {
	$("#d_editor").html(create_dom_statement(yang_root))
	$("#d_options [data-toggle='tooltip']").each(function() {
		$(this).tooltip()
	})
})

$("#d_options").on("click", ".new-module a", function(e) {
	e.preventDefault()

	var target = $(this).text().trim().toLowerCase()

	var warning = '<div id="i_clear_scroll">Creating new ' + target + '. Current changes will be lost if not saved. Continue?</div>'

	var x = '<button id="new_warning" class="btn btn-danger btn-xs" align="left">' +
		'<span class="glyphicon glyphicon">Continue</span>'

	$w = $(warning)
	$x = $(x)
		//$f = $(f)

	show_modal("New " + target, $w, $x)

	$("#new_warning").on('click', function(e) {
		yang_root = create_statement(target)
		$("#d_editor").html(create_dom_statement(yang_root))
		hide_modal()
	})
	document.getElementById("i_clear_scroll").parentNode.style['overflow-y'] = 'auto'
})

var generate_yang_modules_table = function(modules) {
	var h = '<table class="files"><tr><th>Name</th><th>Actions</th></tr>'

	var len = modules.length
	for (var i = 0; i < len; i++) {
		var yang_file = modules[i]
		h += "<tr>"
		h += '<td data-module-name><span>' + yang_file + '</span></td>'
		h += '<td>'
		h += '	<button class="btn btn-default btn-xs btn-edit-yang-model" data-model-name="' + yang_file + '">'
		h += '		<span class="glyphicon glyphicon-ok"></span> Edit</button>'
		h += '  <button class="btn btn-danger btn-xs btn-remove-yang-model" data-model-name="' + yang_file + '">'
		h += '  	<span class="glyphicon glyphicon-remove"></span> Remove</button>'
		h += '<td>'
		h += "</tr>"
	}

	h += "</table>"
	return $(h)
}

/*
 * show user yang files saved on server
 */
$("#d_options").on("click", "#a_files", function() {
	var user_data = get_userdata()
	if (!user_data)
		return show_alert("Please login to be able to use advanced features")

	loading(1)
	Yang.get_all(user_data).then(function(modules) {
		loading(0)

		if (!modules.length) {
			return show_alert("No files saved yet")
		}

		$modal_body = generate_yang_modules_table(modules)
		var link = "/backup/" + user_data.email + "/" + user_data.pass

		var modal_footer  = '<form id="form_download" method="get" action="' + link + '">' +
			'<button type="submit" id="i_confirm_backup" class="btn btn-primary btn-xs">' +
			'<span class="glyphicon glyphicon-download"></span>Download</button>' +
			'</form>' +
			'<button id="i_reset_button" class="btn btn-danger btn-xs">' +
			'<span class="glyphicon glyphicon-trash"></span>Reset YANG database</button>'

		$modal_footer = $(modal_footer)

		show_modal("YANG modules", $modal_body, $modal_footer)
	}, function(error) {
		loading(0)
		show_alert(error.error)
		console.error(error)
	})
})

/*
 * add new element
 */

/* on click */
$("#d_editor").on("click", ".completion a._elem", function() {
	add_elem($(this))

	return false
})

/* add first element on enter pressed */
$("#d_editor").on("keyup", "#icompletion", function(e) {
	if (e.keyCode == 13) {
		add_elem($(this).parent().find("li:visible:first a._elem"))
	}

	return false
})

function add_elem(ref) {
	if (!ref)
		return

	var self = ref.find('span._name')

	// elem name we want to create i.e "import"
	var yang_statement_name = self.text().trim()
	var yang_statement_id = get_id_from_dom(self)

	if (yang_statement_name in yang.statements) {
		var yang_statement = yang.statements[yang_statement_name]

		var yang_module = yang_root.find(yang_statement_id)

		var yang_module_new = null
		if (typeof yang_statement.default === "undefined")
			yang_module_new = yang_module.add(yang_statement_name, yang_statement_name)
		else
			yang_module_new = yang_module.add(yang_statement_name, yang_statement.default)

		remove_completion_window()

		$("#d_editor").find("[data-id='" + yang_module.id + "'] ul[data-statements] > li:last").before(create_dom_statement(yang_module_new))
	}
}

/*
 * validate current yang file
 */

$("#d_options").on("click", "#a_validate", function() {
	var user_data = get_userdata()
	if (!user_data)
		return show_alert("Please login to be able to use advanced features")

	var $d_validation = $("#d_validation")

	$d_validation.html("")
	loading(1)
	generate_yang(false).then(function(response) {
		loading(0)
		console.log(response)
		$d_validation.html(response.error ? response.error : "YANG module is valid.")
	}, function(error) {
		show_alert(error)
	})

	return false
})

/*
 * export yang content to new window
 */

$("#d_options").on('click', '#a_export', function(e) {
	e.preventDefault()

	var user_data = get_userdata()
	if (!user_data)
		return show_alert("Please login to be able to use advanced features")

	loading(1)
	generate_yang(true).then(function(response) {
		loading(0)

		if (!response || !response.yang)
			return show_alert('yang generation failed: ' + response.error)

		var yang_module_name = yang_root.get_full_name()

		var file_url = '/file/' + user_data.email + "/" + user_data.pass + "/" + yang_module_name

		var modal_footer = '<a href="' + file_url + '" class="btn btn-primary btn-xs">' + '<span id="download" class="glyphicon glyphicon-download"></span> ' + 'Download</a>' +
			'<button id="bt_copy_to_clipboard" class="btn btn-primary btn-xs" data-clipboard-target="modal-body" title="requires flash plugin">' +
			'<span class="glyphicon glyphicon-transfer"></span> ' +
			'Copy to clipboard' +
			'</button>'

		if (public_config.export_to_email) {
			modal_footer += '<button id="bt_send_to_email" class="btn btn-primary btn-xs" data-yang-module-name="' + yang_module_name + '">' +
					'<span class="glyphicon glyphicon-envelope"></span>' +
					'&nbsp;Send to email ' + '(' + user_data.email + ')' +
				'</button>'
		}

		var h = $(modal_footer)

		show_modal(yang_module_name, '<pre>' + response.yang + '</pre>', h)

		$('#d_modal').on('hidden.bs.modal', function() {
			loading(0)
		})

		var clipboard = new ZeroClipboard($("#bt_copy_to_clipboard"))

		clipboard.on('ready', function() {
			clipboard.on('aftercopy', function(event) {
				show_alert('copied to clipboard')

				ZeroClipboard.destroy()
			})
		})

		clipboard.on('error', function(event) {
			console.error('ZeroClipboard error of type "' + event.name + '": ' + event.message)
			ZeroClipboard.destroy()
		})

	}, function(error) {
		show_alert(error)
	})
})

$('html').on('click', '#bt_send_to_email', function(e) {
	e.preventDefault()

	var user_data = get_userdata()
	if (!user_data)
		return show_alert("Please login to be able to use advanced features")

	console.log(user_data)
	console.log($(e.target).data('yang-module-name'))

	loading(1)
	yang_root.send_to_email(user_data).then(function(data) {
		loading(0)
		show_success("YANG module successfully sent")
	}, function(error) {
		loading(0)
		show_alert("Error sending YANG module: " + error)
		console.log(error)
	})
})

/*
 * save yang file to server
 */
$("#d_options").on("click", "#a_save", function() {
	var user_data = get_userdata()
	if (!user_data)
		return show_alert("Please login to be able to use advanced features")

	var yang_module_name = yang_root.get_full_name()
	if (!yang_module_name)
		return show_alert("No existing module")

	var yang_module_content = html_entity_decode(get_yang_from_dom($("#d_editor"), true))
	if (!yang_module_content)
		return console.error("no module content")

	loading(1)
	yang_root.save(user_data, yang_module_content).then(function(response) {
		loading(0)
		show_success("YANG model saved")
	}, function(error) {
		loading(0)
		show_alert(error)
	})
	return false
})

$("#d_options").on("click", "#a_download", function(e) {
	e.preventDefault()

	var user_data = get_userdata()
	if (!user_data)
		return show_alert("Please login to be able to use advanced features")

	var yang_module_name = yang_root.get_full_name()
	if (!yang_module_name)
		return show_alert("No existing module")

	location.href = '/yang/' + user_data.email + "/" + user_data.pass + "/" + yang_module_name
})

$("#d_options").on('change', "#import_file", function() {
	var self = $(this)
})

$("#d_options").on("click", "#bt_import", function() {
	var self = $("#import_file")

	var ext = self.val().lastIndexOf('.yang')
	if (ext === -1) {
		show_alert("Please select valid .yang file for import")
		return false
	}

	$('#f_import').ajaxForm({
		complete: function(response) {
			try {
				var yang_data = JSON.parse(response.responseJSON.data)
				yang_root = new yang.statement(yang_data.kw, yang_data.arg)
				Yang.convert_to_structure(yang_data, yang_root)

				$("#d_editor").html(create_dom_statement(yang_root))

				show_success("YANG model is imported")
			} catch (e) {
				return show_alert(e)
			}

		}
	})
})

/*
 * show completion window
 */

$("#d_editor").on("click", "a.add", function(e) {
	e.preventDefault()

	remove_completion_window()

	var self = $(this).closest('li')
	var yang_statement_id = get_id_from_dom(self)

	var yang_statement = yang_root.find(yang_statement_id)

	var w = self.width()
	var h = self.height()
	var pos = self.offset()

	var html = create_completion_window(yang_statement)
	if (!html)
		return false

	html.css({
		"position": "absolute",
		left: pos.left - html.width(),
		top: (pos.top),
		padding: "1em"
	})

	// completion filter field
	var completion_field = self.append(html).find("#icompletion")
	completion_field.focus()

	completion_field.on('keyup', function() {
		var input_text = completion_field.val().trim()

		completion_field.closest("div.completion").find('li').each(function() {
			var self = $(this)
			var matched_text = self.text().trim()

			if (matched_text.indexOf(input_text) !== -1) {
				self.show()
			} else {
				self.hide()
			}
		})
	})
})

/*
 * remove completion window
 */

/* 'Escape' key */
$(document).keyup(function(e) {
	if (e.keyCode == 27)
		remove_completion_window()

	return false
})

/* outer click */
$(document).mouseup(function(e) {
	if ($(e.target).closest("div.completion").length === 0)
		remove_completion_window()
})

/* close click */
$("#d_editor").on("click", "div.completion a.close", function(e) {
	remove_completion_window()

	return false
})


/*
 * remove substatement
 */

$("#d_editor").on("click", "a.delete", function() {
	var self = $(this)
	var id = get_id_from_dom(self)

	self.parent().remove()
	var self_root = yang_root.find(id)
	yang_root.remove(id)

	return false
})

/*
 * update editable structure nameval on change
 */

$("#d_editor").on('blur input', '.editable', function() {
	var self = $(this)
	var nameval = self.text().trim()

	var yang_statement_id = get_id_from_dom(self)
	var yang_statement = yang_root.find(yang_statement_id)

	yang_statement.nameval = nameval
})

/*
 * show/hide substatements [+] -
 */

$("#d_editor").on("mouseenter", "div.yang", function() {
	$(this).find("a.delete:first").css("visibility", "visible")
	$(this).find("a.add:last").css("visibility", "visible")
})
$("#d_editor").on("mouseleave", "div.yang", function() {
	$(this).find("a.delete:first").css("visibility", "hidden")
	$(this).find("a.add:last").css("visibility", "hidden")
})

/*
 * draging/reordering elements
 */

$("#d_editor").on("dragstart", "div.yang", function(e) {
	e.stopPropagation()

	$(this).addClass('dragstarted')
	var id = $(this).data('id')

	e.originalEvent.dataTransfer.dropEffect = 'move'

	// not used, requiered for firefox
	e.originalEvent.dataTransfer.setData('id', id)
})

$("#d_editor").on("dragenter", "div.yang", function(e) {
	e.stopPropagation()

	if (e.target !== this)
		return false

	var from_id = $("#d_editor").find(".dragstarted").data('id')
	var to_id = $(this).data('id')

	// ignore if same element
	if (from_id == to_id)
		return false

	var from_statement = yang_root.find(from_id)
	var to_statement = yang_root.find(to_id)

	// ignore if parent element is not the same
	// doesn't allow draging from child to parent and vice-versa
	if (from_statement.parent !== to_statement.parent)
		return false

	var $from = $("#d_editor").find("[data-id='" + from_id + "']")
	var $to = $("#d_editor").find("[data-id='" + to_id + "']")

	$from.insertAfter($to)

	// move elements in statement structure itself
	// parent is the same for both of them
	to_statement.parent.move(from_id, to_id)
})

$("#d_editor").on("dragover", "div.yang", function(e) {
	e.stopPropagation()
	e.originalEvent.dataTransfer.dropEffect = 'move'
	e.preventDefault()
})

$("#d_editor").on("drop", "div.yang", function(e) {
	e.stopPropagation()

	$(".yang").removeClass("dragstarted")

	return false
})

/*
 * firefox bug workaround
 * disable draggable when editing content to allow 'select all text'
 */

$("#d_editor").on("focus", "[contenteditable]", function() {
	$("[draggable]").each(function() {
		$(this).attr('draggable', false)
	})
})

$("#d_editor").on("blur", "[contenteditable]", function() {
	$("[draggable]").each(function() {
		$(this).attr('draggable', true)
	})
})

/*
 *
 * Javascript functions
 *
 * @user_data: username and userpass hash
 * @callback: called when yang is validate with response from server
 * @output: do we want server to reply us back generated yang content
 */
function generate_yang(output) {
	var user_data = get_userdata()

	if (!user_data)
		return show_alert("Please login to be able to use advanced features")

	var yang_module_name = yang_root.get_full_name()
	if (!yang_module_name)
		return console.error("no module")

	var yang_module_content = html_entity_decode(get_yang_from_dom($("#d_editor"), true))

	console.log(yang_root)

	return yang_root.validate(yang_module_content, user_data, output)
}

function remove_completion_window() {
	// remove existing completion window if exists
	$('div.completion').each(function() {
		$(this).remove()
	})
}

function create_completion_window(statement) {
	console.debug("completion for type:" + statement.type)

	try {
		yang.statements[statement.type].subs[0]
	} catch (e) {
		return console.error("no completions for type")
	}

	var h = "<div class='completion'>"
	h += "<input id='icompletion' type='text' placeholder='filter'/>"
	h += '<a href="#" class="close small" data-toggle="tooltip" data-placement="left" title="Press \'Esc\' to close">close</a>'
	h += "<ul>"

	// ["import", "include", "list"]
	var type_substatements = yang.statements[statement.type].subs

	// return specific message if no elements
	var completion_elements_count = 0
	for (var i in type_substatements) {
		// "prefix"
		var type_substatement_name = type_substatements[i]

		// don't show types which are already added and can't be added twice
		var skip_if_exists = 0
		if (typeof statement !== "undefined" &&
			typeof yang.statements[type_substatement_name] !== "undefined" &&
			typeof yang.statements[type_substatement_name].uniq !== "undefined" &&
			yang.statements[type_substatement_name].uniq) {
			for (var i = 0, len = statement.subs.length; i < len; i++) {
				if (statement.subs[i].type == type_substatement_name) {
					skip_if_exists = 1
					break
				}
			}
		}

		if (skip_if_exists)
			continue

		completion_elements_count++

		h += "<li>"
		h += "<a href='#' class='_elem'><span class='small _name'>" + type_substatement_name + "</span></a>"
		try {
			var yang_statement_elem = yang.statements[type_substatement_name]
			h += " : <span class='small property'>" + yang_statement_elem.desc + "</span>"
			h += "<a href='" + yang_statement_elem.ref + "' target='_blank' class='small property'> (more)</a>"
		} catch (e) {

		}

		h += "</li>"
	}

	if (!completion_elements_count)
		h += "<span class='small'>All possible elements added</span>"
	else
		h += "</ul></div>"

	var $h = $(h)
	$h.find('.close').tooltip()

	return $h
}

/*
 * http://tools.ietf.org/html/rfc6020#page-143
 *
 * general structure:
 *
 * 'keyword' 'identifier' {
		'keyword' 'identifier'
		'keyword' 'identifier'
		'keyword' 'identifier' {
			'keyword' identifier
			...
		}
 * }
 *
 * @module: yang statement module object
 */

function create_dom_statement(m) {
	var h = ""

	// 'keyword' 'identifier'
	h += "<div draggable='true' class='yang' data-id='" + m.id + "'>"

	// don't show removal on root module
	m.parent && (h += "<a class='delete invisible' href='#' title='remove'>-</a> ")

	h += "<span class='identifier collectable'>" + m.type + "</span>"
	h += ' "<span contenteditable="true" class="nameval collectable editable">' + m.nameval + '</span>"'

	// there are no possible substatements close tag

	if (typeof yang.statements[m.type] == "undefined") {
		console.error("statement not implemented:" + m.type + " " + m.nameval)
		return h += "<span class='collectable break'>;</span></div>"
	}

	if (typeof yang.statements[m.type].subs == "undefined" || !yang.statements[m.type].subs.length) {
		return h += "<span class='collectable break'>;</span></div>"
	}

	// process substatements

	h += " <span class='collectable break'>{</span>"
	h += "<div style='margin-left:1em'>"
	h += "<ul data-statements class='sortable'>"

	if (m.subs)
		for (var sub in m.subs) {
			var prop = m.subs[sub]

			h += "<li class='property'>"
			h += create_dom_statement(prop)
			h += "</li>"
		}

	h += "<li>"
	h += "<a href='#' class='add invisible' data-toggle='tooltip' title='" + m.type + " " + m.nameval + "'>[+]</a>"
	h += "</li>"
	h += "</ul>"
	h += "<span class='collectable break'>}</span>"
	h += "</div>"

	return h
}

function get_id_from_dom(elem) {
	return elem.closest('div.yang').data('id')
}

function get_yang_from_dom(elem, pretty) {
	var yang_string = ''
	elem.find('.collectable').each(function() {
		var self = $(this)
		var raw_text = self.html().trim()

		var br = pretty ? (self.hasClass('break') ? '\n' : ' ') : ' '

		if (raw_text)
			yang_string += self.hasClass('nameval') ? '"' + raw_text + '"' : raw_text

		yang_string += br
	})

	return yang_string
}

function create_statement(statement) {
	statement = statement || "module"

	var yang_root = new yang.statement(statement, "example-" + statement)
	if (statement == "module") {
		yang_root.add("namespace", "urn:ietf:params:xml:ns:yang:example")
		yang_root.add("prefix", "ie")
	} else if (statement == "submodule") {
		var e = yang_root.add("belongs-to", "example-module")
		e.add("prefix", "ie")
	}

	yang_root.add("organization", "organization")
	yang_root.add("description", "example yang module")
	yang_root.add("contact", "support@freenetconf.org")
	var e = yang_root.add("revision", new Date().toISOString().slice(0, 10))
	e.add("reference", "https://github.com/freenetconf/yang-creator")

	e = yang_root.add("container", "example")
	e.add("config", true)

	return yang_root
}

/*
 * yangs list bindings
 */

// active in yang files list
$('html').on('click', '.btn-edit-yang-model', function(e) {
	var self = $(this)
	var user_data = get_userdata()

	var yang_module_name = $(e.target).data('model-name')

	Yang.get_module(yang_module_name, user_data).then(function(statement){
		yang_root = statement

		$("#d_editor").html(create_dom_statement(yang_root))
		hide_modal()
	}, function(error) {
		show_alert(error)
	})
})

// active in yang files list
$('html').on('click', '.btn-remove-yang-model', function(e) {
	var self = $(this)

	var yang_module_name = $(e.target).data('model-name')

	var warning = '<div id="remove_warning">' + "This can not be reverted. Are you sure you want to remove?" + '</div>'

	var x = '<button id="i_confirm_remove" class="btn btn-danger btn-xs" align="left">\
	<span class="glyphicon glyphicon-trash"></span>Remove YANG model</button>'

	$w = $(warning)
	$x = $(x)

	show_modal("Remove YANG model <i>" + yang_module_name + '</i>', $w, $x)
	document.getElementById("remove_warning").parentNode.style['overflow-y'] = 'auto'

	$('#d_modal').on('hidden.bs.modal', function() {
		if (document.getElementById('remove_warning')) {
			document.getElementById("d_options").childNodes[1].childNodes[1].click()
		}
	})

	$('#i_confirm_remove').on('click', function() {
		var user_data = get_userdata()
		Yang.delete(yang_module_name, user_data).then(function(result) {
			console.log(result)
			show_success('Yang model "' + yang_module_name + '" removed.')
			document.getElementById("d_options").childNodes[1].childNodes[1].click()
			var $tr = self.closest('tr')
			var $table = $tr.closest('table')
			if ($table.find('tr').length == 2) {
				$table.remove()
				hide_modal()
			} else {
				$tr.remove()
			}
		}, function(error) {
			console.log('error')
		})
	})
})

$('html').on('click', '#i_reset_button', function() {
	var warning = '<div id="reset_warning">This action will remove all your YANG models \
	and restore to default. This action can not be reverted. Are you sure?</div>'
	var user_data = get_userdata()

	var link = "/backup/" + user_data.email + "/" + user_data.pass

	var x = '<form id="form_download" method="get" action="' + link + '">' +
		'<button type="submit" id="i_confirm_backup" class="btn btn-primary btn-xs">' +
		'<span class="glyphicon glyphicon-download"></span>Download</button>' +
		'</form>' +
		'<button id="i_confirm_reset" class="btn btn-danger btn-xs">' +
		'<span class="glyphicon glyphicon-trash"></span>Reset YANG database</button>'


	$w = $(warning)
	$x = $(x)
		//$f = $(f)

	show_modal("Reset YANG database", $w, $x)
	document.getElementById("reset_warning").parentNode.style['overflow-y'] = 'auto'

	$('#i_confirm_reset').on('click', function() {
		Yang.reset_database(user_data).then(function(response) {
			hide_modal()
		}, function(error) {
			console.log(error)
			show_alert(error)
		})
	})
})
