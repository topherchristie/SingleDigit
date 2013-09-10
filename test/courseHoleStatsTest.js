
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
            'Hole 3 should have playable n/a':function(topic){
                should.exist(topic[2].value.playablePercent);
                topic[2].value.playablePercent.should.equal('n/a');
            },
             'Hole 3 should have fairway n/a':function(topic){
                should.exist(topic[2].value.fairwayPercent);
                topic[2].value.fairwayPercent.should.equal('n/a');
            },
            'Hole 1 should not be a par 3':function(topic){
                should.exist(topic[0].value.par3);
                topic[0].value.par3.should.not.be.true;
            },
            'Hole 1 fairways should be 43%':function(topic){
                should.exist(topic[0].value.fairwayPercent);
                topic[0].value.fairwayPercent.should.equal("43");
            },
            'Hole 1 playable should be 80%':function(topic){
                should.exist(topic[0].value.playablePercent);
                topic[0].value.playablePercent.should.equal("86");
            },
            'Hole 11 should be GIR':function(topic){
                should.exist(topic[10].value.GIRPercent);
                topic[10].value.GIRPercent.should.equal("14");
            },
            'Hole 12 should be not be GIR':function(topic){
                should.exist(topic[11].value.GIRPercent);
                topic[11].value.GIRPercent.should.equal("29");
            },
            'Hole 11 avg Score to par should be 2':function(topic){
                should.exist(topic[10].value.avgScoreToPar);
                topic[10].value.avgScoreToPar.should.equal("1.71");
            },
            'Hole 11 avg putts 2.40':function(topic){
                should.exist(topic[10].value.avgPutts);
                topic[10].value.avgPutts.should.equal("2.14");
            },
            'Hole 3 penalties 0':function(topic){
                should.exist(topic[2].value.penalties);
                topic[2].value.penalties.should.equal(0);
            },
            'Hole 11 penalties 2':function(topic){
                should.exist(topic[10].value.penalties);
                topic[10].value.penalties.should.equal(2);
            }
        },
        'Course Reduction with One Round Tests':{
            topic: function(){
                dao.reduceByCourse("greywalls",this.callback);
            },
            'returns object':function(topic){
                should.exist(topic);
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
            },
            'Hole 11 should be GIR':function(topic){
                should.exist(topic[10].value.GIRPercent);
                topic[10].value.GIRPercent.should.equal("100");
            },
            'Hole 12 should be not be GIR':function(topic){
                should.exist(topic[11].value.GIRPercent);
                topic[11].value.GIRPercent.should.equal("0");
            },
            'Hole 11 avg Score to par should be -1':function(topic){
                should.exist(topic[10].value.avgScoreToPar);
                topic[10].value.avgScoreToPar.should.equal(-1);
            },
            'Hole 11 avg putts 1':function(topic){
                should.exist(topic[10].value.avgPutts);
                topic[10].value.avgPutts.should.equal(1);
            },
            'Hole 9 penalties 1':function(topic){
                should.exist(topic[8].value.penalties);
                topic[8].value.penalties.should.equal(1);
            },
            'Hole 10 penalties 0':function(topic){
                should.exist(topic[9].value.penalties);
                topic[9].value.penalties.should.equal(0);
            }
        },
        'Hole Reduction One Round (broadlands) Tests':{
            topic: function(){
                dao.HoleVsPar({"course":"broadlands"},this.callback);
            },
            'returns object':function(topic){
                should.exist(topic);
            },
            'check count':function(topic){
                topic.length.should.equal(18);
            },
            'check hole #1 id':function(topic){
                should.exist(topic[0]);
                should.exist(topic[0].value);
                should.exist(topic[0].value.x);
                topic[0].value.x.should.equal(1);
            },
            'check hole #10 id':function(topic){
                should.exist(topic[9]);
                should.exist(topic[9].value);
                should.exist(topic[9].value.x);
                topic[9].value.x.should.equal(10);
            },
            'check hole #15 overPar ':function(topic){
                should.exist(topic[14]);
                should.exist(topic[14].value);
                should.exist(topic[14].value.y);
                topic[14].value.y.should.equal(-1);
            },
            'check hole #3 overPar ':function(topic){
                should.exist(topic[2]);
                should.exist(topic[2].value);
                should.exist(topic[2].value.y);
                topic[2].value.y.should.equal(2);
            },
            'check hole #11 overPar':function(topic){
                should.exist(topic[10]);
                should.exist(topic[10].value);
                should.exist(topic[10].value.y);
                topic[10].value.y.should.equal(0);
            }
        },
        'Hole Reduction All Rounds  Tests':{
            topic: function(){
                dao.HoleVsPar({"course":null},this.callback);
            },
            'returns object':function(topic){
                should.exist(topic);
            },
            'check count':function(topic){
                topic.length.should.equal(18);
            }
        },
        'Hole Reduction Two Round (mkeCC) Tests':{
            topic: function(){
                dao.HoleVsPar({"course":"mkeCC"},this.callback);
            },
            'returns object':function(topic){
                should.exist(topic);
               // console.log(topic);
            },
            'check count':function(topic){
                topic.length.should.equal(18);
            },
            'check hole #1 id ':function(topic){
                should.exist(topic[0]);
                should.exist(topic[0].value);
                should.exist(topic[0].value.x);
                topic[0].value.x.should.equal(1);
                console.log(topic[0]);
            },
            'check hole id 9':function(topic){
                should.exist(topic[9]);
                should.exist(topic[9].value);
                should.exist(topic[9].value.x);
                topic[9].value.x.should.equal(10);
            },
            'check hole #1 overPar':function(topic){
                should.exist(topic[0]);
                should.exist(topic[0].value);
                should.exist(topic[0].value.y);
                topic[0].value.y.should.equal(1);
            },
            'check hole #11 overPar ':function(topic){
                should.exist(topic[10]);
                should.exist(topic[10].value);
                should.exist(topic[10].value.y);
                topic[10].value.y.should.equal(1.5);
            }
            ,
            'check hole overPar 17':function(topic){
                should.exist(topic[16]);
                should.exist(topic[16].value);
                should.exist(topic[16].value.y);
                topic[16].value.y.should.equal(2);
            },
            'check hole overPar 16':function(topic){
                should.exist(topic[15]);
                should.exist(topic[15].value);
                should.exist(topic[15].value.y);
                topic[15].value.y.should.equal(1.5);
            }
        },
        teardown :function(){
            dao.disconnect();
        }
    }
}).export(module);