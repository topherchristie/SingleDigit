
var flash = require('connect-flash');
var express = require('express');
var app = module.exports = express();
var swig = require('swig');
var config = require('./config');
//var routes = require('./routes');
  
  /*
swig.init({
    root: __dirname + '/views',
//filters: require("./views/filters.js"),
     allowErrors: true // allows errors to be thrown and caught by express instead of suppressed
});
*/
var consolidate = require('consolidate');

// Configuration
app.configure(function(){
  app.set('views', __dirname + '/views');
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
  app.use("/public/handlebars",express.static(__dirname + '/components/handlebars',{maxAge: 31557600000, "Cache-Control":"public"}));
  app.use("/public/xdate",express.static(__dirname + '/components/xdate/src',{maxAge: 31557600000, "Cache-Control":"public"}));
  app.use("/public/underscore",express.static(__dirname + '/components/underscore',{maxAge: 31557600000, "Cache-Control":"public"}));
  app.use("/public/backbone",express.static(__dirname + '/components/backbone',{maxAge: 31557600000, "Cache-Control":"public"}));
  app.use("/public/d3",express.static(__dirname + '/components/d3',{maxAge: 31557600000, "Cache-Control":"public"}));
  app.use("/app",express.static(__dirname + '/app'));
  app.use("/public",express.static(__dirname + '/public'));
  
});

var dao = require("./dao/scoresDao.js");
dao.connect(config.ConnectionString,function(error){
    console.log('connect returned');
    if(error) throw error;
});
    
    
app.on('close',function(err){
    console.log('closing!');
    if(err){
        console.error('Error Closing',err);
    }
	dao.disconnect(function(err){console.error('error closing:' + err);});
});
var helper = require("./helper");
app.get('/', function(req,res){
    var locals = {
        "useCompiledJs":config.useCompiledJs,
        "title":"Golf Home"};
    helper.render(req,res,"index.html",locals);  
});
app.post('/score/save', function(req,res){
    if(req.body.id){
        res.send("saving changes score for " + req.body.id);
    }else{
        dao.createScore(req.body,function(err,res){
            if(err) 
                res.send({message:err}); 
            else
                res.send({message:"created new score",id:res.id}); 
        });
    }
    //res.send(req.body);
});
app.get('/score/edit/:id', function(req,res){
    dao.getScore(req.params.id,function(err,result){
        if(err) throw err;
        if(result == null) throw "id:" + req.param.id + "not found";
        var locals = {
            "useCompiledJs":config.useCompiledJs,
            "title":"Golf - Edit Score",score:result
        };
        helper.render(req,res,"score/add.html",{"locals":locals});  
    });
});

app.get('/score/add', function(req,res){
    dao.getCourses(function(err,result){
        if(err) throw err;
        var locals = {
            "useCompiledJs":config.useCompiledJs,
            "title":"Golf - Add Score",courses:result,score:0,fairways:"0 of 0",putts:0,chips:0,GIR:0
        };
        helper.render(req,res,"score/add.html",locals);  
    });
});

app.get('/scores',function(req,res){
    dao.getScores('me',function(err,result){
        res.json(result) ; 
    });
});

app.get('/scores/refresh',function(req,res){
    var predictor = require("./domain/handicapPredictor");
    var async = require("async");
    dao.getScoresByDate('me',function(err,scores){
        //update current handicap for each score
       
        
        predictor.updateHandicaps(scores);
        
        if(err) throw err;
        async.eachLimit(scores,5,
            function(score,callback){
//console.log('saving');
                score.save(callback);
            },
            function(err){
                if(err) throw res.send(JSON.stringify(err));
               //res.send('finished refreshing');
                req.flash("info",'finished refreshing score stats');
                res.redirect("/");
            }
        );
    }); 
});

var goalManager = require('./domain/goalManager');
app.get('/goals',function(req,res){
    dao.reduceByYear(function(err,result){
        if(err) throw err;
        res.json(goalManager.GetGoals(result)); 
    });
});

app.get('/courses',function(req,res){
    dao.getCourses(function(err,result){
        if(err) throw err;
        res.json(result); 
    });
});

app.get('/course/stats',function(req,res){
    var cId = req.query.courseId;
    dao.reduceByCourse(cId,function(err,result){
        if(err) throw err;
        var model = {"holes":result,"courseId":cId};
        res.json(model); 
    });
});
var routes = require('./routes');

app.get('/teePredictions',routes.tee.predictions);
app.get('/stats/scoresVs/:stat',routes.graphs.scoreVs);
app.get('/stats/girVsFw',routes.graphs.girVsFw);

app.post('/course/tees',function(req,res){
    var cId = req.body.id;
    console.log("cid",cId);
    dao.getTeesByCourseId(cId,function(err,result){
        if(err) throw err;
        var model = {"tees":result,"courseId":cId};
        res.json(model); 
    });
});
app.post('/tee',function(req,res){
    var teeId = req.body.id;
    dao.getTeeById(teeId,function(err,result){
        if(err) throw err;
        var model = result;
        res.json(model); 
    });
});
app.get('/course/predict',function(req,res){
    dao.getTeeById(req.query.teeId,function(err,course){
        if(err) throw err;
        dao.getLast20Scores('me',function(err,result){
            var simplify =[];
            result.forEach(function(s){
              simplify.push({"id":s._id,"date":s.date,"score":s.score,"handicap":s.stats.handicap});
            });
            if(err) throw err;
            var predictor = require('./domain/handicapPredictor');
            var scoreGrouping = predictor.compileScores(simplify);
            var predictions = predictor.coursePredict(course.rating,course.slope,scoreGrouping.sumOfTop9Scores);
            var model = scoreGrouping;
            model.predictions = predictions;
            res.json(model);
        });
    });
});

app.get('/handicap/month',function(req,res){
    res.json([]);
});

if(process.env.PORT){
    app.listen(process.env.PORT,process.env.IP);
    console.log("listening at",process.env.PORT);
}else{
  app.listen("3000");
  console.log("listening at 3000");
}
// *******************************************************
