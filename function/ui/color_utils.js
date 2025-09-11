/**
 * Color Utils: invert colors with robust parsing and formatting.
 * - Supports: #rgb/#rgba/#rrggbb/#rrggbbaa, rgb()/rgba(), hsl()/hsla()
 * - Modes:
 *   - 'luma': invert luminance only (HSL: l -> 1 - l), keep hue/sat
 *   - 'rgb' : invert channels (r,g,b -> 255 - v)
 * - Blend amount: 0..1 (0 = original, 1 = fully inverted)
 * - Output: 'hex' | 'rgb' | 'rgba' (auto if not specified)
 */
(function(){
  function clamp01(x){ return Math.min(1, Math.max(0, x)); }
  function clamp255(x){ return Math.min(255, Math.max(0, Math.round(x))); }

  // Parsing
  function parseHex(hex){
    const s = hex.trim().replace(/^#/,'');
    if(s.length === 3){
      const r = parseInt(s[0]+s[0],16), g=parseInt(s[1]+s[1],16), b=parseInt(s[2]+s[2],16);
      return { r, g, b, a: 1 };
    }
    if(s.length === 4){
      const r = parseInt(s[0]+s[0],16), g=parseInt(s[1]+s[1],16), b=parseInt(s[2]+s[2],16), a=parseInt(s[3]+s[3],16)/255;
      return { r, g, b, a };
    }
    if(s.length === 6){
      const r = parseInt(s.slice(0,2),16), g=parseInt(s.slice(2,4),16), b=parseInt(s.slice(4,6),16);
      return { r, g, b, a: 1 };
    }
    if(s.length === 8){
      const r = parseInt(s.slice(0,2),16), g=parseInt(s.slice(2,4),16), b=parseInt(s.slice(4,6),16), a=parseInt(s.slice(6,8),16)/255;
      return { r, g, b, a };
    }
    throw new Error('Invalid hex color: ' + hex);
  }

  function parseRgb(str){
    const m = str.trim().match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/i);
    if(!m) throw new Error('Invalid rgb(a) color: ' + str);
    const r = Math.max(0, Math.min(255, parseFloat(m[1])));
    const g = Math.max(0, Math.min(255, parseFloat(m[2])));
    const b = Math.max(0, Math.min(255, parseFloat(m[3])));
    const a = m[4] == null ? 1 : Math.max(0, Math.min(1, parseFloat(m[4])));
    return { r, g, b, a };
  }

  function parseHsl(str){
    const m = str.trim().match(/^hsla?\(\s*([\-\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%(?:\s*,\s*([\d.]+))?\s*\)$/i);
    if(!m) throw new Error('Invalid hsl(a) color: ' + str);
    const h = ((parseFloat(m[1])%360)+360)%360; // wrap
    const s = clamp01(parseFloat(m[2])/100);
    const l = clamp01(parseFloat(m[3])/100);
    const a = m[4] == null ? 1 : clamp01(parseFloat(m[4]));
    const { r, g, b } = hslToRgb(h, s, l);
    return { r, g, b, a };
  }

  function parseColor(input){
    if(typeof input !== 'string') throw new Error('Color must be a string');
    const c = input.trim();
    if(c.startsWith('#')) return parseHex(c);
    if(/^rgba?\(/i.test(c)) return parseRgb(c);
    if(/^hsla?\(/i.test(c)) return parseHsl(c);
    // Attempt to use canvas to parse named colors
    const ctx = document.createElement('canvas').getContext('2d');
    ctx.fillStyle = '#000';
    ctx.fillStyle = c;
    const computed = ctx.fillStyle; // normalized to rgb(a)
    if(/^#[0-9a-f]{6}$/i.test(computed)) return parseHex(computed);
    if(/^rgba?\(/i.test(computed)) return parseRgb(computed);
    throw new Error('Unsupported color format: ' + input);
  }

  // Conversions
  function rgbToHsl(r,g,b){
    r/=255; g/=255; b/=255;
    const max = Math.max(r,g,b), min = Math.min(r,g,b);
    let h, s, l = (max+min)/2;
    if(max === min){ h = s = 0; }
    else {
      const d = max - min;
      s = l > 0.5 ? d/(2-max-min) : d/(max+min);
      switch(max){
        case r: h = (g-b)/d + (g < b ? 6 : 0); break;
        case g: h = (b-r)/d + 2; break;
        default: h = (r-g)/d + 4;
      }
      h *= 60;
    }
    return { h, s, l };
  }
  function hslToRgb(h,s,l){
    const C = (1 - Math.abs(2*l - 1)) * s;
    const X = C * (1 - Math.abs(((h/60) % 2) - 1));
    const m = l - C/2;
    let r1=0,g1=0,b1=0;
    if(0<=h && h<60){ r1=C; g1=X; }
    else if(60<=h && h<120){ r1=X; g1=C; }
    else if(120<=h && h<180){ g1=C; b1=X; }
    else if(180<=h && h<240){ g1=X; b1=C; }
    else if(240<=h && h<300){ r1=X; b1=C; }
    else { r1=C; b1=X; }
    return { r: clamp255((r1+m)*255), g: clamp255((g1+m)*255), b: clamp255((b1+m)*255) };
  }

  // Formatting
  function toHex({r,g,b,a}){
    const hh = (v)=>('0'+v.toString(16)).slice(-2);
    if(a == null || a >= 1) return `#${hh(r)}${hh(g)}${hh(b)}`;
    return `#${hh(r)}${hh(g)}${hh(b)}${hh(clamp255(a*255))}`;
  }
  function toRgbString({r,g,b,a}){
    if(a == null || a >= 1) return `rgb(${r}, ${g}, ${b})`;
    const aa = Math.round(a*1000)/1000;
    return `rgba(${r}, ${g}, ${b}, ${aa})`;
  }

  function blend(a, b, t){
    return {
      r: clamp255(a.r + (b.r - a.r) * t),
      g: clamp255(a.g + (b.g - a.g) * t),
      b: clamp255(a.b + (b.b - a.b) * t),
      a: clamp01(a.a + (b.a - a.a) * t)
    };
  }

  /**
   * invertColor(color, opts?)
   * @param {string} color - any css color string
   * @param {object} opts
   *   - mode: 'luma' | 'rgb' (default: 'luma')
   *   - amount: number 0..1 (default: 1)
   *   - output: 'hex' | 'rgb' | 'rgba' | 'auto' (default: 'auto')
   */
  function invertColor(color, opts){
    const o = Object.assign({ mode: 'luma', amount: 1, output: 'auto' }, opts||{});
    const src = parseColor(color);
    let inv;
    if(o.mode === 'rgb'){
      inv = { r: 255-src.r, g: 255-src.g, b: 255-src.b, a: src.a };
    } else {
      const hsl = rgbToHsl(src.r, src.g, src.b);
      const invH = hsl.h; // keep hue
      const invS = hsl.s; // keep saturation
      const invL = 1 - hsl.l; // invert luminance
      const rgb = hslToRgb(invH, invS, invL);
      inv = { r: rgb.r, g: rgb.g, b: rgb.b, a: src.a };
    }
    const out = blend(src, inv, clamp01(o.amount));

    const output = (o.output||'auto').toLowerCase();
    if(output === 'hex') return toHex(out);
    if(output === 'rgb' || output === 'rgba') return toRgbString(out);
    // auto: keep original format family when reasonable
    if(/^#/.test(color)) return toHex(out);
    if(/^rgba?/i.test(color)) return toRgbString(out);
    if(/^hsla?/i.test(color)) return toRgbString(out);
    return toHex(out);
  }

  /**
   * pickTextOn(bgColor): returns '#000' or '#fff' based on luminance for readability
   */
  function pickTextOn(bgColor){
    const {r,g,b} = parseColor(bgColor);
    const l = (0.2126*r + 0.7152*g + 0.0722*b)/255; // relative luminance approximation
    return l > 0.55 ? '#000' : '#fff';
  }

  // expose
  const api = { invertColor, pickTextOn };
  try { Object.defineProperty(window, 'ColorUtils', { value: api, writable: false, configurable: true }); }
  catch(_) { window.ColorUtils = api; }
})();
