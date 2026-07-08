// Inline guard for browsers below our support baseline (Safari 16.4+, Chrome
// 111+, Firefox 111+, Edge 111+). The main app bundle is compiled for that
// baseline, so on older browsers it fails to parse and the user is left with
// a half-rendered page. This script runs first, in the <head>, and swaps in a
// static "please update" overlay before the broken bundle is reached.
//
// Constraints on the script body itself:
//  - Must be ES5 (var / function, no arrows, no let/const, no template
//    literals, no optional chaining), because it needs to survive parsing on
//    the very browsers it is meant to warn.
//  - Feature-detects instead of UA-sniffing: `Object.hasOwn` lands in Safari
//    16.0 and is a reliable marker for the modern baseline.

const SCRIPT = `(function(){try{
  if(typeof Object.hasOwn==='function')return;
  var css='position:fixed;inset:0;z-index:2147483647;background:#fff;color:#0f172a;'+
    'font:16px -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;'+
    'display:flex;align-items:center;justify-content:center;padding:24px;text-align:center;';
  var html='<div style="max-width:420px">'+
    '<div style="font-size:20px;font-weight:600;margin-bottom:12px">Browser tidak didukung</div>'+
    '<p style="margin:0 0 16px;line-height:1.5;color:#334155">Aplikasi Coordex membutuhkan browser modern. '+
    'Silakan perbarui Safari ke versi 16.4 atau lebih baru, atau gunakan Chrome/Firefox versi terbaru.</p>'+
    '<p style="margin:0;font-size:13px;color:#64748b">Di iPhone/iPad: Settings &rarr; General &rarr; Software Update.</p>'+
    '</div>';
  function show(){
    var el=document.createElement('div');
    el.setAttribute('role','alert');
    el.style.cssText=css;
    el.innerHTML=html;
    document.body.appendChild(el);
  }
  if(document.body){show();}else{document.addEventListener('DOMContentLoaded',show);}
}catch(e){}})();`;

export function LegacyBrowserGuard() {
  return <script dangerouslySetInnerHTML={{ __html: SCRIPT }} />;
}
