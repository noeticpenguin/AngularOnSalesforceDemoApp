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
<apex:stylesheet value="{!URLFOR($Resource.Styles, '/css/physicianportal.css')}" />
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

###Naming Conventions

While there is no single accepted naming convention, what follows is a decent set of conventions to start conversation amongst your team.

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

### Debugging AngularJS apps from the Browser JS Console

While there exists a semi-official debugging extension for Chrome called "AngularJS Batarang" it is outdated, buggy and prone to incorrectly identifying nested scopes. Instead of using the Batarang, I suggest using the ng-inspector extension available for Chrome and Safari. You can find the chrome version here: [Chrome Ng-Inspector](https://chrome.google.com/webstore/detail/ng-inspector-for-angularj/aadgmnobpdmgmigaicncghmmoeflnamj) and the safari version here: [safari Ng-Inspector](http://ng-inspector.org/ng-inspector.safariextz) 

####A note on Chrome as a development platform
The Angular team seems to exclusively use Chrome for development (they are google employees after all), but more specifically, they seem to use bleeding edge chrome. This has, in the past bitten the Angular community at least once, where the "stable" version of Chrome and the "stable" version of Angular interacted in such a way as to swallow and hide errors. If you're experiencing an unexpected refusal of the app to render, or other wise function in chrome without any errors in the JS console, test your app in Firefox, or Safari to discover the error. 

####Accessing any scope within an App.
Like jQuery's much lauded $(Selector) syntax you can grab hold of elements by their CSS selectors using Angular's built in element method like this:

```javascript
angular.element('#someId');
```

You can extend this with methods like ```.scope()``` to gain access to the scope attached to that specific css selector. With this combination, you can access any scope on the page - Nested and Isolated scopes as well. Just like this:

```javascript
angular.element('#myAwesomeElement').scope();
```

One note. If you are trying to access a directive's isolated scope the method signature is slightly different. 

```javascript
angular.element('#myAwesomeElement').isolateScope();
```

####Accessing Services from the Console.
There will likely be times you want to access various services from the console. This is an ***Invaluable*** tool in debugging. To access services from the console utilize the following snippet of code:

```javascript
var SERVICE_NAME = angular.element('html').injector().get('SERVICE NAME HERE');
```
As services are always singletons in the Angular world, this will return to you the exact service in use by your controllers, and directives. You can then call methods on your service just like you would any other JS object.

```javascript
SERVICE_NAME.someMethod();
```
This is invaluable for discovering where in a promise chain, for instance, something is failing.

####Chrome specific Debugging tools:

Chrome has a number of javascript debugging tools that are quite handy, but sadly specific to Chrome. In no particular order they are:

- ```$_``` is always equal to the value of the last expression. If, for instance you ran a command and intended to assign it to a variable but forgot, you can ***on the very next line*** run var ```x = $_;``` which will assign x the value of the previous commands return value. Very handy.
- $0, $1, $2, $3 and $4 are the last 5 css selectors selected. You can, therefore use them in scope and service accessor calls like this: ``` angular.element('$2').scope();```
- ```$(selector)``` is a chrome shortcut for ```querySelector()```
- ```$$(selector)``` is a chrome shortcut for ```querySelectorAll()```

### Getting Started (Windows, Linux and Mac)
This guide assumes you're using a relatively recent and sane distribution of Linux, Windows 7 or OS X 10.9 or higher. 

This github repo contains a Gruntfile.js and a package.json file. Between the two of these preconfigured files, you can get 90% of the way to being setup. Unfortunately, the 10% remaining has to be done first. 

Our "tooling stack" is built from the following components

|Component Name| Purpose | Homepage|
----------------------|------------------|-----------------------|
|Node.js|Running JS Code outside the browser| [nodejs.org](nodejs.org)|
|Grunt|Task runner and Automation tool|[gruntjs.com](gruntjs.com)|
|PhantomJS|Headless Chrome Browser for quicker testing|[phantomjs.org/](http://phantomjs.org/)|

Some of these must be installed before we can run our bootstrap script. Namely Node.js *must* be installed. 

|OS |Installation Package| Installation Instructions|
----|-----|-----|
Linux|Varies, see your Linux package manager| Follow your Package managers instructions|
Windows 32Bit|[Http://nodejs.org/dist/v0.10.30/node-v0.10.30-x86.msi](http://nodejs.org/dist/v0.10.30/node-v0.10.30-x86.msi)| Download and follow instructions in the installer|
Windows 64Bit|[http://nodejs.org/dist/v0.10.30/x64/node-v0.10.30-x64.msi](http://nodejs.org/dist/v0.10.30/x64/node-v0.10.30-x64.msi)| Download and following instructions in the installer|
OS X| First, Install Homebrew from here: [http://brew.sh/](http://brew.sh/) |run `brew install node` after installing homebrew|

The following instructions may have to be adapted for path and command line peculiars depending on your OS.

Once you've installed Node, you should have access to the `npm` command in your terminal or shell of choice. Npm is the pacakge manager for node, and how we'll bootstrap the rest of our dependencies. If you cannot type `npm -v` and get a version # back, then you may have to restart your shell/terminal or manually provide the path to npm, wherever it is installed. (as the installation path can vary depending on OS, and even per-installation if user-overridden, this is left as an exercise to the reader). Once you have verified that npm is working, run the following command in the same directory as package.json (the root folder for this project)

`npm install`

Once npm has installed everything, you'll need to run webdriver-manager to install the selenium webdriver tool needed by protractor. This can be acomplished by running: `webdriver-manager update` This too, will take awhile. Windows users will need to take care to execute this script with node.js with a command line that resembles: `node webdriver-manager update` paying careful attention to proper paths.

This will likely take awhile, as it's going to install phantom, instanbul, jasmine and protractor for you. Once it has completed the installation of everything, you should be able to execute `grunt` within that same directory and have grunt attempt to run protractor. Protractor will undoubtably ***Fail*** but if it runs at all, our test of the grunt system has passed. 

Within the Gruntfile.js there is a segment specifying the configuration options for protractor that looks like this:
```javascript
protractor: {
			options: {
				configFile: "./resource-bundles/ng.resource/demoApp/protractor.conf.js", // Default config file
				keepAlive: true, // If false, the grunt process stops when the test fails.
				noColor: false, // If true, protractor will not use colors in its output.
				verbose: true,
				seleniumServerJar: "/usr/local/lib/node_modules/protractor/selenium/selenium-server-standalone-2.42.2.jar",
				seleniumPort: 4444,
				args: {
					// Arguments passed to the command
				}
			},
		},
```

You need to ensure that the configFile path, and the seleniumServerJar path are valid and correct for your installation. Different OS's place the Selenium file in different directories, so pay careful attention to the output of `webdriver-manager update`

#### Serving JS assets locally
Perhaps the biggest downside to Angular on Visualforce development is the length of the feedback look. Developing a feature or fixing a bug is delayed by the length of time it takes Salesforce to handle the upload of the Static resource bundle. To mitigate this, I recommend using a local HTTP server that is both CORS enabled and HTTPS enabled to serve your JS files during development. Within this repo's ng.resources directory there exists two key files to enable this: a python file named cors_server.py and a server.pem. The python file is a dirt-simple, bare-bones HTTPS, and CORS enabled webserver that utilizes the server.pem for doing HTTPS. the server.pem file is currently a self-signed cert created by me, on my machine. You can of course replace it with your own, so long as it's named `server.pem`. Cors_server.py will server all files beneath it in the directory tree with Cors headers, via HTTPS. To run it, type `python cors_server.py` on the command line within that directory. Once the server is started you need to clone your resources component and give it the name `dev_resources`. Ensure that your master application page is set to use `dev_resources` as a component `<c:dev_resources/>` and save it. Then modify your dev_resources component to load from localhost:8000 rather than salesforce. Like this:

```html
<apex:component>
<!-- Application Module -->
<!-- instead of -->
	<!--<apex:includeScript value="{!URLFOR($Resource.ng, 'demoApp/application.js')}"/>-->
<!--use-->
<script type="text/javascript" src="https://localhost:8000/demoApp/application.js"/>

<script type="text/javascript" src="https://localhost:8000/demoApp/controllers/managePatientsCtrl.js"/>

<!-- Ng Application Controllers -->
<script type="text/javascript" src="https://localhost:8000/demoApp/controllers/managePatientsCtrl.js"/>

<!-- Ng Application Services -->
<script type="text/javascript" src="https://localhost:8000/demoApp/services/patientService.js"/>

<!-- Ng Application Directives -->
<script type="text/javascript" src="https://localhost:8000/demoApp/directives/loadingContainer.js"/>
</apex:component>
``` 

The ***Key*** difference is that this component uses standard HTML script include tags, rather than visualforce includeScript tags, and that we're pointing the src attribute at https://localhost:8000

Once you've completed the following (recap) of steps you'll be loading js files directly from your local machine.

1. install python ([https://www.python.org/download/](https://www.python.org/download/))
2. clone resources.component, with the new name dev_resources
3. edit dev_resources to use standard script include tags and ensure the src attribute is set to a https://localhost:8000 url.
4. edit your master application Visualforce page to use `<c:dev_resources/>` instead of `<c:resources/>`
5. run python `cors_server.py` on the command line
6. Reload your application and verify that the command line from step #5 is showing that it's serving files. It should look something like this:

```
127.0.0.1 - - [01/Aug/2014 15:53:53] "GET /demoApp/filters/noFractionCurrency.js HTTP/1.1" 200 -
127.0.0.1 - - [01/Aug/2014 15:53:53] "GET /demoApp/filters/autolink.js HTTP/1.1" 200 -
127.0.0.1 - - [01/Aug/2014 15:53:53] "GET /demoApp/filters/dynamic.js HTTP/1.1" 200 -
127.0.0.1 - - [01/Aug/2014 15:53:56] "GET /demoApp/application.js HTTP/1.1" 200 -
127.0.0.1 - - [01/Aug/2014 15:53:56] "GET /demoApp/filters/percentage.js HTTP/1.1" 200 -
127.0.0.1 - - [01/Aug/2014 15:53:56] "GET /demoApp/filters/autolink.js HTTP/1.1" 200 -
```

At this point, you've successfully setup local serving of js assets and can now modify your services, controllers etc. locally and upon saving them simply reload the page. Your browser will pull the new version from localhost. You'll still need to upload the static resource when your done developing, but now you only need to do that once, when your done.

###Testing with Mocha and Protractor

The angular testing world has seen a set of major updates since our training. This document reflects the *updated* best practices and standard tools. The testing stack for Angular uses a few additional npm modules that were installed during your `npm install` run and consist of:

|Name|Purpose|URL|Notes|
---|---|---|---|
AngularMocks.js|Allows us to inject and mock Angular Services in unit tests|[https://code.angularjs.org/1.2.21/](https://code.angularjs.org/1.2.21/)| The angular-mocks.js version must match your angular.js version!|
|Browserify|Allows us to require modules|[http://browserify.org/](http://browserify.org/)|Used to require various modules needed in our tests|
|Partialify|Removes dependency on actual SF connections for Templates|[https://www.npmjs.org/package/partialify](https://www.npmjs.org/package/partialify)| Allows us to inline templates into directives and tests|
|Lodash|Basically the Std Lib for Javascript. ***Use lowdash***|[http://lodash.com/](http://lodash.com/)|Provides a wealth of missing standard methods and functions to round out javascript as a language|
|Istanbul|Code Coverage Reports|[gotwarlost.github.io/istanbul/](http://gotwarlost.github.io/istanbul/)| Code Coverage reports for JS tests
|Jasmine-as-promised|Promise Matchers for Jasmine|[https://www.npmjs.org/package/jasmine-as-promised](https://www.npmjs.org/package/jasmine-as-promised)|Enables testing promise based code without writing waitAs() methods.|
Once you've setup your test framework you can write your unit tests like this:

```javascript
//This next line defines a suite of tests using the describe method
describe("DemoUnitTest", function() {

	// some general setup run once per suite before everything else.
	var x = 0;
	var y = {
		inc: function(x) {
			return x + 1;
		}
	};

	// Defines a function that is called before every individual test.
	beforeEach(function() {
		x += x + 1;
	});

	// the it method is used to define a test.
	it("should start with the value of 1", function() {
		// the expect method is used to write assertions based on behavior.
		// in this case we expect that the behavior of x (above) is to be equal to 1
		// because the beforeEach method takes X and adds 1 to it.
		expect(x).toEqual(1);
	});

	// A second Test.
	it("should be able to increment by 1, using the y.inc method", function() {
		// execercise some code!
		x = y.inc(x);
		// now we can make an assertion (expectation) that x is equal to 2, because 
		// the before each set it to 1, and calling y.inc(x) adds one to the value of x
		expect(x).toEqual(2);
	});
	
	// Just like the beforeEach method runs before each test, the afterEach method runs 
	// after every test and in our case is used to reset x back to 0.
	afterEach(function() {
		x = 0;
	});
// here we end our suite.
});
``` 

For more testing examples, look at the JasmineDemo.unit.spec.js file. 
Additionally, read up on testing AngularJS in particularl with Jasmine-as-promised here:
[https://github.com/ThomasBurleson/jasmine-as-promised/blob/master/test/test_withAngular.html](https://github.com/ThomasBurleson/jasmine-as-promised/blob/master/test/test_withAngular.html)

### Code Examples:

#### Service Example 1

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

#### Service Example 2 (using minifiable style dependency injection)
```javascript
angular.module('demoApp').factory('caseService', ['$q', '$log', 'sfrquery', function ($q,$log,sfrquery) {
	
	var caseService = {
		_cases: [], //by convention, _ denotes a private variable
		_patient: {
			Id: '003o0000003OB00'
		},
		_patientId: '003o0000003OB00',
		//Methods
		
		setPatient: function(patient){
			_patient = patient;
		},
		getCases: function(){
			var pGetCases = sfrquery.query(caseService.getCasesForPatientQuery());
			pGetCases.then(caseService.setListOfCases);
		},
		setListOfCases: function(data){
			caseService._cases = data;
		},
		getCasesForPatientQuery: function() {
			//@todo make sure _patient is valid
			return "SELECT Id, CaseNumber, priority, Description FROM Case WHERE contactId = '" + caseService._patient.Id + "'";
		},
		getHighPriorityCases: function() {
			return _.where(caseService._cases, function(caseitem){
				return (caseitem.Priority == 'High');
			});
		}
	};
	return caseService;
}]);
```

#### Controller Example #1
```javascript
//angular.module() is both a setter, for creating a module, and
// if given a single argument, a getter.
// rather than using a global var App to attach our controllers
// services, etc. to. just call angular.module('moduleName').whatever()
angular.module('demoApp').controller('caController', ['$scope', '$log', 'userService', 
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
```

#### Example Application Module definition

```javascript
// this block defines the 'demoApp' module, with 4 dependencies
// named: ui.bootstrap, localytics.directives, ui.router and ngForce
angular.module('demoApp', [
	'ui.bootstrap', 'localytics.directives', 'ui.router',  
	'ngForce'
	]);

angular.module('demoApp').
  // The config block of an Angular application module
  // is where you'll configure run-once application
  // settings. In this case, the state diagram
  // for ui.router to use.
  config(function($stateProvider, $urlRouterProvider) {
	$stateProvider.
		// each state() block here defines a different 
		// "state" identified by the first argument
		// the templateUrl key can point to a fully
		// featured VF page, complete with VF Controllers
		// etc.
		// the controller key is an Angular controller 
		// to be instantiated upon successful
		// state change. 
		// the url key is a string representing what will 
		// be appended to the master application page url
		// upon navigation to that state. ie:
		// www.foo.com/bar/#BritishColumbia
		state('BritishColumbia',{
			url: "/BritishColumbia",
			templateUrl: "/apex/DA_bc_partial",
			controller: "bcController"
		}).
		state('California', {
			url: "/California",
			templateUrl: "/apex/DA_ca_partial",
			controller: "caController"
		});
		$urlRouterProvider.otherwise("/California");
  });
```