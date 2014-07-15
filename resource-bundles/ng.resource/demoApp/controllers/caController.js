app.controller('caController', ['$scope', '$log', 'userService', 
	function ($scope, $log, userService) {

	$scope.loaded = "true";
	$scope.showedByButton = false;

	userService.getUsers().then(function(x){
		$log.log(x);
		$log.log(userService._userList);
		$scope.users = userService._userList;
	});

	// $log.log("GetEmail results:", userService.email());

}]);