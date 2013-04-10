
//var time = require('time')(Date);
var vows = require("vows")
var dao = require('../dao/scoresDao.js');
var config = require('../config.js');
var should = require('should');

vows.describe('goal reduce Tests').addBatch({
    'Create dao Connection':{
       topic :function(){
            dao.connect(config.ConnectionString,this.callback());            
        },
        'Goals Tests':{
          topic: function(){
              dao.reduceByYear(this.callback);
          },
          'returns array':function(topic){
              topic.should.be.an.instanceOf(Array);
          },
          'array length should be 2':function(topic){
              topic.should.have.lengthOf(2);
          },
          'first should be 2012':function(topic){
                topic[0]._id.should.equal(2012);
          },
          '2012 should avg 3.3':function(topic){
              topic[0].value.threePutts.should.be.a('number');
                topic[0].value.threePutts.should.equal(3.3);
          },
          'second should be 2013':function(topic){
                should.exist(topic[1]);
                topic[1]._id.should.equal(2013);
          },
          'second value should exist':function(topic){
                should.exist(topic[1]);
                should.exist(topic[1].value.threePutts);
          }
        },
        'Score last 20 Test':{
            topic:function(){
                dao.getLast20Scores('me',this.callback);
            },
            'first item is mke':function(topic){
                topic[0].courseId.should.equal('mkeCC');
            },
            'last item is browndeer 94':function(topic){
                topic[topic.length-1].courseId.should.equal('BrownDeer');
                topic[topic.length-1].score.should.equal(95);
            }
        },
        teardown :function(){
            dao.disconnect();
        }
    }
}).export(module);