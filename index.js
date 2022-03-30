import process from 'node:process';
import {promisify} from 'node:util';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import childProcess from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const TEN_MEGABYTES = 1000 * 1000 * 10;
const execFile = promisify(childProcess.execFile);

const windows = async () => {
	// Source: https://github.com/MarkTiedemann/fastlist
	let binary;
	switch (process.arch) {
		case 'x64':
			binary = 'fastlist-0.3.0-x64.exe';
			break;
		case 'ia32':
			binary = 'fastlist-0.3.0-x86.exe';
			break;
		default:
			throw new Error(`Unsupported architecture: ${process.arch}`);
	}

	const binaryPath = path.join(__dirname, 'vendor', binary);
	const {stdout} = await execFile(binaryPath, {
		maxBuffer: TEN_MEGABYTES,
		windowsHide: true,
	});

	return stdout
		.trim()
		.split('\r\n')
		.map(line => line.split('\t'))
		.map(([pid, ppid, name]) => ({
			pid: Number.parseInt(pid, 10),
			ppid: Number.parseInt(ppid, 10),
			name,
		}));
};

const nonWindowsMultipleCalls = async (options = {}) => {
	const flags = (options.all === false ? '' : 'a') + 'wwxo';
	let programs = [];

	const {stdout} = await execFile('ps', [flags, `pid,ppid,uid,comm`], {maxBuffer: TEN_MEGABYTES});

	for (let line of stdout.trim().split('\n').slice(1)) {

		const [pid, ppid, uid, comm] = line.trim().replace(/  +/g,' ').split(' ');
		
		if(ppid && uid && comm){
			programs.push({
				pid: Number.parseInt(pid, 10),
				uid: Number.parseInt(uid, 10),
				name: path.basename(comm),
				ppid: Number.parseInt(ppid, 10)
			});
		}
	}

	return programs;
	
};

const nonWindows = async (options = {}) => {
	return nonWindowsMultipleCalls(options);
};

const psList = process.platform === 'win32' ? windows : nonWindows;

export default psList;
