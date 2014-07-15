app.controller('bcController', ['$scope', '$q', '$log', 'caseService', function ($scope, $q, $log, caseService) {

	$scope.loaded = "true";

	$q.when(caseService.getCases()).then(function(data){
		$scope.caseList = caseService._cases;
	});

}]);