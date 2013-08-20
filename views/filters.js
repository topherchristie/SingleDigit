var xdate = require('xdate');

var happyDate = exports.happyDate = function(input){
  return (new xdate(input,true)).toString('yyyy-MM-dd');    
}