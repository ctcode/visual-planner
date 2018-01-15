//////////////////////////////////////////////////////////////////////

function VipObject()
{
	this.parent = null;
	this.div = null;
}

VipObject.prototype.createChild = function(parent, cls)
{
	this.div = document.createElement('div');
	this.div.vipobj = this;

	if (cls)
		this.div.className = cls;

	this.parent = parent;
	this.parent.div.appendChild(this.div);
}

VipObject.prototype.addClass = function(cls)
{
	this.div.classList.add(cls);
}

VipObject.prototype.ClearContent = function()
{
	if (this.div)
		this.div.innerHTML = "";
}

VipObject.prototype.First = function()
{
	var element = this.div.firstChild;
	
	if (element)
		return element.vipobj;

	return null;
}

VipObject.prototype.Last = function()
{
	var element = this.div.lastChild;
	
	if (element)
		return element.vipobj;

	return null;
}

VipObject.prototype.Next = function()
{
	var sib = this.div.nextSibling;
	
	if (sib)
		return sib.vipobj;
	
	return null;
}

VipObject.prototype.Prev = function()
{
	var sib = this.div.previousSibling;
	
	if (sib)
		return sib.vipobj;
	
	return null;
}

VipObject.prototype.setText = function(txt)
{
	this.div.textContent = txt;
}

VipObject.prototype.Show = function(showdiv)
{
	this.div.style.visibility = showdiv ? "visible" : "hidden";
}

VipObject.prototype.Align = function(cell_start, cell_end)
{
	if (cell_start && cell_end)
	{
		this.div.style.top = (cell_start.div.offsetTop) + "px";
		this.div.style.height = ((cell_end.div.offsetTop - cell_start.div.offsetTop) + cell_end.div.offsetHeight) + "px";
		this.Show(true);
	}
	else
		this.Show(false);
}

VipObject.prototype.MoveLastBefore = function(vipsib)
{
	if (vipsib)
		this.div.insertBefore(this.div.removeChild(this.div.lastChild), vipsib.div);  // move last child
}



//////////////////////////////////////////////////////////////////////

function VipDiv(parent, id)
{
	this.createChild(parent, id);
}

VipDiv.prototype = new VipObject;



//////////////////////////////////////////////////////////////////////

function VipGridConfig()
{
	this.multi_col_count = 6;
	this.multi_col_count_portrait = 3;
	this.auto_scroll = true;
	this.auto_scroll_offset = -1;
	this.show_weekends = true;
	this.align_weekends = true;
	this.font_scale = 0.6;
	this.past_opacity = 0.7;
	this.show_event_time = true;
	this.show_event_title = true;
	this.show_event_marker = true;
	this.colour_event_title = false;
	this.proportional_events = false;
	this.proportional_start_hour = 8;
	this.proportional_end_hour = 20;
	this.show_all_day_events = true;
	this.single_day_as_multi_day = false;
	this.show_timed_events = true;
	this.multi_day_as_single_day = false;
	this.first_day_only = false;
	this.marker_width = 0.8;
	this.multi_day_opacity = 0.8;
}



//////////////////////////////////////////////////////////////////////

var vipgrid;

function VipGrid(gid, cbid)
{
	vipgrid = this;

	this.div = document.getElementById(gid);
	this.div.innerHTML = "";
	this.div.tabIndex = "1";

	this.addClass("vipgrid");
	this.cfg = new VipGridConfig();
	this.cellmax = 31;
	this.col_header = true;
	this.scrolling_disabled = false;
	this.time24h = true;
	this.buffer = 3;
	this.reqCalEvents = function(){};
	this.selection = {start: null, end: null};
	this.touch = {id: null, start: {x:0, y:0}};
	this.priority = null;
	
	if (cbid)
		this.calbar = new VipCalendarBar(cbid);

	this.div.onkeydown = this.onkeydown.bind(this);
	this.div.onmouseup = this.onmouseup.bind(this);
	this.div.onwheel = this.onwheel.bind(this);

	this.div.addEventListener('touchstart', this.ontouchstart.bind(this), false);
	this.div.addEventListener('touchmove', this.ontouchmove.bind(this), false);
	this.div.addEventListener('touchend', this.ontouchend.bind(this), false);
	this.div.addEventListener('touchcancel', this.ontouchcancel.bind(this), false);

	window.onresize = this.onResize.bind(this);

	if (navigator.userAgent.includes("Chrome"))
	{
		var e = document.getElementById("vipmediaprint");
		if (!e)
		{
			e = document.createElement('style');
			document.head.appendChild(e);
			e.id = "vipmediaprint";
			e.sheet.insertRule("@media only print{.vipgrid {--celloffset: 0px !important;}}", 0);
		}

		window.matchMedia("print").addListener(this.onMediaPrint.bind(this));
	}
}

VipGrid.prototype = new VipObject;

VipGrid.prototype.createGrid = function()
{
	var vdt_start = new VipDate();
	vdt_start.toStartOfMonth();

	if (this.cfg.auto_scroll)
		vdt_start.offsetMonth(this.cfg.auto_scroll_offset);
	else
		vdt_start.toStartOfYear();
	vdt_start.offsetMonth(-this.buffer);

	var vdt_end = new VipDate(vdt_start.dt);

	var colcount = this.cfg.multi_col_count;
	if (this.isPortrait())
		colcount = this.cfg.multi_col_count_portrait;
	colcount += (this.buffer*2);

	for (var c=0; c < colcount; c++)
	{
		vdt_end.offsetMonth(1);

		var vipcol = new VipCol(this, vdt_start, vdt_end);
		
		vdt_start.offsetMonth(1);
	}

	this.updateBuffer();
	this.updateLayout();
	this.div.focus();
}

VipGrid.prototype.createSingleCol = function()
{
	this.cellmax = 28;
	this.col_header = false;
	this.scrolling_disabled = true;
	this.cfg.align_weekends = false;

	var vdt_start = new VipDate();
	vdt_start.toStartOfWeek(1);  // monday this week

	var vdt_end = new VipDate(vdt_start.dt);
	vdt_end.offsetDay(28);
	
	var vipcol = new VipCol(this, vdt_start, vdt_end);

	this.updateLayout();
}

VipGrid.prototype.onResize = function()
{
	this.updateLayout();
}

VipGrid.prototype.onMediaPrint = function(mql)
{
	this.priority = mql.matches ? "important" : null;
	this.updateLayout();
}

VipGrid.prototype.updateLayout = function()
{
	var c = this.cellmax;
	if (this.col_header) c += 2;
	if (this.cfg.align_weekends) c += 6;

	var celloffset = Math.floor(this.div.offsetHeight/c);

	this.div.style.fontSize = ((celloffset/16) * this.cfg.font_scale) + "em";
	var fontsize = parseFloat(window.getComputedStyle(this.div).fontSize);
	var markerwidth = Math.floor(fontsize*this.cfg.marker_width) - 2;

	this.div.style.setProperty('--celloffset', celloffset + "px", this.priority);
	this.div.style.setProperty('--markerwidth', markerwidth + "px");
}

VipGrid.prototype.scroll_col = function(offset)
{
	if (this.scrolling_disabled)
		return;

	var cols = this.div;
	var ltor = (offset > 0);  // scroll direction
	var count = ltor ? offset : -offset;

	var vipcol_prev = ltor ? cols.lastChild.vipobj : cols.firstChild.vipobj;
	var vdt_start = new VipDate(vipcol_prev.vdtStart.dt);
	
	for (var c=0; c < count; c++)
		cols.removeChild(ltor ? cols.firstChild : cols.lastChild);

	for (var c=0; c < count; c++)
	{
		vdt_start.offsetMonth(ltor ? 1:-1);

		var vdt_end = new VipDate(vdt_start.dt);
		vdt_end.offsetMonth(1);

		var vipcol = new VipCol(this, vdt_start, vdt_end);

		if (!ltor)
		if (cols.childElementCount > 1)
			this.MoveLastBefore(this.First());  // move col to left
	}

	this.updateBuffer();
}

VipGrid.prototype.updateBuffer = function()
{
	for (var i=0; i < this.div.childElementCount; i++)
	{
		if (i > (this.buffer-1) && i < (this.div.childElementCount - this.buffer))
			this.div.children[i].classList.remove("buffer");
		else
			this.div.children[i].classList.add("buffer");
	}
}

VipGrid.prototype.isPortrait = function()
{
	var so = "n/a";
	if (screen.orientation)
	if (screen.orientation.type)
		so = screen.orientation.type;
	if (screen.msOrientation)  // edge, ie
		so = screen.msOrientation;

	if (so.includes("portrait"))
		return true;

	return false;
}

VipGrid.prototype.getVipCell = function(id)
{
	var div = document.getElementById(id);
	
	if (div)
	if (div.vipobj instanceof VipCell)
		return div.vipobj;

	return null;
}

VipGrid.prototype.getVipCol = function(id)
{
	var div = document.getElementById(id);
	
	if (div)
	if (div.vipobj instanceof VipCol)
		return div.vipobj;

	return null;
}

VipGrid.prototype.onkeydown = function(event)
{
/*
	switch (event.key)
	{
		case '+':
		case 'Add':
			this.setCellSelectMode(true);
			return;
		case '=':
		case 'Equal':
			this.setCellSelectMode("measure");
			return;
		case 'Escape':
		case 'Esc':
			this.setCellSelectMode(false);
			this.cancel_selection();
			return;
	}
*/

	switch (event.which)
	{
		case 37:  // back
		case 38:  // up
			this.scroll_col(-1);
			break;
		case 39:  // right
		case 40:  // down
			this.scroll_col(1);
			break;
		case 82:  // r
			this.ReloadEvents();
			break;
		default:
			return;
	}

	event.returnValue = false;
	event.preventDefault();
}

VipGrid.prototype.onwheel = function(event)
{
	if (event.deltaY > 0)
		this.scroll_col(1);

	if (event.deltaY < 0)
		this.scroll_col(-1);

	event.preventDefault();
}

VipGrid.prototype.onmouseup = function()
{
	this.complete_selection();
}

VipGrid.prototype.init_selection = function(vipcell)
{
	this.cancel_selection();
	
	vipcell.vipcol.vipsel.Align(vipcell, vipcell);

	this.selection.start = vipcell;
	this.selection.end = vipcell;
}

VipGrid.prototype.update_selection = function(cell_upd)
{
	if (!this.selection.start)
		return;

	if (cell_upd === this.selection.end)
		return;  // selection not changed

	// set the target selection range, in left to right order
	var ltor = cell_upd.isBefore(this.selection.start);
	var cell_targ_left = ltor ? cell_upd : this.selection.start;
	var cell_targ_right = ltor ? this.selection.start : cell_upd;

	// set the column update range, in left to right order
	var ltor = this.selection.end.isBefore(cell_upd);
	var col_upd_left = ltor ? this.selection.end.vipcol : cell_upd.vipcol;
	var col_upd_right = ltor ? cell_upd.vipcol : this.selection.end.vipcol;
	
	// update columns
	var col = col_upd_left;
	while (true)
	{
		col.vipsel.Align(null);
		var cell_top = (col === cell_targ_left.vipcol) ? cell_targ_left : null;
		var cell_bottom = (col === cell_targ_right.vipcol) ? cell_targ_right : null;
		
		if (!cell_top)
		if (col.firstcell.inRange(cell_targ_left, cell_targ_right))
			cell_top = col.firstcell;
		
		if (!cell_bottom)
		if (col.lastcell.inRange(cell_targ_left, cell_targ_right))
			cell_bottom = col.lastcell;
		
		if (cell_top && cell_bottom)
			col.vipsel.Align(cell_top, cell_bottom);

		if (col === col_upd_right)
			break;

		col = col.Next();
	}

	this.selection.end = cell_upd;
	this.updateSelectionTip(this.selection.start, this.selection.end);
}

VipGrid.prototype.complete_selection = function()
{
	if (this.selection.start)
		this.create_calendar_event();

	this.cancel_selection();
}

VipGrid.prototype.cancel_selection = function()
{
	if (!this.selection.start)
		return;

	this.update_selection(this.selection.start);
	this.selection.start.vipcol.vipsel.Align(null);
	this.updateSelectionTip(null);

	this.selection.start = null;
	this.selection.end = null;
}

VipGrid.prototype.setCellSelectMode = function(enable)
{
	var e = document.getElementById("vipcellselect");
	
	if (e) {}
	else
	{
		e = document.createElement('style');
		document.head.appendChild(e);
		e.id = "vipcellselect";
		e.sheet.insertRule(".vipgrid * {pointer-events: none;}", 0);
		e.sheet.insertRule(".vipgrid, .vipcell {cursor: cell; pointer-events: all;}", 1);
		e.sheet.insertRule(".vipsel {background-color: rgba(255,255,127,0.6)}", 2);
	}

	e.sheet.disabled = !enable;
}

VipGrid.prototype.updateSelectionTip = function(vipcell_start, vipcell_end)
{
	//this.calbar.innerHTML = "";

	if (!vipcell_start) return;
	if (!vipcell_end) return;
	if (vipcell_start === vipcell_end) return;

	var c = vipcell_start.vipdate.DateSpan(vipcell_end.vipdate);
	var w = Math.floor(c/7);
	var d = (c-(w*7));
	var tip = (w > 0 ? fmt("^, ^-^", c, w, d) : fmt("^", c));

	//this.calbar.innerHTML = tip;
}

VipGrid.prototype.create_calendar_event = function()
{
	var dt1 = this.selection.start.vipdate.dt;
	var dt2 = this.selection.end.vipdate.dt;
	var vdtStart = new VipDate(dt1 < dt2 ? dt1 : dt2);
	var vdtEnd = new VipDate(dt1 > dt2 ? dt1 : dt2);
	vdtEnd.offsetDay(1);  // end date is exclusive
	
	window.open("https://www.google.com/calendar/r/eventedit?dates=" + vdtStart.ID() + "/" + vdtEnd.ID());
}

VipGrid.prototype.ontouchstart = function(event)
{
	if (event.touches.length == 1)
	{
		var t = event.touches[0];

		this.touch.id = t.identifier;
		this.touch.start.x = t.pageX;
		this.touch.start.y = t.pageY;
	}
}

VipGrid.prototype.ontouchmove = function(event)
{
	if (event.touches.length != 1)
	{
		this.ontouchcancel();
		return;
	}
	
	var t = event.touches[0];
	
	if (t.identifier != this.touch.id)
	{
		this.ontouchcancel();
		return;
	}

	event.preventDefault();
}

VipGrid.prototype.ontouchend = function(event)
{
	if (event.changedTouches.length != 1)
	{
		this.ontouchcancel();
		return;
	}
	
	var t = event.changedTouches[0];
	
	if (t.identifier != this.touch.id)
	{
		this.ontouchcancel();
		return;
	}
	
	var dx = Math.abs(this.touch.start.x - t.pageX);
	var dy = Math.abs(this.touch.start.y - t.pageY);
	
	if (dx > dy)
	if (dx > 30)
		this.scroll_col((this.touch.start.x > t.pageX) ? 1 : -1);

	this.ontouchcancel();
}

VipGrid.prototype.ontouchcancel = function(event)
{
	this.touch.id = null;
}

VipGrid.prototype.registerEventSource = function(src)
{
	src.forwardSetting = this.rcvSetting.bind(this);
	src.forwardEvent = this.rcvCalEvent.bind(this);
	this.reqCalEvents = src.getEvents.bind(src);
	
	if (this.calbar)
		this.calbar.registerCalendarSource(src);
}

VipGrid.prototype.rcvSetting = function(setting, value)
{
	if (setting == "time24h")
		this.time24h = value;
}

VipGrid.prototype.rcvCalEvent = function(evt)
{
	var info = {
		id: evt.id,
		title: evt.title,
		eid: evt.htmlLink.substr(evt.htmlLink.indexOf("eid=")+4),
		colour: evt.colour,
		calendar: evt.calendar,
		calclass: evt.calclass,
		timed: evt.timed,
		vdtStart: new VipDate(evt.start),
		vdtEnd: new VipDate(evt.end)
	};

	if (evt.timed)
	{
		if (!this.cfg.show_timed_events)
			return;
		
		info.vdtEnd.offsetDay(1);
	}
	else
	{
		if (!this.cfg.show_all_day_events)
			return;
	}
	
	var vdtNext = new VipDate(info.vdtStart.dt);
	var daytotal = info.vdtStart.DateSpan(info.vdtEnd);
	var c = 0;
	while (c < daytotal)
	{
		var vipcell = this.getVipCell(vdtNext.ID());
		if (vipcell)
		{
			var vipcol = vipcell.vipcol;

			var multi = (daytotal > 1);
			var single = !multi;
			
			if (this.cfg.show_all_day_events)
			if (this.cfg.single_day_as_multi_day)
			if (single)
			if (!evt.timed)
			{
				multi = true;
				single = false;
			}
			
			if (this.cfg.multi_day_as_single_day)
			if (multi)
			{
				multi = false;
				single = true;

				if (this.cfg.first_day_only)
				{
					multi = true;
					single = (vipcell.div.id == info.vdtStart.ID());
				}
			}

			if (multi)
				vipcol.addEvent(info, vipcell);

			if (single)
				vipcell.addEvent(info);
		}

		vdtNext.offsetDay(1);
		c++;
	}
}

VipGrid.prototype.ReloadEvents = function()
{
	var vipcol = this.First();
	while (vipcol)
	{
		vipcol.vipevts.ClearContent();
		
		var vipcell = vipcol.vipcells.First();
		while (vipcell)
		{
			vipcell.vipevts.ClearContent();

			vipcell = vipcell.Next();
		}

		this.reqCalEvents(vipcol.datespan);

		vipcol = vipcol.Next();
	}
}



//////////////////////////////////////////////////////////////////////

function VipCol(parent, vdt_start, vdt_end)
{
	this.createChild(parent, "vipcol");
	
	this.div.id = ((vdt_start.dt.getFullYear()*100) + (vdt_start.dt.getMonth()+1));
	this.vdtStart = new VipDate(vdt_start.dt);
	this.vdtEnd = new VipDate(vdt_end.dt);

	if (vipgrid.col_header)
	{
		this.viphdr = new VipDiv(this, "vipmonthhdr");
		this.viphdr.setText(this.vdtStart.MonthTitle());
		this.viphdr.div.onclick = this.onclickMonthHeader.bind(this);

		if (this.vdtStart.isPastMonth())
			this.div.style.opacity = vipgrid.cfg.past_opacity;
	}

	this.vipcoloffset = new VipDiv(this, "vipcoloffset");
	if (vipgrid.cfg.align_weekends)
		this.vipcoloffset.div.style.setProperty('--offsetday', this.vdtStart.DayOfWeek());

	this.vipcells = new VipDiv(this.vipcoloffset, "vipcells");
	
	var cellindex=0;
	var id_today = new VipDate().ID();
	var vdt_day = new VipDate(vdt_start.dt);
	while (vdt_day.dt < vdt_end.dt)
	{
		var vipcell = new VipCell(this.vipcells, this, vdt_day, id_today);
		vipcell.cellindex = cellindex;

		vdt_day.offsetDay(1);
		cellindex++;
	}

	this.vipsel = new VipDiv(this.vipcoloffset, "vipsel");
	this.vipsel.Show(false);
	
	this.vipevts = new VipDiv(this.vipcoloffset, "vipcolevts");

	this.firstcell = this.vipcells.First();
	this.lastcell = this.vipcells.Last();
	this.datespan = {dtStart: new Date(this.vdtStart.dt), dtEnd: new Date(this.vdtEnd.dt)};
	
	vipgrid.reqCalEvents(this.datespan);
}

VipCol.prototype = new VipObject;

VipCol.prototype.addEvent = function(info, vipcell)
{
	var vipevt = this.lookupEvent(info.id);
	
	if (vipevt) {}
	else
		vipevt = new VipMultiDayEvent(this.vipevts, info, vipcell);

	vipevt.extend(vipcell);
	this.findFreeSlot(vipevt);
}

VipCol.prototype.lookupEvent = function(id)
{
	var vipevt = this.vipevts.First();
	while (vipevt)
	{
		if (vipevt.info.id == id)
			return vipevt;

		vipevt = vipevt.Next();
	}
	
	return null;
}

VipCol.prototype.findFreeSlot = function(vipevt)
{
	var vipsib = this.vipevts.First();
	while (vipsib)
	{
		if (vipevt === vipsib) {}
		else
		{
			if (vipevt.slot == vipsib.slot)
			if (this.intersection(vipsib.index, vipsib.extent, vipevt.index, vipevt.extent))
			{
				vipevt.nextSlot();
				this.findFreeSlot(vipevt);
				return;
			}
		}

		vipsib = vipsib.Next();
	}
}

VipCol.prototype.intersection = function(ai, ax, bi, bx)
{
	if (ai > bi)
		return ((bi + bx) >= ai);

	if (ai < bi)
		return ((ai + ax) >= bi);

	return true;
}

VipCol.prototype.onclickMonthHeader = function()
{
	window.open("https://www.google.com/calendar/r/month/" + this.vdtStart.GCalURL());
}



//////////////////////////////////////////////////////////////////////

function VipCell(parent, vipcol, vdt, id_today)
{
	this.createChild(parent, "vipcell");
	this.vipcol = vipcol;
	this.vipdate = new VipDate(vdt.dt);
	this.div.id = vdt.ID();
	//this.div.onmousedown = vipgrid.init_selection.bind(vipgrid, this);
	//this.div.onmousemove = vipgrid.update_selection.bind(vipgrid, this);

	if (vipgrid.cfg.show_weekends)
	if (this.vipdate.isWeekend())
		this.addClass("weekend");

	this.vipnum = new VipDiv(this, "vipcellnum");
	this.vipnum.setText(this.vipdate.DayOfMonth());
	this.vipnum.div.onclick = this.onclickDayNumber.bind(this);
	if (this.div.id == id_today)
		this.vipnum.addClass("today");
	
	this.vipevts = new VipDiv(this, "vipcellevts");
}

VipCell.prototype = new VipObject;

VipCell.prototype.isBefore = function(vipcell)
{
	return (this.div.id < vipcell.div.id);
}

VipCell.prototype.inRange = function(locell, hicell)
{
	if (this.div.id >= locell.div.id)
	if (this.div.id <= hicell.div.id)
		return true;

	return false;
}

VipCell.prototype.inDateRange = function(vdt_lo, vdt_hi)
{
	if (this.div.id >= vdt_lo.ID())
	if (this.div.id <= vdt_hi.ID())
		return true;

	return false;
}

VipCell.prototype.addEvent = function(evtinfo)
{
	var vipevt = new VipSingleDayEvent(this.vipevts, evtinfo, this.div.id);

	var vipsib = this.vipevts.First();
	while (vipsib)
	{
		if (vipevt.timestamp < vipsib.timestamp)
			break;

		vipsib = vipsib.Next();
	}

	this.vipevts.MoveLastBefore(vipsib);  // sort in time order
}

VipCell.prototype.onclickDayNumber = function(event)
{
	if (event.ctrlKey)
		window.open("https://www.google.com/calendar/r/day/" + this.vipdate.GCalURL());
	else
		window.open("https://www.google.com/calendar/r/week/" + this.vipdate.GCalURL());
}



//////////////////////////////////////////////////////////////////////

function VipMultiDayEvent(parent, info, vipcell)
{
	this.createChild(parent, "vipmultidayevent");
	this.addClass(info.calclass);

	this.info = info;
	this.div.title = fmt("^ - ^", this.info.calendar, this.info.title);
	this.div.onclick = this.edit.bind(this);
	this.div.style.backgroundColor = this.info.colour;
	this.div.style.setProperty('--start', vipcell.cellindex);
	this.div.style.opacity = vipgrid.cfg.multi_day_opacity;
	this.index = vipcell.cellindex;
	this.extent = 0;
	this.setSlot(0);
}

VipMultiDayEvent.prototype = new VipObject;

VipMultiDayEvent.prototype.extend = function(vipcell)
{
	this.extent = vipcell.cellindex - this.index + 1;
	this.div.style.setProperty('--extent', this.extent);
}

VipMultiDayEvent.prototype.setSlot = function(i)
{
	this.slot = i;
	this.div.style.setProperty('--slot', this.slot);
}

VipMultiDayEvent.prototype.nextSlot = function()
{
	this.setSlot(this.slot + 1);
}

VipMultiDayEvent.prototype.edit = function()
{
	window.open("https://calendar.google.com/calendar/r/eventedit/" + this.info.eid);
}



//////////////////////////////////////////////////////////////////////

function VipSingleDayEvent(parent, info, cellid)
{
	this.createChild(parent, "vipsingledayevent");
	this.addClass(info.calclass);

	this.div.onclick = this.edit.bind(this);
	
	this.info = info;
	this.cellid = cellid;
	this.timestamp = info.vdtStart.DayMinutes();

	var time_title = "";
	if (this.info.timed)
	if (vipgrid.cfg.show_event_time)
		time_title = info.vdtStart.TimeTitle() + " ";

	var evt_title = this.info.title;
	this.div.title = time_title + this.info.calendar + " - " + evt_title;

	if (vipgrid.cfg.proportional_events)
	{
		this.vipmarker = new VipDiv(this, "vipeventmarker");
		this.vipmarker.addClass("proportional");
		this.calcProportionalMarker();
	}
	else
	{
		if (vipgrid.cfg.show_event_marker)
			this.vipmarker = new VipDiv(this, "vipeventmarker");

		if (vipgrid.cfg.show_event_title)
		{
			this.vipevttext = new VipDiv(this, "viptext");
			this.vipevttext.setText(time_title + evt_title);

			if (vipgrid.cfg.colour_event_title)
				this.vipevttext.div.style.color = this.info.colour;
		}
	}
	
	if (this.vipmarker)
		this.vipmarker.div.style.backgroundColor = this.info.colour;
}

VipSingleDayEvent.prototype = new VipObject;

VipSingleDayEvent.prototype.calcProportionalMarker = function()
{
	var m_range_start = (vipgrid.cfg.proportional_start_hour * 60);
	var m_range_end = (vipgrid.cfg.proportional_end_hour * 60);
	var m_range = (m_range_end - m_range_start);

	var m_evt_start = m_range_start;
	var m_evt_end = m_range_end;

	if (this.info.timed)
	{
		if (this.info.vdtStart.ID() == this.cellid)
		{
			m_evt_start = this.timestamp;

			if (m_evt_start < m_range_start)
				m_evt_start = m_range_start;
		}

		var vdtTimedEnd = new VipDate(this.info.vdtEnd.dt);
		vdtTimedEnd.offsetDay(-1);

		if (vdtTimedEnd.ID() == this.cellid)
		{
			m_evt_end = vdtTimedEnd.DayMinutes();

			if (m_evt_end > m_range_end)
				m_evt_end = m_range_end;
		}
	}

	this.vipmarker.div.style.left = (((m_evt_start - m_range_start) / m_range) * 100) + "%";
	this.vipmarker.div.style.width = (((m_evt_end - m_evt_start) / m_range) * 100) + "%";

/*
	var off_right = (this.vipmarker.div.offsetLeft + this.vipmarker.div.offsetWidth);
	if ((off_right <= 0) || (this.vipmarker.div.offsetLeft >= vipcell.vipevts.div.offsetWidth))
	{
		var viphidden = new VipDiv(this, "viphiddenevt");
		viphidden.setPos(0, y_off);
		viphidden.setText("...");
	}
*/
}

VipSingleDayEvent.prototype.edit = function()
{
	window.open("https://calendar.google.com/calendar/r/eventedit/" + this.info.eid);
}



//////////////////////////////////////////////////////////////////////

function VipCalendarBar(id)
{
	this.div = document.getElementById(id);
	this.div.innerHTML = "";

	this.addClass("vipcalbar");
}

VipCalendarBar.prototype = new VipObject;

VipCalendarBar.prototype.registerCalendarSource = function(src)
{
	src.forwardCalendar = this.rcvCal.bind(this);
	src.calclass_prefix = "vipcalclass_";
}

VipCalendarBar.prototype.rcvCal = function(cal)
{
	var vcb = new VipCalendarBtn(this, cal);

	var e = document.getElementById("vipcalvisibility");
	if (!e)
	{
		e = document.createElement('style');
		document.head.appendChild(e);
		e.id = "vipcalvisibility";
	}
	
	vcb.cssrule = e.sheet.cssRules.length;
	e.sheet.insertRule(fmt(".^ {}", cal.cls), e.sheet.cssRules.length);

	var vipsib = this.First();
	while (vipsib)
	{
		if (vcb.name < vipsib.name)
			break;

		vipsib = vipsib.Next();
	}
	this.MoveLastBefore(vipsib);
}



//////////////////////////////////////////////////////////////////////

function VipCalendarBtn(parent, cal)
{
	this.createChild(parent, "vipcalbtn");

	this.name = cal.name;
	this.cssrule = null;
	this.div.onclick = this.onclickCalBtn.bind(this);

	this.vipmarker = new VipDiv(this, "vipcalmarker");
	this.vipmarker.div.style.backgroundColor = cal.colour;

	this.vipcaltext = new VipDiv(this, "viptext");
	this.vipcaltext.setText(this.name);
}

VipCalendarBtn.prototype = new VipObject;

VipCalendarBtn.prototype.onclickCalBtn = function(event)
{
	var e = document.getElementById("vipcalvisibility");
	if (e)
	{
		var r = e.sheet.cssRules[this.cssrule];

		if (this.div.classList.toggle("checked"))
			r.style.setProperty("display", "none");
		else
			r.style.removeProperty("display");
	}
}




//////////////////////////////////////////////////////////////////////

function VipDate(dt)
{
	if (dt)
	{
		this.dt = new Date(dt);
	}
	else
	{
		this.dt = new Date();
		this.dt.setHours(0,0,0,0);
	}
}

VipDate.prototype.ID = function()
{
	return ((this.dt.getFullYear()*10000) + ((this.dt.getMonth()+1)*100) + this.dt.getDate());
}

VipDate.prototype.offsetDay = function(off)
{
	this.dt.setDate(this.dt.getDate() + off);
}

VipDate.prototype.offsetMonth = function(off)
{
	this.dt.setMonth(this.dt.getMonth() + off);
}

VipDate.prototype.toStartOfWeek = function(startday)
{
	while (this.dt.getDay() != startday)
		this.dt.setDate(this.dt.getDate() - 1);
}

VipDate.prototype.toStartOfMonth = function()
{
	this.dt.setDate(1);
}

VipDate.prototype.toStartOfYear = function()
{
	this.dt.setMonth(0);
	this.dt.setDate(1);
}

VipDate.prototype.DateSpan = function(vdt)
{
	var t1 = this.dt.getTime() - (this.dt.getTimezoneOffset()*60000);
	var t2 = vdt.dt.getTime() - (vdt.dt.getTimezoneOffset()*60000);
	return Math.floor(Math.abs(t1-t2)/86400000);
}

VipDate.prototype.DayOfMonth = function()
{
	return this.dt.getDate();
}

VipDate.prototype.DayOfWeek = function()
{
	return this.dt.getDay();
}

VipDate.prototype.isWeekend = function()
{
	return (this.dt.getDay()==0 || this.dt.getDay()==6);
}

VipDate.prototype.isPastMonth = function()
{
	var today = new Date();
	
	if (this.dt.getYear() < today.getYear())
		return true;

	if (this.dt.getYear() > today.getYear())
		return false;
	
	return (this.dt.getMonth() < today.getMonth());
}

VipDate.prototype.MonthTitle = function()
{
	var dt_array = this.dt.toDateString().split(' ');
	return fmt("^ ^", dt_array[1], dt_array[3]);
}

VipDate.prototype.DayTitle = function()
{
	var dt_array = this.dt.toDateString().split(' ');
	return fmt("^ ^ ^", dt_array[0], this.DayOfMonth(), dt_array[1]);
}

VipDate.prototype.TimeTitle = function()
{
	var hh = this.dt.getHours();
	var mm = this.dt.getMinutes();
	var ss = this.dt.getSeconds();
	
	var minutes = fmt((mm < 10) ? "0^" : "^", mm);

	if (vipgrid.time24h)
	{
		return fmt("^:^", hh, minutes);
	}
	else
	{
		var hours = (hh > 12) ? (hh-12) : hh;
		return fmt((hh < 12) ? "^:^am" : "^:^pm", hours, minutes);
	}
}

VipDate.prototype.DayMinutes = function()
{
	return (this.dt.getHours()*60) + this.dt.getMinutes();
}

VipDate.prototype.GCalURL = function()
{
	return (this.dt.getFullYear() + "/" + (this.dt.getMonth()+1) + "/" + this.dt.getDate());
}



/////////////////////////////////////////////////////////////////

function fmt(fmtspec)
// returns string consisting of format specification with '^' placeholders
// replaced in sequence by any parameters supplied
{
	var str = "";
	var arg=1;
	for (var i in fmtspec)
	{
		if (fmtspec[i] == '^')
		{
			if (arg < arguments.length)
			{
				str += arguments[arg];
				arg++;
			}
		}
		else
		{
			str += fmtspec[i];
		}
	}

	return str;
}
