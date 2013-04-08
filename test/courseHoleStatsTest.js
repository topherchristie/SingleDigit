
var vows = require("vows");
var dao = require('../dao/scoresDao.js');
var config = require('../config.js');
var should = require('should');

vows.describe('course hole stats reduce Tests').addBatch({
    'Course Reduction Connection':{
       topic :function(){
            dao.connect(config.ConnectionString,this.callback());            
        },
        'Course Reduction with Multiple Rounds Tests':{
            topic: function(){
                dao.reduceByCourse("BrownDeer",this.callback);
            },
            'returns object':function(topic){
                should.exist(topic);
               // console.log(topic);
            },
            'is array':function(topic){
                topic.should.be.an.instanceOf(Array);
            },
            'has 18 holes':function(topic){
                should.exist(topic);
                topic.should.have.lengthOf(18);
            },
            'Hole 3 should be a par 3':function(topic){
                should.exist(topic[2].value.par3);
                topic[2].value.par3.should.be.true;
            },
            'Hole 1 should not be a par 3':function(topic){
                should.exist(topic[0].value.par3);
                topic[0].value.par3.should.not.be.true;
            },
            'Hole 1 fairways should be 40%':function(topic){
                should.exist(topic[0].value.fairwayPercent);
                topic[0].value.fairwayPercent.should.equal("60");
            },
            'Hole 1 playable should be 80%':function(topic){
                should.exist(topic[0].value.playablePercent);
                topic[0].value.playablePercent.should.equal("80");
            }
        },
        'Course Reduction with One Round Tests':{
            topic: function(){
                dao.reduceByCourse("greywalls",this.callback);
            },
            'returns object':function(topic){
                should.exist(topic);
               // console.log(topic);
            },
            'is array':function(topic){
                topic.should.be.an.instanceOf(Array);
            },
            'has 18 holes':function(topic){
                should.exist(topic);
                topic.should.have.lengthOf(18);
            },
            'Hole 3 should be a par 3':function(topic){
                should.exist(topic[2].value.par3);
                topic[2].value.par3.should.be.true;
            },
            'Hole 11 should not be a par 3':function(topic){
                should.exist(topic[10].value.par3);
                topic[10].value.par3.should.not.be.true;
            },
            'Hole 11 fairways should be 0%':function(topic){
                should.exist(topic[10].value.fairwayPercent);
                topic[10].value.fairwayPercent.should.equal("100");
            },
            'Hole 11 playable should be 0%':function(topic){
                should.exist(topic[10].value.playablePercent);
                topic[10].value.playablePercent.should.equal("100");
            }
        },
        teardown :function(){
            dao.disconnect();
        }
    }
}).export(module);