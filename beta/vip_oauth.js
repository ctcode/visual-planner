//////////////////////////////////////////////////////////////////////

function AuthAccount()
{
	// initialise
	this.authClientID = undefined;
	this.authScope = undefined;
	
	// public
	this.onSignIn = function(){};
	this.onSignOut = function(){};
	this.onError = function(msg){};
	
	// private
	this.auth = null;
}

AuthAccount.prototype.Connect = function()
{
	if (this.auth)
		return;

	gapi.load("client:auth2", this.onLoadAuth.bind(this));
}

AuthAccount.prototype.onLoadAuth = function()
{
	gapi.auth2.init({client_id: this.authClientID, scope: this.authScope}).then(this.onInitAuth.bind(this), this.Fail.bind(this));
}

AuthAccount.prototype.onInitAuth = function(auth)
{
	this.auth = auth;
	this.auth.isSignedIn.listen(this.status_listener.bind(this));
	this.status_listener();
}

AuthAccount.prototype.status_listener = function()
{
	if (this.isSignedIn())
		this.onSignIn();
	else
		this.onSignOut();
}

AuthAccount.prototype.SignIn = function()
{
	if (this.auth)
		this.auth.signIn();
}

AuthAccount.prototype.SignOut = function()
{
	if (this.auth)
		this.auth.signOut();
}

AuthAccount.prototype.isSignedIn = function()
{
	if (this.auth)
		return (this.auth.isSignedIn.get());

	return false;
}

AuthAccount.prototype.getEmail = function()
{
	if (this.isSignedIn())
	{
		var gu = this.auth.currentUser.get();
		var bp = gu.getBasicProfile();
		
		return bp.getEmail();
	}
	
	return null;
}

AuthAccount.prototype.Fail = function(reason)
{
	var msg = "";
	
	if (reason.error)
	{
		msg = "[" + reason.error + "]";

		if (reason.details)
			msg += reason.details;
	}

	console.error("AuthAccount : " + msg);
	this.onError(msg);
}




//////////////////////////////////////////////////////////////////////

function AuthAppData()
{
	// initialise
	this.file_name = null;
	
	// private
	this.file_id = null;
	this.appdata = null;
	this.appdata_default = null;
	this.onLoad = undefined;
	this.onRead = undefined;
	this.onWrite = undefined;
	this.onFail = function(){};
}

AuthAppData.prototype.FileInfo = function()
{
	this.makeReq ({
			path: "https://www.googleapis.com/drive/v3/files",
			method: "GET",
			params: {spaces: 'appDataFolder'}
		},
		this.thenShowFileInfo
	);
}

AuthAppData.prototype.thenShowFileInfo = function(response)
{
	var files = response.result.files;
	console.log(files.length + " files");

	for (var i=0; i < files.length; i++)
		console.log(files[i]);
}

AuthAppData.prototype.LoadFile = function(thenDoThis)
{
	this.file_id = null;
	this.onLoad = thenDoThis;
	
	var file_query = "name = '" + this.file_name + "'";

	this.makeReq ({
			path: "https://www.googleapis.com/drive/v3/files",
			method: "GET",
			params: {q: file_query, spaces: 'appDataFolder'}
		},
		this.thenSetFileID
	);
}

AuthAppData.prototype.thenSetFileID = function(response)
{
	if (response.result.files.length == 1)
		this.file_id = response.result.files[0].id;

	this.onLoad()
}

AuthAppData.prototype.Read = function(thenDoThis, thenFail)
{
	this.appdata = null;
	this.onRead = thenDoThis;
	
	if (thenFail)
		this.onFail = thenFail;

	this.LoadFile(this.thenReadFile);
}

AuthAppData.prototype.thenReadFile = function()
{
	if (this.file_id)
	{
		this.makeReq ({
				path: "https://www.googleapis.com/drive/v3/files" + "/" + encodeURIComponent(this.file_id),
				method: "GET",
				params: {alt: 'media'}
			},
			this.thenSetAppdata
		);
	}
	else this.onRead();
}

AuthAppData.prototype.thenSetAppdata = function(response)
{
	this.appdata = response.body;
	this.onRead();
}

AuthAppData.prototype.setAppData = function(appdataobj)
{
	this.appdata = appdataobj ? JSON.stringify(appdataobj) : null;
}

AuthAppData.prototype.setDefault = function(appdataobj)
{
	this.appdata_default = appdataobj ? JSON.stringify(appdataobj) : null;
}

AuthAppData.prototype.getAppData = function()
{
	if (this.appdata) return JSON.parse(this.appdata);
	if (this.appdata_default) return JSON.parse(this.appdata_default);
	return null;
}

AuthAppData.prototype.Write = function(appdataobj, thenDoThis, thenFail)
{
	this.setAppData(appdataobj);
	this.onWrite = thenDoThis;
	
	if (thenFail)
		this.onFail = thenFail;

	this.LoadFile(this.thenWriteOrCreate);
}

AuthAppData.prototype.thenWriteOrCreate = function()
{
	if (this.file_id)
	{
		this.WriteFile();
	}
	else
	{
		this.makeReq ({
				path: "https://www.googleapis.com/drive/v3/files",
				method: "POST",
				params: {uploadType: "resumable"},
				body: {name: this.file_name, mimeType:"application/json", parents: ['appDataFolder']}
			},
			this.thenSetNewFileID
		);
	}
}

AuthAppData.prototype.thenSetNewFileID = function(response)
{
	this.file_id = response.result.id;
	this.WriteFile();
}

AuthAppData.prototype.WriteFile = function()
{
	console.assert(this.file_id);

	this.makeReq ({
			path: "https://www.googleapis.com/upload/drive/v3/files" + "/" + encodeURIComponent(this.file_id),
			method: "PATCH",
			params: {uploadType: "media"},
			body: this.appdata
		},
		this.onWrite
	);
}

AuthAppData.prototype.makeReq = function(req, callback)
{
	gapi.client.request(req).then(callback.bind(this), this.Fail.bind(this));
}

AuthAppData.prototype.Fail = function(reason)
{
	console.error(reason);
	this.onFail(reason);
}




//////////////////////////////////////////////////////////////////////

function AuthCal()
{
	// initialise
	this.forwardCalendar = function(){};
	this.forwardEvent = function(){};
	this.forwardSetting = function(){};
	this.onError = function(){};
	this.calclass_prefix = "calclass_";

	// private
	this.calendars = null;
	this.run = false;
	this.datespan = null;
	this.timer = 0;
}

AuthCal.prototype.getEvents = function(datespan)
{
	console.assert('dtStart' in datespan);
	console.assert('dtEnd' in datespan);

	if (this.datespan)
	{
		if (datespan.dtStart < this.datespan.dtStart)
			this.datespan.dtStart = datespan.dtStart;

		if (datespan.dtEnd > this.datespan.dtEnd)
			this.datespan.dtEnd = datespan.dtEnd;
	}
	else
		this.datespan = datespan;

	if (this.calendars)
	{
		if (this.run)
		{
			clearTimeout(this.timer);
			this.timer = setTimeout(this.reqEvents.bind(this), 500);
		}
	}
	else
	{
		this.makeReq ({
				path: "https://www.googleapis.com/calendar/v3/users/me/settings/format24HourTime",
				method: "GET",
				params: {}
			},
			this.rcvTimeFormat,
			null,
			"time format"
		);

		this.makeReq ({
				path: "https://www.googleapis.com/calendar/v3/users/me/calendarList",
				method: "GET",
				params: {}
			},
			this.rcvCalList,
			null,
			"calendar list"
		);

		this.calendars = {};
	}
}

AuthCal.prototype.rcvTimeFormat = function(callsign, response)
{
	if (response.result)
	if (response.result.kind == "calendar#setting")
	if (response.result.id == "format24HourTime")
		this.forwardSetting("time24h", response.result.value == "true");
}

AuthCal.prototype.rcvCalList = function(callsign, response)
{
	try
	{
		for (i in response.result.items)
		{
			var cal = response.result.items[i];
			
			if (cal.selected)
			{
				this.calendars[cal.id] = {cls: this.calclass_prefix + i, name: cal.summary, colour: cal.backgroundColor};
				this.forwardCalendar(this.calendars[cal.id]);
			}
		}

		if (response.result.nextPageToken)
		{
			this.makeReq ({
					path: "https://www.googleapis.com/calendar/v3/users/me/calendarList",
					method: "GET",
					params: {pageToken: response.result.nextPageToken}
				},
				this.rcvCalList,
				null,
				"calendar list page"
			);
		}
		else
		{
			this.run = true;
			this.reqEvents();
		}
	}
	catch(e)
	{
		this.Fail(e);
	}
}

AuthCal.prototype.reqEvents = function()
{
	var min = this.datespan.dtStart.toISOString();
	var max = this.datespan.dtEnd.toISOString();
	this.datespan = null;

	for (cal_id in this.calendars)
	{
		this.makeReq ({
				path: "https://www.googleapis.com/calendar/v3/calendars/" + encodeURIComponent(cal_id) + "/events",
				method: "GET",
				params: {timeMin: min, timeMax: max, orderBy: "startTime", singleEvents: true}
			},
			this.rcvCalEvents,
			cal_id,
			"event list: " + min + "/" + max
		);
	}
}

AuthCal.prototype.rcvCalEvents = function(callsign, response)
{
	try
	{
		var cal = this.calendars[callsign];
		
		for (i in response.result.items)
		{
			var item = response.result.items[i];

			if (item.kind != "calendar#event")
				continue;

			if (item.status == "cancelled")
				continue;

			if (item.hasOwnProperty("recurrence"))
				continue;

			if (!item.hasOwnProperty("start"))
				continue;
			
			var evt = {
				id: item.id,
				title: item.summary,
				htmlLink: item.htmlLink,
				calclass: cal.cls,
				colour: cal.colour,
				calendar: cal.name
			};
			
			if ("dateTime" in item.start)
			{
				evt.timed = true;
				evt.start = new Date(item.start.dateTime);
				evt.end = new Date(item.end.dateTime);
			}
			else
			{
				evt.timed = false;
				
				var dmy = item.start.date.split('-');
				evt.start = new Date(parseInt(dmy[0]), parseInt(dmy[1])-1, parseInt(dmy[2]));

				var dmy = item.end.date.split('-');
				evt.end = new Date(parseInt(dmy[0]), parseInt(dmy[1])-1, parseInt(dmy[2]));
			}

			this.forwardEvent(evt);
		}

		if (response.result.nextPageToken)
		{
			this.makeReq ({
					path: "https://www.googleapis.com/calendar/v3/calendars/" + encodeURIComponent(callsign) + "/events",
					method: "GET",
					params: {pageToken: response.result.nextPageToken}
				},
				this.rcvCalEvents,
				callsign,
				"event list page"
			);
		}
	}
	catch(e)
	{
		this.Fail(e);
	}
}

AuthCal.prototype.makeReq = function(req, callback, callsign, failsign)
{
	gapi.client.request(req).then(callback.bind(this, callsign), this.Fail.bind(this, failsign));
}

AuthCal.prototype.Fail = function(failsign, reason)
{
	ga_hit("req_fail", failsign);
	this.onError("[" + reason.result.error.code + ": " + reason.result.error.message + "]");
}
