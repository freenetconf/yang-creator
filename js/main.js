var spinner = "<img src='img/spinner.gif' alt='loading' />"

function loading(show) {
	$("#i_spinner").css('visibility', (show == 1) ? 'visible' : 'hidden')
}

function validateEmail(email) {
	var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
	return re.test(email);
}

$(function() {
	// open last opened link or open channels if nothing requested
	if (location.hash)
		process_action(location.hash)
	else
		location.hash = "#editor"

	// open when hash changes - click mostly
	$(window).on("hashchange", function() {
		var action = location.hash
		process_action(action)
	})

	function set_login_welcome() {
		var user_data = get_userdata()
		if (user_data) {
			$("#f_login").hide()
			$("#d_welcome").find("#s_msg").text(user_data.email).end().show()
		} else {
			$("#d_welcome").hide()
			$("#f_login").show()
		}
	}
	set_login_welcome()

	$("#f_login").submit(function() {
		var self = $(this)
		var user_pass = self.find("#i_userpass").val().trim()
		var user_pass_hash = Sha256.hash(user_pass)
		var email = self.find("#i_email").val().trim()

		if (!validateEmail(email))
			return show_alert("Invalid email")

		if (user_pass.length < 6)
			return show_alert("Password is too short")

		$.ajax({
			type: 'POST',
			url: '/register/' + email + "/" + user_pass_hash,
			dataType: 'json'
		})

		$.jStorage.set('yanger_pass_hash', user_pass_hash)
		$.jStorage.set('yanger_email', email)

		set_login_welcome()

		return false
	})

	$("#d_welcome").on("click", "#a_logout", function() {
		console.debug("logout")
		$.jStorage.deleteKey('yanger_pass_hash')
		$.jStorage.deleteKey('yanger_pass_email')

		set_login_welcome()
	})

	$(document).on('change', '.btn-file :file', function() {
		var input = $(this)
		var numFiles = input.get(0).files ? input.get(0).files.length : 1
		var label = input.val().replace(/\\/g, '/').replace(/.*\//, '')
		input.trigger('fileselect', [numFiles, label])
	})

	$('.btn-file :file').on('fileselect', function(event, numFiles, label) {

		var input = $(this).parents('.input-group').find(':text')
		var log = numFiles > 1 ? numFiles + ' files selected' : label

		input.length && input.val(log)
	})
})

function process_action(action) {
	if (!action)
		return

	action = $.trim(action.replace('#', ''))
}

function show_success(msg) {
	$("<span>" + msg + " </span>").csInfo()
	loading(0)
}

function show_alert(msg) {
	$("<span>" + msg + " </span>").csInfo('alert alert-danger')
	loading(0)
}

function show_modal(title, html, footer) {
	title = title || ''
	html = html || ''
	footer = footer || ''

	var ref = $("#d_modal")
	ref.find('.modal-title').html(title)
	ref.find(".modal-body").html(html)

	var $footer = ref.find(".modal-footer")
	footer && $footer.html(footer).show() || $footer.hide()

	ref.modal()
}

function hide_modal() {
	$("#d_modal").modal('hide')
}

function get_userdata() {
	var yang_userpass_hash = $.jStorage.get("yanger_pass_hash")
	var yang_email = $.jStorage.get("yanger_email")

	console.debug("email:" + yang_email)

	if (!yang_userpass_hash || !yang_email)
		return 0
	else
		return {
			"pass": yang_userpass_hash,
			"email": yang_email
		}
}

(function($) {
	$.fn.outerHTML = function() {
		$t = $(this);
		if ("outerHTML" in $t[0]) return $t[0].outerHTML;
		else return $t.clone().wrap('<p>').parent().html();
	}

	/* csDefault */
	var csInfoID = 0
	$.fn.csInfo = function(arg1, arg2) {
		++csInfoID
		var bkgclass = "alert alert-info"
		var duration = 2500

		if (arg1 && arg2)(bkgclass = arg1) && (duration = arg2)
		else arg1 && (isNaN(arg1) && (bkgclass = arg1) || (duration = arg1))

		var msg = $(this).outerHTML()

		var html = $('<div id="csInfoDiv' + csInfoID + '"><div id="csInfoInner" class="' + bkgclass + ' small">' + msg + '</div></div>')

		$div = $("body").append(html).find('div[id^="csInfoDiv"]')
		$div.addClass("csInfoDiv")
		$div.slideDown("fast").delay(duration).slideUp("fast", function() {
			$(this).remove()
		})
		$div.hover(function() {
			$(this).css("opacity", "0.5")
		}, function() {
			$(this).css("opacity", "1")
		})
	}
})(jQuery)

function htmlentities(string, quote_style, charset, double_encode) {
	var hash_map = this.get_html_translation_table('HTML_ENTITIES', quote_style)
	var symbol = ''
	string = string == null ? '' : string + ''

	if (!hash_map)
		return false

	if (quote_style && quote_style === 'ENT_QUOTES')
		hash_map["'"] = '&#039;'

	if (!!double_encode || double_encode == null) {
		for (symbol in hash_map) {
			if (hash_map.hasOwnProperty(symbol)) {
				string = string.split(symbol)
					.join(hash_map[symbol]);
			}
		}
	} else {
		string = string.replace(/([\s\S]*?)(&(?:#\d+|#x[\da-f]+|[a-zA-Z][\da-z]*);|$)/g, function(ignore, text, entity) {
			for (symbol in hash_map) {
				if (hash_map.hasOwnProperty(symbol)) {
					text = text.split(symbol).join(hash_map[symbol])
				}
			}

			return text + entity;
		})
	}

	return nl2br(string)
}

function get_html_translation_table(table, quote_style) {
	var entities = {},
		hash_map = {},
		decimal;
	var constMappingTable = {},
		constMappingQuoteStyle = {};
	var useTable = {},
		useQuoteStyle = {};

	constMappingTable[0] = 'HTML_SPECIALCHARS';
	constMappingTable[1] = 'HTML_ENTITIES';
	constMappingQuoteStyle[0] = 'ENT_NOQUOTES';
	constMappingQuoteStyle[2] = 'ENT_COMPAT';
	constMappingQuoteStyle[3] = 'ENT_QUOTES';

	useTable = !isNaN(table) ? constMappingTable[table] : table ? table.toUpperCase() : 'HTML_SPECIALCHARS';
	useQuoteStyle = !isNaN(quote_style) ? constMappingQuoteStyle[quote_style] : quote_style ? quote_style.toUpperCase() :
		'ENT_COMPAT';

	if (useTable !== 'HTML_SPECIALCHARS' && useTable !== 'HTML_ENTITIES') {
		throw new Error('Table: ' + useTable + ' not supported');
	}

	entities['38'] = '&amp;';
	if (useTable === 'HTML_ENTITIES') {
		entities['160'] = '&nbsp;';
		entities['161'] = '&iexcl;';
		entities['162'] = '&cent;';
		entities['163'] = '&pound;';
		entities['164'] = '&curren;';
		entities['165'] = '&yen;';
		entities['166'] = '&brvbar;';
		entities['167'] = '&sect;';
		entities['168'] = '&uml;';
		entities['169'] = '&copy;';
		entities['170'] = '&ordf;';
		entities['171'] = '&laquo;';
		entities['172'] = '&not;';
		entities['173'] = '&shy;';
		entities['174'] = '&reg;';
		entities['175'] = '&macr;';
		entities['176'] = '&deg;';
		entities['177'] = '&plusmn;';
		entities['178'] = '&sup2;';
		entities['179'] = '&sup3;';
		entities['180'] = '&acute;';
		entities['181'] = '&micro;';
		entities['182'] = '&para;';
		entities['183'] = '&middot;';
		entities['184'] = '&cedil;';
		entities['185'] = '&sup1;';
		entities['186'] = '&ordm;';
		entities['187'] = '&raquo;';
		entities['188'] = '&frac14;';
		entities['189'] = '&frac12;';
		entities['190'] = '&frac34;';
		entities['191'] = '&iquest;';
		entities['192'] = '&Agrave;';
		entities['193'] = '&Aacute;';
		entities['194'] = '&Acirc;';
		entities['195'] = '&Atilde;';
		entities['196'] = '&Auml;';
		entities['197'] = '&Aring;';
		entities['198'] = '&AElig;';
		entities['199'] = '&Ccedil;';
		entities['200'] = '&Egrave;';
		entities['201'] = '&Eacute;';
		entities['202'] = '&Ecirc;';
		entities['203'] = '&Euml;';
		entities['204'] = '&Igrave;';
		entities['205'] = '&Iacute;';
		entities['206'] = '&Icirc;';
		entities['207'] = '&Iuml;';
		entities['208'] = '&ETH;';
		entities['209'] = '&Ntilde;';
		entities['210'] = '&Ograve;';
		entities['211'] = '&Oacute;';
		entities['212'] = '&Ocirc;';
		entities['213'] = '&Otilde;';
		entities['214'] = '&Ouml;';
		entities['215'] = '&times;';
		entities['216'] = '&Oslash;';
		entities['217'] = '&Ugrave;';
		entities['218'] = '&Uacute;';
		entities['219'] = '&Ucirc;';
		entities['220'] = '&Uuml;';
		entities['221'] = '&Yacute;';
		entities['222'] = '&THORN;';
		entities['223'] = '&szlig;';
		entities['224'] = '&agrave;';
		entities['225'] = '&aacute;';
		entities['226'] = '&acirc;';
		entities['227'] = '&atilde;';
		entities['228'] = '&auml;';
		entities['229'] = '&aring;';
		entities['230'] = '&aelig;';
		entities['231'] = '&ccedil;';
		entities['232'] = '&egrave;';
		entities['233'] = '&eacute;';
		entities['234'] = '&ecirc;';
		entities['235'] = '&euml;';
		entities['236'] = '&igrave;';
		entities['237'] = '&iacute;';
		entities['238'] = '&icirc;';
		entities['239'] = '&iuml;';
		entities['240'] = '&eth;';
		entities['241'] = '&ntilde;';
		entities['242'] = '&ograve;';
		entities['243'] = '&oacute;';
		entities['244'] = '&ocirc;';
		entities['245'] = '&otilde;';
		entities['246'] = '&ouml;';
		entities['247'] = '&divide;';
		entities['248'] = '&oslash;';
		entities['249'] = '&ugrave;';
		entities['250'] = '&uacute;';
		entities['251'] = '&ucirc;';
		entities['252'] = '&uuml;';
		entities['253'] = '&yacute;';
		entities['254'] = '&thorn;';
		entities['255'] = '&yuml;';
	}

	if (useQuoteStyle !== 'ENT_NOQUOTES') {
		entities['34'] = '&quot;'
	}

	if (useQuoteStyle === 'ENT_QUOTES') {
		entities['39'] = '&#39;'
	}

	entities['60'] = '&lt;'
	entities['62'] = '&gt;'

	for (decimal in entities) {
		if (entities.hasOwnProperty(decimal)) {
			hash_map[String.fromCharCode(decimal)] = entities[decimal];
		}
	}

	return hash_map;
}

function html_entity_decode(string, quote_style) {
	var hash_map = {}
	var symbol = ''
	var tmp_str = ''
	var entity = ''
	var tmp_str = string.toString()

	if (false === (hash_map = this.get_html_translation_table('HTML_ENTITIES', quote_style))) {
		return false;
	}

	delete(hash_map['&'])
	hash_map['&'] = '&amp;'

	for (symbol in hash_map) {
		entity = hash_map[symbol]
		tmp_str = tmp_str.split(entity).join(symbol)
	}
	tmp_str = tmp_str.split('&#039;').join("'")

	return br2nl(tmp_str)
}

function nl2br(str) {
	return str.replace(/(?:\r\n|\r|\n)/g, '<br />')
}

function br2nl(str) {
	return str.replace(/<br\s*[\/]?>/gi, "\n")
}
