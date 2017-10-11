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
	this.past_transparency = 30;
	this.show_event_time = true;
	this.show_event_title = true;
	this.show_event_marker = true;
	this.colour_event_title = false;
	this.proportional_events = false;
	this.proportional_start_hour = 8;
	this.proportional_end_hour = 20;
	this.multi_day_as_single_day = false;
	this.multi_day_with_first_single_day = false;
	this.all_day_single_day_as_multi_day = false;
	// unused
	this.marker_width = 0.58;
	this.marker_transparency = 20;
	this.auto_refresh = false;
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

VipGrid.prototype.createMultiCol = function()
{
	var vdt_start = new VipDate();
	vdt_start.MoveToStartOfMonth();

	if (this.cfg.auto_scroll)
		vdt_start.MoveMonths(this.cfg.auto_scroll_offset);
	else
		vdt_start.MoveToStartOfYear();

	var vdt_end = new VipDate(vdt_start);

	var colcount = this.cfg.multi_col_count;
	if (this.isPortrait())
		colcount /= 2;

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
	this.div.style.setProperty('--markerwidth', Math.floor(fontsize*0.8) + "px");
	this.div.style.setProperty('--markerpadding', Math.floor(cellheight*0.2) + "px");
}

VipGrid.prototype.scroll_col = function(offset)
{
	if (this.cfg.scrolling_disabled)
		return;

	var cols = this.div;
	var ltor = (offset > 0);  // scroll direction
	var count = ltor ? offset : -offset;
	
	for (var c=0; c < count; c++)
		cols.removeChild(ltor ? cols.firstChild : cols.lastChild);

	var vipcol_prev = ltor ? cols.lastChild.vipobj : cols.firstChild.vipobj;
	var vdt_start = new VipDate(vipcol_prev.vdt_month);

	for (var c=0; c < count; c++)
	{
		vdt_start.MoveMonths(ltor ? 1:-1);

		var vdt_end = new VipDate(vdt_start);
		vdt_end.MoveMonths(1);

		var vipcol = new VipCol(this, vdt_start, vdt_end);

		if (!ltor)
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

VipGrid.prototype.getVipCell = function(vdt)
{
	var div = document.getElementById(vdt.ID());
	
	if (div)
	if (div.vipobj instanceof VipCell)
		return div.vipobj;

	return null;
}

VipGrid.prototype.addEvents = function(id, evts)
{
	var div = document.getElementById(id);
	
	if (div && div.vipobj instanceof VipCol)
		var vipcol = div.vipobj;
	else
		return;

	for (i in evts)
	{
		var evt = evts[i];

		evt.vdtStart = new VipDate(evt.start);
		evt.vdtEnd = new VipDate(evt.end);
		
		var vdtNext = new VipDate(evt.vdtStart);
		while (true)
		{
			evt.first = (vdtNext.Datestamp() == evt.vdtStart.Datestamp());
			evt.last = evt.timed ? (vdtNext.Datestamp() == evt.vdtEnd.Datestamp()) : (vdtNext.Datestamp() == (evt.vdtEnd.Datestamp()-1));

			var vipcell = this.getVipCell(vdtNext);

			if (vipcell && (vipcell.vipcol === vipcol))
			{
				if (evt.first && evt.last)
					vipcell.addEvent(evt);
				else
					vipcell.addColEvent(evt);
			}

			if (evt.last)
				break;

			vdtNext.MoveDays(1);
			continue;
		}
	}
}

VipGrid.prototype.addGadgetEvent = function(evt)
{
	evt.vdtStart = new VipDate(evt.start);
	evt.vdtEnd = new VipDate(evt.end);
	
	var vdtNext = new VipDate(evt.vdtStart);
	while (true)
	{
		evt.first = (vdtNext.Datestamp() == evt.vdtStart.Datestamp());
		evt.last = evt.timed ? (vdtNext.Datestamp() == evt.vdtEnd.Datestamp()) : (vdtNext.Datestamp() == (evt.vdtEnd.Datestamp()-1));

		var vipcell = this.getVipCell(vdtNext);

		if (vipcell)
		{
			if (evt.first && evt.last)
				vipcell.addEvent(evt);
			else
				vipcell.addColEvent(evt);
		}

		if (evt.last)
			break;

		vdtNext.MoveDays(1);
		continue;
	}
}

VipGrid.prototype.reloadEvents = function()
{
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

		this.reqCalEvents(vipcol.div.id, vipcol.datespan);

		vipcol = vipcol.Next();
	}
}



//////////////////////////////////////////////////////////////////////

function VipCol(parent, vdt_start, vdt_end)
{
	this.createChild(parent, "vipcol");
	
	this.div.id = ((vdt_start.dt.getFullYear()*100) + (vdt_start.dt.getMonth()+1));

	this.vdt_month = new VipDate(vdt_start);
	this.datespan = {start: new Date(vdt_start.dt), end: new Date(vdt_end.dt)};

	if (vip.grid.cfg.col_header)
	{
		this.viphdr = new VipDiv(this, "vipmonthhdr");
		this.viphdr.setText(this.vdt_month.MonthTitle());
		this.viphdr.div.onclick = onclickVipMonthHeader;

		if (this.vdt_month.isPastMonth())
			this.div.style.opacity = ((100 - vip.grid.cfg.past_transparency) / 100);
	}

	this.vipcoloffset = new VipDiv(this, "vipcoloffset");
	if (vip.grid.cfg.align_weekends)
		this.vipcoloffset.div.style.setProperty('--offsetday', this.vdt_month.DayOfWeek());

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
	
	vip.grid.reqCalEvents(this.div.id, this.datespan);
}

VipCol.prototype = new VipObject;

VipCol.prototype.updateSelectionTip = function(vipcell_start, vipcell_end)
{
	this.vipseltip.Show(false);

	if (!vipcell_start) return;
	if (!vipcell_end) return;
	if (vipcell_start === vipcell_end) return;

	var c = vipcell_end.vipdate.Datestamp() - vipcell_start.vipdate.Datestamp();
	var w = Math.floor(c/7);
	var d = (c-(w*7));
	var tip = (w > 0 ? fmt("^, ^-^", c, w, d) : fmt("^", c));

	this.vipseltip.div.style.lineHeight = vipcell_end.div.offsetHeight + "px";
	this.vipseltip.setText(tip);
	this.vipseltip.Align(vipcell_end, vipcell_end);
	this.vipseltip.Show(true);
}

VipCol.prototype.addEvent = function(evt, vipcell)
{
	var vipevt = null;

	var vipsib = this.vipevts.First();
	while (vipsib)
	{
		if (evt.id == vipsib.id)
		{
			vipevt = vipsib;
			break;
		}

		if (vipcell.vipdate.Datestamp() < vipsib.vipcell_start.vipdate.Datestamp())  // sort in date order
			break;

		vipsib = vipsib.Next();
	}

	if (!vipevt)
	{
		vipevt = new VipMultiDayEvent(this.vipevts, evt, vipcell);
		this.vipevts.MoveLastBefore(vipsib);
	}

	vipevt.extend(vipcell);
	this.findFreeSlot(vipevt);
}

VipCol.prototype.findFreeSlot = function(evt)
{
	var sib = this.vipevts.First();
	while (sib)
	{
		if (evt === sib) {}
		else
		{
			if (this.intersection(sib, evt))
			{
				if (evt.div.offsetLeft < 1)
					return;
				
				evt.nextSlot();
				this.findFreeSlot(evt);
				return;
			}
		}

		sib = sib.Next();
	}
}

VipCol.prototype.intersection = function(evt1, evt2)
{
	if (evt1.div.offsetLeft == evt2.div.offsetLeft)
	if (evt1.div.offsetTop < (evt2.div.offsetTop + evt2.div.offsetHeight + 2))
	if ((evt1.div.offsetTop + evt1.div.offsetHeight + 2) > evt2.div.offsetTop)
		return true;

	return false;
}



//////////////////////////////////////////////////////////////////////

function VipCell(parent, vipcol, vdt, id_today)
{
	this.createChild(parent, "vipcell");
	this.vipcol = vipcol;
	this.vipdate = new VipDate(vdt);
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

VipCell.prototype.addColEvent = function(evt)
{
	this.vipcol.addEvent(evt, this);
	this.updateTooltip();
}

VipCell.prototype.addEvent = function(evt)
{
	var vipsib = this.vipevts.First();
	while (vipsib)
	{
		if (evt.id == vipsib.id)
			return;

		vipsib = vipsib.Next();
	}

	var vipevt = new VipSingleDayEvent(this, evt);

	var vipsib = this.vipevts.First();
	while (vipsib)
	{
		if (vipevt.timestamp < vipsib.timestamp)
			break;

		vipsib = vipsib.Next();
	}

	this.vipevts.MoveLastBefore(vipsib);  // sort in time order

	this.updateTooltip();
}

VipCell.prototype.updateTooltip = function()
{
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
}



//////////////////////////////////////////////////////////////////////

function VipMultiDayEvent(parent, evt, vipcell)
{
	this.createChild(parent, "vipmultidayevent");

	this.id = evt.id;
	this.div.style.backgroundColor = evt.colour;
	this.div.style.setProperty('--start', vipcell.vipindex);
	this.vipcell_start = vipcell;
	this.vipcell_end = vipcell;
	this.setExtent(1);
	this.setSlot(1);

	this.div.title = fmt("^ - ^", evt.calendar, html2txt(evt.title));
}

VipMultiDayEvent.prototype = new VipObject;

VipMultiDayEvent.prototype.setExtent = function(i)
{
	this.extent = i;
	this.div.style.setProperty('--extent', this.extent);
}

VipMultiDayEvent.prototype.extend = function(vipcell)
{
	this.vipcell_end = vipcell;
	this.setExtent(this.vipcell_end.vipindex - this.vipcell_start.vipindex + 1);
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



//////////////////////////////////////////////////////////////////////

function VipSingleDayEvent(vipcell, evt)
{
	this.createChild(vipcell.vipevts, "vipsingledayevent");

	this.id = evt.id;
	this.timestamp = evt.vdtStart.Timestamp();
	this.firstday = evt.first;
	this.lastday = evt.last;
	this.timed = evt.timed;
	this.vdtStart = new VipDate(evt.vdtStart);
	this.vdtEnd = new VipDate(evt.vdtEnd);
	
	var evt_title = html2txt(evt.title);

	var time_title = "";
	if (this.timed)
	if (this.firstday)
	if (vip.grid.cfg.show_event_time)
		time_title = evt.vdtStart.TimeTitle() + " ";

	this.div.title = time_title + evt.calendar + " - " + evt_title;

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
				this.vipevttext.div.style.color = evt.colour;
		}
	}
	
	if (this.vipmarker)
		this.vipmarker.div.style.backgroundColor = evt.colour;
}

VipSingleDayEvent.prototype = new VipObject;

VipSingleDayEvent.prototype.calcProportionalMarker = function()
{
	var s_range_start = (vip.grid.cfg.proportional_start_hour * 3600);
	var s_range_end = (vip.grid.cfg.proportional_end_hour * 3600);
	var s_range = (s_range_end - s_range_start);

	var s_evt_start = s_range_start;
	var s_evt_end = s_range_end;

	if (this.firstday && this.timed)
	{
		s_evt_start = this.vdtStart.getDaySeconds();

		if (s_evt_start < s_range_start)
			s_evt_start = s_range_start;
	}

	if (this.lastday && this.timed)
	{
		s_evt_end = this.vdtEnd.getDaySeconds();

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

function html2txt(html)
{
	var tag = document.createElement('span');
	tag.innerHTML = html;
	return tag.textContent;
}
