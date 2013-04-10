//h.stats = scoreCalculator.calculateHole(h);


var vows = require("vows");
var predictor = require('../domain/handicapPredictor');
var should = require('should');

vows.describe('handicap predictor Tests').addBatch({
    'Scores compile':{
        topic: function(){
            var testScores = [];
            testScores.push({"id":"test1","date":new Date(2012,9,22),handicap:13.63});
            testScores.push({"id":"test2","date":new Date(2012,9,21),handicap:12.98});
            testScores.push({"id":"test3","date":new Date(2012,9,20),handicap:17.9});
            testScores.push({"id":"test4","date":new Date(2012,9,19),handicap:18.26});
            testScores.push({"id":"test5","date":new Date(2012,9,18),handicap:11.56});
            testScores.push({"id":"test6","date":new Date(2012,9,17),handicap:15.07});
            testScores.push({"id":"test7","date":new Date(2012,9,16),handicap:16.9});
            testScores.push({"id":"test8","date":new Date(2012,9,15),handicap:17.44});
            testScores.push({"id":"test9","date":new Date(2012,9,14),handicap:21.61});
            testScores.push({"id":"test10","date":new Date(2012,9,13),handicap:17.69});
            testScores.push({"id":"test11","date":new Date(2012,9,12),handicap:22.22});
            testScores.push({"id":"test12","date":new Date(2012,9,11),handicap:19.86});
            testScores.push({"id":"test13","date":new Date(2012,9,10),handicap:22.95});
            testScores.push({"id":"test14","date":new Date(2012,9,9),handicap:17.69});
            testScores.push({"id":"test15","date":new Date(2012,9,8),handicap:21.2});
           return predictor.compileScores(testScores);
        },
        'returns object':function(topic){
          should.exist(topic);
          topic.should.be.an.instanceOf(Object);
        },
        'has scores array of 10':function(topic){
          should.exist(topic);
          should.exist(topic.scores);
          topic.scores.should.be.an.instanceOf(Array);
          topic.scores.should.have.lengthOf(10);
        },
        'first item is correct':function(topic){
            topic.scores[0].id.should.equal('test1');
        },
        'last item is correct':function(topic){
            topic.scores[9].id.should.equal(12);
        },
        'next best is test 4': function(topic){
            should.exist(topic.nextBest);
            topic.nextBest.should.equal(17.9);
        },
        'laste item is index of 18': function(topic){
              topic.scores[9].index.should.equal(18);
        },
        'Does next score bump a counting score': function(topic){
            should.exist(topic.isScoreBeingBumped);
            topic.isScoreBeingBumped.should.be.false;
        },
        'sum of best 9 should be correct':function(topic){
            topic.should.have.property("sumOfTop9Scores");
            topic.sumOfTop9Scores.should.equal(138.16);
        }
    },
    'Scores comple2':{
        topic:function(){
            var simplified = [ { id: '5040d0e8e4b0c977a953cb1d',
    date: new Date("Sun Sep 09 2012 09:40:21 GMT-0400 (EDT)"),
    score: 92,
    handicap: 13.63 },
  { id: '503bb873e4b0ac449f5ba601',
    date: new Date("Sun Aug 26 2012 06:00:21 GMT-0400 (EDT)"),
    score: 92,
    handicap: 12.98 },
  { id: '504e58b5e4b0adc170211c19',
    date: new Date("Sat Aug 25 2012 09:40:21 GMT-0400 (EDT)"),
    score: 96,
    handicap: 17.9 },
  { id: "5050d97be4b02f705f157094",
    date: new Date("Fri Aug 24 2012 09:40:21 GMT-0400 (EDT)"),
    score: 94,
    handicap: 18.26 },
  { id: "50324ac4e4b01966199d1c3f",
    date: new Date("Fri Aug 17 2012 10:00:21 GMT-0400 (EDT)"),
    score: 86,
    handicap: 11.56 },
  { id: "5011498be4b0aabe32a8f9b9",
    date: new Date("Wed Jul 25 2012 11:00:21 GMT-0400 (EDT)"),
    score: 89,
    handicap: 15.07 },
  { id: "500d7d2ae4b06613bcc49375",
    date: new Date("Sun Jul 22 2012 13:05:21 GMT-0400 (EDT)"),
    score: 88,
    handicap: 16.9 },
  { id: "5004363de4b0e762af01b629",
    date: new Date("Sun Jul 15 2012 04:40:21 GMT-0400 (EDT)"),
    score: 97,
    handicap: 17.44 },
  { id: "4ff1b95be4b02a63da8ab804",
    date: new Date("Sun Jul 01 2012 03:35:21 GMT-0400 (EDT)"),
    score: 94,
    handicap: 20.7 },
  { id: "4fe8887de4b0cb519caaa3c2",
    date: new Date("Sun Jun 24 2012 03:30:00 GMT-0400 (EDT)"),
    score: 92,
    handicap: 17.69 },
  { id: "4fbbb483e4b02039bec59cf6",
    date: new Date("Mon May 21 2012 14:55:21 GMT-0400 (EDT)"),
    score: 91,
    handicap: 21.28 },
  { id: "4f9ee019184aba0100000001",
    date: new Date("Sun Apr 29 2012 14:55:21 GMT-0400 (EDT)"),
    score: 94,
    handicap: 18.98 },
  { id: "4fbcf621e4b0cd15b47fd121",
    date: new Date("Sun Apr 15 2012 03:00:00 GMT-0400 (EDT)"),
    score: 97,
    handicap: 22.95 },
  { id: "4fbcf431e4b0cd15b47fd119",
    date: new Date("Sun Apr 01 2012 14:55:21 GMT-0400 (EDT)"),
    score: 91,
    handicap: 17.69 },
  { id: "4fbc153ee4b0a33e91b4b188",
    date: new Date("Sun Mar 18 2012 14:55:21 GMT-0400 (EDT)"),
    score: 95,
    handicap: 21.2 } ];
            return predictor.compileScores(simplified);
        },
        'last result is tstone 17.6':function(topic){            
            should.exist(topic.scores);
            topic.scores[topic.scores.length-1].handicap.should.equal(17.6);
        },
        'current handicap':function(topic){
            topic.should.have.property('currentHandicap')   ;
            topic.currentHandicap.should.equal(14.95);
        }
    },
    'last 20 Scores':{
        topic:function(){
            var simplified = [ { id: '5040d0e8e4b0c977a953cb1d',
    date: new Date("Sun Sep 09 2012 09:40:21 GMT-0400 (EDT)"),
    score: 92,
    handicap: 13.63 },
  { id: '503bb873e4b0ac449f5ba601',
    date: new Date("Sun Aug 26 2012 06:00:21 GMT-0400 (EDT)"),
    score: 92,
    handicap: 12.98 },
  { id: '504e58b5e4b0adc170211c19',
    date: new Date("Sat Aug 25 2012 09:40:21 GMT-0400 (EDT)"),
    score: 96,
    handicap: 17.9 },
  { id: "5050d97be4b02f705f157094",
    date: new Date("Fri Aug 24 2012 09:40:21 GMT-0400 (EDT)"),
    score: 94,
    handicap: 18.26 },
  { id: "50324ac4e4b01966199d1c3f",
    date: new Date("Fri Aug 17 2012 10:00:21 GMT-0400 (EDT)"),
    score: 86,
    handicap: 11.56 },
  { id: "5011498be4b0aabe32a8f9b9",
    date: new Date("Wed Jul 25 2012 11:00:21 GMT-0400 (EDT)"),
    score: 89,
    handicap: 15.07 },
  { id: "500d7d2ae4b06613bcc49375",
    date: new Date("Sun Jul 22 2012 13:05:21 GMT-0400 (EDT)"),
    score: 88,
    handicap: 16.9 },
  { id: "5004363de4b0e762af01b629",
    date: new Date("Sun Jul 15 2012 04:40:21 GMT-0400 (EDT)"),
    score: 97,
    handicap: 17.44 },
  { id: "4ff1b95be4b02a63da8ab804",
    date: new Date("Sun Jul 01 2012 03:35:21 GMT-0400 (EDT)"),
    score: 94,
    handicap: 20.7 },
  { id: "4fe8887de4b0cb519caaa3c2",
    date: new Date("Sun Jun 24 2012 03:30:00 GMT-0400 (EDT)"),
    score: 92,
    handicap: 17.69 },
  { id: "4fbbb483e4b02039bec59cf6",
    date: new Date("Mon May 21 2012 14:55:21 GMT-0400 (EDT)"),
    score: 91,
    handicap: 21.28 },
  { id: "4f9ee019184aba0100000001",
    date: new Date("Sun Apr 29 2012 14:55:21 GMT-0400 (EDT)"),
    score: 94,
    handicap: 18.98 },
  { id: "4fbcf621e4b0cd15b47fd121",
    date: new Date("Sun Apr 15 2012 03:00:00 GMT-0400 (EDT)"),
    score: 97,
    handicap: 22.95 },
  { id: "4fbcf431e4b0cd15b47fd119",
    date: new Date("Sun Apr 01 2012 14:55:21 GMT-0400 (EDT)"),
    score: 91,
    handicap: 17.69 },
  { id: "4fbc153ee4b0a33e91b4b188",
    date: new Date("Sun Mar 18 2012 14:55:21 GMT-0400 (EDT)"),
    score: 95,
    handicap: 21.2 } ];
            return predictor.getListOf20(simplified);
        },
        'confirm there are 20 results':function(topic){            
            should.exist(topic);
            topic.should.have.lengthOf(20);
        },
        'confirm result 0':function(topic){            
            should.exist(topic);
            should.exist(topic[0]);
            topic[0].handicap.should.equal(13.63);
        },
        'confirm result 1':function(topic){            
            should.exist(topic);
            should.exist(topic[1]);
            topic[1].handicap.should.equal(12.98);
        },
        'confirm result 2':function(topic){            
            should.exist(topic);
            should.exist(topic[2]);
            topic[2].handicap.should.equal(17.9);
        },
        'confirm result 3':function(topic){            
            should.exist(topic);
            should.exist(topic[3]);
            topic[3].handicap.should.equal(18.26);
        },
        'confirm result 4':function(topic){            
            should.exist(topic);
            should.exist(topic[4]);
            topic[4].handicap.should.equal(11.56);
        },
        'confirm result 5':function(topic){            
            should.exist(topic);
            should.exist(topic[5]);
            topic[5].handicap.should.equal(15.07);
        },
        'confirm result 6':function(topic){            
            should.exist(topic);
            should.exist(topic[6]);
            topic[6].handicap.should.equal(16.9);
        },
        'confirm result 7':function(topic){            
            should.exist(topic);
            should.exist(topic[7]);
            topic[7].handicap.should.equal(17.44);
        },
        'confirm result 8':function(topic){            
            should.exist(topic);
            should.exist(topic[8]);
            topic[8].handicap.should.equal(20.7);
        },
        'confirm result 9':function(topic){            
            should.exist(topic);
            should.exist(topic[9]);
            topic[9].handicap.should.equal(17.69);
        },
        'confirm result 10':function(topic){            
            should.exist(topic);
            should.exist(topic[10]);
            topic[10].handicap.should.equal(21.28);
        },
        'confirm result 11':function(topic){            
            should.exist(topic);
            should.exist(topic[11]);
            topic[11].handicap.should.equal(18.98);
        },
        'confirm result 12':function(topic){            
            should.exist(topic);
            should.exist(topic[10]);
            topic[12].handicap.should.equal(22.95);
        },
        'confirm result 13':function(topic){            
            should.exist(topic);
            should.exist(topic[13]);
            topic[13].handicap.should.equal(17.69);
        },
        'confirm result 14':function(topic){            
            should.exist(topic);
            should.exist(topic[14]);
            topic[14].handicap.should.equal(21.2);
        },
        'confirm result 15':function(topic){            
            should.exist(topic);
            should.exist(topic[15]);
            topic[15].handicap.should.equal(15.2);
        },
        'confirm result 16':function(topic){            
            should.exist(topic);
            should.exist(topic[16]);
            topic[16].handicap.should.equal(22.9);
        },
        'confirm result 17':function(topic){            
            should.exist(topic);
            should.exist(topic[17]);
            topic[17].handicap.should.equal(18.6);
        },
        'confirm result 18':function(topic){            
            should.exist(topic);
            should.exist(topic[18]);
            topic[18].handicap.should.equal(17.6);
        },
        'confirm result 19':function(topic){            
            should.exist(topic);
            should.exist(topic[19]);
            topic[19].handicap.should.equal(22);
        }
    },
    'Course Preditions':{
        topic:function(){
            var courseSlope = 129;
            var courseRating = 70.8;
            var totalOf9best = 138.16;
            var currentHandicap = 14.95;
            var nextBestHC = 17.9;
            var tenthHC = 17.7
            var fifthBest = 15.2;
            var isBeingBumped = false;
            return predictor.coursePredict(courseRating,courseSlope,totalOf9best,currentHandicap,tenthHC,fifthBest,isBeingBumped,nextBestHC);  
        },
        'returns array':function(topic){
            should.exist(topic);
            topic.should.be.instanceOf(Array);
            topic.should.have.lengthOf(18);
        },
        'first item is 95':function(topic){
            topic[0].should.have.property("score");
            topic[0].score.should.equal(95);
        }
        ,
        'first item has correct New Handicap':function(topic){
            topic[0].should.have.property("newHandicap");
            topic[0].newHandicap.should.equal(15.3);
        },
        'first should not count':function(topic){
            topic[0].should.have.property("counts");
            topic[0].counts.should.be.false;
        },
        'sixth item should count':function(topic){
            topic[5].should.have.property("counts");
            topic[5].counts.should.be.true;
        },
        'sixth item not be single digit':function(topic){
            topic[5].should.have.property("isSingleDigit");
            topic[5].isSingleDigit.should.be.false;
        },
        'last item should be single digit':function(topic){
            topic[topic.length -1].should.have.property("isSingleDigit");
            topic[topic.length -1].isSingleDigit.should.be.true;
        },
        'sixth item should not be top 5':function(topic){
            topic[5].should.have.property("isTop5");
            topic[5].isTop5.should.be.false;
        },
        'last item should be top5':function(topic){
            topic[topic.length -1].should.have.property("isTop5");
            topic[topic.length -1].isTop5.should.be.true;
        }
        ,
        'first item should not keeps or improve Handicap':function(topic){
            topic[0].should.have.property("keepsOrImprovesHandicap");
            topic[0].keepsOrImprovesHandicap.should.be.false;
        },
        'last item should  improve Handicap':function(topic){
            topic[topic.length -1].should.have.property("keepsOrImprovesHandicap");
            topic[topic.length -1].keepsOrImprovesHandicap.should.be.true;
        }
        
    }
}).export(module);
