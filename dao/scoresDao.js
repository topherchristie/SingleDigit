var fs = require('fs');
var mongoose = require('mongoose');
var Schema = mongoose.Schema,
    ObjectId = Schema.ObjectId;

var TeeSchema = new Schema({
	name:String,
	slope:Number,
	rating:Number,
	yards:Number
});

var ScoreSchema = new Schema({
  user:String,
  date:Date,
 // courseId: String,
  courseId: { type: String, ref: 'Course' },
  teeName : String,
  score: Number,
  others:[OtherSchema],
  holes:[HoleSchema],
  ESC : Number
//  Putts : Number,
//  ThreePutt: Number,
//  GIR:Number,
//  fairways:Number
});

var CourseSchema = new Schema({
    _id:String,
    name: String,
	par: Number,
	fairways: Number,
	tees : [TeeSchema]
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
}
exports.disconnect = function(callback){
	mongoose.disconnect(callback);
	console.log('disconnected from mongo');
}



var ScoreModel = mongoose.model('Score',ScoreSchema);
exports.getScore = function(scoreId,callback){
   return ScoreModel.findOne({"_id":scoreId},callback);
}
exports.getScores = function(userId,callback){
  ScoreModel.find({}) .populate("courseId")
  .sort("-date").exec(callback);
}

exports.reduceByYear = function(callback){
    // do it the hard way
    
    
    // reduce it
    
    var o = {
        map: function(){
            var total = 0;
            this.holes.forEach(function(h){
                if(h.putts >= 3){
                    total++;
                }
            });
            
            emit(this.date.getFullYear(),{"threePutts":total});    
            
        },
        scope:{},
        reduce: function(key,vals){
            var total = 0;
            var cnt =0;
            vals.forEach(function(v){
                cnt ++;
                total += v.threePutts;
            });
            
            return {"threePutts": Math.round(total/cnt*10)/10};
            
        },
        query:{}
    };
    ScoreModel.mapReduce(o,callback);
    
    // fake it
    /*
    var hopefullResult= [];
    var y2012 = {};
    y2012._id = 2012;
    y2012.value = {};
    y2012.value.threePutts = 3.3;
    hopefullResult.push(y2012);
    var y2013 = {};
    y2013._id = 2013;
    y2013.value = {};
    y2013.value.threePutts = 3.0;
    //hopefullResult.push(y2013);
    callback(false,hopefullResult);
    */
    
    
};
