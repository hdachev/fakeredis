
function formatSource(src) {
  var literals = {}
    , idc = 0;

  function stash(literal) {
    var id = idc++;
    literals[id] = literal;
    return "__unstash(" + id + ")";
  }

  function unstash(macro) {
    return literals[macro.replace(/[^0-9]+/g, '')];
  }

  return (
    src

      // stash string literals, comments and regexps
      .replace(/\/\/[^\n]*/g, stash)
      .replace(/\/\*[^]*?\*\//g, stash)

      .replace(/'[^\n']*?(\\'[^\n']*?)*'/g, stash)
      .replace(/"[^\n"]*?(\\"[^\n"]*?)*"/g, stash)
      .replace(/\/[^\n\/]*?(\\\/[^\n\/]*?)*\/[a-z]*/g, stash)

      .replace(/\/\/[^\n]*/g, stash)
      .replace(/\/\*[^]*?\*\//g, stash)

      .replace(/'[^\n']*?(\\'[^\n']*?)*'/g, stash)
      .replace(/"[^\n"]*?(\\"[^\n"]*?)*"/g, stash)
      .replace(/\/[^\n\/]*?(\\\/[^\n\/]*?)*\/[a-z]*/g, stash)

      // assume 4 space indent style
      .replace(/    /g, "\t")
      .replace(/  +/g, " ")

      // remove spaces around parens
      .replace(/ *([[({})\]]) */g, "$1")
      .replace(/ *([[({})\]]) */g, "$1")
      .replace(/ *([[({})\]]) */g, "$1")

      // till unstash

      // keep spaces around keywords/identifiers
      .replace(/(if|else|while|for|return|do)([({[])/g, "$1 $2")
      .replace(/([)}])([a-zA-Z])/g, "$1 $2")

      // fix ){
      .replace(/\)\{/g, ") {")
      // fix one liner functions
      .replace(/\{([\S])/g, "{ $1")
      .replace(/([\S])\}/g, "$1 }")

      // fix { }
      .replace(/\{ \}/g, "{}")

      // move opening { on same line
      .replace(/\n\s*\{\s*\n/g, " {\n")

      // move opening ( on same line
      .replace(/\n\s*\(\s*\n/g, "(\n")

      // fix : spacing
      .replace(/\s*:\s*/g, ": ")

      // fix ternary operator : spacing
      .replace(/(\?[^\n:]+):/g, "$1 :")

      // fix operator spacing
      .replace(/\s*(\+\+|--|\|\||&&|\+=|-=|\*=|\/=|\+|-|<=|>=|<+|>+|!==|===|=|%)[^\S\n]*/g, " $1 ")
      .replace(/\s*(\+\+|--|\|\||&&|\+=|-=|\*=|\/=|\+|-|<=|>=|<+|>+|!==|===|=|%)[^\S\n]*/g, " $1 ")
      .replace(/\s*(\+\+|--) */g, "$1")

      // unstash stuff
      .replace(/__unstash\([0-9]+\)/g, unstash)
      .replace(/__unstash\([0-9]+\)/g, unstash)
      .replace(/__unstash\([0-9]+\)/g, unstash)
      .replace(/__unstash\([0-9]+\)/g, unstash)

      // from here on only patterns that include newlines are safe

      // fix var indent and move var , on next line
      .replace(/var [^\;]+;/g, function(vars) {
        return vars.replace(/,(\n(?:\t*\n)*\t+)/g, "$1, ");
      })

      // move obj literal commas for comma-first style
      .replace(/,(\n(?:\t*(?:\/\/[^\n]*)?\n)*)\t([a-zA-Z$_])/g, "$1, $2")

      // fix non-whitespace followed commas
      .replace(/,([\S])/g, ", $1")

      // indent = 2 spaces
      .replace(/\t/g, "  ")

      // fix the stupid comment style
      .replace(/  \/\/\/\/ */g, "// ")

      // remove more than two line long instances of whitespace
      .replace(/\n\n\n\n+/g, "\n\n\n")
  );
}

var fs = require('fs');
function formatFile(filename) {
  fs.readFile(filename + '.unfmt.js', 'utf8', function(err, src) {
    if (err)
      throw err;

    fs.writeFile(filename + '.js', formatSource(src), function(err) {
      if (err)
        throw err;
    });
  });
}

var filenames = ["main", "lib/backend", "lib/connection", "lib/helpers"];
filenames.forEach(formatFile);
