var dao = require("./dao/scoresDao.js");
var config = require("./config");
var async = require("async");

dao.connect(config.ConnectionString,function(error){
    console.log('connect returned');
    if(error) throw error;
    //processTees();
    updateScores();
});
function updateScores(){
    try{
        dao.getScores('me',function(err,scores){
            if(err) throw err;
              async.eachLimit(scores,5,
                function(score,callback){
                    console.log('saving');
                    score.save(callback);
                },
                function(err){
                    if(err) throw err;
                    console.log('closing');
                    dao.disconnect(function(err){if(err) console.error('error closing:' + err);});        
                });
            
        });
    }catch(err){
        console.log('error in updateScores',err);
        dao.disconnect(function(err){if(err) console.error('error closing:' + err);});
    }
}
function processTees(){
    try{
        GetCourses(function(courses){
            var newTees = [];
            courses.forEach(function(course){
                course.tees.forEach(function(tee){
                //   console.log(course._id,":",tee) ;
                   var newTee = {};
                   newTee.course =  course._id;
                   newTee.holes = tee.holes;
                   newTee.name = tee.name;
                   newTee.slope = tee.slope;
                   newTee.rating = tee.rating;
                   newTee.yards = tee.yards;
                   newTees.push(newTee);
                   
                });
            });
            async.eachLimit(newTees,5,
                function(tee,callback){
                    console.log('saving');
                    dao.addNewTee(tee,callback);
                },
                function(err){
                    if(err) throw err;
                    console.log('closing');
                    dao.disconnect(function(err){if(err) console.error('error closing:' + err);});        
                });
    
            
        });
        
    }catch(err){
        console.log('error in processTess',err);
        dao.disconnect(function(err){if(err) console.error('error closing:' + err);});
    }
    finally{
      //  console.log('closing!');
        //
    }
}
    
function GetCourses(callback){
    dao.getCourses(function(err,result){
        if(err) throw err;
        callback(result);
    });
}