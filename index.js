var Mocha = require('mocha'),
	path = require('path'),
	mocha = new Mocha();

if (process.argv && process.argv.length > 2) {
	process.env.RHYTHM_DEPLOYMENT_TEST_DOMAIN = process.argv[2];

	mocha.addFile(path.join(__dirname, 'test.js'));

	mocha.run(function (failures) {
		process.on('exit', function () {
			process.exit(failures);
		});
	});
} else {
	console.log('Usage: rdt [domain]');
}