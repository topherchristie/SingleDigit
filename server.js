

// End Authentication Setup

var flash = require('connect-flash');
var express = require('express');
var app = module.exports = express();
var swig = require('swig');

//var routes = require('./routes');
  
swig.init({
    root: __dirname + '/views',
//filters: require("./views/filters.js"),
     allowErrors: true // allows errors to be thrown and caught by express instead of suppressed
});

var consolidate = require('consolidate');

// Configuration
app.configure(function(){
  //app.set('views', __dirname + '/views');
  app.set('view options',{layout:false,cache:false});
  app.engine('html',consolidate.swig);
  app.set('view engine','html');  
  app.set("json spaces",0);
  app.use(express.logger());
  app.use(express.cookieParser());
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.session({ secret: 'keyboard cat' }));
  // Initialize Passport!  Also use passport.session() middleware, to support
  // persistent login sessions (recommended).
//  app.use(passport.initialize());
 // app.use(passport.session());
  app.use(flash());
 // app.use(app.router);
 // app.use("/public/require",express.static(__dirname + '/node_modules/requirejs',{maxAge: 31557600000, "Cache-Control":"public"}));
  app.use("/public/bootstrap/custom",express.static(__dirname + '/public/custom',{maxAge: 31557600000, "Cache-Control":"public"}));
  app.use("/public/bootstrap",express.static(__dirname + '/components/bootstrap/docs/assets',{maxAge: 31557600000, "Cache-Control":"public"}));
  app.use("/public/jquery",express.static(__dirname + '/components/jquery',{maxAge: 31557600000, "Cache-Control":"public"}));
  app.use("/public/requirejs",express.static(__dirname + '/components/requirejs',{maxAge: 31557600000, "Cache-Control":"public"}));
  app.use("/public/xdate",express.static(__dirname + '/components/xdate/src',{maxAge: 31557600000, "Cache-Control":"public"}));
  app.use("/public/underscore",express.static(__dirname + '/components/underscore',{maxAge: 31557600000, "Cache-Control":"public"}));
  app.use("/public/backbone",express.static(__dirname + '/components/backbone',{maxAge: 31557600000, "Cache-Control":"public"}));
  app.use("/app",express.static(__dirname + '/app'));
  app.use("/public",express.static(__dirname + '/public'));
  
});

var dao = require("./dao/scoresDao.js");

app.get('/', function(req,res){
    var locals = {"title":"Golf Home",scores:dao.getScores()};
    res.render("index.html",locals);  
 //   res.send("hello world");
});

app.get('/scores',function(req,res){
   res.json(dao.getScores()) ;
});


if(process.env.PORT){
    app.listen(process.env.PORT,process.env.IP);
    console.log("listening at",process.env.PORT);
}else{
  app.listen("3000");
  console.log("listening at 3000");
}
// *******************************************************
