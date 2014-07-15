app.controller('caController', ['$scope', '$log', 'userService', 
	function ($scope, $log, userService) {

	$scope.loaded = "true";
	$scope.showedByButton = false;

	$log.log("GetEmail results:", userService.email());

}]);