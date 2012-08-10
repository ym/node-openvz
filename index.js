var spawn = require('child_process').spawn,
    exec  = require('./exec-sync'),
    utils = require('./utils');

exports.version = 1.0;

var formatID = function(id) { return Number(id); }
var formatMega = function(n) { n = Number(n);return n==NaN ? false : (n + "M"); }

var reservedID = {
	'success' : false,
	'reason'  : 'Reserved VE ID.',
};

exports.list = function (type) {
	var cmd_args = '-t -H';

	switch(type) {
		case 'all':
			cmd_args += ' -a';
			break;
		case 'stopped':
			cmd_args += '-S';
			break;

		default:
			break;
	}

	var cmd_result = exec('vzlist ' + cmd_args).split('\n');
	for(var i = 0; i<cmd_result.length; i++) {
		cmd_result[i] = utils.combineWhitespace(utils.trim(cmd_result[i])).split(' ');
		cmd_result[i][4] =  ((cmd_result[i][4] == '-') ? null : cmd_result[i][4]);
		cmd_result[i] = {
			"id" :		Number(cmd_result[i][0]),
			"nproc":	Number(cmd_result[i][1]),
			"status":	cmd_result[i][2],
			"ipaddr":	cmd_result[i][3],
			"hostname":	cmd_result[i][4],
		};
	}
	return cmd_result;
}

exports.create = function(id, args) {
	id = formatID(id);
	
	if(id<101) { return reservedID; }

	var cmd_args = 'vzctl --verbose create ' + id;

	if(args.template == undefined) {
		//
	} else {
		cmd_args += ' --ostemplate ' + utils.escapeShell(args.template);
	}
	
	if(args.ipaddr == undefined) {
		// return false;
	} else {
		cmd_args += ' --ipadd ' + utils.escapeShell(args.ipaddr);
	}

	if(args.hostname == undefined) {
		
	} else {
		cmd_args += ' --hostname ' + utils.escapeShell(args.hostname);
	}

	if(args.diskspace == undefined) {
		
	} else {
		cmd_args += ' --diskspace ' + utils.escapeShell(args.diskspace);
	}


	var cmd_result = exec(cmd_args);
	
	if(cmd_result.indexOf('created') == -1) {
		var cmd_result_splited = cmd_result.split('\n');
		return {
			'success'	: false,
			'log'		: cmd_result,
			'reason'	: cmd_result_splited[0]
		};
	} else {
		return {
			'success'	: true,
			'log'		: cmd_result
		};
	}
}
// console.log(exports.create(1234,{template:'centos-6-x86_64'}));
exports.destroy = function(id) {
	id = formatID(id);

	if(id<101) { return reservedID; }

	var cmd_args = 'vzctl --verbose destroy '+ id;
	
	var cmd_result = exec(cmd_args);

	if(cmd_result.indexOf('destroyed') != -1) {
		return {
			'success'	: true,
			'log'		: cmd_result
		};
	} else {
		return {
			'success'	: false,
			'log'		: cmd_result
		};
	}
}

exports.start = function(id) {
	id = formatID(id);

	if(id<101) { return reservedID; }

	var cmd_args = 'vzctl --verbose start '+ id;
	
	var cmd_result = exec(cmd_args);

	return {
			'success'	: (cmd_result.indexOf('in progress') != -1 || cmd_result.indexOf('already running') != -1),
			'log'		: cmd_result
	};
}

exports.stop = function(id) {
	id = formatID(id);

	if(id<101) { return reservedID; }

	var cmd_args = 'vzctl --verbose stop '+ id;
	
	var cmd_result = exec(cmd_args);

	return {
			'success'	: (cmd_result.indexOf('stopped') != -1 || cmd_result.indexOf('unmounted') != -1),
			'log'		: cmd_result
	};
}



exports.fixnet = function(id) {
	id = formatID(id);

	if(id<101) { return reservedID; }

	var status = exports.status(id);

	if(!status.success) {
		return {
			'success'	: false,
			'log'		: status.log
		}
	}

	var cmd_args = 'arpsend -U -i ' + status.ipaddr + ' -c 10  eth1';
	
	var cmd_result = exec(cmd_args);

	return {
			'success'	: true,
			'log'		: cmd_result
	};
}

exports.status = function(id) {
	id = formatID(id);

	if(id<101) { return reservedID; }

	var cmd_result = exec('vzlist -t -H  -o "ctid,numproc,status,uptime,laverage,hostname,diskspace,diskinodes,privvmpages,privvmpages.l,cpus" ' + id);
	var cmd_result2 = utils.combineWhitespace(utils.trim(cmd_result)).split(' ');


	var cmd_result1 = utils.combineWhitespace(utils.trim(exec('vzlist -t -H -o "ip" ' + id)));

	if(utils.trim(cmd_result) == '') {
		return {
			'success'	: true,
			'id'		: id,
			'exist'		: false,
			"log"		: cmd_result + cmd_result1
		};
	} else {
		return {
			'success'	: true,
			'id'		: cmd_result2[1],
			'exist'		: true,
			'ip'		: cmd_result1.indexOf(" ") !== -1 ? cmd_result1.split(" ") : [cmd_result1],
			"numproc"	: cmd_result2[1],
			"status"	: cmd_result2[2],
			"uptime"	: cmd_result2[3],
			"loadavg"	: cmd_result2[4],
			"hostname"	: cmd_result2[5],
			"diskspace" : cmd_result2[6],
			"diskinodes": cmd_result2[7],
			"memsize"   : cmd_result2[8],
			"memsize.l"  : cmd_result2[9],
			"cpus"		: cmd_result2[10],
			'log'		: cmd_result + cmd_result1
		};		
	}
}




exports.traffic = function(id) {
	id = formatID(id);

	if(id<101) { return reservedID; }

	var cmd_args = 'vzctl exec ' + id + ' "grep venet0 /proc/net/dev"  | awk -F: \'{print $2}\' | awk \'{printf"OK,%s,%s", $1, $9}\'';
	
	var cmd_result = exec(cmd_args);
	
	if(cmd_result.indexOf('OK,') == -1) {
		return {
				'success'	: true,
				'log'		: cmd_result
		};
	} else {
		var cmd_result2 = cmd_result.split(',');
		return {
				'success'	: true,
				'in'		: cmd_result2[1],
				'out'		: cmd_result2[2],
				'timestamp'	: Date.now(),
				'log'		: cmd_result
		};
	}

}

exports.set = function(id, key, value1, value2) {
	id = formatID(id);

	if(id<101) { return reservedID; }
	if(!value2) { value2 = undefined; }
	
	var cmd_args = 'vzctl --verbose set ' + id;

	switch(key) {
		case 'onboot':
			cmd_args += ' --onboot ' + (value1 ? 'yes' : 'no');
			break;
		case 'passwd':
			cmd_args += ' --userpasswd ' + utils.escapeShell(value1 + ":" + value2);
			break;
		case 'hostname':
			cmd_args += '  --hostname ' + utils.escapeShell(value1);
			break;
		case 'ipadd':
			cmd_args += ' --ipadd ' + utils.escapeShell(value1);
			break;
		case 'ipdel':
			cmd_args += ' --ipdel '+ utils.escapeShell(value1);
			break;
		case 'nameserver':
			cmd_args += ' --nameserver '+ utils.escapeShell(value1);
			break;
		case 'diskspace':
			cmd_args += ' --diskspace '+ utils.escapeShell(value1);
			break;
		case 'cpus':
			cmd_args += ' --cpus '+ Number(value1);
			break;
		case 'numproc':
		case 'numtcpsock':
		case 'numothersock':
		case 'vmguarpages':
		case 'kmemsize':
		case 'tcpsndbuf':
		case 'tcprcvbuf':
		case 'othersockbuf':
		case 'dgramrcvbuf':
		case 'oomguarpages':
		case 'lockedpages':
		case 'privvmpages':
		case 'shmpages':
		case 'numfile':
		case 'numfile':
		case 'numpty':
		case 'numsiginfo':
		case 'dcachesize':
		case 'numiptent':
		case 'physpages':
		case 'avnumproc':
		case 'swappages':
			cmd_args += ' --' + key + ' ' + Number(value1) + ':' + (value2 == undefined ? Number(value1) : Number(value2));
			break;
		case '':
		default:
			return {
				'success': false,
				'reason' : 'Invalid Parameter',
			};
	}


	cmd_args += ' --save';
	
	var cmd_result = exec(cmd_args);
	
	if(cmd_result.indexOf('Bad parameter') == -1) {
		return {
			'success': false,
			'log'    : cmd_result
		};
	} else {
		return {
			'success': true,
			'log'    : cmd_result
		};
	}
}

exports.setMemory = function(id, guaranteed, burstable) {
	id = formatID(id);

	if(id<101) { return reservedID; }

	if(burstable == undefined) {
		burstable = guaranteed;
	}

	guaranteed = formatMega(guaranteed);
	burstable = formatMega(burstable);

	if(!guaranteed || !burstable) {

	}

	var cmd_result  = exec("vzctl set " + id + " --kmemsize " + guaranteed + " --save");
		cmd_result += exec("vzctl set " + id + " --vmguarpages " + guaranteed + " --save");
		cmd_result += exec("vzctl set " + id + " --oomguarpages " + guaranteed + " --save");
		cmd_result += exec("vzctl set " + id + " --privvmpages " + burstable + " --save");

	return cmd_result.indexOf('saved') == -1 ? {
													'success': false,
													'log'    : cmd_result
												} : {
													'success': true,
													'log'    : cmd_result
			};
}

exports.macro = function(id, macro) {
	id = formatID(id);

	if(id<101) { return reservedID; }

	switch(macro) {
		case 'ppp-on':
			var cmd_result  = exec("vzctl stop " + id);
				cmd_result += exec("vzctl set " + id + " --features ppp:on --save");
				cmd_result += exec("vzctl start " + id);
				cmd_result += exec("vzctl set " + id + " --devices c:108:0:rw --save");
				cmd_result += exec("vzctl exec " + id + " mknod /dev/ppp c 108 0");
				cmd_result += exec("vzctl exec " + id + " chmod 600 /dev/ppp");
			break;
		case 'ppp-off':
			var cmd_result  = exec("vzctl stop " + id);
				cmd_result += exec("vzctl set " + id + " --features ppp:off --save");
				cmd_result += exec("vzctl start " + id);
				cmd_result += exec("vzctl set " + id + " --devices c:108:0:none --save");
				cmd_result += exec("vzctl exec " + id + " rm -f /dev/ppp");
			break;
		case 'tun-on':
			var cmd_result  = exec("vzctl stop " + id);
				cmd_result += exec("vzctl set " + id + " --devnodes net/tun:rw --save");
				cmd_result += exec("vzctl set " + id + " --devices c:10:200:rw --save");
				cmd_result += exec("vzctl set " + id + " --capability net_admin:on --save");
				cmd_result += exec("vzctl start " + id);
				cmd_result += exec("vzctl exec " + id + " mkdir -p /dev/net");
				cmd_result += exec("vzctl exec " + id + " chmod 600 /dev/net/tun");
			break;
		case 'tun-off':
			var cmd_result  = exec("vzctl stop " + id);
				cmd_result += exec("vzctl set " + id + " --devnodes net/tun:none --save");
				cmd_result += exec("vzctl set " + id + " --devices c:10:200:none --save");
				cmd_result += exec("vzctl set " + id + " --capability net_admin:off --save");
				cmd_result += exec("vzctl start " + id);
				cmd_result += exec("vzctl exec " + id + " rm -f /dev/net/tun");
				break;
		case 'fuse-on':
			var cmd_result  = exec("vzctl stop " + id);
				cmd_result += exec("vzctl set " + id + " --devnodes fuse:rw --save");
				cmd_result += exec("vzctl start " + id);
				break;
		case 'fuse-off':
			var cmd_result  = exec("vzctl stop " + id);
				cmd_result += exec("vzctl set " + id + " --devnodes fuse:none --save");
				cmd_result += exec("vzctl start " + id);
				break;
		case 'nfs-on':
			var cmd_result  = exec("vzctl stop " + id);
				cmd_result += exec("vzctl set " + id + " --features nfs:on --save");
				cmd_result += exec("vzctl start " + id);
				break;
		case 'nfs-off':
			var cmd_result  = exec("vzctl stop " + id);
				cmd_result += exec("vzctl set " + id + " --features nfs:off --save");
				cmd_result += exec("vzctl start " + id);
				break;
		default:
			return {'success': false,'log' : cmd_result};
			break;
	}
	return {'success': true,'log' : cmd_result};
}

exports.removeUBCLimits = function(id) {
	id = formatID(id);

	if(id<101) { return reservedID; }

	exports.set('','');
}
