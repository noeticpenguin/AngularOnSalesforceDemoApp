/**
*  Module
*
* Description
*/
var app = angular.module('demoApp', [
	'ui.bootstrap', 'localytics.directives', 'ui.router',  
	'ngForce'
	]);

app.config(function($stateProvider, $urlRouterProvider) {
	$stateProvider.
		state('BritishColumbia',{
			url: "/BritishColumbia",
			templateUrl: "/apex/DA_bc_partial",
			controller: "bcController"
		}).
		state('California', {
			url: "/California",
			templateUrl: "/apex/DA_ca_partial",
			controller: "caController"
		});
		$urlRouterProvider.otherwise("/California");
});