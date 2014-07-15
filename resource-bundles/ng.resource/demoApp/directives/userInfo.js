angular.module('demoApp')
.directive('userInfo', [function () {
	return {
		// <userInfo data-user="user"/>
		// priority: 0,
		templateUrl: '/apex/DA_userInfoTemplate',
		// replace: true,
		transclude: false,
		restrict: 'E',
		scope: {user: '='},
		link: function postLink(scope, iElement, iAttrs) {
			console.log(iAttrs, iElement, scope);
		}
	};
}]);