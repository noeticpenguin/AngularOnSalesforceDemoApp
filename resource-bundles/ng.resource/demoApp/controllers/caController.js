app.controller('caController', ['$scope', '$log', 'userService', 
	function ($scope, $log, userService) {

	$scope.loaded = "true";
	$scope.showedByButton = false;

	$log.log("GetUser results:", userService.getUser());

}]);