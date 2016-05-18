//////////////////////////////////////////////////////////////////////

function VipObject()
{
}

VipObject.prototype.createDiv = function(parent, id)
{
	if (this.div) console.error("vip: div element already created");
	
	var div = document.createElement('div');

	if (id)
		div.id = id;

	div.style.position = "absolute";
	div.style.pointerEvents = "none";
	div.style.MozUserSelect = "none";  // ff fix
	div.vipobj = this;
	
	var parent_div = parent ? parent.div : document.body;
	parent_div.appendChild(div);

	this.div = div;
	this.parent = parent;
}

VipObject.prototype.setPos = function(left, top)
{
	this.div.style.left = left;
	this.div.style.top = top;
}

VipObject.prototype.setSize = function(width, height)
{
	this.div.style.width = width;
	this.div.style.height = height;
}

VipObject.prototype.ClearContent = function()
{
	if (this.div)
		this.div.innerHTML = "";
}

VipObject.prototype.getFirstChild = function()
{
	var element = this.div.firstChild;
	
	if (element)
		return element.vipobj;

	return null;
}

VipObject.prototype.getLastChild = function()
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

VipObject.prototype.setText = function(txt)
{
	this.div.innerHTML = txt;
}

VipObject.prototype.Show = function(showdiv)
{
	this.div.style.visibility = showdiv ? "visible" : "hidden";
}

VipObject.prototype.Align = function(cell_start, cell_end)
{
	if (cell_start && cell_end)
	{
		this.div.style.top = cell_start.div.offsetTop;
		this.div.style.height = (cell_end.div.offsetTop - cell_start.div.offsetTop) + cell_end.div.offsetHeight;
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
	this.createDiv(parent, id);
}

VipDiv.prototype = new VipObject;



//////////////////////////////////////////////////////////////////////

function VipHost()
{
	this.createDiv(null, "viphost");
}

VipHost.prototype = new VipObject;

VipHost.prototype.createSingleCol = function()
{
	this.SingleCol = true;

	vip.cell.width = document.body.offsetWidth;

	this.scale_font();
	
	var vdt_start = new VipDate.Today();
	vdt_start.MoveToStartOfWeek(1);  // monday this week

	var vdt_end = new VipDate(vdt_start);
	vdt_end.MoveDays(28);
	
	var vipcol = new VipCol(this, vdt_start, vdt_end);
	vipcol.vipcelloffset.setPos(0, 5);
}

VipHost.prototype.createMultiCol = function()
{
	if (vip.multi_col.scale.fixed)
	{
		vip.cell.height = vip.multi_col.scale.height;
		vip.cell.width = vip.multi_col.scale.width;
	}
	else
	{
		if (screen.orientation.type.includes("portrait"))
			vip.multi_col.count = (vip.multi_col.count / 2);

		// reset dimensions depending on available space
		vip.cell.height = Math.floor(document.body.clientHeight/(31+6+1));  // max days + max offset + month name
		vip.cell.width = Math.floor(document.body.clientWidth/vip.multi_col.count);
	}

	vip.cell.margin = vip.cell.height+4;

	this.scale_font();
	
	var vdt_start = new VipDate.Today();
	vdt_start.MoveToStartOfMonth();

	if (vip.multi_col.auto_scroll)
		vdt_start.MoveMonths(vip.multi_col.offset);
	else
		vdt_start.MoveToStartOfYear();

	var vdt_end = new VipDate(vdt_start);

	for (var c=0; c < vip.multi_col.count; c++)
	{
		vdt_end.MoveMonths(1);

		var vipcol = new VipCol(this, vdt_start, vdt_end);
		vipcol.addMonthHeader(vdt_start);
		
		vdt_start.MoveMonths(1);
	}

	this.updateLayout();
}

VipHost.prototype.scale_font = function()
{
	this.div.style.fontSize = fmt("^px", Math.floor(0.7*vip.cell.height));

	var a = document.createElement('div');
	a.innerHTML = "a";
	this.div.appendChild(a);
	vip.cell.font_client = {width: a.clientWidth, height: a.clientHeight};
	this.div.removeChild(a);
}

VipHost.prototype.scroll_col = function(offset)
{
	if (this.SingleCol) return;

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
		vipcol.addMonthHeader(vdt_start);

		if (!ltor)
			this.MoveLastBefore(this.getFirstChild());  // move col to left
	}

	this.updateLayout();
}

VipHost.prototype.updateLayout = function()
{
	var xpos=0;
	var col = this.div.firstChild;
	
	while(col)
	{
		col.style.left = xpos;
		
		xpos += vip.cell.width;
		col = col.nextSibling;
	}
}

VipHost.prototype.getVipCell = function(vdt)
{
	var div = document.getElementById(vdt.Datestamp());
	
	if (div)
	if (div.vipobj instanceof VipCell)
		return div.vipobj;

	return null;
}



//////////////////////////////////////////////////////////////////////

function VipCol(parent, vdt_start, vdt_end)
{
	this.createDiv(parent, "vipcol");

	this.vipcelloffset = new VipDiv(this, "vipcelloffset");
	this.vipcells = new VipCells(this.vipcelloffset, this, vdt_start, vdt_end);
	this.vipevts = new VipDiv(this.vipcelloffset, "vipevts");
	this.vipsel = new VipClrBar(this.vipcelloffset, "vipsel", "rgba(255,255,127,0.6)", 0, vip.cell.width);
	this.vipind = new VipClrBar(this.vipcelloffset, "vipind", "rgba(0,0,0,0.3)", (vip.cell.margin-3), 1);

	this.vipseltip = new VipDiv(this.vipcelloffset, "vipseltip");
	this.vipseltip.Show(false);
	this.vipseltip.div.style.fontSize = fmt("^px", Math.floor(0.5*vip.cell.height));
	this.vipseltip.div.style.width = vip.cell.width;
	this.vipseltip.div.style.textAlign = "center";

	this.vipsel.div.style.zIndex = "10";
	this.vipseltip.div.style.zIndex = "10";

	this.firstcell = this.vipcells.div.firstChild.vipobj;
	this.lastcell = this.vipcells.div.lastChild.vipobj;

	this.ReqDateStart = vdt_start.GCalDate();
	this.ReqDateEnd = vdt_end.GCalDate();
	
	vip.event_req.queue.push(this);
	request_events();
}

VipCol.prototype = new VipObject;

VipCol.prototype.addMonthHeader = function(vdt_month)
{
	this.vdt_month = new VipDate(vdt_month);
	this.vipcelloffset.setPos(0, ((vdt_month.DayOfWeek() + 1) * vip.cell.height));

	if (vdt_month.isPastMonth())
		this.div.style.opacity = ((100 - vip.multi_col.past_transparency) / 100);

	var viphdr = new VipDiv(this, "vipmonthhdr");
	viphdr.setText(vdt_month.MonthTitle());

	var hdr = viphdr.div;
	hdr.setAttribute('onclick', "onclick_month_header(event);");
	hdr.style.width = vip.cell.width;
	hdr.style.textAlign = "center";
	hdr.style.pointerEvents = "all";
	hdr.style.cursor = "pointer";
}

VipCol.prototype.updateSelectionTip = function(vipcell_start, vipcell_end)
{
	this.vipseltip.Show(false);

	if (!vipcell_start) return;
	if (!vipcell_end) return;
	if (vipcell_start === vipcell_end) return;

	this.vipseltip.div.innerHTML = vipcell_start.vipdate.TimespanTo(vipcell_end.vipdate);
	this.vipseltip.setPos(vipcell_end.div.offsetLeft, vipcell_end.div.offsetTop + Math.floor((vipcell_end.div.clientHeight - this.vipseltip.div.clientHeight) / 2));
	this.vipseltip.Show(true);
}

VipCol.prototype.addEvent = function(event, vipcell)
{
	var vipevt = null;

	var vipsib = this.vipevts.getFirstChild();
	while (vipsib)
	{
		if (event.id == vipsib.evt_id)
		{
			vipevt = vipsib;
			break;
		}

		if (vipcell.vipdate.dt < vipsib.vipcell_start.vipdate.dt)
			break;

		vipsib = vipsib.Next();
	}

	if (!vipevt)
	{
		vipevt = new VipMultiDayEvent(this.vipevts, event, vipcell);
		this.vipevts.MoveLastBefore(vipsib);
	}

	vipevt.updateEvent(vipcell);
	vipcell.updateEventInfo();
	this.updateEventLayout();
}

VipCol.prototype.updateEventLayout = function()
{
	var fixed = [];

	var vipsib = this.vipevts.getFirstChild();
	while (vipsib)
	{
		var x_off = (vipsib.div.clientWidth + 2);
		vipsib.div.style.left = (vip.cell.width - x_off);
		
		while(true)
		{
			var shift = false;

			for (var i=0; i < fixed.length; i++)
			{
				if (this.intersection(vipsib, fixed[i]))
				{
					shift = true;
					break;
				}
			}
			
			if (shift)
				vipsib.div.style.left = (vipsib.div.offsetLeft - x_off);
			else
				break;
		}

		fixed.push(vipsib);
		vipsib = vipsib.Next();
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

function VipCells(parent, col, vdt_start, vdt_end)
{
	this.createDiv(parent, "vipcells");

	var y = 0;
	var vdt_day = new VipDate(vdt_start);
	while (vdt_day.dt < vdt_end.dt)
	{
		var vipcell = new VipCell(this, col, vdt_day);
		vipcell.setPos(0, y);
		vdt_day.MoveDays(1);
		y += vip.cell.height;
	}
}

VipCells.prototype = new VipObject;



//////////////////////////////////////////////////////////////////////

function VipCell(parent, col, vdt)
{
	this.createDiv(parent, vdt.Datestamp());
	this.vipcol = col;
	this.vipdate = new VipDate(vdt);

	this.setSize(vip.cell.width-1, vip.cell.height-1);
	this.div.style.backgroundColor = (vdt.isWeekend() ? "#d8d8d8" : "#eaeaea");
	this.div.style.pointerEvents = "all";
	
	var vipnum = new VipDiv(this);
	vipnum.setText(vdt.DayOfMonth());

	var num = vipnum.div;
	num.style.top = Math.floor((vip.cell.height - num.clientHeight) / 2);
	num.style.width = vip.cell.height;
	num.style.textAlign = "center";
	num.style.cursor = "pointer";
	num.style.pointerEvents = "all";
	num.setAttribute('onclick', "onclick_day_number(event);");

	if (vdt.isToday())
	{
		num.style.fontWeight = "bold";
		num.style.color = "white";
		num.style.backgroundColor = "red";
	}
	
	this.vipevts = new VipDiv(this, "vipevts");
	this.vipevts.setPos(vip.cell.margin, 0);
	this.vipevts.setSize((this.div.offsetWidth - vip.cell.margin), this.div.offsetHeight);
	this.vipevts.div.style.overflow = "hidden";
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
	if (this.vipdate.dt >= vdt_lo.dt)
	if (this.vipdate.dt <= vdt_hi.dt)
		return true;

	return false;
}

VipCell.prototype.addEvent = function(event)
{
	var vtm_event = new VipTime.GCal(event.startTime);
	var timestamp = vtm_event.Timestamp();

	var vipsib = this.vipevts.getFirstChild();
	while (vipsib)
	{
		if (event.id == vipsib.evt_id)
			return;

		if (timestamp < vipsib.evt_timestamp)
			break;

		vipsib = vipsib.Next();
	}

	var vipevt = new VipSingleDayEvent(this, event);
	this.vipevts.MoveLastBefore(vipsib);  // sort in time order

	this.updateEventInfo();
	this.updateEventLayout();
}

VipCell.prototype.updateEventLayout = function()
{
	if (vip.events.proportional.show)
		return;
		
	var sep = 2;

	var tot_width = 0;
	var vipevt = this.vipevts.getFirstChild();
	while (vipevt)
	{
		if (tot_width > 0)
			tot_width += sep;
		
		vipevt.initLayout();
		tot_width += vipevt.div.offsetWidth;

		vipevt = vipevt.Next();
	}

	if (vip.events.title.show)
	{
		while (tot_width > this.vipevts.div.offsetWidth)
		{
			var longest = this.vipevts.getFirstChild();
			var vipevt = longest.Next();
			while (vipevt)
			{
				if (vipevt.flex_title.length > longest.flex_title.length)
					longest = vipevt;
					
				vipevt = vipevt.Next();
			}
			
			if (longest.flex_title.length == 0)
				break;

			tot_width -= longest.div.offsetWidth;
			longest.shortenTitle();
			tot_width += longest.div.offsetWidth;
		}
	}

	var x_off = 0;

	var vipevt = this.vipevts.getFirstChild();
	while (vipevt)
	{
		if (x_off > 0)
			x_off += sep;
		
		vipevt.div.style.left = x_off;
		x_off += vipevt.div.offsetWidth;

		vipevt = vipevt.Next();
	}
}

VipCell.prototype.updateEventInfo = function()
{
	var str_tooltip = "";

	var vipevt = this.vipcol.vipevts.getFirstChild();
	while (vipevt)
	{
		if (this.inRange(vipevt.vipcell_start, vipevt.vipcell_end))
		{
			if (str_tooltip.length > 0)
				str_tooltip += '\n';
			
			str_tooltip += vipevt.tooltip;
		}

		vipevt = vipevt.Next();
	}

	vipevt = this.vipevts.getFirstChild();
	while (vipevt)
	{
		if (str_tooltip.length > 0)
			str_tooltip += '\n';
		
		str_tooltip += vipevt.tooltip;

		vipevt = vipevt.Next();
	}

	this.div.setAttribute("title", str_tooltip);
}



//////////////////////////////////////////////////////////////////////

function VipClrBar(parent, id, clr, xpos, width)
{
	this.createDiv(parent, id);
	this.Show(false);
	
	var bar = this.div;
	bar.style.left = xpos;
	bar.style.width = width;
	bar.style.backgroundColor = clr;
}

VipClrBar.prototype = new VipObject;



//////////////////////////////////////////////////////////////////////

function VipMultiDayEvent(parent, event, vipcell)
{
	this.createDiv(parent, "vipmultidayevent");
	this.evt_id = event.id;
	this.evt_title = html2txt(event.title);
	this.vipcell_start = vipcell;
	this.vipcell_end = vipcell;
	this.div.style.zIndex = "1";

	var evt = this.div;
	evt.style.width = vip.events.allday.width_chars * vip.cell.font_client.width;
	evt.style.backgroundColor = event.palette.medium;

	if (event.calendar)
		this.tooltip = fmt("^ - ^", event.calendar, this.evt_title);
	else
		this.tooltip = this.evt_title;
}

VipMultiDayEvent.prototype = new VipObject;

VipMultiDayEvent.prototype.updateEvent = function(vipcell)
{
	this.vipcell_end = vipcell;
	this.Align(this.vipcell_start, this.vipcell_end);
}



//////////////////////////////////////////////////////////////////////

function VipSingleDayEvent(vipcell, event)
{
	var vdt_start = new VipDate.GCal(event.startTime);
	var vtm_start = new VipTime.GCal(event.startTime);

	this.createDiv(vipcell.vipevts, "vipsingledayevent");
	this.evt_id = event.id;
	this.evt_datestamp = vdt_start.Datestamp();
	this.evt_timestamp = vtm_start.Timestamp();
	this.evt_title = html2txt(event.title);
	this.evt_timed = !event.allDay;
	this.div.style.zIndex = "2";

	this.evt_title_time = "";
	if (this.evt_timed)
	if (this.evt_datestamp == vipcell.vipdate.Datestamp())
		this.evt_title_time = vtm_start.TimeTitle() + " ";

	this.tooltip = this.evt_title_time;
	if (event.calendar)
		this.tooltip += fmt("^ - ", event.calendar);
	this.tooltip += this.evt_title;

	var x_off = 0;
	var y_off = Math.floor((vip.cell.height - vip.cell.font_client.height) / 2);

	if (!vip.events.title.show || !vip.events.title.hide_marker)
	{
		this.vipmarker = new VipDiv(this, "vipevtmarker");
		this.vipmarker.setSize(vip.cell.font_client.width, vip.cell.font_client.height);
		this.vipmarker.setPos(0, y_off);
		this.vipmarker.div.style.backgroundColor = event.palette.medium;

		x_off = (this.vipmarker.div.offsetWidth + 2);
	}

	if (vip.events.proportional.show)
	{
		var vdt_start = new VipDate.GCal(event.startTime);
		var vdt_end = new VipDate.GCal(event.endTime);
		
		if (vdt_start.isSameDay(vdt_end))
			var vtm_end = new VipTime.GCal(event.endTime);
		else
			var vtm_end = new VipTime.HourMin(24, 0);
		
		var m_duration = ((vtm_end.toSeconds() - vtm_start.toSeconds()) / 60);
		var m_start = (vtm_start.toSeconds() / 60);
		var m_range_start = (vip.events.proportional.start_hour * 60);
		var m_range_end = (vip.events.proportional.end_hour * 60);
		var m_per_px = ((m_range_end - m_range_start)/vipcell.vipevts.div.offsetWidth);

		this.vipmarker.div.style.left = Math.round((m_start - m_range_start) / m_per_px);
		this.vipmarker.div.style.width = Math.round(m_duration / m_per_px);

		var off_right = (this.vipmarker.div.offsetLeft + this.vipmarker.div.offsetWidth);
		if ((off_right <= 0) || (this.vipmarker.div.offsetLeft >= vipcell.vipevts.div.offsetWidth))
		{
			var viphidden = new VipDiv(this, "viphiddenevt");
			viphidden.setPos(0, y_off);
			viphidden.setText("...");
		}
	}

	if (vip.events.title.show)
	{
		this.viptitle = new VipDiv(this, "viptitle");
		this.viptitle.div.style.whiteSpace = "nowrap";
		this.viptitle.setPos(x_off, y_off);

		if (vip.events.title.colour)
			this.viptitle.div.style.color = event.palette.medium;
	}
}

VipSingleDayEvent.prototype = new VipObject;

VipSingleDayEvent.prototype.initLayout = function()
{
	if (this.viptitle)
	{
		this.flex_title = "";

		if (vip.events.title.time)
			this.flex_title += this.evt_title_time;

		this.flex_title += this.evt_title;
		
		if (vip.events.title.hide_marker)
		if (this.Next())
			this.flex_title += ',';

		this.viptitle.setText(this.flex_title);
	}

	this.updateWidth();
}

VipSingleDayEvent.prototype.updateWidth = function()
{
	if (this.viptitle)
		this.div.style.width = (this.viptitle.div.offsetLeft + this.viptitle.div.offsetWidth);
	else if (this.vipmarker)
		this.div.style.width = this.vipmarker.div.offsetWidth;
	else
		this.div.style.width = 0;
}

VipSingleDayEvent.prototype.shortenTitle = function()
{
	if (this.flex_title.length > 0)
	{
		this.flex_title = this.flex_title.substr(0, this.flex_title.length-1);
		this.flex_title = this.flex_title.trim();

		this.viptitle.setText(this.flex_title + "...");
		this.updateWidth();
	}
}



//////////////////////////////////////////////////////////////////////

function VipDate(vdt)
{
	if (vdt instanceof VipDate)
		this.dt = new Date(vdt.dt);  // make a copy
}

VipDate.prototype.dt_today = new Date;
VipDate.prototype.dt_today.setHours(0,0,0,0);

VipDate.prototype.constructor.Today = function()
{
	var vdt = new VipDate;
	vdt.dt = new Date(vdt.dt_today);
	return vdt;
}

VipDate.prototype.constructor.YMD = function(yyyy, mm, dd)
{
	var vdt = new VipDate;
	vdt.dt = new Date(yyyy, mm-1, dd);
	return vdt;
}

VipDate.prototype.constructor.GCal = function(gdt)
{
	var dt = google.calendar.utils.toDate(gdt);
	var vdt = new VipDate.YMD(dt.getFullYear(), dt.getMonth()+1, dt.getDate());
	return vdt;
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
}

VipDate.prototype.Datestamp = function()
{
	return ((this.dt.getFullYear()*10000) + ((this.dt.getMonth() + 1)*100) + this.dt.getDate());
}

VipDate.prototype.DayOfMonth = function()
{
	return this.dt.getDate();
}

VipDate.prototype.DayOfWeek = function()
{
	return this.dt.getDay();
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

VipDate.prototype.GCalDate = function()
{
	return google.calendar.utils.fromDate(this.dt);
}

VipDate.prototype.isWeekend = function()
{
	return (this.dt.getDay()==0 || this.dt.getDay()==6);
}

VipDate.prototype.isToday = function()
{
	return (this.dt.valueOf() == this.dt_today.valueOf());
}

VipDate.prototype.isSameDay = function(vdt)
{
	return (this.dt.valueOf() == vdt.dt.valueOf());
}

VipDate.prototype.isPastMonth = function()
{
	var vdt_this_month = new VipDate.Today();
	vdt_this_month.MoveToStartOfMonth();
	
	return (this.dt < vdt_this_month.dt);
}

VipDate.prototype.TimespanTo = function(vdt_end)
{
	var s = Math.abs(Date.UTC(this.dt.getFullYear(), this.dt.getMonth(), this.dt.getDate()) - Date.UTC(vdt_end.dt.getFullYear(), vdt_end.dt.getMonth(), vdt_end.dt.getDate()));
	var c = Math.floor(s/86400000);
	var w = Math.floor(c/7);
	var d = (c-(w*7));
	
	return (w > 0 ? fmt("^, ^-^", c, w, d) : fmt("^", c));
}

VipDate.prototype.ShowInCalendar = function()
{
	google.calendar.showDate(this.dt.getFullYear(), (this.dt.getMonth() + 1), this.dt.getDate());
}



//////////////////////////////////////////////////////////////////////

function VipTime(vtm)
{
	this.hh = 0;
	this.mm = 0;
	this.ss = 0;

	if (vtm instanceof VipTime)
	{
		this.hh = vtm.hh;
		this.mm = vtm.mm;
		this.ss = vtm.ss;
	}
}

VipTime.prototype.constructor.HourMin = function(hh, mm)
{
	var vtm = new VipTime;
	vtm.hh = hh;
	vtm.mm = mm;

	return vtm;
}

VipTime.prototype.constructor.GCal = function(gdt)
{
	var dt = google.calendar.utils.toDate(gdt);

	var vtm = new VipTime;
	vtm.hh = dt.getHours();
	vtm.mm = dt.getMinutes();

	return vtm;
}

VipTime.prototype.Timestamp = function()
{
	return ((this.hh*10000) + (this.mm*100) + this.ss);
}

VipTime.prototype.toSeconds = function()
{
	return ((this.hh*60*60) + (this.mm*60) + this.ss);
}

VipTime.prototype.TimeTitle = function()
{
	var minutes = fmt((this.mm < 10) ? "0^" : "^", this.mm);

	if (vip.events.time_24hr)
	{
		return fmt("^:^", this.hh, minutes);
	}
	else
	{
		var hours = (this.hh > 12) ? (this.hh-12) : this.hh;
		return fmt((this.hh < 12) ? "^:^am" : "^:^pm", hours, minutes);
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
