//////////////////////////////////////////////////////////////////////

function VipObject()
{
}

VipObject.prototype.createChildDiv = function(container_element, cls)
{
	var div = document.createElement('div');

	if (cls)
		div.className = cls;

	div.vipobj = this;

	this.div = div;
	this.parent = null;
	
	container_element.appendChild(div);
}

VipObject.prototype.createChild = function(parent, cls)
{
	this.createChildDiv(parent.div, cls);
	this.parent = parent;
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
		this.div.style.height = ((cell_end.div.offsetTop - cell_start.div.offsetTop) + cell_end.div.offsetHeight - 1) + "px";
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
	// grid config
	this.cellmax = 31;
	this.col_header = true;
	this.scrolling_disabled = false;
	this.time_24hr = true;
	// user settings
	this.multi_col_count = 6;
	this.multi_col_count_portrait = 3;
	this.auto_scroll = true;
	this.auto_scroll_offset = -1;
	this.show_weekends = true;
	this.align_weekends = true;
	this.font_scale = 64;
	this.past_opacity = 0.7;
	this.show_event_time = true;
	this.show_event_title = true;
	this.show_event_marker = true;
	this.colour_event_title = false;
	this.proportional_events = false;
	this.proportional_start_hour = 8;
	this.proportional_end_hour = 20;
	this.multi_day_as_single_day = false;
	this.first_day_only = false;
	this.all_events_as_multi_day = false;
	this.marker_width = 80;
	this.multi_day_opacity = 0.8;
}



//////////////////////////////////////////////////////////////////////

function VipGrid(container_element)
{
	this.createChildDiv(container_element, "vipgrid");
	this.div.tabIndex = "1";

	this.cfg = new VipGridConfig();
	this.reqCalEvents = function() {};
}

VipGrid.prototype = new VipObject;

VipGrid.prototype.create = function()
{
	if (window.sessionStorage)
		sessionStorage.clear();

	var vdt_start = new VipDate();
	vdt_start.MoveToStartOfMonth();

	if (this.cfg.auto_scroll)
		vdt_start.MoveMonths(this.cfg.auto_scroll_offset);
	else
		vdt_start.MoveToStartOfYear();

	var vdt_end = new VipDate(vdt_start);

	var colcount = this.cfg.multi_col_count;
	if (this.isPortrait())
		colcount = this.cfg.multi_col_count_portrait;

	for (var c=0; c < colcount; c++)
	{
		vdt_end.MoveMonths(1);

		var vipcol = new VipCol(this, vdt_start, vdt_end);
		
		vdt_start.MoveMonths(1);
	}

	this.updateLayout();
}

VipGrid.prototype.createSingleCol = function()
{
	this.cfg.cellmax = 28;
	this.cfg.col_header = false;
	this.cfg.align_weekends = false;
	this.cfg.scrolling_disabled = true;

	var vdt_start = new VipDate();
	vdt_start.MoveToStartOfWeek(1);  // monday this week

	var vdt_end = new VipDate(vdt_start);
	vdt_end.MoveDays(28);
	
	var vipcol = new VipCol(this, vdt_start, vdt_end);
	vipcol.addClass("indicator");

	this.updateLayout();
}

VipGrid.prototype.updateLayout = function()
{
	if (this.div.childElementCount == 0)
		return;

	var c = this.cfg.cellmax;
	if (this.cfg.col_header) c++;
	if (this.cfg.align_weekends) c += 6;

	var colheight = this.First().div.offsetHeight;
	var cellheight = Math.floor(colheight/c);
	var cellnumpadding = Math.floor(cellheight/10);

	this.div.style.fontSize = (cellheight/16) * (this.cfg.font_scale/100) + "em";
	this.div.style.lineHeight = (cellheight - (cellnumpadding*2)) + "px";

	var fontsize = parseFloat(window.getComputedStyle(this.div).fontSize);
	
	this.div.style.setProperty('--cellheight', cellheight + "px");
	this.div.style.setProperty('--cellnumpadding', cellnumpadding + "px");
	this.div.style.setProperty('--markerwidth', Math.floor(fontsize*(this.cfg.marker_width/100)) + "px");
	this.div.style.setProperty('--markerpadding', Math.floor(cellheight*0.2) + "px");
}

VipGrid.prototype.scroll_col = function(offset)
{
	if (this.cfg.scrolling_disabled)
		return;

	var cols = this.div;
	var ltor = (offset > 0);  // scroll direction
	var count = ltor ? offset : -offset;

	var vipcol_prev = ltor ? cols.lastChild.vipobj : cols.firstChild.vipobj;
	var vdt_start = new VipDate(vipcol_prev.vdtStart);
	
	for (var c=0; c < count; c++)
		cols.removeChild(ltor ? cols.firstChild : cols.lastChild);

	for (var c=0; c < count; c++)
	{
		vdt_start.MoveMonths(ltor ? 1:-1);

		var vdt_end = new VipDate(vdt_start);
		vdt_end.MoveMonths(1);

		var vipcol = new VipCol(this, vdt_start, vdt_end);

		if (!ltor)
		if (cols.childElementCount > 1)
			this.MoveLastBefore(this.First());  // move col to left
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

VipGrid.prototype.getCalEvents = function(vipcol, id, datespan)
{
	var stg = null;
	
	if (window.sessionStorage)
	{
		var stgitem = sessionStorage[id];
		
		if (stgitem)
			stg = JSON.parse(stgitem);
	}
	
	if (stg)
	{
		for (i in stg)
		{
			var evtinfo = stg[i];
			
			if (evtinfo.singlecell)
				this.getVipCell(evtinfo.cell_id).addEvent(evtinfo);

			if (evtinfo.multicell)
				vipcol.addEvent(evtinfo);
		}
	}
	else
		this.reqCalEvents(id, datespan);
}

VipGrid.prototype.rcvEvents = function(id, evts)
{
	var storage = [];

	var vipcol = this.getVipCol(id);
	if (vipcol)
		for (i in evts)
			this.rcvEvent(vipcol, evts[i], storage);

	if (window.sessionStorage)
		sessionStorage[id] = JSON.stringify(storage);
}

VipGrid.prototype.rcvEvent = function(vipcol, evt, storage)
{
	var vdtEvtStart = new VipDate(evt.start);
	var vdtEvtEnd = new VipDate(evt.end);
	
	if (evt.timed)
	{
		var endID = vdtEvtEnd.ID();
		vdtEvtEnd.MoveDays(1);
	}

	var vdtSpanStart = new VipDate(vdtEvtStart.ID() < vipcol.vdtStart.ID() ? vipcol.vdtStart : vdtEvtStart);
	var vdtSpanEnd = new VipDate(vdtEvtEnd.ID() > vipcol.vdtEnd.ID() ? vipcol.vdtEnd : vdtEvtEnd);
	
	var vdtNext = new VipDate(vdtSpanStart);
	while (vdtNext.ID() < vdtSpanEnd.ID())
	{
		var vipcell = this.getVipCell(vdtNext.ID());

		var evtinfo = {
			id: evt.id,
			title: evt.title,
			colour: evt.colour,
			calendar: evt.calendar,
			timed: evt.timed,
			timestamp: vdtEvtStart.Timestamp(),
			timetitle: vdtEvtStart.TimeTitle(),
			startDaySeconds: vdtEvtStart.getDaySeconds(),
			endDaySeconds: vdtEvtEnd.getDaySeconds(),
			multiday: ((vdtEvtEnd.Datestamp() - vdtEvtStart.Datestamp()) > 1),
			firstday: (vdtNext.ID() == vdtEvtStart.ID()),
			cellindex: vipcell.vipindex,
			cellspan: (vdtSpanEnd.Datestamp() - vdtSpanStart.Datestamp())
		};
		
		if (evt.timed)
			evtinfo.lastday = (vdtNext.ID() == endID);
		
		var multi = evtinfo.multiday;
		var single = !evtinfo.multiday;
		
		if (this.cfg.multi_day_as_single_day)
		if (multi)
		{
			multi = false;
			single = true;

			if (this.cfg.first_day_only)
			{
				multi = true;
				single = evtinfo.firstday;
			}
		}
		
		if (this.cfg.all_events_as_multi_day)
		{
			multi = true;
			single = false;
		}

		evtinfo.multicell = multi;
		evtinfo.singlecell = single;
		evtinfo.cell_id = vipcell.div.id;
		storage.push(evtinfo);

		if (single)
			vipcell.addEvent(evtinfo);

		if (multi)
		{
			vipcol.addEvent(evtinfo);
			return;
		}

		vdtNext.MoveDays(1);
	}
}

VipGrid.prototype.reloadEvents = function()
{
/*
	var vipcol = this.First();
	while (vipcol)
	{
		vipcol.vipevts.ClearContent();
		
		var vipcell = vipcol.vipcells.First();
		while (vipcell)
		{
			vipcell.vipevts.ClearContent();
			vipcell.updateTooltip();

			vipcell = vipcell.Next();
		}

		this.reqCalEvents(vipcol.div.id, vipcol.Datespan());

		vipcol = vipcol.Next();
	}
*/
}



//////////////////////////////////////////////////////////////////////

function VipCol(parent, vdt_start, vdt_end)
{
	this.createChild(parent, "vipcol");
	
	this.div.id = ((vdt_start.dt.getFullYear()*100) + (vdt_start.dt.getMonth()+1));
	this.vdtStart = new VipDate(vdt_start);
	this.vdtEnd = new VipDate(vdt_end);

	if (vip.grid.cfg.col_header)
	{
		this.viphdr = new VipDiv(this, "vipmonthhdr");
		this.viphdr.setText(this.vdtStart.MonthTitle());
		this.viphdr.div.onclick = onclickVipMonthHeader;

		if (this.vdtStart.isPastMonth())
			this.div.style.opacity = vip.grid.cfg.past_opacity;
	}

	this.vipcoloffset = new VipDiv(this, "vipcoloffset");
	if (vip.grid.cfg.align_weekends)
		this.vipcoloffset.div.style.setProperty('--offsetday', this.vdtStart.DayOfWeek());

	this.vipcells = new VipDiv(this.vipcoloffset, "vipcells");
	
	var cellindex=0;
	var id_today = new VipDate().ID();
	var vdt_day = new VipDate(vdt_start);
	while (vdt_day.dt < vdt_end.dt)
	{
		var vipcell = new VipCell(this.vipcells, this, vdt_day, id_today);
		vipcell.vipindex = cellindex;

		vdt_day.MoveDays(1);
		cellindex++;
	}

	this.vipsel = new VipDiv(this.vipcoloffset, "vipsel");
	this.vipsel.Show(false);

	this.vipseltip = new VipDiv(this.vipcoloffset, "vipseltip");
	this.vipseltip.Show(false);

	this.vipind = new VipDiv(this.vipcoloffset, "vipind");
	this.vipind.Show(false);
	
	this.vipevts = new VipDiv(this.vipcoloffset, "vipcolevts");

	this.firstcell = this.vipcells.First();
	this.lastcell = this.vipcells.Last();
	
	vip.grid.getCalEvents(this, this.div.id, this.Datespan());
}

VipCol.prototype = new VipObject;

VipCol.prototype.Datespan = function()
{
	return {dtStart: new Date(this.vdtStart.dt), dtEnd: new Date(this.vdtEnd.dt)};
}

VipCol.prototype.addEvent = function(evtinfo)
{
	var vipevt = new VipMultiDayEvent(this.vipevts, evtinfo);
	this.findFreeSlot(vipevt);
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
			if (this.intersection(vipsib.info.cellindex, vipsib.info.cellspan, vipevt.info.cellindex, vipevt.info.cellspan))
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

VipCol.prototype.updateSelectionTip = function(vipcell_start, vipcell_end)
{
	this.vipseltip.Show(false);

	if (!vipcell_start) return;
	if (!vipcell_end) return;
	if (vipcell_start === vipcell_end) return;

	var c = Math.abs(vipcell_end.vipdate.Datestamp() - vipcell_start.vipdate.Datestamp());
	var w = Math.floor(c/7);
	var d = (c-(w*7));
	var tip = (w > 0 ? fmt("^, ^-^", c, w, d) : fmt("^", c));

	this.vipseltip.div.style.lineHeight = vipcell_end.div.offsetHeight + "px";
	this.vipseltip.setText(tip);
	this.vipseltip.Align(vipcell_end, vipcell_end);
	this.vipseltip.Show(true);
}



//////////////////////////////////////////////////////////////////////

function VipCell(parent, vipcol, vdt, id_today)
{
	this.createChild(parent, "vipcell");
	this.vipcol = vipcol;
	this.vipdate = new VipDate(vdt);
	this.datestamp = vdt.Datestamp();
	this.div.id = vdt.ID();

	if (vip.grid.cfg.show_weekends)
	if (this.vipdate.isWeekend())
		this.addClass("weekend");

	this.vipnum = new VipDiv(this, "vipcellnum");
	this.vipnum.setText(this.vipdate.DayOfMonth());
	this.vipnum.div.onclick = onclickVipDayNumber;
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
	var vipevt = new VipSingleDayEvent(this.vipevts, evtinfo);

	var vipsib = this.vipevts.First();
	while (vipsib)
	{
		if (vipevt.info.timestamp < vipsib.info.timestamp)
			break;

		vipsib = vipsib.Next();
	}

	this.vipevts.MoveLastBefore(vipsib);  // sort in time order

	this.updateTooltip();
}

VipCell.prototype.updateTooltip = function()
{
/*
	var evtlist = [];

	var vipevt = this.vipcol.vipevts.First();
	while (vipevt)
	{
		if (this.inRange(vipevt.vipcell_start, vipevt.vipcell_end))
			evtlist.push(vipevt);

		vipevt = vipevt.Next();
	}

	var vipevt = this.vipevts.First();
	while (vipevt)
	{
		for (var i=0; i < evtlist.length; i++)
		{
			if (vipevt.id == evtlist[i].id)
			{
				evtlist.splice(i, 1);  // remove duplicate
				break;
			}
		}
		
		evtlist.push(vipevt);

		vipevt = vipevt.Next();
	}

	var str_tooltip = "";
	for (var i=0; i < evtlist.length; i++)
	{
		if (str_tooltip.length > 0)
			str_tooltip += '\n';
		
		str_tooltip += evtlist[i].div.title;
	}

	this.div.title = str_tooltip;
*/
}



//////////////////////////////////////////////////////////////////////

function VipMultiDayEvent(parent, evtinfo)
{
	this.createChild(parent, "vipmultidayevent");

	this.info = evtinfo;
	this.div.title = fmt("^ - ^", this.info.calendar, this.info.title);
	this.div.style.backgroundColor = this.info.colour;
	this.div.style.setProperty('--start', this.info.cellindex);
	this.div.style.setProperty('--extent', this.info.cellspan);
	this.div.style.opacity = vip.grid.cfg.multi_day_opacity;
	this.setSlot(1);
}

VipMultiDayEvent.prototype = new VipObject;

VipMultiDayEvent.prototype.setSlot = function(i)
{
	this.slot = i;
	this.div.style.setProperty('--slot', this.slot);
}

VipMultiDayEvent.prototype.nextSlot = function()
{
	this.setSlot(this.slot + 1);
}



//////////////////////////////////////////////////////////////////////

function VipSingleDayEvent(parent, evtinfo)
{
	this.createChild(parent, "vipsingledayevent");

	this.info = evtinfo;

	var time_title = "";
	if (this.info.timed)
	if (this.info.firstday)
	if (vip.grid.cfg.show_event_time)
		time_title = this.info.timetitle + " ";

	var evt_title = this.info.title;
	this.div.title = time_title + this.info.calendar + " - " + evt_title;

	if (vip.grid.cfg.proportional_events)
	{
		this.vipmarker = new VipDiv(this, "vipeventmarker");
		this.vipmarker.addClass("proportional");
		this.calcProportionalMarker();
	}
	else
	{
		if (vip.grid.cfg.show_event_marker)
			this.vipmarker = new VipDiv(this, "vipeventmarker");

		if (vip.grid.cfg.show_event_title)
		{
			this.vipevttext = new VipDiv(this, "vipeventtext");
			this.vipevttext.setText(time_title + evt_title);

			if (vip.grid.cfg.colour_event_title)
				this.vipevttext.div.style.color = this.info.colour;
		}
	}
	
	if (this.vipmarker)
		this.vipmarker.div.style.backgroundColor = this.info.colour;
}

VipSingleDayEvent.prototype = new VipObject;

VipSingleDayEvent.prototype.calcProportionalMarker = function()
{
	var s_range_start = (vip.grid.cfg.proportional_start_hour * 3600);
	var s_range_end = (vip.grid.cfg.proportional_end_hour * 3600);
	var s_range = (s_range_end - s_range_start);

	var s_evt_start = s_range_start;
	var s_evt_end = s_range_end;

	if (this.info.firstday && this.info.timed)
	{
		s_evt_start = this.info.startDaySeconds;

		if (s_evt_start < s_range_start)
			s_evt_start = s_range_start;
	}

	if (this.info.lastday && this.info.timed)
	{
		s_evt_end = this.info.endDaySeconds;

		if (s_evt_end > s_range_end)
			s_evt_end = s_range_end;
	}

	this.vipmarker.div.style.left = (((s_evt_start - s_range_start) / s_range) * 100) + "%";
	this.vipmarker.div.style.width = (((s_evt_end - s_evt_start) / s_range) * 100) + "%";

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




//////////////////////////////////////////////////////////////////////

function VipDate(src)
{
	if (src)
	{
		if (src instanceof VipDate)
			this.dt = new Date(src.dt);
		else
			this.dt = new Date(src);
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

VipDate.prototype.Timestamp = function()
{
	return (this.dt.getTime() - (this.dt.getTimezoneOffset()*60000));
}

VipDate.prototype.Datestamp = function()
{
	return Math.floor(this.Timestamp()/86400000);
}

VipDate.prototype.MoveDays = function(offset)
{
	this.dt.setDate(this.dt.getDate() + offset);
}

VipDate.prototype.MoveMonths = function(offset)
{
	this.dt.setMonth(this.dt.getMonth() + offset);
}

VipDate.prototype.MoveToStartOfWeek = function(startday)
{
	while (this.dt.getDay() != startday)
		this.MoveDays(-1);
}

VipDate.prototype.MoveToStartOfMonth = function()
{
	this.dt.setDate(1);
}

VipDate.prototype.MoveToStartOfYear = function()
{
	this.dt.setMonth(0);
	this.dt.setDate(1);
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

VipDate.prototype.getDaySeconds = function()
{
	return ((this.dt.getHours()*3600) + (this.dt.getMinutes()*60) + this.dt.getSeconds());
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

	if (vip.grid.cfg.time_24hr)
	{
		return fmt("^:^", hh, minutes);
	}
	else
	{
		var hours = (hh > 12) ? (hh-12) : hh;
		return fmt((hh < 12) ? "^:^am" : "^:^pm", hours, minutes);
	}
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
