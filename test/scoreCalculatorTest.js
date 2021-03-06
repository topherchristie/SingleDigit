//h.stats = scoreCalculator.calculateHole(h);


var vows = require("vows");
var Calculator = require('../app/js/lib/scoreCalculator');
var should = require('should');

vows.describe('hole calculator Tests').addBatch({
    'Par 4 Hole Tests':{
        topic: function(){
            var calculator = new Calculator();
            var hole = {};
            hole.score = 5;
            hole.putts=3;
            hole.fairway = 'Hit';
            var stats =calculator.calculateHole(hole,4);
            this.callback(null,stats);
        },
        'returns object':function(topic){
          should.exist(topic);
          topic.should.be.an.instanceOf(Object);
        },
        'has property of hasFairway':function(topic){
            should.exist(topic);
            topic.should.have.property('hasFairway');
            topic.hasFairway.should.be.true;
        },
        'has property of fairwayHit':function(topic){
            should.exist(topic);
            topic.should.have.property('fairwayHit');
            topic.fairwayHit.should.be.true;
        },
        'has property gir':function(topic){
            should.exist(topic);
            topic.should.have.property('GIR');
            topic.GIR.should.be.true;
        },
        'has property overPar':function(topic){
            should.exist(topic);
            topic.should.have.property('overPar');
            topic.overPar.should.equal(1);
        }
    },
    'ChipIn Hole Tests':{
        topic: function(){
            var calculator = new Calculator();
            var hole = {};
            hole.score = 4;
            hole.putts=2;
            hole.chips=0;
            var stats =calculator.calculateHole(hole,3);
            this.callback(null,stats);
        },
        'has chipIn':function(topic){
            topic.should.have.property("chipIn");
        },
        'has 1 chipIn':function(topic){
            topic.chipIn.should.equal(1);
            
        }
        
    },
    'Par 3 Hole Tests':{
        topic: function(){
            var calculator = new Calculator();
            var hole = {};
            hole.score = 4;
            hole.putts=2;
            var stats =calculator.calculateHole(hole,3);
            this.callback(null,stats);
        },
        'returns object':function(topic){
          should.exist(topic);
          topic.should.be.an.instanceOf(Object);
        },
        'has property of hasFairway':function(topic){
            should.exist(topic);
            topic.should.have.property('hasFairway');
            topic.hasFairway.should.be.false;
        },
        'has property of fairwayHit should not exist':function(topic){
            should.exist(topic);
            topic.should.not.have.property('fairwayHit');
        },
        'has property gir':function(topic){
            should.exist(topic);
            topic.should.have.property('GIR');
            topic.GIR.should.be.false;
        },
        'has property overPar':function(topic){
            should.exist(topic);
            topic.should.have.property('overPar');
        }
    }
}).export(module);

vows.describe('Round Calculaor Tests').addBatch({
    'Handicap with ESC tests':{
        topic: function(){
            var calculator = new Calculator();
            var score = 94,
            ESC = 93,
            rating = 70,
            slope = 125;
            return calculator.Handicap(score,ESC,rating,slope);
        },
        'returns number':function(topic){
          should.exist(topic);
        },
        'Should use ESC vs score':function(topic){
            topic.should.be.equal(20.79);
        }
    }
}).export(module);