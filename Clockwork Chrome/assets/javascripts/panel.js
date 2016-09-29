Clockwork.controller('PanelController', function($scope, $http, toolbar)
{
	$scope.activeId = null;
	$scope.requests = {};

	$scope.activeCookies = [];
	$scope.activeDatabaseQueries = [];
	$scope.activeEmails = [];
	$scope.activeGetData = [];
	$scope.activeHeaders = [];
	$scope.activeLog = [];
	$scope.activePostData = [];
	$scope.activeRequest = [];
	$scope.activeRoutes = [];
	$scope.activeSessionData = [];
	$scope.activeTimeline = [];
	$scope.activeTimelineLegend = [];
	$scope.activeViews = [];
	$scope.activeFilesystemData = [];
	$scope.activeNetworkData = [];
	$scope.activeCacheData = [];
	$scope.activeDynamicData = [];
	$scope.activeTotalDatabaseCount = 0;

	$scope.showIncomingRequests = true;

	$scope.init = function(type)
	{
		if (type == 'chrome-extension') {
			$scope.initChrome();
		} else {
			$scope.initStandalone();
		}

		this.createToolbar();
	};

	$scope.initChrome = function()
	{
		key('⌘+k, ctrl+l', function() {
			$scope.$apply(function() {
				$scope.clear();
			});
		});

		chrome.devtools.network.onRequestFinished.addListener(function(request)
		{
			var headers = request.response.headers;
			var requestId = headers.find(function(x) { return x.name.toLowerCase() == 'x-clockwork-id'; });
			var requestVersion = headers.find(function(x) { return x.name.toLowerCase() == 'x-clockwork-version'; });
            		var requestPath = headers.find(function(x) { return x.name.toLowerCase() == 'x-clockwork-path'; });

			var requestHeaders = {};
			$.each(headers, function(i, header) {
				if (header.name.toLowerCase().indexOf('x-clockwork-header-') === 0) {
					originalName = header.name.toLowerCase().replace('x-clockwork-header-', '');
					requestHeaders[originalName] = header.value;
				}
			});

			if (requestVersion !== undefined) {
				var baseUrl = request.request.url;
				if ($scope.baseUrl) {
					baseUrl = $scope.baseUrl
				}
				var uri = new URI(baseUrl);

				uri.subdomain(uri.subdomain().replace(/\.checkout$/, '')); // Handle checkout pages
				uri.subdomain(uri.subdomain().replace(/^assets-/, '')); // Handle asset loads

				var path = ((requestPath) ? requestPath.value : '/__clockwork/') + requestId.value;

				path = path.split('?');
				uri.pathname(path[0]);
				if (path[1]) {
					uri.query(path[1]);
				}

				chrome.extension.sendRequest({action: 'getJSON', url: uri.toString(), headers: requestHeaders}, function(data){
					$scope.$apply(function(){
						$scope.addRequest(requestId.value, data);
					});
				});
			}
		});
	};

	$scope.initStandalone = function()
	{
		// generate a hash of get params from query string (http://stackoverflow.com/questions/901115/how-can-i-get-query-string-values)
		var getParams = (function(a) {
			if (a === '') return {};
			var b = {};
			for (var i = 0; i < a.length; ++i) {
				var p = a[i].split('=');
				if (p.length != 2) continue;
				b[p[0]] = decodeURIComponent(p[1].replace(/\+/g, " "));
			}
			return b;
		})(window.location.search.substr(1).split('&'));

		if (getParams['id'] === undefined)
			return;

		$http.get('/__clockwork/' + getParams['id']).success(function(data){
			$scope.addRequest(getParams['id'], data);
		});
	};

	$scope.createToolbar = function()
	{


		toolbar.createTextbox('Base uri', 'base-uri', function(){
			var url = $(this).val();
			if (url.substring(0, 4) == "http"){
				$scope.baseUrl = url;
			} else {
				$scope.baseUrl = false;
			}

		});

		toolbar.createTextbox(' Request id', 'request-id', function(){
			$scope.requestId = $(this).val();
		});
		toolbar.createButton('download', 'Request', function()
		{
			var $button = $(this).find('i');
			$button.toggleClass('fa-download', false);
			$button.toggleClass('fa-download', false);
			$button.toggleClass('fa-cog', true);
			$button.toggleClass('fa-spin', true);

			$scope.$apply(function() {
				var base = $scope.baseUrl ? $scope.baseUrl : '/';

				$http.get(base + '/__clockwork/' + $scope.requestId).success(function(data){
					$scope.addRequest($scope.requestId, data);
				}).finally(function(){
					$button.toggleClass('fa-download', true)
					$button.toggleClass('fa-cog', false);
					$button.toggleClass('fa-spin', false);
				});
			});
		});
		toolbar.createButton('ban', 'Clear', function()
		{
			$scope.$apply(function() {
				$scope.clear();
			});
		});

		$('.toolbar').replaceWith(toolbar.render());
	};

$scope.figureOutData = function(data){
	return data;
}
	$scope.addRequest = function(requestId, data)
	{
		data.responseDurationRounded = data.responseDuration ? Math.round(data.responseDuration) : 0;
		data.databaseDurationRounded = data.databaseDuration ? Math.round(data.databaseDuration) : 0;

		data.cookies = $scope.createKeypairs(data.cookies);
		data.databaseQueries = $scope.processCoalesceDatabaseQueries($scope.createKeypairs(data.databaseQueries));
		data.totalQueries = $scope.activeTotalDatabaseCount;
		data.emails = $scope.processEmails(data.emailsData);
		data.getData = $scope.createKeypairs(data.getData);
		data.headers = $scope.processHeaders(data.headers);
		data.log = $scope.processLog(data.log);
		data.postData = $scope.createKeypairs(data.postData);
		data.sessionData = $scope.createKeypairs(data.sessionData);
		data.timeline = $scope.processTimeline(data);
		data.views = $scope.processViews(data.viewsData);
		data.filesystemData = $scope.createKeypairs(data.filesystemData);
		data.networkData = $scope.createKeypairs(data.networkData);
		data.cacheData = data.cacheData;
		data.dynamicData = $scope.figureOutData(data.dynamicData);

		data.errorsCount = $scope.getErrorsCount(data);
		data.warningsCount = $scope.getWarningsCount(data);

		$scope.requests[requestId] = data;

		if ($scope.showIncomingRequests) {
			$scope.setActive(requestId);
		}
	};

	$scope.clear = function()
	{
		$scope.requests = {};
		$scope.activeId = null;

		$scope.activeCookies = [];
		$scope.activeDatabaseQueries = [];
		$scope.activeEmails = [];
		$scope.activeGetData = [];
		$scope.activeHeaders = [];
		$scope.activeLog = [];
		$scope.activePostData = [];
		$scope.activeRequest = [];
		$scope.activeRoutes = [];
		$scope.activeSessionData = [];
		$scope.activeTimeline = [];
		$scope.activeTimelineLegend = [];
		$scope.activeViews = [];
		$scope.activeFilesystemData = [];
		$scope.activeNetworkData = [];
		$scope.activeCacheData = [];
		$scope.activeDynamicData = [];
		$scope.activeTotalDatabaseCount = 0;

		$scope.showIncomingRequests = true;
	};

	$scope.setActive = function(requestId)
	{
		$scope.activeId = requestId;

		$scope.activeCookies = $scope.requests[requestId].cookies;
		$scope.activeDatabaseQueries = $scope.requests[requestId].databaseQueries;
		$scope.activeTotalDatabaseCount = $scope.requests[requestId].totalQueries;
		$scope.activeEmails = $scope.requests[requestId].emails;
		$scope.activeGetData = $scope.requests[requestId].getData;
		$scope.activeHeaders = $scope.requests[requestId].headers;
		$scope.activeLog = $scope.requests[requestId].log;
		$scope.activePostData = $scope.requests[requestId].postData;
		$scope.activeRequest = $scope.requests[requestId];
		$scope.activeRoutes = $scope.requests[requestId].routes;
		$scope.activeSessionData = $scope.requests[requestId].sessionData;
		$scope.activeTimeline = $scope.requests[requestId].timeline;
		$scope.activeTimelineLegend = $scope.generateTimelineLegend();
		$scope.activeViews = $scope.requests[requestId].views;
		$scope.activeFilesystemData = $scope.requests[requestId].filesystemData;
		$scope.activeNetworkData = $scope.requests[requestId].networkData;
		$scope.activeCacheData = $scope.requests[requestId].cacheData;
		$scope.activeDynamicData = $scope.requests[requestId].dynamicData;

		var lastRequestId = Object.keys($scope.requests)[Object.keys($scope.requests).length - 1];

		$scope.showIncomingRequests = requestId == lastRequestId;
	};

	$scope.getClass = function(requestId)
	{
		if (requestId == $scope.activeId) {
			return 'selected';
		} else {
			return '';
		}
	};

	$scope.showDatabaseConnectionColumn = function()
	{
		var connections = {};

		$scope.activeDatabaseQueries.forEach(function(query)
		{
			connections[query.connection] = true;
		});

		return Object.keys(connections).length > 1;
	};

	$scope.createKeypairs = function(data)
	{
		var keypairs = [];

		if (!(data instanceof Object)) {
			return keypairs;
		}

		$.each(data, function(key, value){
			keypairs.push({name: key, value: value});
		});

		return keypairs;
	};

	$scope.generateTimelineLegend = function()
	{
		var items = [];

		var maxWidth = $('.data-grid-details').width() - 230;
		var labelCount = Math.floor(maxWidth / 80);
		var step = $scope.activeRequest.responseDuration / (maxWidth - 20);

		for (var j = 2; j < labelCount + 1; j++) {
			items.push({
				left: (j * 80 - 35).toString(),
				time: Math.round(j * 80 * step).toString()
			});
		}

		if (maxWidth - ((j - 1) * 80) > 45) {
			items.push({
				left: (maxWidth - 35).toString(),
				time: Math.round(maxWidth * step).toString()
			});
		}

		return items;
	};

	$scope.processDatabaseQueries = function(data)
	{
		if (!(data instanceof Object)) {
			return [];
		}

		$.each(data, function(key, value) {
			value.model = value.model || '-';
			value.shortModel = value.model ? value.model.split('\\').pop() : '-';
			value.fullPath = value.file && value.line ? value.file.replace(/^\//, '') + ':' + value.line : undefined;
			value.shortPath = value.fullPath ? value.fullPath.split(/[\/\\]/).pop() : undefined;
		});

		return data;
	};

	$scope.processCoalesceDatabaseQueries = function(data)
	{
		if (!(data instanceof Object)) {
			return [];
		}

		$scope.activeTotalDatabaseCount = 0;

		var ret = {};
		$.each(data, function (key, value){
			value.query = value.value;
			var query = value.value;
			var sql = value.name;


			var firstQuery = query[0];
			value.model = firstQuery.model || '-';
			value.shortModel = firstQuery.model ? firstQuery.model.split('\\').pop() : '-';
			value.fullPath = firstQuery.file && firstQuery.line ? firstQuery.file.replace(/^\//, '') + ':' + firstQuery.line : undefined;
			value.shortPath = firstQuery.fullPath ? firstQuery.fullPath.split(/[\/\\]/).pop() : undefined;

				if(!ret[sql]) {
					value.count = 0;
					ret[sql] = value;
					ret[sql].duration = 0;
				}

				var params = [];
				$.each(query, function (key, value){
						value.bindings._meta_ = {
							file: value.shortPath,
							model: value.model,
							duration: value.duration,
							connection: value.connection
						};
						params.push(value.bindings);

						ret[sql].count += 1;
						ret[sql].duration += value.duration;
						ret[sql].connection = value.connection;
				});

				ret[sql].params = params;

				var hash = {};
				$.each(params, function(key, value){ // each time the query was run
						var values = [];
						$.each(value, function(nothing, needed){ values.push(needed); });
						hash[values.join()] = true;
				});

				var unique = Object.keys(hash).length;
				var total = ret[sql].params.length;

				if (unique === 1 && total > 1) {
					ret[sql].duplication = 100;
				} else {
					ret[sql].duplication = Math.floor(100 * (1 - (unique / total)));
				}

				$scope.activeTotalDatabaseCount += ret[sql].count;
		});


		var things = [];
		for (var key in ret) {
 			if (!ret.hasOwnProperty(key)) {
				continue;
			}

			things.push(ret[key]);
		}

		return things;
	};

	$scope.processEmails = function(data)
	{
		var emails = [];

		if (!(data instanceof Object)) {
			return emails;
		}

		$.each(data, function(key, value)
		{
			if (!(value.data instanceof Object)) {
				return;
			}

			emails.push({
				'to':      value.data.to,
				'subject': value.data.subject,
				'headers': value.data.headers
			});
		});

		return emails;
	};

	$scope.processHeaders = function(data)
	{
		var headers = [];

		if (!(data instanceof Object)) {
			return headers;
		}

		$.each(data, function(key, value){
			key = key.split('-').map(function(value){
				return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
			}).join('-');

			$.each(value, function(i, value){
				headers.push({name: key, value: value});
			});
		});

		return headers;
	};

	$scope.processLog = function(data)
	{
		if (!(data instanceof Object)) {
			return [];
		}

		$.each(data, function(key, value) {
			value.time = new Date(value.time * 1000);
			value.context = value.context !== '[]' ? value.context : undefined;
			value.fullPath = value.file && value.line ? value.file.replace(/^\//, '') + ':' + value.line : undefined;
			value.shortPath = value.fullPath ? value.fullPath.split(/[\/\\]/).pop() : undefined;
		});

		return data;
	};

	$scope.processTimeline = function(data)
	{
		var j = 1;
		var maxWidth = $('.data-grid-details').width() - 230 - 20;

		var timeline = [];

		$.each(data.timelineData, function(i, value){
			value.style = 'style' + j.toString();
			value.left = (value.start - data.time) * 1000 / data.responseDuration * 100;
			value.width = value.duration / data.responseDuration * 100;

			value.durationRounded = Math.round(value.duration);

			if (value.durationRounded === 0) {
				value.durationRounded = '< 1';
			}

			if (i == 'total') {
				timeline.unshift(value);
			} else {
				timeline.push(value);
			}

			if (++j > 3) j = 1;
		});

		return timeline;
	};

	$scope.processViews = function(data)
	{
		var views = [];

		if (!(data instanceof Object)) {
			return views;
		}

		$.each(data, function(key, value)
		{
			if (!(value.data instanceof Object)) {
				return;
			}

			views.push({
				'name': value.data.name,
				'data': value.data.data
			});
		});

		return views;
	};

	$scope.getErrorsCount = function(data)
	{
		var count = 0;

		$.each(data.log, function(index, record)
		{
			if (record.level == 'error') {
				count++;
			}
		});

		return count;
	};

	$scope.getWarningsCount = function(data)
	{
		var count = 0;

		$.each(data.log, function(index, record)
		{
			if (record.level == 'warning') {
				count++;
			}
		});

		return count;
	};

	angular.element(window).bind('resize', function() {
		$scope.$apply(function(){
			$scope.activeTimelineLegend = $scope.generateTimelineLegend();
		});
    });
});
