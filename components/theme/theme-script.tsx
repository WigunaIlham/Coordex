// Inline no-flash script. Runs synchronously in <head> before hydration so
// the html element already has the right `.dark` class and `data-color`
// attribute before any pixels are painted.
//
// next-themes ships its own light/dark sync — this script only handles the
// color-scheme attribute (which lives outside next-themes' storage key).

const SCRIPT = `(function(){try{
  var c=localStorage.getItem('kkn-os:color');
  if(c && c!=='default' && ['blue','rose','amber','violet'].indexOf(c)>-1){
    document.documentElement.setAttribute('data-color',c);
  }
}catch(e){}})();`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: SCRIPT }} />;
}
