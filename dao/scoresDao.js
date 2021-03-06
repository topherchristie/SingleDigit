var fs = require('fs');
var mongoose = require('mongoose');
var Schema = mongoose.Schema,
    ObjectId = Schema.ObjectId;

var TeeSchema = new Schema({
    name:String,
	slope:Number,
	rating:Number,
	yards:Number,
    course: { type: String, ref: 'Course' },
    holes:[TeeHoleSchema]
});
var TeeHoleSchema = new Schema({
  id:Number,
  yards:Number,
  par:Number
});
var TeeModel = mongoose.model('NewTee',TeeSchema);

var ScoreSchema = new Schema({
  user:String,
  date:Date,
 // courseId: String,
  courseId: { type: String, ref: 'Course' },
  course: { type: String, ref: 'Course' },
  tee: { type: ObjectId, ref: 'NewTee' },
  //teeName : String,
  score: Number,
  others:[OtherSchema],
  holes:[HoleSchema],
  ESC : Number,
  handicapAfter: Number,
  handicapBefore:Number,
  stats :{
      handicap:Number,
      threePutts:Number,
      onePutts:Number,
      chips:Number,
      extraChips:Number,
      putts:Number,
      overPar:Number,
      eagles:Number,
      pars:Number,
      birdies:Number,
      bogies:Number,
      doubles:Number,
      others:Number,
      ch15:Number,
      puttsPerHole:Number,
      chipIn:Number,
      scrambles:Number,
      scramblePercent:Number,
      scrambleChances:Number,
      GIR:Number,
      avgPuttsWithChip:Number,
      avgPuttsWithoutChip:Number,
      fairways:Number,
      playable:Number,
      totalFairways:Number,
      shortGame:Number,
      shortGamePercent:Number,
      fairwayPercent:Number,
      playablePercent:Number,
      drivePoints:Number,
      penalties:Number,
      extra:Number
  }
});


var scoreCalculator = new (require('../app/js/lib/scoreCalculator'))();
ScoreSchema.pre('save',function(next){
    
    if(this.tee && this.tee.holes){
        var self = this;
        this.holes.forEach(function(h){
           /* h.id = parseInt(h.id);
            h.score = parseInt(h.score);
            h.putts = parseInt(h.putts);
            h.chips = parseInt(h.chips);
            h.penalties = parseInt(h.penalties);
            h.drivePoints = parseInt(h.drivePoints);*/
            var teeHole = self.tee.holes[h.id-1];
            if(teeHole){
                h.stats = scoreCalculator.calculateHole(h,teeHole.par);
            }
        });
        this.stats = scoreCalculator.calc(this.score,this.ESC,this.holes,this.course,this.tee);
    }else{
        console.log('saving score,tee or tee.holes is false');
    }
    
    
 //   scoreCalculator.UpdateScore(this);
    this.markModified('holes');
   //console.log(this.stats.extra);
    next();
});



var CourseSchema = new Schema({
    _id:String,
    name: String,
	par: Number,
	fairways: Number
});
var CourseModel = mongoose.model('Course',CourseSchema);

var OtherSchema = new Schema({
 name:String,
 score:Number,
 notes:String
});

var HoleSchema = new Schema({
  id:Number,
  score:Number,
  putts:Number,
  chips:Number,
  clubOfTee:String,
  fairway:String,
  drivePoints: Number,
  penalties :{type:Number,default:0},
  playable: Boolean,//{type:Boolean,default:false},
  approachDistance:Number,
  stats :{
      overPar:Number,
      GIR:Boolean,
      hasFairway:Boolean,
      fairwayHit:Boolean//,
  }
});
var _connected = false;
exports.isConnected = function(){
    return _connected;
}
exports.connect = function(dburl2,callback) {
	console.log('starting connection');
    if(!_connected){
	    mongoose.connect(dburl2,callback);
        _connected = true;
    }
};
exports.disconnect = function(callback){
    _connected=false;
	mongoose.disconnect(callback);
	console.log('disconnected from mongo');
};

var ScoreModel = mongoose.model('Score',ScoreSchema);
exports.getScore = function(scoreId,callback){
   return ScoreModel.findOne({"_id":scoreId}).populate("course").populate("tee").exec(callback);
};
exports.createScore  =  function(score,callback){
    var scoreModel = new ScoreModel(score);
    scoreModel.save(callback);
    //return ScoreModel.save(score,callback);
};
exports.saveScore = function(score,callback){
    //ScoreModel.findOneAndUpdate({"_id":score._id}, score,{}, callback);
    ScoreModel.findOne({"_id":score._id}, function (err, doc) {
      if (err) throw err;
      doc.holes = score.holes;
      doc.save(callback);
    });
};

exports.getScores = function(userId,callback){
  ScoreModel.find({}).populate("course").populate("tee")
  .sort("-date").exec(callback);
};
exports.getScoresByDate = function(userId,callback){
  ScoreModel.find({}).populate("course").populate("tee")
  .sort("date").exec(callback);
};


exports.getAllSimple = function(userId,properties,sortObject,callback){
    var query = ScoreModel.find({},properties)
        .sort(sortObject);
        query.exec(callback);
};
exports.getLast20Scores = function(userId,callback){
    ScoreModel.find({})
        .populate("course").populate("tee")
        .sort("-date").exec(callback);
};

exports.getCourses = function(callback){
    CourseModel.find().sort("name").exec(callback);
};
exports.getTeeById = function(teeId,callback){
   return TeeModel.findOne({"_id":teeId},callback);
};
exports.getTeesByCourseId = function(courseId,callback){
   return TeeModel.find({"course":courseId},callback);
};

exports.addNewTee = function(newTee,callback){
    TeeModel.create(newTee,callback);
};

exports.getTee = function(courseId, teeName, callback){
    TeeModel.findOne({"course":courseId,"name":teeName},callback);
};

exports.reduceByCourse = function(courseId,callback){
    var r = {
        map: function(){
            
            this.holes.forEach(function(h){
                var par3,fairways,playable,fairwayPercent,playablePercent;
                if(h.stats){
                    if(h.stats.hasFairway){
                        par3=false;
                        fairways = h.stats.fairwayHit?1:0;
                        playable = h.playable?1:0;
                       // var gir = h.gir;
                        fairwayPercent= (fairways/1*100).toFixed(0);
                        playablePercent=(playable/1*100).toFixed(0);
                    }else{
                        par3=true;
                        fairwayPercent= 'n/a';
                        playablePercent= 'n/a';
                    }
                    emit(h.id,{
                        "par3":par3,
                        "fairway":fairways,
                        'avgScoreToPar':h.stats.overPar,
                        "playable":playable,
                        "fairwayPercent":fairwayPercent,
                        "playablePercent":playablePercent,
                        'GIR':h.stats.GIR?1:0,
                        'GIRPercent':h.stats.GIR?'100':'0',
                        'count':1,
                        'avgPutts':h.putts,
                        'penalties':h.penalties
                    });
                }
            });
        },
        scope:{},
        reduce: function(key,vals){
            var fairways = 0;
            var playable =0,count=0;
            var GIR = 0;
            var scoreToPar = 0;
            var penalties = 0;
            var putts = 0;
            vals.forEach(function(v){
                if(!vals.par3){
                    fairways += v.fairway;
                    playable += v.playable;                    
                }
                count++;
                GIR += v.GIR;
                scoreToPar += v.avgScoreToPar;
                penalties += v.penalties;
                putts += v.avgPutts;
            });
            return {
                "par3": vals[0].par3,
                "count": count,
                "fairway":fairways,
                "playable":playable,
                'avgScoreToPar':count===0?'n/a':(scoreToPar/count).toFixed(2),
                "GIR":GIR,
                'GIRPercent':count===0?'n/a':(GIR/count*100).toFixed(0),
                "fairwayPercent":count===0 ||vals[0].par3 ?'n/a':(fairways/count*100).toFixed(0),
                "playablePercent":count===0||vals[0].par3?'n/a':(playable/count*100).toFixed(0),
                'avgPutts':count===0?'n/a':(putts/count).toFixed(2),
                'penalties':penalties
            };
        },
        query:{"course":courseId}
    };
    ScoreModel.mapReduce(r,callback);
};
exports.handicapForYear = function(year, callback){
    var results = [];
    results[0] = {'name':'March','short':'M'};
    results[1] = {'name':'April','short':'M'};
    results[2] = {'name':'May','short':'M'};
    results[3] = {'name':'June','short':'M'};
    results[4] = {'name':'July','short':'M'};
    results[5] = {'name':'Aug','short':'M'};
    results[6] = {'name':'Sept','short':'M'};
    results[7] = {'name':'Oct','short':'M'};

    callback(null,results);
};
exports.reduceByYear = function(callback){
    // reduce it    
    var o = {
        map: function(){
            if(this.stats){
                emit(this.date.getFullYear(),{
                    "threePutts":this.stats.threePutts,
                    "extraChips":this.stats.extraChips, 
                    "putts":this.stats.putts, 
                    "scramblePercent":this.stats.scramblePercent,
                    "extras":this.stats.extra,
                    "GIR":this.stats.GIR,
                    "drivePoints":this.stats.drivePoints,
                    "score":this.score
                    });      
            }
        },
        scope:{},
        reduce: function(key,vals){
            var total = 0;
            var cnt =0;
            var extraChips = 0;
            var putts = 0;
            var scramblePercent=0;
            var extras = 0;
            var GIR = 0;
            var drivePoints =0;
            var score = 0;
            vals.forEach(function(v){
                cnt ++;
                total += v.threePutts;
                extraChips += v.extraChips;
                putts += v.putts;
                scramblePercent += v.scramblePercent;
                extras += v.extras;
                GIR += v.GIR;
                drivePoints += v.drivePoints;
                score += v.score;
            });
            return {
                "threePutts": Math.round(total/cnt*10)/10,
                "extraChips": Math.round(extraChips/cnt*10)/10,
                "putts": Math.round(putts/cnt*10)/10,
                "scramblePercent": Math.round(scramblePercent/cnt*10)/10,
                "extras": Math.round(extras/cnt*10)/10,
                "GIR": Math.round(GIR/cnt*10)/10,
                "drivePoints": Math.round(drivePoints/cnt*10)/10,
                "score": Math.round(score/cnt*10)/10
            };
        },
        query:{}
    };
    ScoreModel.mapReduce(o,callback);
  };
exports.HoleVsPar = function(course,callback){
    var r = {
        map: function(){
            this.holes.forEach(function(h){
                if(h.stats){
                    emit(h.id,
                        {
                         "x":h.id,    
                         "d":h.id,
                         "y": h.stats.overPar
                        }
                    
                    );
                }
            });
        },
        scope:{},
        reduce: function(key,vals){
            var scoreToPar = 0;
            var cnt = 0;
            vals.forEach(function(v){
                scoreToPar += parseInt(v.y);
                cnt ++;
            });
         
            return {
                "d": key,
                "x":key,
                "y": Math.round(scoreToPar/cnt*100)/100
                //"valcnt":cnt,
                //"vals":vals
            };
        },
        query: {} // cannot get something like this to workfunction(){return { "course" : course.course};}//{"course":course.course}
    };
    ScoreModel.mapReduce(r,callback);
};
