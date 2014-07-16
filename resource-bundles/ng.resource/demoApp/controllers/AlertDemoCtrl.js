app.controller('AlertDemoCtrl', ['$scope',
	function($scope) {

		$scope.alerts = [{
			type: "danger",
			msg: "This is a warning"
		}, {
			type: "success",
			msg: "ERROR!!!!"
		}];

		$scope.closeAlert = function(index) {
			$scope.alerts.splice(index, 1);
		};

		$scope.addAlert = function() {
			$scope.alerts.push({
				msg: 'Another alert!'
			});
		};


	}
]);