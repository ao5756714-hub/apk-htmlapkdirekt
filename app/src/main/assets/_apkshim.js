(function(){
  var A = window.AndroidFiles;
  if (!A || window.__apkShim) return;
  window.__apkShim = true;

  function b64(file){
    return new Promise(function(res, rej){
      var r = new FileReader();
      r.onload = function(){ res(String(r.result).split(',')[1] || ''); };
      r.onerror = rej;
      r.readAsDataURL(file);
    });
  }
  try {
    Object.defineProperty(navigator, 'canShare', {configurable: true, writable: true, value: function(d){
      return !!d && ((d.files && d.files.length > 0) || !!d.text || !!d.url || !!d.title);
    }});
    Object.defineProperty(navigator, 'share', {configurable: true, writable: true, value: async function(d){
      d = d || {};
      var out = [];
      if (d.files) {
        for (var i = 0; i < d.files.length; i++) {
          var f = d.files[i];
          out.push({n: f.name || ('file' + i), m: f.type || 'application/octet-stream', b: await b64(f)});
        }
      }
      A.share(d.title || '', d.text || '', d.url || '', JSON.stringify(out));
    }});
  } catch(e){}
  window.print = function(){ A.print(); };

  try {
    var orig = navigator.clipboard;
    var clip = {
      writeText: function(t){ A.copy(String(t)); return Promise.resolve(); },
      readText: function(){ return Promise.resolve(A.paste()); },
      write: function(items){
        if (orig && orig.write) return orig.write(items);
        return Promise.reject(new Error('Desteklenmiyor'));
      },
      read: function(){
        if (orig && orig.read) return orig.read();
        return Promise.reject(new Error('Desteklenmiyor'));
      }
    };
    Object.defineProperty(navigator, 'clipboard', {configurable: true, value: clip});
  } catch(e){}
  try {
    var wl = {request: function(){
      A.keepAwake(true);
      var sentinel = {released: false, type: 'screen', addEventListener: function(){}, removeEventListener: function(){},
        release: function(){ A.keepAwake(false); this.released = true; return Promise.resolve(); }};
      return Promise.resolve(sentinel);
    }};
    Object.defineProperty(navigator, 'wakeLock', {configurable: true, value: wl});
  } catch(e){}

  var inc = [];
  function accepts(inp, f){
    var a = (inp.getAttribute('accept') || '').toLowerCase();
    if (!a) return true;
    var n = f.name.toLowerCase(), t = (f.type || '').toLowerCase();
    return a.split(',').some(function(p){
      p = p.trim();
      if (!p) return false;
      if (p.charAt(0) === '.') return n.slice(-p.length) === p;
      if (p.slice(-2) === '/*') return t.indexOf(p.slice(0, -1)) === 0;
      return t === p;
    });
  }
  function deliver(files){
    var ev = new CustomEvent('apkfile', {detail: {files: files, file: files[0]}, cancelable: true});
    window.dispatchEvent(ev);
    if (ev.defaultPrevented) return;
    var ins = document.querySelectorAll('input[type=file]'), target = null;
    for (var i = 0; i < ins.length && !target; i++) { if (accepts(ins[i], files[0])) target = ins[i]; }
    if (!target) return;
    try {
      var dt = new DataTransfer();
      for (var j = 0; j < files.length; j++) { if (target.multiple || j === 0) dt.items.add(files[j]); }
      target.files = dt.files;
      target.dispatchEvent(new Event('input', {bubbles: true}));
      target.dispatchEvent(new Event('change', {bubbles: true}));
    } catch(e){}
  }
  window.__incomingFile = function(name, mime, b){
    var bin = atob(b), u8 = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    inc.push(new File([u8], name, {type: mime || ''}));
  };
  window.__incomingDone = function(){
    var files = inc; inc = [];
    if (files.length) deliver(files);
  };
  window.__incomingText = function(t){
    window.dispatchEvent(new CustomEvent('apktext', {detail: {text: t}}));
  };
})();
