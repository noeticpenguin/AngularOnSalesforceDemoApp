app.controller('bcController', ['$scope', '$q', '$log', 'userService',
	function($scope, $q, $log, userService) {

		userService.userList().then(function(userList) {
			$scope.users = userList;
		});

		$scope.alertMe = function() {
			alert("Awesome Sauce, the next YO app.");
		};

	}
]);