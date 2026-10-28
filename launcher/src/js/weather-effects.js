import {conditionOf} from './weather.js';
/** A static weather tint plus bounded, four-frame-per-second precipitation. */
export function createWeatherEffects(el, getConfig) {
  let conditions=null, visible=true, timer=null, kind=null;
  const motion=window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  let precipitation;
  if (el) {
    // Two identical sets join into a seamless loop; only their parent moves.
    el.innerHTML='<span class="weather-glow"></span><span class="weather-cloud weather-cloud-a"></span><span class="weather-cloud weather-cloud-b"></span><div class="weather-precipitation">' +
      Array.from({length:16},function(_,i){const n=i%8;return '<span class="weather-particle" style="left:'+((n*37)%100)+'%;top:'+((n*43)%100+(i<8?0:100))+'%"></span>';}).join('')+'</div>';
    precipitation=el.querySelector('.weather-precipitation');
  }
  function tick(){
    if(!el || el.hidden || document.hidden || document.body.classList.contains('settings-open') ||
      document.body.classList.contains('app-inactive') || document.body.classList.contains('custom-screensaver-active'))return;
    precipitation.style.transform='translate3d(0,'+((Date.now()%12000)/120)+'%,0)';
  }
  function stop(){clearInterval(timer);timer=null;}
  function applyConfig(){
    if(!el)return;
    const cfg=getConfig().weather || {};
    el.hidden=!visible || cfg.enabled===false || cfg.effectsEnabled===false || !conditions;
    if(conditions){
      const condition=conditionOf(conditions.code);
      kind=condition==='drizzle'||condition==='thunder'?'rain':condition==='mainly-clear'?'clear':condition==='partly-cloudy'?'clouds':condition;
      el.setAttribute('data-weather',kind);el.setAttribute('data-day',String(conditions.isDay));
    }
    const reduced=!!(motion && motion.matches);
    el.classList.toggle('weather-reduced-motion',reduced);
    if(!el.hidden && !reduced && (kind==='rain'||kind==='snow')){if(!timer){tick();timer=setInterval(tick,250);}}
    else stop();
  }
  if(motion && motion.addListener)motion.addListener(applyConfig);
  return {update:function(value){conditions=value;applyConfig();},applyConfig:applyConfig,
    setVisible:function(value){visible=value;applyConfig();},
    stop:function(){stop();if(motion && motion.removeListener)motion.removeListener(applyConfig);}};
}
