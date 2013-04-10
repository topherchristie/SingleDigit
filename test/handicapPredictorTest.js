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
    'Course Preditions':{
        topic:function(){
            var courseSlope = 129;
            var courseRating = 70.8;
            var totalOf9best = 138.16;
            return predictor.coursePredict(courseRating,courseSlope,totalOf9best);  
        },
        'returns array':function(topic){
            should.exist(topic);
            topic.should.be.instanceOf(Array);
            topic.should.have.lengthOf(19);
        },
        'first item is 96':function(topic){
            topic[0].should.have.property("score");
            topic[0].score.should.equal(96);
        }
        ,
        'first item has correct New Handicap':function(topic){
            topic[0].should.have.property("newHandicap");
            topic[0].newHandicap.should.equal(15.38);
        }
    }
}).export(module);
