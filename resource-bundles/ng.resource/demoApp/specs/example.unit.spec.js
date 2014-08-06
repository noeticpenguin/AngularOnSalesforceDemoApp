describe("DemoUnitTest", function() {

	var x = 0;
	var y = {
		inc: function(x) {
			return x + 1;
		}
	};

	beforeEach(function() {
		x += x + 1;
	});

	it("should start with the value of 1", function() {
		expect(x).toEqual(1);
	});

	it("should be able to increment by 1, using the y.inc method", function() {
		x = y.inc(x);
		expect(x).toEqual(2);
	});

	afterEach(function() {
		x = 0;
	});

});