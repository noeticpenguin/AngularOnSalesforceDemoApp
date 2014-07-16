describe('angularjs homepage', function() {

	beforeEach(function() {
		browser.get('http://juliemr.github.io/protractor-demo/');
	});


	it('should add one and two', function() {
		// browser.get('http://juliemr.github.io/protractor-demo/');
		element(by.model('first')).sendKeys(1);
		element(by.model('second')).sendKeys(2);

		element(by.id('gobutton')).click();

		expect(element(by.binding('latest')).getText()).
		toEqual('3'); // This is wrong!
	});

	it('should add one and two', function() {
		// browser.get('http://juliemr.github.io/protractor-demo/');
		element(by.model('first')).sendKeys(55);
		element(by.model('second')).sendKeys(5);

		element(by.id('gobutton')).click();

		expect(element(by.binding('latest')).getText()).
		toEqual('60'); // This is wrong!

		var historyObjs = element(by.repeater("result in memory").column(''));
		expect(historyObjs.length).toEqual(2);

	});

});