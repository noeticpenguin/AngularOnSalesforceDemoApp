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
		mocha_istanbul: {
			coverage: {
				src: 'resource-bundles/ng.resource/demoApp/specs', // the folder, not the files,
				options: {
					mask: '*.unit.spec.js',
					check: {
						lines: 75,
						statements: 75,
						branches: 75,
						functions: 75
					},
					root: './resource-bundles/ng.resource/', // define where the cover task should consider the root of libraries that are covered by tests
					excludes: ['resource-bundles/ng.resource/demoApp/specs/*.js'], // this excludes your tests from code coverage reports.
					reportFormats: ['html', 'lcov'], // what style report do you want?
				}
			}
		}
	});
	grunt.registerTask('default', 'mocha_istanbul');
};