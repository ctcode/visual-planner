function mainCtrl($scope)
{
	var gAccount = new AuthAccount();
	gAccount.authClientID = '304094492573-vgmnc6pr5tf1va809qpoc6sri6amiptk.apps.googleusercontent.com';
	gAccount.authScope = 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/drive.appdata';

	var gAppData = new AuthAppData();
	gAppData.file_name = "settings.json";
	gAppData.setDefault({banner_text: "visual-planner", vipconfig: new VipGridConfig()});

	$scope.multi_col_count_options = {1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 8: 8, 10: 10, 12: 12};
	$scope.settings = gAppData.getAppData();
	$scope.signed_in = false;
	$scope.busy = false;

	$scope.sign_msg = "Signing In...";
	gAccount.Connect();

	gAccount.onSignIn = function() {
		$scope.sign_msg = gAccount.getEmail();
		$scope.$apply();
		ReadAppdata();
	}

	gAccount.onSignOut = function() {
		gAppData.setAppData(null);
		$scope.settings = gAppData.getAppData();
		$scope.form.$setPristine(true);
		$scope.sign_msg = "Signed Out";
		$scope.signed_in = false;
		$scope.view = 'grid';
		$scope.$apply();
		initGrid();
	}

	gAccount.onError = function(msg) {
		alert("Account Error: " + msg);
	}

	$scope.onclickSettings = function() {
		$scope.view = 'settings';
		ga_hit("view", "settings/" + $scope.signed_in);
	}

	$scope.onclickSignOut = function() {
		gAccount.SignOut();
	}

	$scope.onclickSave = function() {
		$scope.busy = true;
		WriteAppdata();
	}

	$scope.onclickCancel = function() {
		$scope.settings = gAppData.getAppData();
		$scope.form.$setPristine(true);
		$scope.view = 'grid';
	}

	function ReadAppdata() {
		gAppData.Read(
			function() {
				$scope.settings = gAppData.getAppData();
				$scope.form.$setPristine(true);
				$scope.signed_in = true;
				$scope.view = 'grid';
				$scope.$apply();
				initGrid();
			},
			function() {alert("Error loading settings.");}
		);
	}

	function WriteAppdata() {
		gAppData.Write(
			$scope.settings,
			function() {
				$scope.busy = false;
				$scope.form.$setPristine(true);
				$scope.view = 'grid';
				$scope.$apply();
				initGrid();
			},
			function() {alert("Error saving settings.");}
		);
	}

	function initGrid() {
		var e = document.getElementById("grid");
		e.innerHTML = "";
		
		vip_init_grid(e);

		if ($scope.signed_in)
		{
			var gCal = new AuthCal();
			gCal.onError = onCalError;
			gCal.onReceiveEvents = vip.grid.rcvEvents.bind(vip.grid);
			vip.grid.reqCalEvents = gCal.getEvents.bind(gCal);
		}

		vip.grid.cfg = gAppData.getAppData().vipconfig;
		vip.grid.create();
		
		ga_hit("view", "grid/" + $scope.signed_in);
	}

	var cal_error_notified = false;
	function onCalError() {
		if (cal_error_notified)
			return;

		alert("Error loading calendar events.\n\nPlease reload the page.");
		cal_error_notified = true;
	}
}
