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
		jasmine: {
			default: {
				src: [
					'resource-bundles/ng.resource/demoApp/application.js',
					'resource-bundles/ng.resource/demoApp/controllers/*.js',
					'resource-bundles/ng.resource/demoApp/directives/*.js',
					'resource-bundles/ng.resource/demoApp/filters/*.js',
					'resource-bundles/ng.resource/demoApp/services/userService.js',
				],
				options: {
					vendor: [
						'resource-bundles/ng.resource/demoApp/lib/jquery-2.1.1.min.js',
						'resource-bundles/ng.resource/demoApp/lib/angular.min.js',
						'resource-bundles/ng.resource/demoApp/lib/lodash.underscore.min.js',
						'resource-bundles/ng.resource/demoApp/lib/Restangular.min.js',
						'resource-bundles/ng.resource/demoApp/lib/safeApply.min.js',
						'resource-bundles/ng.resource/demoApp/lib/ngForce.js',
						'resource-bundles/ng.resource/demoApp/lib/ui-bootstrap-tpls-0.11.0.min.js',
						'resource-bundles/ng.resource/demoApp/lib/ui.router.min.js',
						'resource-bundles/ng.resource/demoApp/lib/angular.mocks.js'
					],
					specs: ['./resource-bundles/ng.resource/demoApp/specs/**/*.unit.spec.js']
				},
				version: '2.0.0'
			}
		}
	});

	grunt.registerTask('default', 'jasmine');
};