

var vows = require("vows");
var manager = require('../domain/goalManager');
var should = require('should');

vows.describe('goal reduce Tests').addBatch({
    'Goals Tests':{
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
            fake.push(y2013);
            var result  = manager.GetGoals(fake);
            this.callback(false,result);
        },
        'returns array':function(topic){
          topic.should.be.an.instanceOf(Array);
        },
        'array length = 1':function(topic){
            topic.length.should.equal(1);
        },
        'first goal is 3 putts':function(topic){
            topic[0].id.should.equal("3 putt");
        },
        '2012 was 3.3':function(topic){
            should.exist(topic[0].lastYear);
            topic[0].lastYear.should.equal(3.3);
        },
        '2013 was 3.0':function(topic){
            should.exist(topic[0].thisYear);
            topic[0].thisYear.should.equal(3.0);
        },
        'year diff should be - .3':function(topic){
            should.exist(topic[0].yearDiff);
            topic[0].yearDiff.should.equal(-0.3);
        },
        //has 2013 goal
         'has goal':function(topic){
            should.exist(topic[0].goal);
            topic[0].goal.should.equal(2.2);
        },
        //has goal diff
        'goal diff should be -.8':function(topic){
            should.exist(topic[0].goalDiff);
            topic[0].goalDiff.should.equal(-0.8);
        }
        
    }
}).export(module);
