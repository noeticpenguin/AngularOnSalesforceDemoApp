app.factory('userService', ['$q', '$log', 'sfrquery', function ($q, $log, sfrquery) {
	/**
	 * User Service encapsultates a given user.
	 */

	var userService = {
		// internal (private) properties:
		_user: {},
		_userList: [],
		_email: "",
		_username: "",

		// public methods
		getUser: function(){
			var pGetUser = sfrquery.query("SELECT Id, username, Email FROM user WHERE Alias = 'Chatter'");
			return pGetUser.then(userService.setUserDetails);
		},
		getUsers: function(){
			var pGetUser1 = sfrquery.query("SELECT Id, username, Email FROM user");
			return pGetUser1.then(userService.setUserList);
		},
		setUserList: function(data){
			userService._userList = data;
		},
		userList: function(data){
			return userService._userList;
		},
		setUserDetails: function(data){
			userService._user = data[0];
			userService._email = data[0].Email;
			userService._username = data[0].Username;
			return data;
		},
		findUser: function(){

		},
		destroyUser: function() {

		},
		updateUser: function() {

		},
		email: function(){
			if (userService._email){
				return userService._email;
			} else {
				return userService.getUser().then(function(x){
					$log.log(x);
				});
			}
		},
		username: function() {

		}
	};
	return userService;
}]);