module.exports = function(grunt) {
	require('load-grunt-tasks')(grunt, {
		pattern: ['grunt-*', '!grunt-template-jasmine-istanbul', 'which']
	});

	grunt.initConfig({
		protractor: {
			options: {
				configFile: "./resource-bundles/ng.resource/demoApp/protractor.conf.js", // Default config file
				keepAlive: true, // If false, the grunt process stops when the test fails.
				noColor: false, // If true, protractor will not use colors in its output.
				verbose: true,
				seleniumServerJar: "/usr/local/lib/node_modules/protractor/selenium/selenium-server-standalone-2.42.2.jar",
				seleniumPort: 4444,
				args: {
					// Arguments passed to the command
				}
			},
		},
	});

	grunt.registerTask('default', 'protractor');

};