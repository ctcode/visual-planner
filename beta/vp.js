function mainCtrl($scope)
{
	var gAccount = new AuthAccount();
	gAccount.authClientID = '304094492573-vgmnc6pr5tf1va809qpoc6sri6amiptk.apps.googleusercontent.com';
	gAccount.authScope = 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/drive.appdata';

	var gAppData = new AuthAppData();
	gAppData.file_name = "settings.json";
	gAppData.setDefault({banner_text: "visual-planner", vipconfig: new VipGridConfig()});
	
	var gCal=null;

	$scope.multi_col_count_options = {1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 8: 8, 10: 10, 12: 12};
	$scope.settings = gAppData.getAppData();
	$scope.signed_in = false;
	$scope.busy = false;

	$scope.sign_msg = "Signing In...";
	gAccount.Connect();

	gAccount.onSignIn = function() {
		$scope.sign_msg = gAccount.getEmail();
		$scope.$apply();
		gCal = new AuthCal();
		gCal.onReceiveEvents = rcvCalEvents;
		gCal.onError = function() {alert("Error loading calendar events.")};
		ReadAppdata();
	}

	gAccount.onSignOut = function() {
		gAppData.setAppData(null);
		gCal=null;
		$scope.settings = gAppData.getAppData();
		$scope.form.$setPristine(true);
		$scope.sign_msg = "Signed Out";
		$scope.signed_in = false;
		$scope.view = 'grid';
		$scope.$apply();
		updateGrid();
	}

	gAccount.onError = function(msg) {
		alert("Account Error: " + msg);
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
				updateGrid();
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
				updateGrid();
			},
			function() {alert("Error saving settings.");}
		);
	}

	function updateGrid() {
		var e = document.getElementById("grid");
		e.innerHTML = "";
		
		vip_init_grid(e);
		vip.grid.cfg = gAppData.getAppData().vipconfig;
		vip.grid.reqCalEvents = reqCalEvents;
		vip.grid.createMultiCol();
	}

	function reqCalEvents(id, datespan) {
		if (gCal)
			gCal.getEvents(id, datespan);
	}

	function rcvCalEvents(id, evts) {
		vip.grid.addEvents(id, evts);
	}
}
