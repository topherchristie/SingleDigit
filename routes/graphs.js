
var GraphRoute = function(){};
GraphRoute.scoreVs = function(req,res){
    var dao = require("../dao/scoresDao.js");
    var id = req.params.stat || "putts";
    var sortObject = {};
    sortObject["score"]  = 1;
    sortObject["stats." + id] = 1;
    dao.getAllSimple('me', "date stats." + id + " score",sortObject,function(err,scores){
        var model =[];
        var sorted = scores;
        
        for(var i =0;i<sorted.length;i++){
            var s = sorted[i];
           if(model.length > 0 && model[model.length-1].x === s.score && model[model.length-1].y === s.stats[id]){
               model[model.length-1].cnt ++;
           }else{
                model.push({"d":s.date,"x":s.score,"y":s.stats[id],'cnt':1});   
           }
        }
        
        res.send({"data":model});
    });
};
module.exports = GraphRoute;
