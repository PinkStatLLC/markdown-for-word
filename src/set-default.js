// Makes Markdown for Word the default app for .md files.
ObjC.import('CoreServices');
function run() {
  var id = 'io.github.markdown-for-word';
  var types = ['net.daringfireball.markdown'];
  var out = [];
  types.forEach(function (t) {
    var err = $.LSSetDefaultRoleHandlerForContentType($(t), $.kLSRolesAll, $(id));
    var now = $.LSCopyDefaultRoleHandlerForContentType($(t), $.kLSRolesAll);
    out.push(t + ' -> ' + (now ? ObjC.castRefToObject(now).js : 'none') + ' (status ' + err + ')');
  });
  return out.join('\n');
}
