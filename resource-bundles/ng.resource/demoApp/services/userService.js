app.factory('userService', ['$q', 'sfrquery', function ($q, sfrquery) {
	/**
	 * User Service encapsultates a given user.
	 */

	var userService = {
		// internal (private) properties:
		_user: {},
		_email: "",
		_username: "",

		// public methods
		getUser: function(){
			var pGetUser = sfrquery.query("SELECT Id, username, Email FROM user WHERE Alias = 'Chatter'");
			pGetUser.then(userService.setUserDetails);
			return userService._user;
		},
		setUserDetails: function(data){
			userService._user = data;
			userService._email = data.Email;
			userService._username = data.Username;
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
				return userService.getUser().Email;
			}
		},
		username: function() {

		}
	};
	return userService;
}]);