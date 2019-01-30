//////////////////////////////////////////////////////////////////////

function UnAuthCal()
{
	// initialise
	this.datespan = {dtStart: null, dtEnd: null};
	this.forwardEvent = function(){};
	this.api_key = "";

	// private
	this.calendars = {};
}

UnAuthCal.prototype.addCal = function(id)
{
	this.calendars[id] = {clr: "#2b67cf"};
}

UnAuthCal.prototype.setCalClr = function(id, clr)
{
	this.calendars[id].clr = clr;
}

UnAuthCal.prototype.loadEvents = function()
{
	this.isoStart = this.datespan.dtStart.toISOString();
	this.isoEnd = this.datespan.dtEnd.toISOString();

	for (id in this.calendars)
		this.reqEvents(id);
}

UnAuthCal.prototype.reqEvents = function(id, tok)
{
	var path =
		"https://www.googleapis.com/calendar/v3/calendars/" + encodeURIComponent(id) + "/events" +
		"?timeMin=" + this.isoStart +
		"&timeMax=" + this.isoEnd +
		"&key=" + this.api_key
	;
	
	if (tok)
		path += ("&pageToken=" + tok);

	var xhttp = new XMLHttpRequest();
	xhttp.onreadystatechange = this.rcvEvents.bind(this, xhttp, id);
	xhttp.open("GET", path);
	xhttp.send();
}

UnAuthCal.prototype.rcvEvents = function(xhttp, callsign)
{
	if (xhttp.readyState == 4 && xhttp.status == 200)
	{
		var response = JSON.parse(xhttp.responseText);
		var cal = this.calendars[callsign];
		
		for (var i in response.items)
		{
			var item = response.items[i];

			if (item.kind == "calendar#event")
			if (item.status != "cancelled")
			if (!item.hasOwnProperty("recurrence"))
			if (item.hasOwnProperty("start"))
			{
				var evt = {
					id: item.id,
					title: item.summary,
					colour: cal.clr,
					calendar: response.summary
				};
				
				if ("dateTime" in item.start)
				{
					evt.timed = true;
					evt.timespan = {start: item.start.dateTime, end: item.end.dateTime};
				}
				else
				{
					evt.timed = false;
					evt.datespan = {start: item.start.date, end: item.end.date};
				}
			}

			this.forwardEvent(evt);
		}

		if (response.nextPageToken)
			this.reqEvents(callsign, response.nextPageToken);
	}
}
