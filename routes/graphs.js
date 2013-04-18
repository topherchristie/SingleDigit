
var GraphRoute = function(){};
GraphRoute.scoreVs = function(req,res){
    var dao = require("../dao/scoresDao.js");
    var id = req.params.stat || "putts";
        
    dao.getAllSimple('me', "date stats." + id + " score",function(err,scores){
        var model =[];
        scores.forEach(function(s){
            model.push({"d":s.date,"x":s.score,"y":s.stats[id]});
        });
        res.send({"data":model});
    });
};
module.exports = GraphRoute;
