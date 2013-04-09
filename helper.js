var helper = exports;

helper.render = function(req,res,template,locals){
    var msg = req.flash('info');
    locals.message = msg.length > 0 ? msg : null;
    //var wtf = req.app.locals(locals);
  //  locals.url = require("./url");
    res.render(template,locals);
};