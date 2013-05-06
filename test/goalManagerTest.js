

var vows = require("vows");
var manager = require('../domain/goalManager');
var should = require('should');

vows.describe('goal manager Tests').addBatch({
    'Goals Tests':{
        topic: function(){
            var fake = [];
            var y2012 = {};
            y2012._id = 2012;
            y2012.value = {};
            y2012.value.threePutts = 3.3;
            y2012.value.putts = 35.8;
            y2012.value.extraChips = 2.8;
            
            fake.push(y2012);
            var y2013 = {};
            y2013._id = 2013;
            y2013.value = {};
            y2013.value.threePutts = 3.0;
            y2013.value.putts= 34.8;
            y2013.value.extraChips = 2;
            fake.push(y2013);
            var result  = manager.GetGoals(fake);
            this.callback(false,result);
        },
        'returns array':function(topic){
          should.exist(topic);
          topic.should.be.an.instanceOf(Array);
        },
        'array length = 8':function(topic){
            should.exist(topic);
            topic.length.should.equal(8);
        },
        'first goal is 3 putts':function(topic){
            should.exist(topic);
            topic[0].id.should.equal("3 putt");
        },
        '2012 was 3.3':function(topic){
            should.exist(topic);
            should.exist(topic[0].lastYear);
            topic[0].lastYear.should.equal(3.3);
        },
        '2013 was 3.0':function(topic){
            should.exist(topic);
            should.exist(topic[0].thisYear);
            topic[0].thisYear.should.equal(3.0);
        },
        'year diff should be - .3':function(topic){
            should.exist(topic);
            should.exist(topic[0].yearDiff);
            topic[0].yearDiff.should.equal(-0.3);
        },
        //has 2013 goal
         'has goal':function(topic){
             should.exist(topic);
            should.exist(topic[0].goal);
            topic[0].goal.should.equal(2.2);
        },
        //has goal diff
        'goal diff should be .8':function(topic){
            should.exist(topic);
            should.exist(topic[0].goalDiff);
            topic[0].goalDiff.should.equal(0.8);
        }
        
    },
      'Goals No Current Year Tests':{
        topic: function(){
            var fake = [];
            var y2012 = {};
            y2012._id = 2012;
            y2012.value = {};
            y2012.value.threePutts = 3.3;
            fake.push(y2012);
            var y2013 = {};
            y2013._id = 2013;
            y2013.value = {};
            y2013.value.threePutts = 3.0;
            var result  = manager.GetGoals(fake);
            this.callback(false,result);
        },
        'returns array':function(topic){
          topic.should.be.an.instanceOf(Array);
        },
        'array length = 8':function(topic){
            topic.should.have.lengthOf(8);
        },
        'first goal is 3 putts':function(topic){
            topic[0].id.should.equal("3 putt");
        },
        '2012 was 3.3':function(topic){
            should.exist(topic[0].lastYear);
            topic[0].lastYear.should.equal(3.3);
        },
        '2013 should be 0':function(topic){
            should.exist(topic[0].thisYear);
            topic[0].thisYear.should.equal(0);
        },
        'year diff should be 0':function(topic){
            should.exist(topic[0].yearDiff);
            topic[0].yearDiff.should.equal(0);
        },
        //has 2013 goal
         'has goal':function(topic){
            should.exist(topic[0].goal);
            topic[0].goal.should.equal(2.2);
        },
        //has goal diff
        'goal diff should be 0':function(topic){
            should.exist(topic[0].goalDiff);
            topic[0].goalDiff.should.equal(0);
        }
        
    }
}).export(module);
