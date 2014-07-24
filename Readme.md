Best practices, tips and tools for developing Angular.js Applications on Visualforce
====================================================================================

### Application Structure

While the Angular documentation recommends placing all of your like modules within the same file. (eg: all your controllers in a single controllers.js file) I find this pattern is hard to maintain. Files end up being in excess of 1000 lines. Instead, I prefer to maintain separate files for each module, and use post-development tools like Grunt to combine and minify the individual files into one. With that in mind, I recommend the following structure:

- ApplicationName (DemoApp)
	- lib/ (Containing modules and js libraries you didn't write)
	- css/ (Containing css)
	- img/ (Containing Images for your views)
	- fonts/ (Containing fonts referenced by css: font-awesome, etc.)
	- controllers/ (Containing controller modules)
	- directives/ (Containing custom directive modules)
	- filters/ (Containing custom filter modules)
	- services/ (Containing custom Services, Factories and Providers)
	- tests/
		- unit/
		- e2e/
	- application.js (Main Application module)
	- Gruntfile.js (Tasks)
	- protractor.conf.js (Protractor Config)
	- devServer.py (Cors & Https server for serving js resources locally)
	- server.pem (Self signed certificate used by the devServer.py)

This file structure is contained with a Salesforce Static Resource. **Ensure that the cache policy for your static resource is defined as Public!**

The application itself must be contained inside a Visualforce page. Typically, I name this whatever my application is called. For example purposes we'll call it "DemoApp" Rather than clutter the master application with a laundry list of includes I prefer to create a custom Visualforce component to hold all the includes. This has the added benefit of creating a single change point where we can inject javascript from our local server, rather than Salesforces server. This makes development *much* faster.

### Using Visualforce Components

Custom Visualforce components provide handy containers for re-usable bits of code that we can inject on any Angular.js application page. I prefer to have at least one component defined to clean up the markup of my master application page. Normally, I call this component something nice and descriptive like: 'ngResources'. I like to keep it well organized, something like this:

```html
<apex:component>
<!-- Css -->
<apex:stylesheet value="{!URLFOR($Resource.GNE_CM_MPS_Portal_Styles, '/css/physicianportal.css')}" />
<!-- Javascript Libraries -->
<apex:includeScript value="{!URLFOR($Resource.ng, 'demoApp/lib/angular.min.js')}"/>
<!-- Application Module -->
<apex:includeScript value="{!URLFOR($Resource.ng, 'demoApp/application.js')}"/>
<!-- Ng Application Controllers -->
<apex:includeScript value="{!URLFOR($Resource.ng, '/demoApp/controllers/managePatientsCtrl.js')}"/>
<!-- Ng Application Services -->
<apex:includeScript value="{!URLFOR($Resource.ng, 'demoApp/services/patientService.js')}"/>
<!-- Ng Application Directives -->
<apex:includeScript value="{!URLFOR($Resource.ng, 'demoApp/directives/loadingContainer.js')}"/>
</apex:component>
```

You can then use your component by inserting it on your Visualforce application page like this:

```
<c:ngResources/>
```

###Module Definitions. 
The application module should be defined in it's own file, named application.js and stored in the root folder of the static resource. see the file structure section above for more details. It should be noted that the method `angular.module()` is both a getter and setter, and as such can be used and changed with other module definition functions like this: `angular.module('demoApp').module_type(...)"` to define a new module on the application. This prevents the need for a global namespace variable to hold the application's module.

Because the javascript has a fluid "api"; and because Angular makes use of that fluid api, methods can be chanined together to produce monad like results. This can often result in painfully long lines of code. Rather than accepting hard to read long lines of code, Instead structure your fluid api use like this:

```javascript
Angular.module('demoApp')
	.controller('awesomeCtrl', function($scope){
	});
```

inserting a line break, and starting the fluid api (with a period) on the next line, indented one leve.

###Naming Conventions While there is no single accepted naming convention, what follows is a decent set of conventions to start conversation amongst your team.

1. Variables (that are for more than itteration within a loop) should be self-descriptive.
2. Modules except directives should include their "type"
	- services should be named: somethingService (all factories, services and providers should be labed as <whatever>Service)
	- filters should be named: somethingFilter
	- controllers should be named: somethingCtrl or somethingController
3. Services are plural by convention ie: CarsService or PatientsService.
4. Filters are Single by convention ie: customCurrencyFilter or nameFormatterFilter
5. Varaibles within services starting with _ are private by convention ie: _foo or _bar and getters/setters should be provided for them.
6. Getters are the named after the name of the property they return. For instance, given a property named cars the getter would be named serviceName.cars();
7. Setters are named after the name of the property they set, prepended by the word set. For instance, setCars()
8. Data Acquisition methods within services should be as idempotent as possible. Strive to memoize them. See service Example 1.

### General Architectural Best Practices

1. Strive to contain all logic, wherever possible, in services, factories and providers. (collectively known as services)
2. Controllers should be thought of as models backing the view - they exist only to setup `$scope`.
3. Before deciding to write a directive, attempt to write a filter to acomplish the same task. Often a filter is all that's needed.
4. If you write a directive, isolate the scope with the '=' scope definition.
5. While your views can live in a html file within a static resource, there are benefits to having visualforce server-side render the template before handing it to Angular. Use both tools (Visualforce and Angular) together, to augment each others' weaknesses.
6. If you must include the template as a file within the static resource, remember to use Visualforce to merge `{!URLFOR($Resource.ng, '/path/to/templatesDirectory')}` so that you can give Angular access to the auto-defined and cache-controlled url
7. Visualforce remoting is slower than the Rest api for *small* datasets. Conversely, it's *much faster* for complex or large datasets.
	- You have a complex dataset when you cannot generate the data with a single soql query. (or when you want to insert or update in bulk.)
	- Result sets over 5000 is the general rule for when to switch to Visualforce remoting
	- Visualforce Remote Objects are quite handy, and performant. Don't forget about them
8. Test all your services via unit tests. Test all your custom directives via End2end testing.
9. Short of a compelling reason, all non-getter service methods should return a promise.
10. ***Always*** include a `.catch()` block on promise chains, `$q.all()` and `$q.spread()` calls.
11. $scope inheritance is based on nesting HTML / views. Don't forget that.

### Promises and Flow Control.

Promises are relatively new to the Javascript world, and provide an elegant way of handling asynchronous code execution. Within, Angular, promises are exposed via the `$q` service. Which can be depency injected. The $q service provides a number of methods, but the most important of which is the .defer() method, which returns a deferred object. Once you have a deferred object from `var x = $q.defer();` you can execute long running code asynchronously. To attach your long-running code's result to the deferred object you use the `.resolve()` method. In order to make your code run asynchronously, however, your method needs to return a promise object. Thankfully, each deferred object has a property named `.promise` that returns a promise.

####Common Promise Patterns:

- Utilizing promises for flow control. Any method that returns a promise can be chained with other methods that consume promises. You can chain N number of functions together **so long as each method returns a promise.** There are two patterns that utilize this feature and they can be intermixed as you see fit. Those patterns are:

```javascript
promiseGeneratingFunction1()
    .then(promiseGeneratingFunction2())
    .then(promiseGeneratingFunction3())
    .then(someServiceMethod())
    .catch(function(errorMessage){
        $log.log(errorMessage);
    });
```

```javascript
PromiseGeneratingFunction1()
    .then(function(data){
        //do stuff with data returned by promiseGeneratingFunction
        return aNewPromiseCallingMethod(params)
    })
    .then(function(data){
        //perhaps save the data here to $scope
        return data; // or you can return another promise if you want to continue the chain.
    })
    .catch(function(errorMessage){
        $log.error(errorMessage);
    })
```

- The Key difference between these two methods is the first utilizes pre-defined functions in the .then() blocks where as the second example utilizes anonymous functions. Either type works fine, and again you can mix and match them as needed. Note that when using named functions as in example 1 above, that the javascript interpreter will automatically pass parameters from one .then() to the next .then()'s function.
- Additionally, the `$q` service provides two other methods that are essential for proper and efficient flow control. - `$q.when()` turns any data, from a 'string' to fully fledged promise into a promise. Use this whenever you're not sure the data you're manipulating is already a promise or, for instance, to start off a promise chain like this:

```javascript
$q.when("StartingPromiseValue")
	.then(anotherFunction())
	.catch(function(errorMessage){
		$log.error(errorMessage);
});
```

- The `$q.all()` method provides an interface for executing work when a given array of promises have *all* resolved. This is useful for initialization methods or times when you need to make several callouts to promise functions, but those promises **do not** depend on each other. Syntactically it looks like this:

```javascript
var arrayOfPromises = [];
arrayOfPromises.push(serviceName.promiseReturningMethod());
arrayOfPromises.push(serviceName2.promiseReturningMethod2());
arrayOfPromises.push(serviceName3.promiseReturningMethod3());

$scope.allPromisesDone(arrayOfResults){
	// do something with the data
}
$q.all(arrayOfPromises)
	.then(allPromisesDone(data){
		// do something with the array of results that is data
	});
```

- Additionally, an `angular.decorator()` can be used to provide the $q service with the `.spread()` method. You can find that decorator code here: https://gist.github.com/ThomasBurleson/9724999 ***I highly suggest using the spread() decorator.*** When using the `.spread()` functionality your syntax will look like this:

```javascript
$q.all([ promise1, promise2 ]).then($q.spread(function (promise1Result, promise2Result) {
	// here you have access to promise1Result and promise2Result as named parameters.
});
```

### Service Example 1

```javascript
angular.module("MyPatientsPage")
	.factory("patientService", function($log, $q, vfr) {
		var patientService = {
			// "Private variables"
			_patients: [],
			// vfr.send returns a function. Use this getPatientsMethod as a function
			getPatientsMethod: PromiseGeneratingFunction(),
			// Public Methods
			getPatients: function() {
				var pGetPatients = PromiseGeneratingFunction();
				return pGetPatients.then(patientService.setPatients);
			},
			setPatients: function(data) {
				patientService._patients = data.patients;
				return patientService._patients;
			},
			patients: function() {
				var ret = $q.defer();
				if (patientService._patients && patientService._patients.length > 0) {
					ret.resolve(patientService._patients);
				} else {
					$q.when(patientService.getPatients()).then(function(k) {
						ret.resolve(k);
					});
				}
				return ret.promise;
			}
		};
		return patientService;
	});
```
