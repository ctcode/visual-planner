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
	this.calendars = null;
	this.queue = [];
	this.pending = 0;
	this.batch = null;
	this.onError = function(){};
}

AuthCal.prototype.getEvents = function(reqobj, datespan)
{
	console.assert('rcvEvents' in reqobj);
	console.assert('dtStart' in datespan);
	console.assert('dtEnd' in datespan);
	
	this.queue.push({reqobj:reqobj, datespan:datespan, evts:[]});
	this.run();
}

AuthCal.prototype.run = function()
{
	if (this.queue.length == 0)
		return;

	if (this.pending > 0)
		return;

	if (this.calendars)
	{
		this.batch = this.queue.shift();
		var min = this.batch.datespan.dtStart.toISOString();
		var max = this.batch.datespan.dtEnd.toISOString();

		for (cal_id in this.calendars)
		{
			this.makeReq ({
					path: "https://www.googleapis.com/calendar/v3/calendars/" + encodeURIComponent(cal_id) + "/events",
					method: "GET",
					params: {timeMin: min, timeMax: max}
				},
				this.rcvCalEvents,
				cal_id
			);

			this.pending++;
		}
	}
	else
	{
		this.makeReq ({
				path: "https://www.googleapis.com/calendar/v3/users/me/calendarList",
				method: "GET",
				params: {}
			},
			this.rcvCalList
		);

		this.pending++;
	}
}

AuthCal.prototype.rcvCalList = function(callsign, response)
{
	this.calendars = {};

	for (i in response.result.items)
	{
		var cal = response.result.items[i];
		
		if (cal.selected)
			this.calendars[cal.id] = {name: cal.summary, colour: cal.backgroundColor};
	}
	
	this.pending--;
	this.run();
}

AuthCal.prototype.rcvCalEvents = function(callsign, response)
{
	var cal = this.calendars[callsign];
	
	for (i in response.result.items)
	{
		var item = response.result.items[i];

		if (item.kind == "calendar#event")
		{
			var evt = {
				id: item.id,
				title: item.summary,
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
				evt.start = new Date(item.start.date);
				evt.end = new Date(item.end.date);
				
				evt.start.setHours(0,0,0,0);
				evt.end.setHours(0,0,0,0);
			}

			this.batch.evts.push(evt);
		}
	}

	if (response.result.nextPageToken)
	{
		this.makeReq ({
				path: "https://www.googleapis.com/calendar/v3/calendars/" + encodeURIComponent(callsign.cal_id) + "/events",
				method: "GET",
				params: {pageToken: response.result.nextPageToken}
			},
			this.rcvCalEvents,
			callsign
		);
	}
	else
	{
		this.pending--;
		
		if (this.pending == 0)
		{
			this.batch.reqobj.rcvEvents(this.batch.evts);
			this.run();
		}
	}
}

AuthCal.prototype.makeReq = function(req, callback, callsign)
{
	gapi.client.request(req).then(callback.bind(this, callsign), this.Fail.bind(this));
}

AuthCal.prototype.Fail = function(reason)
{
	console.error(reason);
	this.onError(reason);
}
