
var TeeRoute = function(){};
TeeRoute.predictions = function(req,res){
    var dao = require("../dao/scoresDao.js");
    dao.getLast20Scores('me',function(err,scores){
        var simplify =[];
        scores.forEach(function(s){
          simplify.push({"id":s._id,"date":s.date,"score":s.score,"handicap":s.stats.handicap});
        });
        if(err) throw err;
        var predictor = require('../domain/handicapPredictor');
        var scoreGrouping = predictor.compileScores(simplify);
        
        //var model = scoreGrouping;
        dao.getTeesByCourseId(req.query.courseId,function(err,tees){
            if(err) throw err;
            var teeList = [];
            tees.forEach(function(tee){
                var simpleTee = {};
                simpleTee.slope = tee.slope;
                simpleTee.rating = tee.rating;
                simpleTee.name = tee.name;
                simpleTee._id = tee._id;
                simpleTee.scores = scoreGrouping.scores;
                simpleTee.nextBest = scoreGrouping.nextBest;
                simpleTee.isScoreBeingBumped = scoreGrouping.isScoreBeingBumped;
                simpleTee.currentHandicap = scoreGrouping.currentHandicap;
                simpleTee.predictions = predictor.coursePredictByGrouping(tee.rating,tee.slope,scoreGrouping);
               // console.log('predictions',simpleTee.predictions);
                teeList.push(simpleTee);
            });
            res.json(teeList);
        });            
    });
};
module.exports = TeeRoute;
