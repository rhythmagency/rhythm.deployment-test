/*
 Override the console.error method to prevent stack-traces
 from appearing in the report. This may have some adverse
 effects such as not being able to show the output of
 errors when they actually do occur.
 */
console.error = function (args) {
};

var _ = require('lodash'),
	should = require('should'),
	request = require('request'),
	Browser = require('zombie'),
	https = require('https'),
	colors = require('colors'),
	DOMParser = require('xmldom').DOMParser,
	browser = new Browser(),

// This should be set as an environment variable on the local system
	googleApiKey = process.env.GOOGLE_API_KEY,

// This is set from index.js and passed in from a command-line argument.
	domain = process.env.RHYTHM_DEPLOYMENT_TEST_DOMAIN,

	url = 'http://' + domain + '/',
	urlSSL = 'https://' + domain + '/',
	data = {},
	timeout = 15000,

	fnDownloadData = function (property, message, url) {
		before(function (done) {
			this.timeout(timeout);

			console.log('    ✓ ' + message.blue);

			request.get({
				'url': url,
				'headers': {
					'content-type': 'application/json; charset=UTF-8',
					'user-agent': 'node.js'
				}
			}, function (err, res, body) {
				data[property] = JSON.parse(body);

				done();
			});
		});
	},
	fnCheckUrlExists = function (file) {
		it('Should contain a ' + file + ' file', function (done) {
			request.get(url + file, function (err, res) {
				should.not.exist(err);

				res.statusCode.should.equal(200);

				done();
			});
		});
	};

describe('Checking ' + domain, function () {
	if (googleApiKey) {
		fnDownloadData('pagespeed', 'Checking Google PageSpeed...', 'https://www.googleapis.com/pagespeedonline/v1/runPagespeed?key=' + googleApiKey + '&url=' + url);
		fnDownloadData('htmlValidator', 'Checking W3C HTML Validator...', 'http://validator.w3.org/check?output=json&uri=' + url);
		fnDownloadData('cssValidator', 'Checking W3C CSS Validator...', 'http://jigsaw.w3.org/css-validator/validator?warning=0&profile=css3&output=json&uri=' + url);
		fnCheckUrlExists('favicon.ico');
		fnCheckUrlExists('sitemap.xml');

		it('Should have an images in the sitemap.xml', function (done) {
			this.timeout(timeout);

			request.get(url + 'sitemap.xml', function (err, res, body) {
				should.not.exist(err);

				res.statusCode.should.equal(200);

				var document = new DOMParser().parseFromString(body),
					nodes = document.getElementsByTagNameNS('http://www.google.com/schemas/sitemap-image/1.1', 'image');

				nodes.length.should.be.greaterThan(0);

				done();
			});
		});

		it('Should contain a 404 page', function (done) {
			request.get(url + 'xxxxxxxxxxxxxxxxxx', function (err, res) {
				should.not.exist(err);

				res.statusCode.should.equal(404);

				done();
			});
		});

		it('Should have a PageSpeed score greater than 79', function () {
			data.pagespeed.score.should.be.greaterThan(79).and.be.a.Number;
		});

		it('Should have gzip compression enabled', function () {
			data.pagespeed.formattedResults.ruleResults.EnableGzipCompression.ruleImpact.should.be.lessThan(0.5);
		});

		it('Should leverage browser caching', function () {
			data.pagespeed.formattedResults.ruleResults.LeverageBrowserCaching.ruleImpact.should.be.lessThan(0.5);
		});

		it('Should have low server response time', function () {
			data.pagespeed.formattedResults.ruleResults.MainResourceServerResponseTime.ruleImpact.should.be.lessThan(0.5);
		});

		it('Should have minified CSS', function () {
			data.pagespeed.formattedResults.ruleResults.MinifyCss.ruleImpact.should.be.lessThan(0.5);
		});

		it('Should have minified HTML', function () {
			data.pagespeed.formattedResults.ruleResults.MinifyHTML.ruleImpact.should.be.lessThan(0.5);
		});

		it('Should have minified JavaScript', function () {
			data.pagespeed.formattedResults.ruleResults.MinifyJavaScript.ruleImpact.should.be.lessThan(0.5);
		});

		it('Should not have render-blocking resources', function () {
			data.pagespeed.formattedResults.ruleResults.MinimizeRenderBlockingResources.ruleImpact.should.be.lessThan(0.5);
		});

		it('Should have optimized images', function () {
			data.pagespeed.formattedResults.ruleResults.OptimizeImages.ruleImpact.should.be.lessThan(0.5);
		});

		it('Should not have HTML validation errors', function () {
			data.htmlValidator.messages.length.should.equal(0);
		})

		it('Should not have CSS validation errors', function () {
			data.cssValidator.cssvalidation.validity.should.be.ok;
			data.cssValidator.cssvalidation.result.errorcount.should.equal(0);
		});

		it('Should have Google Analytics installed', function (done) {
			this.timeout(timeout);

			browser.visit(url, function () {
				var _gaq = browser.evaluate('window["_gaq"]');

				_.isObject(_gaq).should.be.ok;

				should(_gaq).have.property('I');
				should(_gaq.I).have.property('prefix', 'ga.');

				done();
			});
		});

		it('Should have apple touch icons', function (done) {
			this.timeout(timeout);

			browser.visit(url, function () {
				var queries = _.chain([72, 114, 144])
					.map(function (size) {
						var dimensions = size + 'x' + size,
							sizes = '[sizes="' + dimensions + '"]',
							href = '[href="/apple-touch-icon-' + dimensions + '.png"]',
							hrefPrecomposed = '[href="/apple-touch-icon-' + dimensions + '-precomposed.png"]';

						return 'link[rel="apple-touch-icon"]' + sizes + href + ',link[rel="apple-touch-icon-precomposed"]' + sizes + hrefPrecomposed;
					})
					.value();

				queries.push('link[rel="apple-touch-icon"][href="/apple-touch-icon.png"],link[rel="apple-touch-icon-precomposed"][href="/apple-touch-icon-precomposed.png"]');

				_.each(queries, function (query) {
					var icons = browser.queryAll(query);

					icons.length.should.be.greaterThan(0);
				});

				done();
			});
		});

		it('Should have an SSL certificate installed', function (done) {
			request.get(urlSSL, function (err, res) {
				should.not.exist(err);

				res.statusCode.should.equal(200);

				done();
			});
		});
	} else {
		it('Should have local environment variable GOOGLE_API_KEY set', function () {
			googleApiKey.should.be.ok;
		});
	}
});