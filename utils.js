var colors = require('colors'),
	prototypeRegistered = false,

exports.trim = function (str) {
	var whitespace = ' \n\r\t\f\x0b\xa0\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u200b\u2028\u2029\u3000';
	for (var i = 0; i < str.length; i++) {
		if (whitespace.indexOf(str.charAt(i)) === -1) {
			str = str.substring(i);
			break;
		}
	}
	for (i = str.length - 1; i >= 0; i--) {
		if (whitespace.indexOf(str.charAt(i)) === -1) {
			str = str.substring(0, i + 1);
			break;
		}
	}
	return whitespace.indexOf(str.charAt(0)) === -1 ? str : '';
}

exports.combineWhitespace = function (str) {
	var intIndexOfMatch = str.indexOf("  ");
	while (intIndexOfMatch != -1){
		str = str.replace( "  ", " " )
		intIndexOfMatch = str.indexOf( "  " );
	}
	return str;
}

exports.escapeShell = function(cmd) {
  return '"'+cmd.replace(/(["\s'$`\\])/g,'\\$1')+'"';
};

exports.contains = function(str, search) {
	return str.indexOf(search) != -1;
}

exports.log = function(info, level) {
	var date = new Date().toString('T');
	
	if(level == undefined) {
		level = 'info';
	}

	var content = '[' + level + ']' + ' ' + date + ' ' + info;

	switch(level) {
		case 'info':
			console.log(content.magenta);
			break;
		case 'error':
			console.log(content.red);
			break;
		case 'warning':
			console.log(content.yellow);
			break;
		default:
			console.log(content.zebra);
			break;
	}

	delete date, content;
}

exports.registerPrototype = function() {
	if(prototypeRegistered) {
		return true;
	}

	String.prototype.escapeShell = exports.escapeShell;
	String.prototype.combineWhitespace = exports.combineWhitespace;
	String.prototype.trim = exports.trim;
	String.prototype.contains = exports.contains;
}