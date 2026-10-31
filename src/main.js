// Markdown for Word v2: opens .md files in Microsoft Word as real Word documents,
// and every Save in Word (Cmd+S) writes the edits back to the original .md.
// Stays open in the Dock while a Markdown file is open in Word, then quits itself.
ObjC.import('Foundation');
ObjC.import('AppKit');

var app = Application.currentApplication();
app.includeStandardAdditions = true;
var FM = $.NSFileManager.defaultManager;
var tracked = {}; // md path -> {docx, dir, front, docxTime, mdTime, opened, seen}

function res() { return $.NSBundle.mainBundle.resourcePath.js; }
function sq(s) { return "'" + s.replace(/'/g, "'\\''") + "'"; }
function sh(cmd) { return app.doShellScript(cmd); }
function now() { return Date.now() / 1000; }

function mtime(p) {
  var a = FM.attributesOfItemAtPathError(p, $());
  if (a.isNil()) return 0;
  return a.objectForKey('NSFileModificationDate').timeIntervalSince1970;
}

function readText(p) {
  var s = $.NSString.stringWithContentsOfFileEncodingError(p, $.NSUTF8StringEncoding, $());
  if (s.isNil()) s = $.NSString.stringWithContentsOfFileEncodingError(p, $.NSWindowsCP1252StringEncoding, $());
  if (s.isNil()) throw new Error('Could not read ' + p);
  return s.js;
}

function writeText(p, t) {
  var ok = $.NSString.alloc.initWithUTF8String(t).writeToFileAtomicallyEncodingError(p, true, $.NSUTF8StringEncoding, $());
  if (!ok) throw new Error('Could not write ' + p);
}

function hash(s) {
  var h = 5381;
  for (var i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
  return h.toString(16);
}

function openMd(p) {
  var t = tracked[p];
  if (t && isOpenInWord(t)) { sh('open -a "Microsoft Word" ' + sq(t.docx)); return; }
  var md = readText(p).replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  var front = '';
  var fm = md.match(/^---\n[\s\S]*?\n(---|\.\.\.)\n/);
  if (fm) { front = fm[0]; md = md.slice(front.length); }
  var name = p.split('/').pop();
  var base = name.replace(/\.(md|markdown|mdown|mkd|mkdn)$/i, '');
  var dir = $.NSHomeDirectory().js + '/Library/Caches/MarkdownForWord/' + hash(p);
  FM.createDirectoryAtPathWithIntermediateDirectoriesAttributesError(dir, true, $(), $());
  var docx = dir + '/' + base + '.docx';
  writeText(dir + '/in.md', md);
  var srcDir = p.slice(0, p.length - name.length);
  sh('cd ' + sq(srcDir) + ' && ' + sq(res() + '/pandoc') + ' -f gfm -t docx -o ' + sq(docx) + ' ' + sq(dir + '/in.md'));
  tracked[p] = { docx: docx, dir: dir, front: front, docxTime: mtime(docx), mdTime: mtime(p), opened: now(), seen: false };
  sh('open -a "Microsoft Word" ' + sq(docx));
}

function syncBack(p, t) {
  sh(sq(res() + '/pandoc') + ' -f docx -t gfm --wrap=none -o ' + sq(t.dir + '/out.md') + ' ' + sq(t.docx));
  var out = t.front + readText(t.dir + '/out.md');
  var target = p;
  if (mtime(p) !== t.mdTime) {
    // The .md changed outside Word since it was opened: never overwrite it.
    target = p.replace(/(\.[^.\/]+)?$/, ' (Word edits)$1');
    app.displayNotification('The original changed elsewhere, so your edits went to ' + target.split('/').pop(), { withTitle: 'Markdown for Word' });
  }
  writeText(target, out);
  if (target === p) t.mdTime = mtime(p);
}

// Word keeps a "~$" owner file next to a document while it is open.
// Checking for it avoids needing permission to control Word.
function isOpenInWord(t) {
  var items = FM.contentsOfDirectoryAtPathError(t.dir, $());
  if (items.isNil()) return false;
  return items.js.some(function (n) { return n.js.indexOf('~$') === 0; });
}

function handle(list) {
  list.forEach(function (f) {
    try { openMd(f.toString()); }
    catch (e) { app.displayAlert('Markdown for Word', { message: String(e) }); }
  });
}

function openDocuments(docs) { handle(docs); }

function run(argv) {
  if (argv && argv.length) { handle(argv); return; }
  var picked;
  try {
    picked = app.chooseFile({ withPrompt: 'Choose Markdown files to open in Word', multipleSelectionsAllowed: true });
  } catch (e) { return; }
  handle([].concat(picked));
}

function idle() {
  Object.keys(tracked).forEach(function (p) {
    var t = tracked[p];
    var dt = mtime(t.docx);
    if (dt && dt !== t.docxTime) {
      t.docxTime = dt;
      try { syncBack(p, t); }
      catch (e) { app.displayAlert('Markdown for Word', { message: 'Could not save back to ' + p + '\n' + e }); }
    }
    if (isOpenInWord(t)) t.seen = true;
    else if (t.seen || now() - t.opened > 60) delete tracked[p];
  });
  if (Object.keys(tracked).length === 0) $.NSApplication.sharedApplication.terminate($());
  return 2;
}
