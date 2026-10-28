/** Local month widget. No account, network, event data or root permissions. */
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
export function monthCells(year, month, today) {
  const first = new Date(Date.UTC(year, month, 1));
  const start = first.getUTCDate() - first.getUTCDay();
  return Array.from({length:42}, function (_, i) {
    const d = new Date(Date.UTC(year, month, start + i));
    return {day:d.getUTCDate(), currentMonth:d.getUTCMonth() === month,
      today:!!today && d.getUTCFullYear() === today.getFullYear() &&
        d.getUTCMonth() === today.getMonth() && d.getUTCDate() === today.getDate()};
  });
}
export function createCalendarPanel(el, getConfig, options) {
  const isVisible = (options && options.isVisible) || function () { return true; };
  let selectedMonth=null, timer=null, stamp='';
  function step(direction){const base=selectedMonth || new Date();selectedMonth=new Date(base.getFullYear(),base.getMonth()+direction,1);refresh();}
  if (el) {
    el.innerHTML='<div class="calendar-head"><button id="calendar-prev" class="widget-icon-button focusable" data-focus-index="620" type="button" aria-label="Previous month">‹</button>' +
      '<button id="calendar-current" class="calendar-month focusable" data-focus-index="621" type="button" title="Return to this month"></button>' +
      '<button id="calendar-next" class="widget-icon-button focusable" data-focus-index="622" type="button" aria-label="Next month">›</button></div>' +
      '<div class="calendar-weekdays" aria-hidden="true"><span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span></div>' +
      '<div class="calendar-grid" role="list" aria-label="Days of the month"></div>';
    el.querySelector('#calendar-prev').addEventListener('click',function(){step(-1);});
    el.querySelector('#calendar-next').addEventListener('click',function(){step(1);});
    el.querySelector('#calendar-current').addEventListener('click',function(){selectedMonth=null;refresh();});
  }
  function refresh() {
    if (!el) return;
    const cfg=getConfig();el.hidden=!!(cfg.calendar && cfg.calendar.enabled === false);
    if (el.hidden) return;
    const now=new Date();const date=selectedMonth || new Date(now.getFullYear(),now.getMonth(),1);
    const year=date.getFullYear(), month=date.getMonth();
    const key=[year,month,now.getFullYear(),now.getMonth(),now.getDate()].join('-');
    if (stamp===key) return;
    stamp=key;
    const label=MONTHS[month]+' '+year;
    el.querySelector('#calendar-current').textContent=label;
    el.querySelector('#calendar-current').setAttribute('aria-label',label+'. Return to this month');
    el.querySelector('.calendar-grid').setAttribute('aria-label',label);
    el.querySelector('.calendar-grid').innerHTML=monthCells(year,month,now).map(function(d){
      return '<span role="listitem" class="calendar-day'+(d.currentMonth?'':' calendar-outside')+(d.today?' calendar-today':'')+'"'+
        (d.today?' aria-current="date"':'')+'>'+d.day+'</span>';
    }).join('');
  }
  function start(){refresh();if(!timer)timer=setInterval(function(){if(isVisible())refresh();},60000);}
  return {refresh:refresh,start:start,stop:function(){clearInterval(timer);timer=null;}};
}
