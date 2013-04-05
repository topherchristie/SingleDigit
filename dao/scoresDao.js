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
    this.stats = scoreCalculator.calc(this.score,this.ESC,this.holes,this.course,this.tee);
    console.log(this.stats.extra);
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
  approachDistance:Number
});
//var dburl = process.env.MONGOLAB_URI || 'mongodb://localhost:27017/golfism';
//var dburl2= 'mongodb://singleDigitUser:pizza4All@ds031947.mongolab.com:31947/golfism';
exports.connect = function(dburl2,callback) {
	console.log('starting connection');
	mongoose.connect(dburl2,callback);
};
exports.disconnect = function(callback){
	mongoose.disconnect(callback);
	console.log('disconnected from mongo');
};



var ScoreModel = mongoose.model('Score',ScoreSchema);
exports.getScore = function(scoreId,callback){
   return ScoreModel.findOne({"_id":scoreId},callback);
};
exports.getScores = function(userId,callback){
  ScoreModel.find({}).populate("course").populate("tee")
  .sort("-date").exec(callback);
};

exports.getCourses = function(callback){
    CourseModel.find().sort("name").exec(callback);
};



exports.addNewTee = function(newTee,callback){
    TeeModel.create(newTee,callback);
}

exports.getTee = function(courseId, teeName, callback){
    TeeModel.findOne({"course":courseId,"name":teeName},callback);
};
exports.reduceByYear = function(callback){
    // reduce it    
    var o = {
        map: function(){
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
