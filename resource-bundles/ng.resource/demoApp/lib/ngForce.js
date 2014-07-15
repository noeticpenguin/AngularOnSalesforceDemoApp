/*
 * ngForce - a visualForce remoting based Angular.js service for developing
 * Angular apps within Visualforce.
 *
 * Copyright (c)2013, Kevin Pooorman.
 * License: MIT
 *
 * Usage:
 *   This is modeled after the Angular builtin's $http and $resource modules
 *   Injection of this service into your controller, etc. exposes the
 *   ngForce object, and it's methods to your controller. These methods expose
 *   access via promise-based asyncronous Visualforce Remoting.
 *
 */

angular.module('ngForce', ['Scope.safeApply', 'restangular']);

angular.module('ngForce').provider('sfTemplate',function sfTemplateProvider() {
  var salesforceTemplateUrls = [];
  var salesforceDirectiveUrls = [];

  this.salesforceTemplateUrls = function(urlArray) {
    salesforceTemplateUrls = _.map(urlArray,function(url) {
      return url.toLowerCase();
    });
  };

  this.salesforceDirectiveUrls = function(urlArray) {
    salesforceDirectiveUrls = _.map(urlArray,function(url) {
      return url.toLowerCase();
    });
  };

  this.$get = ['$log',function sfTemplate($log) {
    // Add substrings which are unique to the script tags you wish to block.
    // Note: Regex support would be nice. The problem is that JS files have `.`
    //   as part of the file path, which is symbol reserved by Regex.
    var scriptSymbolBlacklist = [
      '.ajax4jsf.javascript.AjaxScript',
      '/js/perf/stub.js',
      '/sfdc/JiffyStubs.js'
    ];
    // Salesforce injects scripts into all Visualforce pages.
    //   e.g.:
    //   /faces/a4j/g/3_3_3.Finalorg.ajax4jsf.javascript.AjaxScript?rel=1392581006000
    //   /static/111213/js/perf/stub.js
    // Because we can't disable this, we strip them out before rendering them.
    //   If we don't, the browser will take ~250ms to fetch them before
    //   the template is rendered.
    var escapeRegexp = function(s) {
      return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    };
    var buildScriptRegex = function(scriptNames) {
      // Script names may use RexExp-reserved characters. Escape them.
      var scriptNamesEscaped = _.map(scriptNames, escapeRegexp);
      // Wrap in ".*" to match any part of script name.
      var scriptNamePatterns = _.map(scriptNamesEscaped, function(s) {
        return '.*' + s + '.*?';
      });
      // Change scripts to Regex pattern options syntax.
      //   e.g. [a, b] -> "(a|b)"
      var scriptNameOptions = "(" + scriptNamePatterns.join('|') + ")";
      var scriptTagPattern = '<script src="' + scriptNameOptions + '"><\/script>';
      var scriptTagRegex = new RegExp(scriptTagPattern, 'gi');
      return scriptTagRegex;
    };
    var stripScriptTags = function(htmlTemplate) {
      if (!angular.isString(htmlTemplate)) {
        return htmlTemplate;
      }
      var badScriptRegex = buildScriptRegex(scriptSymbolBlacklist);
      var cleanedHtmlTemplate = htmlTemplate.replace(badScriptRegex, '');
      // $log.debug('ngForce: Cleaned template:', cleanedHtmlTemplate);
      return cleanedHtmlTemplate;
    };
    var pluckBodyContent = function(htmlTemplate) {
      if (!angular.isString(htmlTemplate)) {
        return htmlTemplate;
      }
      var cleanedHtmlTemplate;
      if (htmlTemplate.indexOf('<body') == -1) {
        // If no <body> tag, then take everything after </head>
        var headRegex = /(.|[\n\r])*<\/head>/im;
        cleanedHtmlTemplate = htmlTemplate.replace(headRegex, '');
      } else {
        var bodyContentRegex = /<body[^>]*>((.|[\n\r])*)<\/body>/im;
        var matches = bodyContentRegex.exec(htmlTemplate);
        var bodyContent = matches[1];
        cleanedHtmlTemplate = bodyContent;
      }
      return cleanedHtmlTemplate;
    };

    return {
      response: function(response) {
        //Response succesfully returned, in form (e.g.)(mostly only top-level or relevant 2nd level bits included):
        //  {
        //    config: {
        //      ...
        //      url: '/the/url'
        //      ...
        //    },
        //    data: '<whatwasretrieved></whatwasretrieved>',
        //    headers: fn(),
        //    status: 200
        //  }
        
        //If the url is one of our salesforceTemplateUrls, manipulate the response,
        //  otherwise just return the response
        var urlParser = document.createElement('a'); //Use built in js url chunking, no point rolling this ourselves!
        urlParser.href = response.config.url.toLowerCase();
        var urlPathOnly = urlParser.pathname;
        var salesforceTemplateUrl = _.contains(salesforceTemplateUrls,urlPathOnly);
        var salesforceDirectiveUrl = _.contains(salesforceDirectiveUrls,urlPathOnly);
        $log.debug('sfTemplate: intercepted a url: \"', response.config.url, '\". PathOnly: \"', urlPathOnly,'\". salesforceTemplateUrl?: ',salesforceTemplateUrl,'. salesforceDirectiveUrl?: ',salesforceDirectiveUrl);
        if(salesforceTemplateUrl || salesforceDirectiveUrl) {
          response.data = stripScriptTags(response.data);
          $log.debug('sfTemplate: intercepted salesforceTemplateUrl or salesforceDirectiveUrl: \"',urlPathOnly,'\". Stripped script tags. response: ', response);
        }
        if(salesforceDirectiveUrl) {
          response.data = pluckBodyContent(response.data);
          $log.debug('sfTemplate: intercepted salesforceDirectiveUrl: \"',response.config.url,'\". Plucked body content. response: ', response);
        }
        return response;
      }
    };
  }];
});

angular.module('ngForce').factory('vfr', function($q, $rootScope, $log) {
	var vfRemote = {};
	if (typeof Visualforce != "object") {
		throw new Error('Visualforce is not available as an object! Did you forget to include the ngForce component?');
	}
	/*
	 * This section of code brought to you by Kevin O'Hara.
	 * May I one day be half as awesome as he is.
	 *
	 * Kevin o'Hara released premote, a nice lib for wrapping
	 * visualforce remoting calls in a promise interface. this
	 * function .send() is largely a gentle refactoring of his
	 * work, found in "premote" here:
	 *		https://github.com/kevinohara80/premote
	 * such that it locks into the ng exec loop and utilizes
	 * the angular $q service, itself based on the Q lib
	 * Kevin uses.
	 */

	vfRemote.send = function(remoteAction, options, nullok) {
		var namespace, controller, method;
		var Manager = Visualforce.remoting.Manager;
		var parts = remoteAction.split('.');

		if (options && typeof options !== 'object') {
			throw new Error('Options must be an object');
		}

		if (parts.length < 2) {
			throw new Error('Invalid Remote Action specified. Use Controller.MethodName or $RemoteAction.Controller.MethodName');
		} else {
			if (parts.length === 3) {
				namespace = parts[0];
				controller = parts[1];
				method = parts[2];
			} else if (parts.length === 2) {
				controller = parts[0];
				method = parts[1];
			}
		}

		return function() {
			var deferred = $q.defer();
			var args;

			if (arguments.length) {
				args = Array.prototype.slice.apply(arguments);
			} else {
				args = [];
			}

			args.splice(0, 0, remoteAction);
			args.push(function(result, event) {
				handleResultWithPromise(result, event, nullok, deferred);
			});

			if (options) {
				args.push(options);
			}

			Manager.invokeAction.apply(Manager, args);
			return deferred.promise;
		};
	};

	handleResultWithPromise = function(result, event, nullok, deferred) {
		if (result) {
			result = JSON.parse(result);
			if (Array.isArray(result) && result[0].message && result[0].errorCode) {
				deferred.reject(result);
				$rootScope.$safeApply();
			} else {
				deferred.resolve(result);
				$rootScope.$safeApply();
			}
		} else if (typeof nullok !== 'undefined' && nullok) {
			deferred.resolve();
			$rootScope.$safeApply();
		} else {
			deferred.reject({
				message: "Null returned by RemoteAction not called with nullOk flag",
				errorCode: "NULL_RETURN"
			});
			$rootScope.$safeApply();
		}
	};

	/*
	 * Setup for ngForce3 style func calls
	 */

	var standardOptions = {
		escape: false,
		timeout: 10000
	};

	// Bulk Create
	vfRemote.bulkCreate = vfRemote.send('ngForceController.bulkCreate', standardOptions, false);
	// Bulk Update
	vfRemote.bulkUpdate = vfRemote.send('ngForceController.bulkUpdate', standardOptions, false);
	// Create
	vfRemote.create = vfRemote.send('ngForceController.create', standardOptions, false);
	// Clone
	vfRemote.clone = vfRemote.send('ngForceController.sObjectKlone', standardOptions, false);
	// Delete
	vfRemote.del = vfRemote.send('ngForceController.del', standardOptions, true);
	// Describe
	vfRemote.describe = vfRemote.send('ngForceController.describe', standardOptions, false);
	// Describe Field Set
	vfRemote.describeFieldSet = vfRemote.send('ngForceController.describeFieldSet', standardOptions, false);
	// Describe Picklist Values 
	vfRemote.describePicklistValues = vfRemote.send('ngForceController.getPicklistValues', standardOptions, false);
	// Get Object Type
	vfRemote.getObjectType = vfRemote.send('ngForceController.getObjType', standardOptions, false);
	// Get Query Results as select2 data
	vfRemote.getQueryResultsAsSelect2Data = vfRemote.send('ngForceController.getQueryResultsAsSelect2Data', standardOptions, false);
	// Query
	vfRemote.query = vfRemote.send('ngForceController.query', {
		escape: false,
		timeout: 30000
	}, false);
	// Query from Fieldset
	vfRemote.queryFromFieldset = vfRemote.send('ngForceController.queryFromFieldSet', {
		escape: false,
		timeout: 30000
	}, false);
	// Retrieve a field list for a given object.
	vfRemote.retrieve = vfRemote.send('ngForceController.retrieve', standardOptions, false);
	// Search (SOSL)
	vfRemote.search = vfRemote.send('ngForceController.search', standardOptions, false);
	// Soql from Fieldset
	vfRemote.soqlFromFieldSet = vfRemote.send('ngForceController.soqlFromFieldSet', standardOptions, false);
	// Update
	vfRemote.update = vfRemote.send('ngForceController.updat', standardOptions, true);
	// Upsert
	vfRemote.upsert = vfRemote.send('ngForceController.upser', standardOptions, true);

	return vfRemote;
});

angular.module('ngForce').factory('sfr', function($q, $rootScope, Restangular, $log) {
	var sobjectEndpoints = []; // sObjectName => restangularObject
	var recordEndpoints = []; // recordId => restangularObject
	var sfRest = {
		model: function(modelName, recordId) {
			var baseResource = Restangular.
			setDefaultHeaders({
				'Authorization': 'Bearer ' + window.apiSid
			}).
			setBaseUrl('/services/data/v29.0/sobjects/').
			setRestangularFields({
				id: "Id",
				selfLink: 'attributes.url'
			});
			var resource;
			if (recordId)
			// ../sobjects/{modelName}/{recordId}
				resource = baseResource.one(modelName, recordId);
			else
			// ../sobjects/{modelName}
				resource = baseResource.all(modelName);
			return resource;
		},
		insert: function(sObjectName, recordToInsert, getLatest) {
			var $defer = $q.defer();

			// Guard against inputs.
			if (!angular.isString(sObjectName)) {
				$defer.reject('An sObject name is required to perform insert.');
				return $defer.promise;
			}
			var _getLatest = angular.isDefined(getLatest) ? getLatest : false; // Default to getLatest

			// Find the right REST endpoint for the sObject.
			var sObjectEndpoint = sobjectEndpoints[sObjectName];
			if (angular.isUndefined(sObjectEndpoint)) {
				sObjectEndpoint = this.model(sObjectName);
				sobjectEndpoints[sObjectName] = sObjectEndpoint;
			}

			// Insert the new record.
			return sObjectEndpoint.post(recordToInsert).then(function(response) {
				if (response.success) {
					$log.debug('ngForce: Created new ' + sObjectName + ' record:', response);
					$defer.resolve(response);
					if (!_getLatest) {
						return $defer.promise;
					}
					// Get the new record's fields.
					return sObjectEndpoint.get(response.id).then(function(newRecord) {
						$log.debug('ngForce: Inserted:', newRecord);
						return newRecord;
					});
				} else {
					$defer.reject("Insert failed: [" +
						response.errors + "] Full response: " + response);
				}
				return $defer.promise;
			});
		},
		update: function(sObjectName, recordToUpdate, getLatest) {
			var $defer = $q.defer();

			// Guard against inputs.
			if (!angular.isString(sObjectName)) {
				$defer.reject('An sObject name is required to perform an update.');
				return $defer.promise;
			}
			var _getLatest = angular.isDefined(getLatest) ? getLatest : false; // Default to getLatest

			var recordId = recordToUpdate.id || recordToUpdate.Id;
			if (!angular.isString(recordId)) {
				$defer.reject('An "Id" field is required to perform an update.');
				return $defer.promise;
			}

			// Find the right REST endpoint for the sObject.
			// Get the endpoint for the record.
			var recordEndpoint = recordEndpoints[recordId];
			if (angular.isUndefined(recordEndpoint)) {
				recordEndpoint = this.model(sObjectName, recordId);
				recordEndpoints[recordId] = recordEndpoint;
			}

			// Remove fields we can't update.
			var propsToIgnore = ['Id', 'LastReferencedDate', 'LastModifiedById',
				'LastModifiedDate', 'LastViewedDate', 'SystemModstamp',
				'CreatedById', 'CreatedDate', 'IsDeleted'
			];
			for (var i = 0; i < propsToIgnore.length; i++) {
				var p = propsToIgnore[i];
				delete recordToUpdate[p];
			}

			// Update the record.
			return recordEndpoint.patch(recordToUpdate).then(function(response) {
				$log.debug('ngForce: Patched ' + sObjectName + ' record:', recordToUpdate);
				if (!_getLatest) {
					$defer.resolve('Patch successful!');
					return $defer.promise;
				}
				// Get the new record's fields.
				return recordEndpoint.get().then(function(newRecord) {
					$log.debug('ngForce: Updated ' + sObjectName + ' record:', response);
					return newRecord;
				});
			});
		},
		delete: function(sObjectName, recordToDelete) {
			var $defer = $q.defer();

			// Guard against inputs.
			if (!angular.isString(sObjectName)) {
				$defer.reject('An sObject name is required to perform a delete.');
				return $defer.promise;
			}

			var recordId = recordToDelete.id || recordToDelete.Id;
			if (!angular.isString(recordId)) {
				$defer.reject('An "Id" field is required to perform a delete.');
				return $defer.promise;
			}

			// Find the right REST endpoint for the sObject.
			// Get the endpoint for the record.
			var recordEndpoint = recordEndpoints[recordId];
			if (angular.isUndefined(recordEndpoint)) {
				recordEndpoint = this.model(sObjectName, recordId);
				recordEndpoints[recordId] = recordEndpoint;
			}

			// Delete the record.
			return recordEndpoint.remove().then(function(response, err) {
				$log.debug('ngForce: Deleted ' + sObjectName + ' record:', recordId);
				$defer.resolve('Delete successful!');
				return $defer.promise;
			});
		}
	};
	return sfRest;
});

angular.module('ngForce').factory('sfrquery', function($q, $rootScope, $log, Restangular, encodeUriQuery) {
	var sfrquery = Restangular.withConfig(function(RestangularConfigurer) {
		RestangularConfigurer.setDefaultHttpFields({
			cache: false
		});
		RestangularConfigurer.setBaseUrl('/services/data/v29.0/');
		RestangularConfigurer.setDefaultHeaders({
			'Authorization': 'Bearer ' + window.apiSid
		});
		// With the SF "query" endpoint, it may not return the whole set
		//   of requested records. In this case, it will send one page of
		//   records, the total number of records, and a URL we can use to
		//   get the remaining pages of records.
		// Therefore, we can not use an extractor, as it will not let us
		//   access the "totalSize" and "nextRecordsUrl" attributes, but
		//   only give us the contents of the "records" attributes.
		// RestangularConfigurer.setResponseExtractor(function(response) {
		//	return response.records;
		// });
	}).setRestangularFields({
		id: "Id",
		selfLink: 'attributes.url'
	}).oneUrl('query', '/services/data/v29.0/query');

	sfrquery.query = function(query, cacheEnabled) {
		cacheEnabled = typeof cacheEnabled !== 'undefined' ? cacheEnabled : false;
		return sfrquery.withHttpConfig({
			cache: cacheEnabled
		}).get({
			q: query
		}).then(function(response) {
			return response.records;
		});
	};

	/**
	 * queryAll recursively calls through a series of salesforce Rest calls to retrieve
	 * all the rows resulting from an initial query.
	 * @param  {String} queryStringOrQueryLocator Either the query string -- on initial call, or the query locator
	 * @param  {Boolean} cacheEnabled             True - we use cache, false - no cache for you.
	 * @param  {Deferred} deferred                Deferred object - null on initial call
	 * @param  {Array} results                    Array of rows returned by all completed calls. Null on inital call
	 * @return {Promise}                          Returns a Promise!
	 */
	sfrquery.queryAll = function(queryStringOrQueryLocator, cacheEnabled, deferred, results) {
		// Setup the 3 optional params - Default to true for caching
		if (angular.isUndefined(cacheEnabled)) {
			cacheEnabled = true;
		}
		// On initial call, this recursive function will not be called with a results array, create it.
		if (angular.isUndefined(results)) {
			results = [];
		}
		// On the initial call, this recursive function will not have a deferred object, create it here.
		if (angular.isUndefined(deferred)) {
			deferred = $q.defer();
		}
		// On initial call, this method will have a query string, not a query locator. 
		// In those situations, we need to pre-pend "?q=" to the querystring. 
		// We determine whether or not to do this, by inspecting the first six characters
		// We *expect* that "Select" is the first word of a queryAll query string.
		if (queryStringOrQueryLocator.trim().substring(0, 6).toLowerCase() === 'select') {
			queryStringOrQueryLocator = "?q=" + encodeUriQuery(queryStringOrQueryLocator);
		}

		// Here starts the functional body of the method.
		sfrquery.withHttpConfig({
			cache: cacheEnabled
			// Go request the data from SF.
		}).customGET(queryStringOrQueryLocator)
			.then(function(data) {
				// Add to the results array. Don't sorting or unique.
				results = results.concat(data.records);
				// Inspect the returned data, looking to see if we're "done" i.e.: we've recieved all the pages
				// of data. 
				if (!data.done) {
					// If we're not done, recursively call this method with the query locator returned by the previous call.
					// Making sure to pass on our cache parameters, our deferred object and the results array.
					sfrquery.queryAll(_.last(data.nextRecordsUrl.split("/")), cacheEnabled, deferred, results);
				} else {
					// if we are done, resolve the deferred object.
					deferred.resolve(results);
					return deferred.promise;
				}
			}, function(error) {
				// any errors are handled here.
				return deferred.reject(error);
			});

		// this deferred.notify call allows us in theory to update the ui with a "we've made 5 out of 7 calls" type message.
		deferred.notify();
		// regardless, return a promise!
		return deferred.promise;
	};

	return sfrquery;
});

angular.module('ngForce').factory('encodeUriQuery', function() {

	// We are using Restangular, which uses the following functions to encode URI.
	// This was copy-pasted directly from Restangular, in the `Path` object,
	//   which is used in the `urlCreatorFactory`.
	function sortedKeys(obj) {
		var keys = [];
		for (var key in obj) {
			if (obj.hasOwnProperty(key)) {
				keys.push(key);
			}
		}
		return keys.sort();
	}

	function forEachSorted(obj, iterator, context) {
		var keys = sortedKeys(obj);
		for (var i = 0; i < keys.length; i++) {
			iterator.call(context, obj[keys[i]], keys[i]);
		}
		return keys;
	}

	function encodeUriQuery(val, pctEncodeSpaces) {
		return encodeURIComponent(val).
		replace(/%40/gi, '@').
		replace(/%3A/gi, ':').
		replace(/%24/g, '$').
		replace(/%2C/gi, ',').
		replace(/%20/g, (pctEncodeSpaces ? '%20' : '+'));
	}

	return encodeUriQuery;
});

angular.module('ngForce').factory('sfrBackend', function($q, $rootScope, $log, $httpBackend, encodeUriQuery) {

	// Note: This function is identical to the one in the `sfTemplate` service.
	var escapeRegexp = function(s) {
		return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
	};

	var sfrBackend = {

		whenGetPage: function(pageName, responsePage) {
			var _pageName = pageName;
			// Ensure pageName is prefixed with "/page/"
			if (_pageName.indexOf("/apex/") == -1) {
				_pageName = "/apex/" + _pageName;
			}
			var escapedPageName = escapeRegexp(_pageName);
			$httpBackend.whenGET(new RegExp(escapedPageName, "i")).respond(responsePage);
		},

		whenQuery: function(sObjectName, resRecords, soqlClauses) {

			// Guards
			// We want arrays, but will handle receiving single items.
			var _soqlClauses = angular.isString(soqlClauses) ? [soqlClauses] : soqlClauses;
			var _resRecords = !angular.isArray(resRecords) ? [resRecords] : resRecords;

			var encodedSoqlRegex = "query.*FROM\\++" + sObjectName;

			if (typeof _soqlClauses != 'undefined' && _soqlClauses !== null) {
				// Encode clauses using the same encoding as Restangular, which we use.
				var encodedSoqlClauses = _.chain(_soqlClauses)
					.map(function(value, key) {
						return encodeUriQuery(value);
					})
					.foldl(function(memo, value) {
						return memo += value;
					})
					.value();
				// The URI encoding uses RegExp characters, such as `+` and `(`. Escape them.
				encodedSoqlRegex += "\\++WHERE.*" + escapeRegexp(encodedSoqlClauses);
			}

			$httpBackend.whenGET(new RegExp(encodedSoqlRegex, "i")).respond(200, {
				"totalSize": _resRecords.length,
				"done": true,
				"records": _resRecords
			});
		},

		// Tell $httpBackend to respond to a query for the specified object
		//   with the specified records if the query contains the specified
		//   clauses in its WHERE predicate.
		expectQuery: function(sObjectName, resRecords, soqlClauses) {

			// Guards
			// We want arrays, but will handle receiving single items.
			var _soqlClauses = angular.isString(soqlClauses) ? [soqlClauses] : soqlClauses;
			var _resRecords = !angular.isArray(resRecords) ? [resRecords] : resRecords;

			var encodedSoqlRegex = "query.*FROM\\++" + sObjectName;

			if (typeof _soqlClauses != 'undefined' && _soqlClauses !== null) {
				// Encode clauses using the same encoding as Restangular, which we use.
				var encodedSoqlClauses = _.chain(_soqlClauses)
					.map(function(value, key) {
						return encodeUriQuery(value);
					})
					.foldl(function(memo, value) {
						return memo += value;
					})
					.value();
				// The URI encoding uses RegExp characters, such as `+` and `(`. Escape them.
				encodedSoqlRegex += "\\++WHERE.*" + escapeRegexp(encodedSoqlClauses);
			}

			$httpBackend.expectGET(new RegExp(encodedSoqlRegex, "i")).respond(200, {
				"totalSize": _resRecords.length,
				"done": true,
				"records": _resRecords
			});
		},

		expectInsert: function(sObjectName, resRecords, getLatest) {
			// We want arrays, but will handle receiving single items.
			var _resRecords = !angular.isArray(resRecords) ? [resRecords] : resRecords;
			var _getLatest = getLatest || true; // Default to getLatest

			angular.forEach(_resRecords, function(resRecord, key) {
				$httpBackend.expectPOST(new RegExp(sObjectName, "i")).respond(201, {
					"id": resRecord.Id,
					"success": true,
					"errors": []
				});
				if (!_getLatest) {
					$httpBackend.expectGET(new RegExp(sObjectName + "/" + resRecord.Id, "i")).respond(200, resRecord);
				}
			});
		},

		expectDelete: function(sObjectName, recordIds) {
			// We want arrays, but will handle receiving single items or nothing.
			recordIds = recordIds || "";
			var _recordIds = !angular.isArray(recordIds) ? [recordIds] : recordIds;
			angular.forEach(_recordIds, function(recordId) {
				$httpBackend.expectDELETE(new RegExp(sObjectName + "/" + recordId, "i")).respond(201, {});
			});
		}
	};
	return sfrBackend;
});

angular.module('ngForce').factory('sfranalytics', function($q, $rootScope, Restangular) {
	var analytics = Restangular.withConfig(function(RestangularConfigurer) {
		RestangularConfigurer.setBaseUrl('/services/data/v29.0/analytics/');
		RestangularConfigurer.setDefaultHeaders({
			'Authorization': 'Bearer ' + window.apiSid
		});
	}).setRestangularFields({
		id: "Id"
	}).all('reports');

	return analytics;
});